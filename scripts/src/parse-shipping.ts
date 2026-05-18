import XLSX from "@e965/xlsx";
import * as path from "path";
import * as fs from "fs";

const xlsPath = path.resolve(process.cwd(), "../attached_assets/F21_shipping_schedule_2015-2020_1779071420640.xls");
const wb = XLSX.readFile(xlsPath, { cellDates: false });

interface RawShipment {
  category: string;
  poNumber: string;
  poDate: string;
  exFactoryDate: string;
  etd: string;
  destination: string;
  via: string;
  status: string;
}

// Each sheet has same shape: row 2 = Ex-factory, row 3 = ETD, row 4 = PO#, row 5 = VIA, row 6 = Destination
// Row 0 or 1 sometimes has PO date or "Cancelled"/"Complete" status indicator
// Real data starts at varying column index per sheet

const sheetMap: Record<string, string> = {
  "Hangers 2018-2021": "Chrome Retail Hanger",
  "Hangers 2015-2018": "Powder-Coat Hanger",
  "Track light LED": "LED Track Light",
  "LED Light box": "LED Display Cabinet",
  "Flooring": "Engineered Oak Flooring",
  "Ecommerce": "Cardboard Mailer",
};

function parseDateMaybe(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v).trim();
  // Strip "ETA " prefix
  const cleaned = s.replace(/^ETA ?/i, "");
  // mm/dd/yy or mm/dd/yyyy
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return "";
  let [, mo, d, y] = m;
  if (y.length === 2) y = (parseInt(y) < 50 ? "20" : "19") + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const all: RawShipment[] = [];
for (const [name, productHint] of Object.entries(sheetMap)) {
  const sheet = wb.Sheets[name];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (rows.length < 7) continue;
  const ref = sheet["!ref"];
  const range = XLSX.utils.decode_range(ref!);
  // Field rows: identify rows where col B holds label
  let exRow = -1, etdRow = -1, poRow = -1, viaRow = -1, destRow = -1, statusRow = 0;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const label = String((rows[r] as unknown[])[1] ?? "").trim().toLowerCase();
    if (label.startsWith("exfactory") || label.startsWith("ex-factory") || label.startsWith("etd (ex")) exRow = r;
    else if (label === "etd") etdRow = r;
    else if (label === "po#") poRow = r;
    else if (label === "via") viaRow = r;
    else if (label === "destination") destRow = r;
    else if (label === "required eta" || label === "po date") { /* skip */ }
  }
  if (poRow < 0 || exRow < 0) continue;

  for (let c = 2; c <= range.e.c; c++) {
    const po = String((rows[poRow] as unknown[])[c] ?? "").trim();
    const ex = parseDateMaybe((rows[exRow] as unknown[])[c]);
    if (!po || !ex) continue;
    // Strip multi-PO concatenated entries
    const cleanedPo = po.split("/")[0].split(",")[0].trim();
    if (cleanedPo.length < 4 || cleanedPo.length > 24) continue;
    const etd = etdRow >= 0 ? parseDateMaybe((rows[etdRow] as unknown[])[c]) : "";
    const via = viaRow >= 0 ? String((rows[viaRow] as unknown[])[c] ?? "").trim() : "";
    const dest = destRow >= 0 ? String((rows[destRow] as unknown[])[c] ?? "").trim() : "";
    const status = String((rows[statusRow] as unknown[])[c] ?? "").trim();
    all.push({
      category: productHint,
      poNumber: cleanedPo,
      poDate: "",
      exFactoryDate: ex,
      etd,
      destination: dest,
      via: via || "OCEAN",
      status,
    });
  }
}

console.log(`Parsed ${all.length} shipments`);
console.log("Sample first 5:", JSON.stringify(all.slice(0, 5), null, 2));
console.log("Sample last 5:", JSON.stringify(all.slice(-5), null, 2));
console.log("By category:", Object.fromEntries(
  Object.entries(all.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1; return acc;
  }, {}))
));

const outPath = path.resolve(process.cwd(), "./src/parsed-shipments.json");
fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
console.log("Wrote", outPath);
