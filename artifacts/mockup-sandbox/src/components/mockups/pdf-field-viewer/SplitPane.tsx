import { useState } from "react";
import { ChevronRight, FileText, Link2, Sparkles, AlertCircle, CheckCircle2, ZoomIn, ZoomOut, ChevronLeft, ChevronDown, X } from "lucide-react";

const FIELDS = [
  { key: "documentType",  label: "Document Type",  value: "purchase_order",        confidence: 99, inferred: false, reasoning: 'Filename begins with "PO"', bbox: { x: 42, y: 58, w: 180, h: 20 } },
  { key: "poNumber",      label: "PO Number",       value: "PO-1001-778143",        confidence: 98, inferred: false, reasoning: "PO number taken from filename",        bbox: { x: 42, y: 88, w: 160, h: 18 } },
  { key: "invoiceNumber", label: "Invoice Number",  value: null,                    confidence: null, inferred: false, reasoning: null, bbox: null },
  { key: "invoiceDate",   label: "Invoice Date",    value: null,                    confidence: null, inferred: false, reasoning: null, bbox: null },
  { key: "supplier",      label: "Supplier",        value: "Tianjin Wire Works",    confidence: 50, inferred: true,  reasoning: "Inferred from active shipments list", bbox: { x: 42, y: 148, w: 200, h: 18 } },
  { key: "buyer",         label: "Buyer",           value: "Marlowe & Sons",        confidence: 50, inferred: true,  reasoning: "Inferred from active shipments list", bbox: { x: 42, y: 178, w: 180, h: 18 } },
  { key: "totalAmount",   label: "Total Amount",    value: "$46,234.00",            confidence: 88, inferred: false, reasoning: "Found in document footer",           bbox: { x: 380, y: 420, w: 140, h: 22 } },
  { key: "currency",      label: "Currency",        value: "USD",                   confidence: 40, inferred: true,  reasoning: "Defaulting to USD",                  bbox: { x: 380, y: 448, w: 60,  h: 18 } },
  { key: "paymentTerms",  label: "Payment Terms",   value: "30/70",                 confidence: 40, inferred: true,  reasoning: "Common supplier split inference",    bbox: { x: 42,  y: 320, w: 80,  h: 18 } },
  { key: "incoterms",     label: "Incoterms",       value: "FOB Tianjin",           confidence: 45, inferred: true,  reasoning: "Default for Chinese suppliers",      bbox: { x: 42,  y: 348, w: 120, h: 18 } },
  { key: "etd",           label: "ETD",             value: null,                    confidence: null, inferred: false, reasoning: null, bbox: null },
  { key: "eta",           label: "ETA",             value: null,                    confidence: null, inferred: false, reasoning: null, bbox: null },
  { key: "portLoading",   label: "Port of Loading", value: "Tianjin",               confidence: 50, inferred: true,  reasoning: "Inferred from supplier city",        bbox: { x: 42,  y: 378, w: 90,  h: 18 } },
];

function confColor(c: number | null) {
  if (c === null) return "";
  if (c >= 80) return "bg-emerald-50 text-emerald-700";
  if (c >= 60) return "bg-blue-50 text-blue-700";
  if (c >= 40) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

// Mock PDF page — a simplified purchase order document
function PdfPage({ activeField }: { activeField: typeof FIELDS[0] | null }) {
  const bbox = activeField?.bbox ?? null;
  return (
    <div className="relative bg-white shadow-lg border border-gray-200 mx-auto" style={{ width: 500, minHeight: 660, fontFamily: "Georgia, serif", fontSize: 12 }}>
      {/* PDF content */}
      <div className="p-10 space-y-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xl font-bold text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>PURCHASE ORDER</p>
            <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: "Arial, sans-serif" }}>PO-1001-778143</p>
          </div>
          <div className="text-right text-xs text-gray-500" style={{ fontFamily: "Arial, sans-serif" }}>
            <p className="font-semibold text-gray-700">Marlowe & Sons</p>
            <p>114 Crescent Way, London</p>
            <p>United Kingdom</p>
          </div>
        </div>

        {/* Supplier block */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase text-gray-400 mb-1" style={{ fontFamily: "Arial, sans-serif" }}>Bill To / Supplier</p>
          <p className="font-semibold text-gray-800">Tianjin Wire Works Co., Ltd.</p>
          <p className="text-gray-600">No. 88 Industrial Boulevard</p>
          <p className="text-gray-600">Tianjin, China 300000</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 text-xs" style={{ fontFamily: "Arial, sans-serif" }}>
          <div><span className="text-gray-400">Payment Terms:</span> <span className="text-gray-700">30/70</span></div>
          <div><span className="text-gray-400">Incoterms:</span> <span className="text-gray-700">FOB Tianjin</span></div>
          <div><span className="text-gray-400">Port of Loading:</span> <span className="text-gray-700">Tianjin</span></div>
          <div><span className="text-gray-400">Port of Discharge:</span> <span className="text-gray-700">Felixstowe</span></div>
          <div><span className="text-gray-400">ETD:</span> <span className="text-gray-700">—</span></div>
          <div><span className="text-gray-400">ETA:</span> <span className="text-gray-700">—</span></div>
        </div>

        {/* Line items table */}
        <table className="w-full text-xs border-collapse mb-6" style={{ fontFamily: "Arial, sans-serif" }}>
          <thead>
            <tr className="bg-gray-100 border border-gray-200">
              <th className="text-left px-2 py-1.5 text-gray-600 font-semibold">Description</th>
              <th className="text-right px-2 py-1.5 text-gray-600 font-semibold">Qty</th>
              <th className="text-right px-2 py-1.5 text-gray-600 font-semibold">Unit Price</th>
              <th className="text-right px-2 py-1.5 text-gray-600 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              { desc: "Chrome Retail Hanger — Heavy Duty Top", qty: 3200, unit: 4.80, amt: 15360 },
              { desc: "Chrome Retail Hanger — Velvet Grip",    qty: 4100, unit: 4.20, amt: 17220 },
              { desc: "Chrome Retail Hanger — Slim Tube",      qty: 2200, unit: 6.20, amt: 13640 },
            ].map((row, i) => (
              <tr key={i} className="border border-gray-100">
                <td className="px-2 py-1.5 text-gray-700">{row.desc}</td>
                <td className="px-2 py-1.5 text-right text-gray-700">{row.qty.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right text-gray-700">${row.unit.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right text-gray-700">${row.amt.toLocaleString()}.00</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={3} className="px-2 py-1.5 text-right font-bold text-gray-700">Total (USD)</td>
              <td className="px-2 py-1.5 text-right font-bold text-gray-900">$46,234.00</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-3" style={{ fontFamily: "Arial, sans-serif" }}>
          <p>This purchase order is subject to the terms and conditions agreed between Marlowe & Sons and the supplier.</p>
          <p className="mt-1">Currency: USD &nbsp;·&nbsp; Authorised by: J. Marlowe &nbsp;·&nbsp; Date: 2026-05-18</p>
        </div>
      </div>

      {/* Highlight overlay */}
      {bbox && (
        <div
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            left: bbox.x * (500 / 520),
            top: bbox.y * (660 / 680),
            width: bbox.w * (500 / 520),
            height: bbox.h * (660 / 680),
          }}
        >
          <div className="w-full h-full rounded-sm border-2 border-amber-400 bg-amber-200/40 shadow-sm" />
          <div className="absolute -top-5 left-0 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            {activeField?.label}
          </div>
        </div>
      )}
    </div>
  );
}

export function SplitPane() {
  const [selected, setSelected] = useState<string | null>("poNumber");
  const activeField = FIELDS.find(f => f.key === selected) ?? null;

  return (
    <div className="flex h-screen bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      {/* Left panel — field list */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
        {/* Doc header */}
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-[#212833] text-sm">PO-1001-778143.pdf</p>
              <p className="text-[10px] text-[#9E9FAE]">May 18, 01:58 PM · 4.3 KB</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Extracted</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Medium confidence</span>
          </div>
        </div>

        {/* Shipment link */}
        <div className="px-4 py-2.5 border-b border-[#E5EAF0]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">
              <Link2 className="w-3 h-3" />SHIPMENT LINK
            </div>
            <button className="text-[10px] font-semibold text-[#9000FF]">Change</button>
          </div>
          <div className="bg-[#F8F9FB] rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#212833] text-xs">PO-1001-778143</p>
              <p className="text-[10px] text-[#9E9FAE]">Tianjin Wire Works</p>
            </div>
            <X className="w-3.5 h-3.5 text-[#C0C8D4]" />
          </div>
        </div>

        {/* Extracted fields */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">
            <Sparkles className="w-3 h-3" />EXTRACTED FIELDS
          </div>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">62% confidence</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {FIELDS.map(field => {
            const isSelected = selected === field.key;
            const hasLocation = !!field.bbox;
            return (
              <button
                key={field.key}
                onClick={() => setSelected(isSelected ? null : field.key)}
                className={`w-full text-left px-4 py-2.5 border-b border-[#F0F4F8] transition-colors flex items-start gap-2 ${
                  isSelected ? "bg-amber-50 border-l-2 border-l-amber-400" : hasLocation ? "hover:bg-[#F8F9FB] cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[11px] font-medium ${isSelected ? "text-amber-800" : "text-[#5E687B]"}`}>{field.label}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {hasLocation && (
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded transition-colors ${isSelected ? "bg-amber-300 text-amber-900" : "bg-[#E5EAF0] text-[#9E9FAE]"}`}>
                          PDF ↗
                        </span>
                      )}
                      {field.confidence !== null && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${confColor(field.confidence)}`}>{field.confidence}%</span>
                      )}
                    </div>
                  </div>
                  {field.value ? (
                    <p className={`text-xs font-semibold mt-0.5 ${field.inferred ? "text-amber-700" : "text-[#212833]"}`}>
                      {field.value}
                      {field.inferred && <span className="ml-1 text-[9px] font-medium bg-amber-100 text-amber-700 px-1 py-0.5 rounded">inferred</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-[#C0C8D4] mt-0.5">—</p>
                  )}
                </div>
                {hasLocation && <ChevronRight className={`w-3 h-3 shrink-0 mt-1 transition-transform ${isSelected ? "text-amber-500 rotate-90" : "text-[#D0D8E4]"}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — PDF viewer */}
      <div className="flex-1 flex flex-col bg-[#E8EAED] overflow-hidden">
        {/* PDF toolbar */}
        <div className="bg-white border-b border-[#E5EAF0] px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {activeField?.bbox ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-[#212833]">Showing location of <span className="text-amber-700">{activeField.label}</span></span>
              </>
            ) : (
              <span className="text-xs text-[#9E9FAE]">Select a field to jump to its location in the document</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-[#F0F4F8]"><ZoomOut className="w-3.5 h-3.5 text-[#5E687B]" /></button>
            <span className="text-[11px] text-[#5E687B] w-12 text-center">100%</span>
            <button className="p-1.5 rounded hover:bg-[#F0F4F8]"><ZoomIn className="w-3.5 h-3.5 text-[#5E687B]" /></button>
            <div className="w-px h-4 bg-[#E5EAF0] mx-1" />
            <button className="p-1.5 rounded hover:bg-[#F0F4F8]"><ChevronLeft className="w-3.5 h-3.5 text-[#5E687B]" /></button>
            <span className="text-[11px] text-[#5E687B]">1 / 1</span>
            <button className="p-1.5 rounded hover:bg-[#F0F4F8]"><ChevronRight className="w-3.5 h-3.5 text-[#5E687B]" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          <PdfPage activeField={activeField} />
        </div>

        {/* Bottom hint */}
        {activeField?.reasoning && (
          <div className="shrink-0 bg-white border-t border-[#E5EAF0] px-5 py-2.5 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#9E9FAE] shrink-0" />
            <p className="text-[11px] text-[#5E687B]">{activeField.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
