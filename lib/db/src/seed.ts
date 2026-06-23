import { db, pool } from "./index";
import { sql } from "drizzle-orm";
import {
  organizationsTable,
  stagesTable,
  suppliersTable,
  buyersTable,
  dealsTable,
  dealShipmentsTable,
  shipmentsTable,
  paymentsTable,
  factoryQuotesTable,
  messagesTable,
  tasksTable,
} from "./schema";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ORG_ID = 1;

interface SeedShipment {
  id: string;
  poNumber: string;
  product: string;
  category: string;
  supplierName: string;
  supplierCountry: string;
  customerName: string;
  status: string;
  currentStageId: string;
  dueDate: string;
  exFactoryDate: string;
  destination: string;
  via: string;
  payments: { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; sortOrder: number; buyerSharePct?: number; intermediaryAdvanceUsd?: number; intermediaryRecoveredUsd?: number }[];
  quotes?: { factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean }[];
}

interface SeedMessage {
  id: string;
  shipmentId: string;
  supplierName: string;
  sender: string;
  channel: string;
  receivedAt: string;
  snippet: string;
  fullBody: string;
  unread: boolean;
  aiTags: string[];
  aiDraft: string;
  aiAction: string;
}

interface SeedTask {
  id: string;
  shipmentId: string;
  messageId: string | null;
  title: string;
  source: string;
  sourceAge: string;
  urgency: string;
  action: string;
  done: boolean;
}

interface SeedDeal {
  id: string;
  buyerPoNumber: string;
  customerName: string;
  buyerTotalUsd: number;
  buyerUnitPrice: number;
  buyerQuantity: number;
  currency: string;
  notes: string;
  shipmentIds: string[];
}

interface SeedData {
  stages: { id: string; label: string; sortOrder: number }[];
  deals: SeedDeal[];
  shipments: SeedShipment[];
  messages: SeedMessage[];
  tasks: SeedTask[];
}

async function main() {
  const seedPath = path.resolve(__dirname, "../../../scripts/src/seed-data.json");
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed data not found at ${seedPath}. Run scripts/src/build-seed-data.ts first.`);
  }
  const data: SeedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  console.log("Clearing existing data...");
  await db.execute(sql`
    TRUNCATE TABLE
      tasks, messages, factory_quotes, payments, deal_shipments, shipments,
      deals, suppliers, buyers, stages, rfqs, rfq_quotes, copilot_proposals,
      autonomy_policies, shipment_predictions, stage_events, buyer_emails,
      gmail_credentials, po_numbering_config, extraction_corrections, extractions,
      documents, team_invitations, team_users, organizations
    RESTART IDENTITY CASCADE
  `);

  console.log("Inserting default organization...");
  await db.insert(organizationsTable).values({
    id: DEFAULT_ORG_ID,
    name: "FlowForge Demo",
    slug: "flowforge-demo",
  });

  console.log("Inserting stages...");
  await db.insert(stagesTable).values(data.stages.map(s => ({ ...s, orgId: DEFAULT_ORG_ID })));

  console.log("Inserting suppliers...");
  const supplierNames = Array.from(new Set(data.shipments.map(s => s.supplierName)));
  const insertedSuppliers = await db
    .insert(suppliersTable)
    .values(supplierNames.map(name => ({
      name,
      country: data.shipments.find(s => s.supplierName === name)?.supplierCountry ?? "CN",
      orgId: DEFAULT_ORG_ID,
    })))
    .returning();
  const supplierByName = new Map(insertedSuppliers.map(s => [s.name, s.id]));

  console.log("Inserting buyers...");
  const buyerNames = Array.from(new Set(data.shipments.map(s => s.customerName).filter(Boolean)));
  const insertedBuyers = await db
    .insert(buyersTable)
    .values(buyerNames.map(name => ({ name, orgId: DEFAULT_ORG_ID })))
    .returning();
  const buyerByName = new Map(insertedBuyers.map(b => [b.name, b.id]));
  void buyerByName;

  console.log("Inserting deals...");
  const dealIdMap = new Map<string, number>();
  for (const d of (data.deals ?? [])) {
    const [inserted] = await db.insert(dealsTable).values({
      buyerPoNumber: d.buyerPoNumber,
      customerName: d.customerName,
      buyerTotalUsd: d.buyerTotalUsd,
      buyerUnitPrice: d.buyerUnitPrice,
      buyerQuantity: d.buyerQuantity,
      currency: d.currency,
      notes: d.notes,
      orgId: DEFAULT_ORG_ID,
    }).returning();
    dealIdMap.set(d.id, inserted.id);
  }

  // Build a map: seed shipment id → deal DB id
  const shipmentSeedToDealId = new Map<string, number>();
  for (const d of (data.deals ?? [])) {
    const dbDealId = dealIdMap.get(d.id);
    if (!dbDealId) continue;
    for (const sid of d.shipmentIds) {
      shipmentSeedToDealId.set(sid, dbDealId);
    }
  }

  console.log("Inserting shipments...");
  const shipmentIdMap = new Map<string, number>();
  for (const s of data.shipments) {
    const [inserted] = await db.insert(shipmentsTable).values({
      poNumber: s.poNumber,
      product: s.product,
      category: s.category,
      supplierId: supplierByName.get(s.supplierName)!,
      customerName: s.customerName,
      dealId: shipmentSeedToDealId.get(s.id) ?? null,
      status: s.status,
      currentStageId: s.currentStageId,
      dueDate: new Date(s.dueDate),
      exFactoryDate: new Date(s.exFactoryDate),
      destination: s.destination,
      via: s.via,
      orgId: DEFAULT_ORG_ID,
    }).returning();
    shipmentIdMap.set(s.id, inserted.id);

    // Payments
    await db.insert(paymentsTable).values(s.payments.map(p => ({
      shipmentId: inserted.id,
      label: p.label,
      percent: p.percent,
      amountUsd: p.amountUsd,
      paid: p.paid,
      dueDate: new Date(p.dueDate),
      sortOrder: p.sortOrder,
      buyerSharePct: p.buyerSharePct ?? null,
      intermediaryAdvanceUsd: p.intermediaryAdvanceUsd ?? null,
      intermediaryRecoveredUsd: p.intermediaryRecoveredUsd ?? null,
      orgId: DEFAULT_ORG_ID,
    })));

    // Quotes
    if (s.quotes && s.quotes.length > 0) {
      await db.insert(factoryQuotesTable).values(s.quotes.map((q, i) => ({
        shipmentId: inserted.id,
        factory: q.factory,
        country: q.country,
        unitPrice: q.unitPrice,
        leadDays: q.leadDays,
        moq: q.moq,
        selected: q.selected,
        sortOrder: i,
        orgId: DEFAULT_ORG_ID,
      })));
    }
  }

  console.log("Inserting deal_shipments join rows...");
  for (const d of (data.deals ?? [])) {
    const dbDealId = dealIdMap.get(d.id);
    if (!dbDealId) continue;
    for (const sid of d.shipmentIds) {
      const dbShipmentId = shipmentIdMap.get(sid);
      if (!dbShipmentId) continue;
      await db.insert(dealShipmentsTable).values({ dealId: dbDealId, shipmentId: dbShipmentId, orgId: DEFAULT_ORG_ID }).catch(() => {});
    }
  }

  console.log("Inserting messages...");
  const messageIdMap = new Map<string, number>();
  for (const m of data.messages) {
    const realShipmentId = shipmentIdMap.get(m.shipmentId);
    if (!realShipmentId) continue;
    const [inserted] = await db.insert(messagesTable).values({
      shipmentId: realShipmentId,
      supplierId: supplierByName.get(m.supplierName) ?? null,
      sender: m.sender,
      channel: m.channel,
      snippet: m.snippet,
      fullBody: m.fullBody,
      aiDraft: m.aiDraft,
      aiAction: m.aiAction,
      aiTags: m.aiTags,
      unread: m.unread,
      receivedAt: new Date(m.receivedAt),
      orgId: DEFAULT_ORG_ID,
    }).returning();
    messageIdMap.set(m.id, inserted.id);
  }

  console.log("Inserting tasks...");
  for (const t of data.tasks) {
    const realShipmentId = shipmentIdMap.get(t.shipmentId);
    if (!realShipmentId) continue;
    await db.insert(tasksTable).values({
      shipmentId: realShipmentId,
      messageId: t.messageId ? messageIdMap.get(t.messageId) ?? null : null,
      title: t.title,
      source: t.source,
      sourceAge: t.sourceAge,
      urgency: t.urgency,
      action: t.action,
      done: t.done,
      orgId: DEFAULT_ORG_ID,
    });
  }

  console.log(`Seed complete: ${data.shipments.length} shipments, ${data.messages.length} messages, ${data.tasks.length} tasks`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
