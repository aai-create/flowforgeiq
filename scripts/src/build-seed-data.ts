import * as fs from "fs";
import * as path from "path";

interface RawShipment {
  category: string;
  poNumber: string;
  exFactoryDate: string;
  etd: string;
  destination: string;
  via: string;
  status: string;
}

const raw = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "./src/parsed-shipments.json"), "utf-8"),
) as RawShipment[];

const today = new Date("2026-05-18T00:00:00Z");

const SUPPLIERS_BY_CATEGORY: Record<string, { name: string; country: string }[]> = {
  "Chrome Retail Hanger":    [{ name: "Tianjin Wire Works",       country: "CN" }, { name: "Guangzhou Metalworks", country: "CN" }],
  "Powder-Coat Hanger":      [{ name: "Foshan Precision Parts",   country: "CN" }, { name: "Guangzhou Metalworks", country: "CN" }],
  "LED Track Light":         [{ name: "Shenzhen LEDPro",          country: "CN" }, { name: "Dongguan BrightTech",  country: "CN" }],
  "LED Display Cabinet":     [{ name: "Shenzhen LEDPro",          country: "CN" }, { name: "Foshan LightMaster",   country: "CN" }],
  "Engineered Oak Flooring": [{ name: "Hangzhou Timber Co.",      country: "CN" }, { name: "Ningbo Hardwood Mill", country: "CN" }],
  "Cardboard Mailer":        [{ name: "Qingdao Packaging Group",  country: "CN" }],
};

const CUSTOMERS_BY_CATEGORY: Record<string, string[]> = {
  "Chrome Retail Hanger":    ["Marlowe & Sons", "Vellum Studio"],
  "Powder-Coat Hanger":      ["Marlowe & Sons", "Northbound Outfitters"],
  "LED Track Light":         ["Pioneer Goods Co.", "Atelier Nord"],
  "LED Display Cabinet":     ["Northbound Outfitters", "Vellum Studio"],
  "Engineered Oak Flooring": ["Pioneer Goods Co.", "Cedar Hollow Homes"],
  "Cardboard Mailer":        ["Vellum Studio", "Cedar Hollow Homes"],
};

const PRODUCT_VARIANTS: Record<string, string[]> = {
  "Chrome Retail Hanger":    ["Heavy Duty Top", "Slim Profile Bottom", "Velvet Grip", "Notched Shoulder"],
  "Powder-Coat Hanger":      ["Matte Black Top", "Charcoal Bottom", "Bronze Petite", "Ivory Wishbone"],
  "LED Track Light":         ["3000K Spot — 12W", "4000K Wash — 18W", "Tunable White — 24W"],
  "LED Display Cabinet":     ["Warm White Strip — 1.2m", "Cool White Bar — 900mm", "RGB Edge — 1.8m", "Tunable Halo — 600mm"],
  "Engineered Oak Flooring": ["Herringbone — Natural", "Plank — Smoked", "Chevron — Whitewash", "Plank — Coffee"],
  "Cardboard Mailer":        ["Recycled Kraft 9x12", "Tear-Strip 12x15"],
};

// All 11 stages — distribute shipments across them
const STAGES = [
  "spec", "quotes", "sample_ord", "sample_apr", "po_issued",
  "production", "qc", "ex_factory", "in_transit", "payment", "delivered",
];

// Curated picks: spread across categories and provide stage variety
function pickShipments(): RawShipment[] {
  const picks: RawShipment[] = [];
  const counts: Record<string, number> = {
    "Chrome Retail Hanger": 5,
    "Powder-Coat Hanger": 4,
    "LED Track Light": 3,
    "LED Display Cabinet": 6,
    "Engineered Oak Flooring": 4,
    "Cardboard Mailer": 2,
  };
  for (const [cat, n] of Object.entries(counts)) {
    const pool = raw.filter(r => r.category === cat && r.poNumber);
    // Evenly pick from the pool
    const step = Math.max(1, Math.floor(pool.length / n));
    for (let i = 0; i < n && i * step < pool.length; i++) {
      picks.push(pool[i * step]);
    }
  }
  return picks;
}

const picks = pickShipments();

// ─── Date shifting ─────────────────────────────────────────────────────────
// Distribute shipments along the stage timeline so the "delivered" shipments
// finished a while ago and the "spec" shipments are just starting.
// Stage 0 (spec) → ex-factory far in the future; Stage 10 (delivered) → past.
// Stage 5 (production) and stage 7 (ex-factory) cluster around today.

function targetExFactory(stageIdx: number): Date {
  // Stage 0 → +60d; stage 5 → +15d; stage 7 → -2d; stage 10 → -45d
  const offsetDays = Math.round(60 - (stageIdx / 10) * 105);
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

interface SeedShipment {
  id: string;
  poNumber: string;
  product: string;
  category: string;
  supplierName: string;
  supplierCountry: string;
  customerName: string;
  status: "on-track" | "at-risk" | "delayed";
  currentStageId: string;
  dueDate: string;       // ISO date
  exFactoryDate: string; // ISO date
  destination: string;
  via: string;
  payments: { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; sortOrder: number }[];
  quotes?: { factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean }[];
}

const seeded: SeedShipment[] = [];

picks.forEach((r, idx) => {
  // Assign a stage cyclically to ensure spread
  const stageIdx = idx % STAGES.length;
  const stageId = STAGES[stageIdx];

  const newExFactory = targetExFactory(stageIdx);
  // Skew randomly +/- 5 days
  newExFactory.setUTCDate(newExFactory.getUTCDate() + ((idx * 7) % 11) - 5);

  // Status: delivered/in_transit/payment → on-track usually; production → mix; ex_factory/qc → at-risk sometimes; spec/quotes → on-track
  let status: SeedShipment["status"] = "on-track";
  // Distribute risk: roughly 60% on-track, 25% at-risk, 15% delayed for active stages
  if (stageIdx >= 3 && stageIdx <= 9) {
    const r = (idx * 13) % 20;
    if (r < 3) status = "delayed";
    else if (r < 8) status = "at-risk";
  }

  const suppliers = SUPPLIERS_BY_CATEGORY[r.category];
  const supplier = suppliers[idx % suppliers.length];
  const customers = CUSTOMERS_BY_CATEGORY[r.category];
  const customer = customers[idx % customers.length];
  const variants = PRODUCT_VARIANTS[r.category];
  const variant = variants[idx % variants.length];
  const product = `${r.category} — ${variant}`;

  // Unit economics: pick a believable unit price per category
  const unitPrice = ({
    "Chrome Retail Hanger":    0.95 + (idx % 4) * 0.08,
    "Powder-Coat Hanger":      1.20 + (idx % 4) * 0.10,
    "LED Track Light":        12.50 + (idx % 4) * 1.40,
    "LED Display Cabinet":     4.20 + (idx % 4) * 0.55,
    "Engineered Oak Flooring": 38.00 + (idx % 4) * 4.50,
    "Cardboard Mailer":        0.42 + (idx % 4) * 0.05,
  } as Record<string, number>)[r.category];

  const qty = ({
    "Chrome Retail Hanger":    8_000  + (idx % 5) * 2_000,
    "Powder-Coat Hanger":      6_000  + (idx % 5) * 1_500,
    "LED Track Light":         400    + (idx % 4) * 100,
    "LED Display Cabinet":     1_200  + (idx % 4) * 300,
    "Engineered Oak Flooring": 800    + (idx % 4) * 200,
    "Cardboard Mailer":        20_000 + (idx % 4) * 5_000,
  } as Record<string, number>)[r.category];

  const totalUsd = Math.round(unitPrice * qty);
  const depositAmt = Math.round(totalUsd * 0.30);
  const balanceAmt = totalUsd - depositAmt;

  // Deposit due ~45 days before ex-factory; balance due ~3 days before ex-factory
  const depositDue = new Date(newExFactory); depositDue.setUTCDate(depositDue.getUTCDate() - 45);
  const balanceDue = new Date(newExFactory); balanceDue.setUTCDate(balanceDue.getUTCDate() - 3);

  // Payment paid status based on stage:
  // spec/quotes/sample_ord/sample_apr → both unpaid; po_issued+ → deposit paid; in_transit+ → both paid; delivered → both paid
  const depositPaid = stageIdx >= 4;
  const balancePaid = stageIdx >= 8 && status !== "delayed";

  const payments: SeedShipment["payments"] = [
    { label: "Deposit (30%)", percent: 30, amountUsd: depositAmt, paid: depositPaid, dueDate: depositDue.toISOString().slice(0, 10), sortOrder: 0 },
    { label: "Balance (70%)", percent: 70, amountUsd: balanceAmt, paid: balancePaid, dueDate: balanceDue.toISOString().slice(0, 10), sortOrder: 1 },
  ];

  // Quotes only for shipments in "quotes" stage
  let quotes: SeedShipment["quotes"];
  if (stageId === "quotes") {
    const allFactories = suppliers.concat([
      { name: "Ningbo Alloy Co.", country: "CN" },
      { name: "Foshan Grid Factory", country: "CN" },
    ]);
    quotes = allFactories.slice(0, 3).map((f, i) => ({
      factory: f.name,
      country: f.country,
      unitPrice: Math.round((unitPrice * (1 + (i - 1) * 0.05)) * 100) / 100,
      leadDays: 28 + i * 4,
      moq: [500, 1000, 2000][i],
      selected: i === 0,
    }));
  }

  seeded.push({
    id: `s${idx + 1}`,
    poNumber: `PO-${idx + 1001}-${r.poNumber.replace(/^PO-/, "").slice(0, 12)}`,
    product,
    category: r.category,
    supplierName: supplier.name,
    supplierCountry: supplier.country,
    customerName: customer,
    status,
    currentStageId: stageId,
    dueDate: newExFactory.toISOString().slice(0, 10),
    exFactoryDate: newExFactory.toISOString().slice(0, 10),
    destination: r.destination || "Los Angeles",
    via: r.via || "OCEAN",
    payments,
    quotes,
  });
});

// ─── Threads / messages / tasks ────────────────────────────────────────────
// Generate plausible inbox items for the more "active" shipments.

interface SeedMessage {
  id: string;
  shipmentId: string;
  supplierName: string;
  sender: string;
  channel: "gmail" | "whatsapp" | "sheets" | "pdf";
  timestamp: string; // human-readable; will get re-formatted client-side
  receivedAt: string; // ISO
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
  urgency: "high" | "medium" | "low";
  action: string;
  done: boolean;
}

const messages: SeedMessage[] = [];
const tasks: SeedTask[] = [];

let mIdx = 1, tIdx = 1;
function relTime(daysAgo: number): { ts: string; iso: string; age: string } {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  let ts = "";
  let age = "";
  if (daysAgo === 0) { ts = `${10 + (mIdx % 4)}:${(15 + mIdx * 7) % 60} AM`; age = `${(mIdx * 37) % 6 + 1}h ago`; }
  else if (daysAgo === 1) { ts = "Yesterday"; age = "Yesterday"; }
  else if (daysAgo < 7) { ts = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][daysAgo % 7]; age = `${daysAgo}d ago`; }
  else { ts = `${daysAgo}d ago`; age = `${daysAgo}d ago`; }
  return { ts, iso: d.toISOString(), age };
}

const templates: { stages: string[]; channel: SeedMessage["channel"]; build: (s: SeedShipment) => Partial<SeedMessage> & { taskTitle: string; taskAction: string; urgency: SeedTask["urgency"] } }[] = [
  {
    stages: ["quotes"],
    channel: "sheets",
    build: (s) => ({
      sender: `Cost Sheet — ${s.poNumber}`,
      snippet: `Quote comparison updated. ${s.quotes?.[0].factory} leads at $${s.quotes?.[0].unitPrice}/unit. Margin: 34.2%`,
      fullBody: `Automated update from Google Sheets — Costing Tracker:\n\nQuote comparison for ${s.product}:\n` +
        (s.quotes?.map(q => `  • ${q.factory}: $${q.unitPrice}/unit, ${q.leadDays}d lead, MOQ ${q.moq}`).join("\n") ?? "") +
        `\n\nRecommended selection: ${s.quotes?.[0].factory}`,
      aiTags: ["update: quote ready", "margin: 34.2%"],
      aiDraft: "Confirming selection of the recommended factory. Please issue PI for deposit.",
      aiAction: "Select factory quote and issue deposit invoice",
      taskTitle: `Select factory quote — ${s.poNumber} (${s.category})`,
      taskAction: "Review Quotes",
      urgency: "medium",
    }),
  },
  {
    stages: ["sample_apr"],
    channel: "whatsapp",
    build: (s) => ({
      sender: s.supplierName,
      snippet: "Strike-off finish coat needs +2 days, polishing line backed up. Please advise.",
      fullBody: `Hi team, quick update on ${s.poNumber}. The sample approval finish coat needs +2 days — our polishing line is backed up. Please advise if we can proceed. If we push this, Ex-Factory moves by 2 days.`,
      aiTags: ["risk: delay 2d", "milestone: sample approval"],
      aiDraft: `Understood — please proceed with the delay. We'll update ${s.poNumber} ex-factory accordingly. Please confirm revised schedule in writing.`,
      aiAction: `Approve delay and update ${s.poNumber} timeline`,
      taskTitle: `Approve 2-day delay — ${s.supplierName} (${s.poNumber})`,
      taskAction: "Reply & Update",
      urgency: "high",
    }),
  },
  {
    stages: ["production"],
    channel: "gmail",
    build: (s) => ({
      sender: s.supplierName,
      snippet: "Production update: assembly 60% complete, on track for ex-factory.",
      fullBody: `Hello,\n\nProduction update on ${s.poNumber}. Assembly is now 60% complete and we remain on track for the ex-factory window.\n\nBalance payment of $${s.payments[1].amountUsd.toLocaleString()} will be due before release.\n\nBest regards,\nFactory Team`,
      aiTags: ["milestone: production", "payment: balance due"],
      aiDraft: "Thanks for the update. Please send final QC photos before ex-factory release.",
      aiAction: "Acknowledge update and schedule QC inspection",
      taskTitle: `Schedule QC inspection — ${s.supplierName} (${s.poNumber})`,
      taskAction: "Book Inspection",
      urgency: "medium",
    }),
  },
  {
    stages: ["qc"],
    channel: "pdf",
    build: (s) => ({
      sender: s.supplierName,
      snippet: `QC inspection passed — AQL 2.5. SGS report attached. Balance payment $${s.payments[1].amountUsd.toLocaleString()} required.`,
      fullBody: `Please find attached the SGS inspection report.\n\nQC result: PASSED\nAQL 2.5 standard · 2 minor defects · 0 major\n\nBalance payment of $${s.payments[1].amountUsd.toLocaleString()} required before container release.`,
      aiTags: ["milestone: QC passed", "payment: balance due"],
      aiDraft: `Thank you — SGS report received and QC pass confirmed. We will arrange the balance wire shortly.`,
      aiAction: `Confirm QC pass and schedule balance payment`,
      taskTitle: `Arrange balance wire $${s.payments[1].amountUsd.toLocaleString()} — ${s.supplierName} (${s.poNumber})`,
      taskAction: "Initiate Wire",
      urgency: "medium",
    }),
  },
  {
    stages: ["ex_factory"],
    channel: "whatsapp",
    build: (s) => ({
      sender: s.supplierName,
      snippet: "Port congestion — export delay 4 days. Revised ex-factory shifting.",
      fullBody: `Heads up — major port congestion at our terminal. Our freight forwarder has revised our export slot by 4 days. Please advise buyer and update the tracker.`,
      aiTags: ["risk: port congestion", "delay: 4d"],
      aiDraft: "Understood on the congestion. Please send revised packing schedule. We'll notify the buyer.",
      aiAction: `Approve 4-day delay and notify buyer`,
      taskTitle: `Port congestion reply needed — ${s.supplierName} (${s.poNumber})`,
      taskAction: "Reply",
      urgency: "high",
    }),
  },
];

seeded.forEach((s, sIdx) => {
  const matches = templates.filter(t => t.stages.includes(s.currentStageId));
  if (matches.length === 0) return;
  // Only generate messages for some shipments to keep inbox lively but not noisy
  if (sIdx % 2 !== 0 && s.currentStageId !== "sample_apr" && s.currentStageId !== "ex_factory") return;
  const t = matches[0];
  const daysAgo = sIdx % 4;
  const tt = relTime(daysAgo);
  const partial = t.build(s);
  const msgId = `m${mIdx++}`;
  messages.push({
    id: msgId,
    shipmentId: s.id,
    supplierName: s.supplierName,
    sender: partial.sender!,
    channel: t.channel,
    timestamp: tt.ts,
    receivedAt: tt.iso,
    snippet: partial.snippet!,
    fullBody: partial.fullBody!,
    unread: daysAgo === 0,
    aiTags: partial.aiTags ?? [],
    aiDraft: partial.aiDraft ?? "",
    aiAction: partial.aiAction ?? "",
  });
  tasks.push({
    id: `t${tIdx++}`,
    shipmentId: s.id,
    messageId: msgId,
    title: partial.taskTitle,
    source: `${t.channel === "sheets" ? "Costing Sheet" : t.channel === "pdf" ? "PDF · SGS" : t.channel === "gmail" ? "Gmail" : "WhatsApp"} · ${s.supplierName}`,
    sourceAge: tt.age,
    urgency: partial.urgency,
    action: partial.taskAction,
    done: false,
  });
});

// Add a couple of payment-related tasks for overdue balances
seeded.forEach((s) => {
  const balance = s.payments[1];
  if (!balance.paid && new Date(balance.dueDate) < today) {
    tasks.push({
      id: `t${tIdx++}`,
      shipmentId: s.id,
      messageId: null,
      title: `Balance payment overdue — ${s.poNumber} ($${balance.amountUsd.toLocaleString()}) was due ${balance.dueDate}`,
      source: "Payment tracker",
      sourceAge: "Today",
      urgency: "high",
      action: "Send Payment",
      done: false,
    });
  }
});

const out = {
  generatedAt: new Date().toISOString(),
  pretendToday: today.toISOString(),
  stages: [
    { id: "spec",       label: "Spec Sheet",        sortOrder:  0 },
    { id: "quotes",     label: "Factory Quotes",    sortOrder:  1 },
    { id: "sample_ord", label: "Sample Order",      sortOrder:  2 },
    { id: "sample_apr", label: "Sample Approval",   sortOrder:  3 },
    { id: "po_issued",  label: "PO Issued",         sortOrder:  4 },
    { id: "production", label: "Production",        sortOrder:  5 },
    { id: "qc",         label: "QC Inspection",     sortOrder:  6 },
    { id: "ex_factory", label: "Ex-Factory",        sortOrder:  7 },
    { id: "in_transit", label: "In Transit",        sortOrder:  8 },
    { id: "payment",    label: "Payment Clearance", sortOrder:  9 },
    { id: "delivered",  label: "Delivered",         sortOrder: 10 },
  ],
  shipments: seeded,
  messages,
  tasks,
};

const outPath = path.resolve(process.cwd(), "./src/seed-data.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`  ${out.shipments.length} shipments, ${out.messages.length} messages, ${out.tasks.length} tasks`);
console.log(`  Stage distribution:`, out.shipments.reduce<Record<string, number>>((acc, s) => { acc[s.currentStageId] = (acc[s.currentStageId] ?? 0) + 1; return acc; }, {}));
console.log(`  Status distribution:`, out.shipments.reduce<Record<string, number>>((acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; }, {}));
