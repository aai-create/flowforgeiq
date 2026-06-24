import { useState } from "react";
import { FileText, Link2, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";

const FIELDS = [
  { key: "documentType",  label: "Document Type",  value: "purchase_order",        confidence: 99, inferred: false, reasoning: 'Filename begins with "PO" — classify as purchase_order.',  snippet: { text: "PURCHASE ORDER", context: "PO-1001-778143.pdf", highlight: [0, 16] } },
  { key: "poNumber",      label: "PO Number",       value: "PO-1001-778143",        confidence: 98, inferred: false, reasoning: "PO number taken from filename.",                             snippet: { text: "PO-1001-778143", context: "Header · line 2", highlight: [0, 14] } },
  { key: "invoiceNumber", label: "Invoice Number",  value: null,                    confidence: null, inferred: false, reasoning: null, snippet: null },
  { key: "invoiceDate",   label: "Invoice Date",    value: null,                    confidence: null, inferred: false, reasoning: null, snippet: null },
  { key: "supplier",      label: "Supplier",        value: "Tianjin Wire Works",    confidence: 50, inferred: true,  reasoning: "No supplier text in PDF. Inferred from active shipments list mapping PO-1001-778143 → Supplier 'Tianjin Wire Works'.", snippet: { text: "Tianjin Wire Works Co., Ltd.", context: "Bill To / Supplier block · line 1", highlight: [0, 19] } },
  { key: "buyer",         label: "Buyer",           value: "Marlowe & Sons",        confidence: 50, inferred: true,  reasoning: "No buyer text in PDF. Inferred from active shipments list mapping PO-1001-778143 → Customer 'Marlowe & Sons'.", snippet: { text: "Marlowe & Sons", context: "Top-right header · company name", highlight: [0, 14] } },
  { key: "totalAmount",   label: "Total Amount",    value: "$46,234.00",            confidence: 88, inferred: false, reasoning: "Found in document footer total row.",                       snippet: { text: "Total (USD)  $46,234.00", context: "Line items table · footer row", highlight: [13, 23] } },
  { key: "currency",      label: "Currency",        value: "USD",                   confidence: 40, inferred: true,  reasoning: "No currency in document. Defaulting to USD.",                snippet: { text: "Currency: USD · Authorised by: J. Marlowe", context: "Document footer", highlight: [10, 13] } },
  { key: "paymentTerms",  label: "Payment Terms",   value: "30/70",                 confidence: 40, inferred: true,  reasoning: "No payment terms in document. Best inference: common supplier split '30/70'.", snippet: { text: "Payment Terms  30/70", context: "Details grid · row 1", highlight: [15, 20] } },
  { key: "incoterms",     label: "Incoterms",       value: "FOB Tianjin",           confidence: 45, inferred: true,  reasoning: "No incoterms in document. Supplier is Chinese → default 'FOB [city]' → 'FOB Tianjin'.", snippet: { text: "Incoterms  FOB Tianjin", context: "Details grid · row 2", highlight: [11, 22] } },
  { key: "etd",           label: "ETD",             value: null,                    confidence: null, inferred: false, reasoning: null, snippet: null },
  { key: "eta",           label: "ETA",             value: null,                    confidence: null, inferred: false, reasoning: null, snippet: null },
  { key: "portLoading",   label: "Port of Loading", value: "Tianjin",               confidence: 50, inferred: true,  reasoning: "No port info in PDF. Inferred from supplier city (Tianjin).", snippet: { text: "Port of Loading  Tianjin", context: "Details grid · row 3", highlight: [17, 24] } },
];

function confColor(c: number | null) {
  if (c === null) return "";
  if (c >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  if (c >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function HighlightedText({ text, highlight }: { text: string; highlight: [number, number] }) {
  const [start, end] = highlight;
  return (
    <span className="font-mono text-[13px] text-gray-800">
      {text.slice(0, start)}
      <mark className="bg-amber-300 text-amber-900 rounded-sm px-0.5 not-italic font-bold">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </span>
  );
}

// Simulated page excerpt card
function PdfSnippetCard({ snippet, label, inferred }: {
  snippet: NonNullable<typeof FIELDS[0]["snippet"]>;
  label: string;
  inferred: boolean;
}) {
  return (
    <div className="mt-1 mx-3 mb-2 rounded-xl overflow-hidden border border-amber-200 shadow-sm">
      {/* Card header */}
      <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] font-semibold text-amber-800">PDF source · {snippet.context}</span>
        </div>
        {inferred && (
          <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">inferred — not in PDF</span>
        )}
      </div>

      {/* Simulated PDF snippet */}
      <div className="bg-white px-4 py-4">
        {/* Margin rule */}
        <div className="flex gap-3 items-start">
          {/* Left margin lines (decorative) */}
          <div className="w-12 shrink-0 space-y-2 pt-1">
            <div className="h-2 bg-gray-100 rounded" />
            <div className="h-2 bg-gray-100 rounded w-8" />
            <div className="h-2 bg-gray-100 rounded" />
          </div>

          {/* Text block */}
          <div className="flex-1 min-w-0">
            {/* Filler lines above */}
            <div className="space-y-1.5 mb-3">
              <div className="h-2 bg-gray-100 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>

            {/* The highlighted line — the actual extracted text */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3">
              <div className="w-1 h-full rounded self-stretch bg-amber-400 shrink-0" style={{ minHeight: 24 }} />
              <HighlightedText text={snippet.text} highlight={snippet.highlight as [number, number]} />
            </div>

            {/* Filler lines below */}
            <div className="space-y-1.5">
              <div className="h-2 bg-gray-100 rounded w-5/6" />
              <div className="h-2 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-gray-50 border-t border-gray-100 px-3 py-1.5">
        <p className="text-[10px] text-gray-500 italic">"{snippet.context}" — extracted value: <span className="font-semibold not-italic text-gray-700">{snippet.text.slice(...snippet.highlight)}</span></p>
      </div>
    </div>
  );
}

export function InlineSnippet() {
  const [expanded, setExpanded] = useState<string | null>("totalAmount");

  return (
    <div className="h-screen bg-[#FAFBFC] flex flex-col overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      {/* Doc header */}
      <div className="bg-white border-b border-[#E5EAF0] px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-[#212833]">PO-1001-778143.pdf</p>
            <p className="text-[10px] text-[#9E9FAE]">May 18, 01:58 PM · 4.3 KB</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Extracted</span>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Medium confidence</span>
        </div>
      </div>

      {/* Shipment link */}
      <div className="bg-white border-b border-[#E5EAF0] px-5 py-2.5 shrink-0">
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

      {/* Field list */}
      <div className="bg-white border-b border-[#E5EAF0] px-5 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">
          <Sparkles className="w-3 h-3" />EXTRACTED FIELDS
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#9E9FAE]">Click any field with a source to expand its PDF excerpt</span>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">62% confidence</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {FIELDS.map(field => {
          const isOpen = expanded === field.key;
          const hasSnippet = !!field.snippet;
          return (
            <div key={field.key} className={`border-b border-[#F0F4F8] transition-colors ${isOpen ? "bg-amber-50/50" : "bg-white"}`}>
              <button
                onClick={() => hasSnippet ? setExpanded(isOpen ? null : field.key) : undefined}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors ${hasSnippet ? "cursor-pointer hover:bg-amber-50/30" : "cursor-default"} ${isOpen ? "border-l-2 border-amber-400" : ""}`}
              >
                {/* Label */}
                <p className="text-[11px] text-[#5E687B] font-medium w-36 shrink-0">{field.label}</p>

                {/* Value */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {field.value ? (
                    <p className={`text-xs font-semibold ${field.inferred ? "text-amber-700" : "text-[#212833]"} truncate`}>
                      {field.value}
                      {field.inferred && <span className="ml-1.5 text-[9px] font-medium bg-amber-100 text-amber-700 px-1 py-0.5 rounded">inferred</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-[#C0C8D4]">—</p>
                  )}
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {field.confidence !== null && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${confColor(field.confidence)}`}>{field.confidence}%</span>
                  )}
                  {hasSnippet && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-2 py-0.5 transition-colors border ${isOpen ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                      <FileText className="w-3 h-3" />
                      <span>View in PDF</span>
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  )}
                </div>
              </button>

              {/* Expandable snippet */}
              {isOpen && field.snippet && (
                <PdfSnippetCard snippet={field.snippet} label={field.label} inferred={field.inferred} />
              )}

              {/* Reasoning (always visible when open) */}
              {isOpen && field.reasoning && (
                <p className="text-[10px] text-[#9E9FAE] italic px-5 pb-2.5">{field.reasoning}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
