import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, shipmentsTable, messagesTable, suppliersTable, buyersTable, stagesTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

const SeedDemoBody = z.object({
  supplierId: z.number().int().positive(),
  buyerId: z.number().int().positive(),
});

router.post("/onboarding/seed-demo", async (req, res) => {
  const parsed = SeedDemoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { supplierId, buyerId } = parsed.data;
  const orgId = await resolveOrgId(req);

  const [supplier] = await db
    .select({ id: suppliersTable.id, name: suppliersTable.name })
    .from(suppliersTable)
    .where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.orgId, orgId)));

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const [buyer] = await db
    .select({ id: buyersTable.id, name: buyersTable.name })
    .from(buyersTable)
    .where(and(eq(buyersTable.id, buyerId), eq(buyersTable.orgId, orgId)));

  if (!buyer) {
    res.status(404).json({ error: "Buyer not found" });
    return;
  }

  const stages = await db
    .select()
    .from(stagesTable)
    .where(eq(stagesTable.orgId, orgId))
    .orderBy(asc(stagesTable.sortOrder));

  const firstStageId = stages[0]?.id ?? "production";

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 45);
  const exFactoryDate = new Date();
  exFactoryDate.setDate(exFactoryDate.getDate() + 30);

  const now = Date.now();
  const poNumber = `DEMO-${now.toString().slice(-6)}`;

  const [shipment] = await db
    .insert(shipmentsTable)
    .values({
      poNumber,
      product: "Sample Product — Demo Order",
      category: "General",
      supplierId: supplier.id,
      customerName: buyer.name,
      buyerId: buyer.id,
      status: "on-track",
      currentStageId: firstStageId,
      dueDate,
      exFactoryDate,
      destination: "Los Angeles, CA",
      via: "OCEAN",
      orgId,
    })
    .returning();

  const baseTime = new Date();
  const messages = [
    {
      shipmentId: shipment.id,
      supplierId: supplier.id,
      sender: supplier.name,
      channel: "whatsapp",
      direction: "inbound" as const,
      snippet: `Hi! We confirm receipt of your PO ${poNumber}. Production starts next Monday. Any special requirements?`,
      fullBody: `Hi!\n\nWe confirm receipt of your PO ${poNumber}. Production is scheduled to start next Monday. Lead time is 25 days from start date.\n\nPlease let us know if you have any special packaging or labelling requirements before we begin.\n\nBest regards,\n${supplier.name}`,
      aiDraft: `Hi — thanks for confirming. No special requirements beyond what's in the spec sheet. Please send us a production update at the midway point. We'll confirm packaging details by end of week.`,
      aiAction: "Acknowledge and request mid-production update",
      aiTags: ["milestone: production start", "PO confirmed"],
      unread: true,
      receivedAt: new Date(baseTime.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      shipmentId: shipment.id,
      supplierId: supplier.id,
      sender: supplier.name,
      channel: "email",
      direction: "inbound" as const,
      snippet: `Please find attached our proforma invoice for ${poNumber}. Deposit of 30% due within 7 days.`,
      fullBody: `Dear Team,\n\nPlease find attached our proforma invoice for PO ${poNumber}.\n\nPayment terms:\n• Deposit: 30% within 7 days of confirmation\n• Balance: 70% before shipment release\n\nBank details will be provided upon your confirmation.\n\nBest regards,\nAccounts Team\n${supplier.name}`,
      aiDraft: `Thank you — proforma received. We will arrange the 30% deposit transfer within 7 days. Please send bank details to our finance team at finance@example.com.`,
      aiAction: "Confirm receipt and initiate deposit payment",
      aiTags: ["payment: deposit due", "invoice received"],
      unread: true,
      receivedAt: new Date(baseTime.getTime() - 26 * 60 * 60 * 1000),
    },
    {
      shipmentId: shipment.id,
      supplierId: supplier.id,
      sender: supplier.name,
      channel: "wechat",
      direction: "inbound" as const,
      snippet: "Sample photos ready — please check and approve so we can proceed to bulk production.",
      fullBody: `Hi! Sample photos are ready for your review. We have 3 colour variants as discussed.\n\n1. Natural finish — very close to reference\n2. Matte black — slight texture difference, please advise\n3. Chrome — matches spec perfectly\n\nPlease approve by Friday so we can order bulk materials on schedule. Production window will be lost if approval is delayed past Monday.`,
      aiDraft: `Hi — photos received. Colour 1 and 3 approved. For colour 2, please adjust texture to match the reference closer and send a revised photo. We need final confirmation by Thursday to stay on track.`,
      aiAction: "Approve colours 1 & 3, request revision on colour 2",
      aiTags: ["sample: approval required", "risk: delay if not approved"],
      unread: false,
      receivedAt: new Date(baseTime.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      shipmentId: shipment.id,
      supplierId: supplier.id,
      sender: supplier.name,
      channel: "email",
      direction: "inbound" as const,
      snippet: "QC inspection report attached — AQL 2.5 passed. Ready for final packaging approval.",
      fullBody: `Dear Team,\n\nPlease find the attached QC inspection report for PO ${poNumber}.\n\nResult: PASSED — AQL 2.5\nUnits inspected: 240 (10% random sample)\nMinor defects: 2 (within acceptable limit)\nMajor defects: 0\n\nProduction is complete and units are ready for final packaging. Please confirm packaging artwork approval so we can begin boxing.\n\nBalance payment of 70% will be required before container loading.\n\nBest regards,\n${supplier.name}`,
      aiDraft: `QC report received — congratulations on the PASS. Packaging artwork is approved as per our last email. Please proceed with boxing. We will arrange the 70% balance payment this week.`,
      aiAction: "Confirm QC pass and initiate balance payment",
      aiTags: ["milestone: QC passed", "payment: balance due", "ready for packaging"],
      unread: true,
      receivedAt: new Date(baseTime.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  const inserted = await db
    .insert(messagesTable)
    .values(
      messages.map(m => ({
        ...m,
        isFlagged: false,
        routingStatus: "routed" as const,
        routingConfidence: 1.0,
        matchMethod: "demo",
        orgId,
      })),
    )
    .returning();

  req.log.info(
    { supplierId, buyerId, shipmentId: shipment.id, messageCount: inserted.length },
    "onboarding/seed-demo: seeded demo data",
  );

  res.status(201).json({
    shipmentId: shipment.id,
    poNumber,
    messageCount: inserted.length,
  });
});

export default router;
