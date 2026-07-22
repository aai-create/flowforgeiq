import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedShipment {
  category: string;
  poNumber: string;
  exFactoryDate: string;
  destination: string;
  via: string;
}

interface SeedDeal {
  buyerTotalUsd: number;
  buyerUnitPrice: number;
  buyerQuantity: number;
  shipmentIds: string[];
}

interface SeedShipment {
  id: string;
  supplierName: string;
}

interface SeedData {
  shipments: SeedShipment[];
  deals: SeedDeal[];
}

// ─── Load both data sources ───────────────────────────────────────────────────
// parsed-shipments.json: authentic F21 PO numbers, categories, via, destination
const parsedRaw = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "./src/parsed-shipments.json"), "utf-8"),
) as ParsedShipment[];

// seed-data.json: deals with buyerTotalUsd/buyerUnitPrice/buyerQuantity
const seedData = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "./src/seed-data.json"), "utf-8"),
) as SeedData;

// Deduplicate PO numbers from parsed-shipments.json
const seenPo = new Set<string>();
const parsed = parsedRaw.filter(r => {
  if (!r.poNumber || seenPo.has(r.poNumber)) return false;
  seenPo.add(r.poNumber);
  return true;
});

// Build category pools
const pools: Record<string, ParsedShipment[]> = {};
for (const r of parsed) {
  if (!pools[r.category]) pools[r.category] = [];
  pools[r.category].push(r);
}

// Buyer totals pool from seed-data.json deals (keyed by index for rotation)
const dealPool = seedData.deals;

// ─── 9 Suppliers — F21-style full Chinese company names ──────────────────────
const SUPPLIERS = [
  { name: "Tianjin Zhongcheng Hanger Co., Ltd.",        country: "CN", contactName: "Wang Jianming",  contactEmail: "j.wang@zhongchenghanger.com",   whatsApp: "+8613912345678", paymentTerms: "30% deposit, 70% balance",         category: "Chrome Retail Hanger" },
  { name: "Guangzhou Yihang Metal Products Co., Ltd.",   country: "CN", contactName: "Chen Lirong",    contactEmail: "l.chen@yihangmetal.com",         whatsApp: "+8613923456789", paymentTerms: "30% deposit, 70% balance",         category: "Chrome Retail Hanger" },
  { name: "Foshan Jingda Precision Metalware Co., Ltd.", country: "CN", contactName: "Liu Wei",        contactEmail: "w.liu@jingdametalware.com",      whatsApp: "+8613934567890", paymentTerms: "30% deposit, 70% balance",         category: "Powder-Coat Hanger" },
  { name: "Dongguan Huisheng Electronics Co., Ltd.",     country: "CN", contactName: "Zhang Mingfei",  contactEmail: "m.zhang@huishengelectronics.com", whatsApp: "+8613945678901", paymentTerms: "30% TT advance, 70% against BL", category: "LED Track Light" },
  { name: "Shenzhen Qiangli Optoelectronics Co., Ltd.",  country: "CN", contactName: "Huang Jiahao",   contactEmail: "j.huang@qianglioptronics.com",   whatsApp: "+8613956789012", paymentTerms: "30% TT advance, 70% against BL", category: "LED Track Light" },
  { name: "Foshan Guohua Lighting Co., Ltd.",            country: "CN", contactName: "Xu Yanbo",       contactEmail: "y.xu@guohua-lighting.com",       whatsApp: "+8613967890123", paymentTerms: "40% deposit, 60% balance",         category: "LED Display Cabinet" },
  { name: "Hangzhou Desheng Timber Co., Ltd.",           country: "CN", contactName: "Li Guoqiang",    contactEmail: "g.li@deshengtimber.com",         whatsApp: "+8613978901234", paymentTerms: "30% deposit, 70% balance",         category: "Engineered Oak Flooring" },
  { name: "Ningbo Oasis Wood Products Co., Ltd.",        country: "CN", contactName: "Zhou Haiyan",    contactEmail: "h.zhou@oasiswoodproducts.com",   whatsApp: "+8613989012345", paymentTerms: "30% deposit, 70% balance",         category: "Engineered Oak Flooring" },
  { name: "Qingdao Sunway Packaging Co., Ltd.",          country: "CN", contactName: "Sun Peng",       contactEmail: "p.sun@sunwaypackaging.com",      whatsApp: "+8613990123456", paymentTerms: "50% deposit, 50% before shipment", category: "Cardboard Mailer" },
];

// Category → supplier list (for cycling)
const catToSuppliers: Record<string, string[]> = {
  "Chrome Retail Hanger":    ["Tianjin Zhongcheng Hanger Co., Ltd.", "Guangzhou Yihang Metal Products Co., Ltd."],
  "Powder-Coat Hanger":      ["Foshan Jingda Precision Metalware Co., Ltd.", "Guangzhou Yihang Metal Products Co., Ltd."],
  "LED Track Light":         ["Dongguan Huisheng Electronics Co., Ltd.", "Shenzhen Qiangli Optoelectronics Co., Ltd."],
  "LED Display Cabinet":     ["Foshan Guohua Lighting Co., Ltd.", "Dongguan Huisheng Electronics Co., Ltd."],
  "Engineered Oak Flooring": ["Hangzhou Desheng Timber Co., Ltd.", "Ningbo Oasis Wood Products Co., Ltd."],
  "Cardboard Mailer":        ["Qingdao Sunway Packaging Co., Ltd."],
};

// F21-only buyer rotation (no synthetic names)
const BUYERS = ["F21 OpCo LLC", "Forever 21 LP", "Forever 21 International BV"];

const productVariants: Record<string, string[]> = {
  "Chrome Retail Hanger":    ["Heavy Duty Top", "Slim Profile Bottom", "Velvet Grip", "Notched Shoulder"],
  "Powder-Coat Hanger":      ["Matte Black Top", "Charcoal Bottom", "Bronze Petite", "Ivory Wishbone"],
  "LED Track Light":         ["3000K Spot — 12W", "4000K Wash — 18W", "Tunable White — 24W"],
  "LED Display Cabinet":     ["Warm White Strip — 1.2m", "Cool White Bar — 900mm", "RGB Edge — 1.8m"],
  "Engineered Oak Flooring": ["Herringbone — Natural", "Plank — Smoked", "Chevron — Whitewash"],
  "Cardboard Mailer":        ["Recycled Kraft 9×12", "Tear-Strip 12×15"],
};

// Fallback unit prices / quantities when seed-data deals don't provide enough
const unitPriceMap: Record<string, number[]> = {
  "Chrome Retail Hanger":    [0.95, 1.03, 1.11, 1.19],
  "Powder-Coat Hanger":      [1.20, 1.30, 1.40, 1.50],
  "LED Track Light":         [12.50, 13.90, 15.30],
  "LED Display Cabinet":     [4.20, 4.75, 5.30],
  "Engineered Oak Flooring": [38.00, 42.50, 47.00],
  "Cardboard Mailer":        [0.42, 0.47],
};

const qtyMap: Record<string, number[]> = {
  "Chrome Retail Hanger":    [8000, 10000, 12000, 14000],
  "Powder-Coat Hanger":      [6000, 7500, 9000, 10500],
  "LED Track Light":         [400, 500, 600],
  "LED Display Cabinet":     [1200, 1500, 1800],
  "Engineered Oak Flooring": [800, 1000, 1200],
  "Cardboard Mailer":        [20000, 25000],
};

// Category rotation across stage × row
const CATEGORIES = [
  "Chrome Retail Hanger", "Chrome Retail Hanger", "Chrome Retail Hanger",
  "Powder-Coat Hanger",   "Powder-Coat Hanger",   "Powder-Coat Hanger",
  "LED Track Light",      "LED Track Light",
  "LED Display Cabinet",  "LED Display Cabinet",
  "Engineered Oak Flooring", "Engineered Oak Flooring",
  "Cardboard Mailer",
];

// ─── Stage plan — 40 shipments total with date-shifting relative to 2026-07-20 ─
const STAGE_PLAN: { stageId: string; count: number }[] = [
  { stageId: "delivered",   count: 6 },
  { stageId: "payment",     count: 4 },
  { stageId: "in_transit",  count: 3 },
  { stageId: "ex_factory",  count: 3 },
  { stageId: "qc",          count: 5 },
  { stageId: "production",  count: 5 },
  { stageId: "sample_apr",  count: 3 },
  { stageId: "po_issued",   count: 3 },
  { stageId: "sample_ord",  count: 2 },
  { stageId: "quotes",      count: 3 },
  { stageId: "spec",        count: 3 },
];

const STAGE_RANK = ["spec","quotes","sample_ord","sample_apr","po_issued","production","qc","ex_factory","in_transit","payment","delivered"];
const TODAY = new Date("2026-07-20T00:00:00Z");

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function fmt(d: Date): string { return d.toISOString().slice(0, 10); }

function getExFactoryDate(stageId: string, jitter: number): string {
  const off: Record<string, number> = {
    delivered: -30, payment: -8, in_transit: -15, ex_factory: -5,
    qc: 25, production: 35, sample_apr: 55, po_issued: 65,
    sample_ord: 75, quotes: 90, spec: 105,
  };
  return fmt(addDays(TODAY, (off[stageId] ?? 30) + jitter));
}

function getDueDate(stageId: string, exFactory: string): string {
  const ex = new Date(exFactory);
  const extra: Record<string, number> = {
    delivered: 0, payment: 5, in_transit: 18, ex_factory: 22,
    qc: 28, production: 35, sample_apr: 45, po_issued: 50,
    sample_ord: 55, quotes: 65, spec: 75,
  };
  return fmt(addDays(ex, extra[stageId] ?? 30));
}

// ─── Generate rows ────────────────────────────────────────────────────────────
interface ShipmentRow {
  poNumber: string; buyerPoNumber: string; product: string; category: string;
  supplierName: string; customerName: string; via: string; destination: string;
  exFactoryDate: string; dueDate: string; currentStageId: string;
  buyerTotalUsd: number; buyerUnitPrice: number; buyerQuantity: number; targetSpreadPct: number;
}

interface PaymentRow {
  poNumber: string; label: string; amountUsd: number; percent: number;
  paid: string; dueDate: string; sortOrder: number;
}

const shipmentRows: ShipmentRow[] = [];
const paymentRows: PaymentRow[] = [];
const usedPoNumbers = new Set<string>();

let globalIdx = 0;
let buyerPoSeq = 5000;

for (let stageIdx = 0; stageIdx < STAGE_PLAN.length; stageIdx++) {
  const { stageId, count } = STAGE_PLAN[stageIdx];

  for (let r = 0; r < count; r++) {
    const idx = globalIdx++;
    const category = CATEGORIES[(stageIdx * 3 + r) % CATEGORIES.length];
    const pool = pools[category] ?? [];

    // Pick an authentic F21 PO number from parsed-shipments.json (skip already used)
    let raw: ParsedShipment | undefined;
    for (let attempt = 0; attempt < pool.length; attempt++) {
      const candidate = pool[(idx + attempt) % pool.length];
      if (!usedPoNumbers.has(candidate.poNumber)) {
        raw = candidate;
        break;
      }
    }
    const poNumber = raw?.poNumber ?? `T${idx + 1}`;
    usedPoNumbers.add(poNumber);

    const supplierList = catToSuppliers[category] ?? ["Qingdao Sunway Packaging Co., Ltd."];
    const supplierName = supplierList[idx % supplierList.length];
    const variants = productVariants[category] ?? ["Standard"];
    const product = `${category} — ${variants[idx % variants.length]}`;
    const via = raw?.via ?? "OCEAN";
    const destination = raw?.destination ?? "PA";
    const buyerPoNumber = `BPO-${(buyerPoSeq++).toString()}`;
    const customerName = BUYERS[idx % BUYERS.length];

    // Date-shifting relative to TODAY
    const jitter = (idx * 7) % 11 - 5;
    const exFactoryDate = getExFactoryDate(stageId, jitter);
    const dueDate = getDueDate(stageId, exFactoryDate);

    // Buyer financials: prefer seed-data.json deal pool, fall back to computed values
    const deal = dealPool[idx % Math.max(1, dealPool.length)];
    const unitPrices = unitPriceMap[category] ?? [1.0];
    const qtys = qtyMap[category] ?? [1000];
    const unitPrice = unitPrices[idx % unitPrices.length];
    const qty = deal?.buyerQuantity > 0 ? deal.buyerQuantity : qtys[idx % qtys.length];
    const buyerUnitPrice = deal?.buyerUnitPrice > 0
      ? deal.buyerUnitPrice
      : Math.round(unitPrice * (1.18 + (idx % 5) * 0.02) * 100) / 100;
    const buyerTotalUsd = deal?.buyerTotalUsd > 0
      ? deal.buyerTotalUsd
      : Math.round(buyerUnitPrice * qty);
    const supplierTotal = Math.round(unitPrice * (qtys[idx % qtys.length]));
    const targetSpreadPct = buyerTotalUsd > 0 && supplierTotal > 0
      ? Math.round(((buyerTotalUsd - supplierTotal) / buyerTotalUsd) * 100) / 100
      : 0.18;

    shipmentRows.push({
      poNumber, buyerPoNumber, product, category, supplierName, customerName,
      via, destination, exFactoryDate, dueDate, currentStageId: stageId,
      buyerTotalUsd, buyerUnitPrice, buyerQuantity: qty, targetSpreadPct,
    });

    // 2 payments per shipment → 80 total
    const depositAmt = Math.round(supplierTotal * 0.30);
    const balanceAmt = supplierTotal - depositAmt;
    const exDate = new Date(exFactoryDate);
    const stageRank = STAGE_RANK.indexOf(stageId);

    paymentRows.push({
      poNumber, label: "Deposit (30%)", amountUsd: depositAmt, percent: 0.30,
      paid: stageRank >= 4 ? "TRUE" : "FALSE",
      dueDate: fmt(addDays(exDate, -45)), sortOrder: 0,
    });
    paymentRows.push({
      poNumber, label: "Balance (70%)", amountUsd: balanceAmt, percent: 0.70,
      paid: stageRank >= 9 ? "TRUE" : "FALSE",
      dueDate: fmt(addDays(exDate, -3)), sortOrder: 1,
    });
  }
}

// ─── Workbook ─────────────────────────────────────────────────────────────────
const wb = new ExcelJS.Workbook();
wb.creator = "FlowForge";
wb.created = new Date();

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF212833" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Calibri" };
const DESC_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECF0" } };
const DESC_FONT: Partial<ExcelJS.Font> = { italic: true, color: { argb: "FF5E687B" }, size: 9, name: "Calibri" };
const DATA_FONT: Partial<ExcelJS.Font> = { size: 10, name: "Calibri" };

function styleSheet(ws: ExcelJS.Worksheet, headers: string[], descs: string[], widths: number[]) {
  const hRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h; c.font = HEADER_FONT; c.fill = HEADER_FILL;
    c.alignment = { vertical: "middle", horizontal: "left" };
  });
  hRow.height = 18;
  const dRow = ws.getRow(2);
  descs.forEach((d, i) => {
    const c = dRow.getCell(i + 1);
    c.value = d; c.font = DESC_FONT; c.fill = DESC_FILL;
    c.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  dRow.height = 30;
  ws.views = [{ state: "frozen", ySplit: 2, xSplit: 0 }];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

function applyRow(ws: ExcelJS.Worksheet, rowNum: number, vals: unknown[], colCount: number) {
  const row = ws.getRow(rowNum);
  row.values = vals as ExcelJS.CellValue[];
  row.height = 16;
  for (let c = 1; c <= colCount; c++) row.getCell(c).font = DATA_FONT;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
const suppSheet = wb.addWorksheet("Suppliers");
styleSheet(suppSheet,
  ["name","country","contactName","contactEmail","whatsAppNumber","paymentTerms"],
  ["Required. Upsert key within org — must be unique","ISO country code (e.g. CN)","Contact person full name","Contact email address","WhatsApp number with country code (e.g. +8613912345678)","Payment terms"],
  [52,10,22,42,24,36],
);
SUPPLIERS.forEach((s, i) => applyRow(suppSheet, i + 3, [s.name,s.country,s.contactName,s.contactEmail,s.whatsApp,s.paymentTerms], 6));

// ── Shipments ─────────────────────────────────────────────────────────────────
const shipSheet = wb.addWorksheet("Shipments");
styleSheet(shipSheet,
  ["poNumber","buyerPoNumber","product","category","supplierName","customerName","via","destination","exFactoryDate","dueDate","currentStageId","buyerTotalUsd","buyerUnitPrice","buyerQuantity","targetSpreadPct"],
  ["Required. Upsert key — authentic F21 PO number","Optional buyer-side PO","Required. Product description","Category","Required. Must match a name in the Suppliers sheet","Buyer / customer company name","OCEAN/AIR/LCL/COURIER","Port or warehouse (e.g. PA, LA)","YYYY-MM-DD","YYYY-MM-DD","spec/quotes/sample_ord/sample_apr/po_issued/production/qc/ex_factory/in_transit/payment/delivered","Buyer invoice total (USD)","Buyer unit price (USD)","Buyer quantity","Target spread decimal (0.18 = 18%)"],
  [18,14,38,26,52,28,10,18,16,16,18,16,16,16,16],
);
shipmentRows.forEach((s, i) => applyRow(shipSheet, i + 3, [s.poNumber,s.buyerPoNumber,s.product,s.category,s.supplierName,s.customerName,s.via,s.destination,s.exFactoryDate,s.dueDate,s.currentStageId,s.buyerTotalUsd,s.buyerUnitPrice,s.buyerQuantity,s.targetSpreadPct], 15));

// ── Payments ──────────────────────────────────────────────────────────────────
const paySheet = wb.addWorksheet("Payments");
styleSheet(paySheet,
  ["poNumber","label","amountUsd","percent","paid","dueDate","sortOrder"],
  ["Required. Must match a poNumber in Shipments",'Required. e.g. "Deposit (30%)"',"Required. Amount in USD","Decimal (0.30 = 30%)","TRUE or FALSE","YYYY-MM-DD","Integer 0, 1, 2…"],
  [18,22,14,10,10,16,12],
);
paymentRows.forEach((p, i) => applyRow(paySheet, i + 3, [p.poNumber,p.label,p.amountUsd,p.percent,p.paid,p.dueDate,p.sortOrder], 7));

// ── Valid Stage IDs reference ─────────────────────────────────────────────────
const refSheet = wb.addWorksheet("Valid Stage IDs");
refSheet.getColumn(1).width = 20; refSheet.getColumn(2).width = 30;
[
  ["stageId","Label"],
  ["spec","Spec Sheet"],["quotes","Factory Quotes"],["sample_ord","Sample Order"],
  ["sample_apr","Sample Approval"],["po_issued","PO Issued"],["production","Production"],
  ["qc","QC Inspection"],["ex_factory","Ex-Factory"],["in_transit","In Transit"],
  ["payment","Payment Clearance"],["delivered","Delivered"],
].forEach(([id, label], i) => {
  const row = refSheet.getRow(i + 1);
  row.getCell(1).value = id; row.getCell(2).value = label;
  const font = i === 0 ? HEADER_FONT : DATA_FONT;
  row.getCell(1).font = font; row.getCell(2).font = font;
  if (i === 0) { row.getCell(1).fill = HEADER_FILL; row.getCell(2).fill = HEADER_FILL; }
});

// ─── Write ────────────────────────────────────────────────────────────────────
const outPath = path.resolve(process.cwd(), "../attached_assets/flowforge-import-template.xlsx");
await wb.xlsx.writeFile(outPath);
console.log(`Wrote ${outPath}`);
console.log(`  ${SUPPLIERS.length} suppliers`);
console.log(`  ${shipmentRows.length} shipments`);
console.log(`  ${paymentRows.length} payments`);
