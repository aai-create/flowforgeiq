import { Router, type IRouter } from "express";
import * as path from "path";
import * as fs from "fs";
import multer from "multer";
import ExcelJS from "exceljs";
import { z } from "zod/v4";
import { requireAdmin, resolveOrgId } from "../middlewares/requireAuth";
import { db, suppliersTable, shipmentsTable, paymentsTable, dealsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Workspace root detection ─────────────────────────────────────────────────
// Walk up from __dirname (set by esbuild banner to dist/) until we find pnpm-workspace.yaml,
// which is guaranteed to be at the repo root. This is resilient to bundle path changes.
function findWorkspaceRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  // fallback: 3 levels up from dist/ (artifacts/api-server/dist → workspace root)
  return path.resolve(startDir, "../../..");
}

const WORKSPACE_ROOT = findWorkspaceRoot(__dirname);

// ─── GET /import/template ─────────────────────────────────────────────────────
router.get("/import/template", requireAdmin, (_req, res) => {
  const filePath = path.join(WORKSPACE_ROOT, "attached_assets", "flowforge-import-template.xlsx");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Template file not found" });
    return;
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="flowforge-import-template.xlsx"');
  fs.createReadStream(filePath).pipe(res);
});

// ─── Zod schemas ─────────────────────────────────────────────────────────────
const SupplierRowSchema = z.object({
  name:           z.string().min(1, "name is required"),
  country:        z.string().optional(),
  contactName:    z.string().optional(),
  contactEmail:   z.string().optional(),
  whatsAppNumber: z.string().optional(),
  paymentTerms:   z.string().optional(),
});

const VALID_STAGES = ["spec","quotes","sample_ord","sample_apr","po_issued","production","qc","ex_factory","in_transit","payment","delivered"] as const;
const VALID_VIA    = ["OCEAN","AIR","LCL","COURIER"] as const;

const ShipmentRowSchema = z.object({
  poNumber:       z.string().min(1, "poNumber is required"),
  buyerPoNumber:  z.string().optional(),
  product:        z.string().min(1, "product is required"),
  category:       z.string().optional(),
  supplierName:   z.string().min(1, "supplierName is required"),
  customerName:   z.string().optional(),
  via:            z.enum(VALID_VIA).optional(),
  destination:    z.string().optional(),
  exFactoryDate:  z.string().optional(),
  dueDate:        z.string().optional(),
  currentStageId: z.enum(VALID_STAGES).optional(),
  buyerTotalUsd:  z.coerce.number().optional(),
  buyerUnitPrice: z.coerce.number().optional(),
  buyerQuantity:  z.coerce.number().int().optional(),
  targetSpreadPct: z.coerce.number().optional(),
});

const PaymentRowSchema = z.object({
  poNumber:  z.string().min(1, "poNumber is required"),
  label:     z.string().min(1, "label is required"),
  amountUsd: z.coerce.number({ error: "amountUsd must be a number" }),
  percent:   z.coerce.number().optional(),
  paid:      z.union([z.boolean(), z.string()]).transform(v => v === true || v === "TRUE" || v === "true").optional(),
  dueDate:   z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  message: string;
}

interface ParsedRow {
  row: number;
  data: Record<string, unknown>;
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object" && "result" in v) return (v as ExcelJS.CellFormulaValue).result;
  if (typeof v === "object" && "richText" in v) {
    return (v as ExcelJS.CellRichTextValue).richText.map(r => r.text).join("");
  }
  if (typeof v === "object" && "hyperlink" in v) return (v as ExcelJS.CellHyperlinkValue).text;
  return v;
}

function parseSheet(ws: ExcelJS.Worksheet): { headers: string[]; rows: Record<string, unknown>[] } {
  const headers: string[] = [];
  // Row 1 = headers
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
    headers.push(String(cellValue(cell) ?? "").trim());
  });

  const rows: Record<string, unknown>[] = [];
  // Start from row 3 (row 2 is description)
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    const record: Record<string, unknown> = {};
    let hasData = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        const val = cellValue(cell);
        if (val !== undefined && val !== "") {
          record[header] = val;
          hasData = true;
        }
      }
    });
    if (hasData) rows.push(record);
  });
  return { headers, rows };
}

// ─── POST /import/data ────────────────────────────────────────────────────────
router.post(
  "/import/data",
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const dryRun = req.query.dryRun === "true";
    const orgId = await resolveOrgId(req);

    const wb = new ExcelJS.Workbook();
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await wb.xlsx.load(Buffer.from(req.file.buffer) as never);
    } catch {
      res.status(422).json({ error: "Could not parse XLSX file" });
      return;
    }

    const suppSheet  = wb.getWorksheet("Suppliers");
    const shipSheet  = wb.getWorksheet("Shipments");
    const paySheet   = wb.getWorksheet("Payments");

    if (!suppSheet || !shipSheet || !paySheet) {
      res.status(422).json({ error: "XLSX must contain sheets named Suppliers, Shipments, and Payments" });
      return;
    }

    const { rows: rawSupp } = parseSheet(suppSheet);
    const { rows: rawShip } = parseSheet(shipSheet);
    const { rows: rawPay  } = parseSheet(paySheet);

    const errors: ValidationError[] = [];
    const parsedSuppliers: ParsedRow[] = [];
    const parsedShipments: ParsedRow[] = [];
    const parsedPayments:  ParsedRow[] = [];

    // Validate suppliers
    rawSupp.forEach((raw, i) => {
      const result = SupplierRowSchema.safeParse(raw);
      if (result.success) {
        parsedSuppliers.push({ row: i + 3, data: result.data as unknown as Record<string, unknown> });
      } else {
        for (const issue of result.error.issues) {
          errors.push({ sheet: "Suppliers", row: i + 3, column: issue.path[0] as string ?? "?", message: issue.message });
        }
      }
    });

    // Validate shipments
    rawShip.forEach((raw, i) => {
      const result = ShipmentRowSchema.safeParse(raw);
      if (result.success) {
        parsedShipments.push({ row: i + 3, data: result.data as unknown as Record<string, unknown> });
      } else {
        for (const issue of result.error.issues) {
          errors.push({ sheet: "Shipments", row: i + 3, column: issue.path[0] as string ?? "?", message: issue.message });
        }
      }
    });

    // Validate payments
    rawPay.forEach((raw, i) => {
      const result = PaymentRowSchema.safeParse(raw);
      if (result.success) {
        parsedPayments.push({ row: i + 3, data: result.data as unknown as Record<string, unknown> });
      } else {
        for (const issue of result.error.issues) {
          errors.push({ sheet: "Payments", row: i + 3, column: issue.path[0] as string ?? "?", message: issue.message });
        }
      }
    });

    // Cross-sheet validation: Shipments.supplierName must appear in uploaded Suppliers sheet
    // OR already exist as a supplier for this org (validated against the DB during dry-run).
    const knownSupplierNames = new Set(
      parsedSuppliers.map(s => (s.data as { name: string }).name),
    );
    const unknownSupplierNames = new Set(
      parsedShipments
        .map(s => (s.data as { supplierName: string }).supplierName)
        .filter(name => !knownSupplierNames.has(name)),
    );
    if (unknownSupplierNames.size > 0) {
      // Bulk-check org DB for unknown names
      const existingOrgSuppliers = await db
        .select({ name: suppliersTable.name })
        .from(suppliersTable)
        .where(eq(suppliersTable.orgId, orgId));
      const orgSupplierNames = new Set(existingOrgSuppliers.map(s => s.name));
      parsedShipments.forEach(({ row, data }) => {
        const d = data as { supplierName: string };
        if (!knownSupplierNames.has(d.supplierName) && !orgSupplierNames.has(d.supplierName)) {
          errors.push({
            sheet: "Shipments",
            row,
            column: "supplierName",
            message: `supplierName "${d.supplierName}" not found in the Suppliers sheet or existing org suppliers`,
          });
        }
      });
    }

    // Cross-sheet validation: each payment's poNumber must reference a known shipment PO
    const knownPoNumbers = new Set(
      parsedShipments.map(s => (s.data as { poNumber: string }).poNumber),
    );
    parsedPayments.forEach(({ row, data }) => {
      const d = data as { poNumber: string };
      if (!knownPoNumbers.has(d.poNumber)) {
        errors.push({
          sheet: "Payments",
          row,
          column: "poNumber",
          message: `poNumber "${d.poNumber}" not found in the Shipments sheet`,
        });
      }
    });

    if (dryRun) {
      res.json({
        dryRun: true,
        suppliers: parsedSuppliers,
        shipments: parsedShipments,
        payments:  parsedPayments,
        errors,
      });
      return;
    }

    if (errors.length > 0) {
      res.status(422).json({ errors });
      return;
    }

    // ── Upsert suppliers ──────────────────────────────────────────────────────
    const insertedSuppliers = { count: 0 };
    const skippedSuppliers  = { count: 0 };
    const supplierNameToId  = new Map<string, number>();

    for (const { data } of parsedSuppliers) {
      const d = data as z.infer<typeof SupplierRowSchema>;
      const [existing] = await db
        .select({ id: suppliersTable.id })
        .from(suppliersTable)
        .where(and(eq(suppliersTable.orgId, orgId), eq(suppliersTable.name, d.name)));

      if (existing) {
        supplierNameToId.set(d.name, existing.id);
        skippedSuppliers.count++;
      } else {
        const [inserted] = await db
          .insert(suppliersTable)
          .values({
            orgId,
            name:           d.name,
            country:        d.country ?? "CN",
            contactEmail:   d.contactEmail,
            contactName:    d.contactName,
            whatsAppNumber: d.whatsAppNumber,
            paymentTerms:   d.paymentTerms,
          })
          .returning({ id: suppliersTable.id });
        if (inserted) {
          supplierNameToId.set(d.name, inserted.id);
          insertedSuppliers.count++;
        }
      }
    }

    // ── Upsert shipments ──────────────────────────────────────────────────────
    const insertedShipments = { count: 0 };
    const skippedShipments  = { count: 0 };
    const poToShipmentId    = new Map<string, number>();

    for (const { data } of parsedShipments) {
      const d = data as z.infer<typeof ShipmentRowSchema>;

      // Resolve supplier id: check map from Suppliers sheet, then fall back to org DB.
      // Unknown suppliers are caught by dry-run validation and never auto-created here.
      let supplierId = supplierNameToId.get(d.supplierName);
      if (!supplierId) {
        const [existingSupp] = await db
          .select({ id: suppliersTable.id })
          .from(suppliersTable)
          .where(and(eq(suppliersTable.orgId, orgId), eq(suppliersTable.name, d.supplierName)));
        if (existingSupp) supplierId = existingSupp.id;
      }
      if (!supplierId) continue; // should not reach here if dryRun validation was run first

      const [existing] = await db
        .select({ id: shipmentsTable.id })
        .from(shipmentsTable)
        .where(and(eq(shipmentsTable.orgId, orgId), eq(shipmentsTable.poNumber, d.poNumber)));

      if (existing) {
        poToShipmentId.set(d.poNumber, existing.id);
        skippedShipments.count++;
      } else {
        const exFactory = d.exFactoryDate ? new Date(d.exFactoryDate) : new Date();
        const due       = d.dueDate       ? new Date(d.dueDate)       : new Date();

        // Always upsert a deal for every shipment, keyed by buyerPoNumber (or poNumber as fallback).
        const buyerPo = d.buyerPoNumber ?? d.poNumber;
        let dealId: number | undefined;
        const [existingDeal] = await db
          .select({ id: dealsTable.id })
          .from(dealsTable)
          .where(and(eq(dealsTable.orgId, orgId), eq(dealsTable.buyerPoNumber, buyerPo)));
        if (existingDeal) {
          dealId = existingDeal.id;
        } else {
          const [newDeal] = await db
            .insert(dealsTable)
            .values({
              orgId,
              buyerPoNumber:   buyerPo,
              customerName:    d.customerName ?? "Unknown",
              buyerTotalUsd:   d.buyerTotalUsd ?? 0,
              buyerUnitPrice:  d.buyerUnitPrice ?? 0,
              buyerQuantity:   d.buyerQuantity ?? 0,
              targetSpreadPct: d.targetSpreadPct,
            })
            .returning({ id: dealsTable.id });
          if (newDeal) dealId = newDeal.id;
        }

        const [inserted] = await db
          .insert(shipmentsTable)
          .values({
            orgId,
            poNumber:       d.poNumber,
            product:        d.product,
            category:       d.category ?? "",
            supplierId,
            customerName:   d.customerName ?? "Unknown",
            status:         "on-track",
            currentStageId: d.currentStageId ?? "spec",
            dueDate:        due,
            exFactoryDate:  exFactory,
            destination:    d.destination ?? "",
            via:            d.via ?? "OCEAN",
            dealId,
          })
          .returning({ id: shipmentsTable.id });

        if (inserted) {
          poToShipmentId.set(d.poNumber, inserted.id);
          insertedShipments.count++;
        }
      }
    }

    // ── Upsert payments ───────────────────────────────────────────────────────
    const insertedPayments = { count: 0 };
    const skippedPayments  = { count: 0 };

    for (const { data } of parsedPayments) {
      const d = data as z.infer<typeof PaymentRowSchema>;
      const shipmentId = poToShipmentId.get(d.poNumber);
      if (!shipmentId) continue; // skip payments for unknown POs

      const [existing] = await db
        .select({ id: paymentsTable.id })
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.orgId, orgId),
            eq(paymentsTable.shipmentId, shipmentId),
            eq(paymentsTable.label, d.label),
          ),
        );

      if (existing) {
        skippedPayments.count++;
      } else {
        const due = d.dueDate ? new Date(d.dueDate) : new Date();
        await db.insert(paymentsTable).values({
          orgId,
          shipmentId,
          label:     d.label,
          amountUsd: Math.round(d.amountUsd),
          percent:   Math.round((d.percent ?? 0) * 100),
          paid:      d.paid === true,
          dueDate:   due,
          sortOrder: d.sortOrder ?? 0,
        });
        insertedPayments.count++;
      }
    }

    req.log.info({ orgId, insertedSuppliers, insertedShipments, insertedPayments }, "import/data: complete");

    res.json({
      dryRun: false,
      inserted: {
        suppliers: insertedSuppliers.count,
        shipments: insertedShipments.count,
        payments:  insertedPayments.count,
      },
      skipped: {
        suppliers: skippedSuppliers.count,
        shipments: skippedShipments.count,
        payments:  skippedPayments.count,
      },
    });
  },
);

export default router;
