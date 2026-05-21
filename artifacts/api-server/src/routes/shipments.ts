import { Router, type IRouter } from "express";
import {
  db,
  shipmentsTable,
  suppliersTable,
  paymentsTable,
  factoryQuotesTable,
} from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import {
  ListShipmentsResponseItem,
  CreateShipmentBody,
  UpdateShipmentBody,
  UpdateShipmentResponse,
  UpdatePaymentBody,
  UpdatePaymentResponse,
  SelectFactoryQuoteBody,
  SelectFactoryQuoteResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function loadShipment(id: number) {
  const [row] = await db
    .select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .where(eq(shipmentsTable.id, id));
  if (!row) return null;
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.shipmentId, id)).orderBy(asc(paymentsTable.sortOrder));
  const quotes = await db.select().from(factoryQuotesTable).where(eq(factoryQuotesTable.shipmentId, id)).orderBy(asc(factoryQuotesTable.sortOrder));
  return { ...row.shipment, supplierName: row.supplierName, payments, quotes };
}

router.get("/shipments", async (_req, res) => {
  const shipments = await db
    .select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .orderBy(asc(shipmentsTable.id));
  const allPayments = shipments.length ? await db.select().from(paymentsTable).orderBy(asc(paymentsTable.sortOrder)) : [];
  const allQuotes = shipments.length ? await db.select().from(factoryQuotesTable).orderBy(asc(factoryQuotesTable.sortOrder)) : [];
  const out = shipments.map(({ shipment, supplierName }) =>
    ListShipmentsResponseItem.parse({
      ...shipment,
      supplierName,
      payments: allPayments.filter(p => p.shipmentId === shipment.id),
      quotes: allQuotes.filter(q => q.shipmentId === shipment.id),
    }),
  );
  res.json(out);
});

router.post("/shipments", async (req, res) => {
  const parsed = CreateShipmentBody.parse(req.body);
  const input = {
    ...parsed,
    status: parsed.status ?? "on-track",
    currentStageId: parsed.currentStageId ?? "stage-spec-sheet",
    via: parsed.via ?? "OCEAN",
  };
  let row: typeof shipmentsTable.$inferSelect;
  try {
    [row] = await db.insert(shipmentsTable).values(input).returning();
  } catch (err: unknown) {
    const isPoUnique = (e: unknown): boolean => {
      if (!e || typeof e !== "object") return false;
      const obj = e as Record<string, unknown>;
      const code = obj["code"];
      const constraint = String(obj["constraint"] ?? "");
      const detail = String(obj["detail"] ?? "");
      if (code === "23505" && (constraint.includes("po_number") || detail.includes("po_number"))) return true;
      if (obj["cause"]) return isPoUnique(obj["cause"]);
      return false;
    };
    if (isPoUnique(err)) {
      res.status(409).json({ error: "A shipment with this PO number already exists." });
      return;
    }
    throw err;
  }
  const out = await loadShipment(row.id);
  if (!out) {
    res.status(500).json({ error: "Failed to load created shipment" });
    return;
  }
  res.status(201).json(ListShipmentsResponseItem.parse(out));
});

router.patch("/shipments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdateShipmentBody.parse(req.body);
  await db.update(shipmentsTable).set(input).where(eq(shipmentsTable.id, id));
  const out = await loadShipment(id);
  if (!out) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateShipmentResponse.parse(out));
});

router.patch("/payments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdatePaymentBody.parse(req.body);
  const [updated] = await db.update(paymentsTable).set(input).where(eq(paymentsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdatePaymentResponse.parse(updated));
});

router.post("/shipments/:id/select-quote", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const input = SelectFactoryQuoteBody.parse(req.body);
  const [target] = await db
    .select()
    .from(factoryQuotesTable)
    .where(and(eq(factoryQuotesTable.id, input.quoteId), eq(factoryQuotesTable.shipmentId, shipmentId)));
  if (!target) {
    res.status(404).json({ error: "Quote not found for this shipment" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.update(factoryQuotesTable).set({ selected: false }).where(eq(factoryQuotesTable.shipmentId, shipmentId));
    await tx.update(factoryQuotesTable).set({ selected: true }).where(
      and(eq(factoryQuotesTable.id, input.quoteId), eq(factoryQuotesTable.shipmentId, shipmentId)),
    );
  });
  const quotes = await db.select().from(factoryQuotesTable).where(eq(factoryQuotesTable.shipmentId, shipmentId)).orderBy(asc(factoryQuotesTable.sortOrder));
  res.json(quotes.map(q => SelectFactoryQuoteResponseItem.parse(q)));
});

export default router;
