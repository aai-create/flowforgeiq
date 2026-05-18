import { useState, useRef } from "react";
import { FileText, Link2, Sparkles, X, ChevronLeft, ChevronRight, ZoomIn, MapPin } from "lucide-react";

const FIELDS = [
  { key: "documentType",  label: "Document Type",  value: "purchase_order",        confidence: 99, inferred: false,
    page: 1, pageTotal: 1,
    excerpt: "PURCHASE ORDER\nPO-1001-778143\nMarlowe & Sons",
    highlightWord: "PURCHASE ORDER",
    region: { label: "Header — top-left", section: "Title block" },
  },
  { key: "poNumber",      label: "PO Number",       value: "PO-1001-778143",        confidence: 98, inferred: false,
    page: 1, pageTotal: 1,
    excerpt: "PURCHASE ORDER\nPO-1001-778143",
    highlightWord: "PO-1001-778143",
    region: { label: "Header — line 2", section: "Title block" },
  },
  { key: "invoiceNumber", label: "Invoice Number",  value: null,  confidence: null, inferred: false, page: null, pageTotal: null, excerpt: null, highlightWord: null, region: null },
  { key: "invoiceDate",   label: "Invoice Date",    value: null,  confidence: null, inferred: false, page: null, pageTotal: null, excerpt: null, highlightWord: null, region: null },
  { key: "supplier",      label: "Supplier",        value: "Tianjin Wire Works",    confidence: 50, inferred: true,
    page: 1, pageTotal: 1,
    excerpt: "Bill To / Supplier\nTianjin Wire Works Co., Ltd.\nNo. 88 Industrial Blvd, Tianjin",
    highlightWord: "Tianjin Wire Works",
    region: { label: "Supplier block — line 1", section: "Bill To" },
  },
  { key: "buyer",         label: "Buyer",           value: "Marlowe & Sons",        confidence: 50, inferred: true,
    page: 1, pageTotal: 1,
    excerpt: "Marlowe & Sons\n114 Crescent Way\nLondon, United Kingdom",
    highlightWord: "Marlowe & Sons",
    region: { label: "Header — top-right", section: "From / Buyer" },
  },
  { key: "totalAmount",   label: "Total Amount",    value: "$46,234.00",            confidence: 88, inferred: false,
    page: 1, pageTotal: 1,
    excerpt: "Total (USD)          $46,234.00",
    highlightWord: "$46,234.00",
    region: { label: "Table footer — Total row", section: "Line Items" },
  },
  { key: "currency",      label: "Currency",        value: "USD",                   confidence: 40, inferred: true,
    page: 1, pageTotal: 1,
    excerpt: "Currency: USD · Authorised by: J. Marlowe",
    highlightWord: "USD",
    region: { label: "Footer — metadata", section: "Document footer" },
  },
  { key: "paymentTerms",  label: "Payment Terms",   value: "30/70",                 confidence: 40, inferred: true,
    page: 1, pageTotal: 1,
    excerpt: "Payment Terms    30/70\nIncoterms          FOB Tianjin",
    highlightWord: "30/70",
    region: { label: "Details grid — row 1", section: "Shipping & Terms" },
  },
  { key: "incoterms",     label: "Incoterms",       value: "FOB Tianjin",           confidence: 45, inferred: true,
    page: 1, pageTotal: 1,
    excerpt: "Incoterms    FOB Tianjin\nPort of Loading  Tianjin",
    highlightWord: "FOB Tianjin",
    region: { label: "Details grid — row 2", section: "Shipping & Terms" },
  },
  { key: "etd",           label: "ETD",             value: null,  confidence: null, inferred: false, page: null, pageTotal: null, excerpt: null, highlightWord: null, region: null },
  { key: "eta",           label: "ETA",             value: null,  confidence: null, inferred: false, page: null, pageTotal: null, excerpt: null, highlightWord: null, region: null },
  { key: "portLoading",   label: "Port of Loading", value: "Tianjin",               confidence: 50, inferred: true,
    page: 1, pageTotal: 1,
    excerpt: "Port of Loading  Tianjin\nPort of Discharge  Felixstowe",
    highlightWord: "Tianjin",
    region: { label: "Details grid — row 3", section: "Shipping & Terms" },
  },
];

function confColor(c: number | null) {
  if (c === null) return "";
  if (c >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  if (c >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function HighlightLine({ text, word }: { text: string; word: string }) {
  const idx = text.indexOf(word);
  if (idx < 0) return <span className="font-mono text-sm text-gray-800">{text}</span>;
  return (
    <span className="font-mono text-sm text-gray-800">
      {text.slice(0, idx)}
      <mark className="bg-amber-300 text-amber-900 rounded-sm px-0.5 font-bold not-italic">{word}</mark>
      {text.slice(idx + word.length)}
    </span>
  );
}

function Popover({ field, onClose }: { field: typeof FIELDS[0]; onClose: () => void }) {
  if (!field.excerpt || !field.highlightWord || !field.region) return null;
  const lines = field.excerpt.split("\n");

  return (
    <div
      className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-[#E5EAF0] overflow-hidden"
      style={{ width: 380, top: "50%", right: "calc(100% + 12px)", transform: "translateY(-50%)" }}
    >
      {/* Popover header */}
      <div className="bg-[#212833] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#9E9FAE]" />
          <div>
            <p className="text-xs font-semibold text-white">PO-1001-778143.pdf</p>
            <p className="text-[10px] text-[#9E9FAE]">Page {field.page} of {field.pageTotal} · {field.region.section}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5 text-[#9E9FAE]" />
        </button>
      </div>

      {/* Simulated PDF page thumbnail with location indicator */}
      <div className="bg-[#E8EAED] px-5 py-4">
        {/* Page indicator strip */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-semibold text-[#5E687B]">{field.region.label}</span>
        </div>

        {/* Micro page view */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 relative">
          {/* Above context — filler lines */}
          <div className="space-y-1 mb-2">
            <div className="h-1.5 bg-gray-100 rounded w-full" />
            <div className="h-1.5 bg-gray-100 rounded w-4/5" />
          </div>

          {/* Text excerpt with highlight */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-2">
            <div className="flex items-start gap-2">
              <div className="w-0.5 self-stretch bg-amber-400 rounded shrink-0" />
              <div className="space-y-1.5 min-w-0">
                {lines.map((line, i) => (
                  <div key={i} className={`leading-snug ${i === 0 ? "" : "text-gray-500 text-xs"}`}>
                    {i === 0
                      ? <HighlightLine text={line} word={field.highlightWord!} />
                      : <span className="font-mono text-xs text-gray-500">{line}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Below context — filler lines */}
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-100 rounded w-5/6" />
            <div className="h-1.5 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      </div>

      {/* Field info footer */}
      <div className="border-t border-[#F0F4F8] px-4 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#9E9FAE] font-medium uppercase tracking-wide">{field.label}</p>
          <p className={`text-sm font-bold mt-0.5 ${field.inferred ? "text-amber-700" : "text-[#212833]"}`}>{field.value}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-[#F0F4F8] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-[#9E9FAE]" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-[#F0F4F8] transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-[#9E9FAE]" />
          </button>
          <button className="flex items-center gap-1 text-[10px] font-semibold text-[#9000FF] bg-[#9000FF]/8 border border-[#9000FF]/20 px-2.5 py-1 rounded-full ml-1">
            <ZoomIn className="w-3 h-3" />
            Open in PDF
          </button>
        </div>
      </div>

      {/* Triangle pointer */}
      <div
        className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0"
        style={{ borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "8px solid white" }}
      />
    </div>
  );
}

export function HoverPopover() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeField = FIELDS.find(f => f.key === activeKey) ?? null;

  return (
    <div className="h-screen bg-[#FAFBFC] flex flex-col overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      {/* Doc header */}
      <div className="bg-white border-b border-[#E5EAF0] px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-red-500" />
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

      {/* Field section label */}
      <div className="bg-white border-b border-[#E5EAF0] px-5 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">
          <Sparkles className="w-3 h-3" />EXTRACTED FIELDS
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9E9FAE]">Click a field to see its PDF location</span>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">62% confidence</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {FIELDS.map(field => {
          const isActive = activeKey === field.key;
          const hasLocation = !!field.excerpt;

          return (
            <div key={field.key} className={`border-b border-[#F0F4F8] relative transition-colors ${isActive ? "bg-[#F8F4FF] z-10" : "bg-white z-0"}`}>
              <button
                onClick={() => hasLocation ? setActiveKey(isActive ? null : field.key) : undefined}
                className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors ${hasLocation ? "cursor-pointer" : "cursor-default"} ${isActive ? "border-l-2 border-[#9000FF]" : ""}`}
              >
                {/* Label */}
                <p className="text-[11px] text-[#5E687B] font-medium w-36 shrink-0 pt-0.5">{field.label}</p>

                {/* Value */}
                <div className="flex-1 min-w-0">
                  {field.value ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-semibold ${field.inferred ? "text-amber-700" : "text-[#212833]"}`}>{field.value}</p>
                      {field.inferred && <span className="text-[9px] font-medium bg-amber-100 text-amber-700 px-1 py-0.5 rounded">inferred</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-[#C0C8D4]">—</p>
                  )}
                  {/* Reasoning always visible */}
                  {isActive && field.region && (
                    <p className="text-[10px] text-[#9E9FAE] mt-0.5 italic">
                      Found in: <span className="font-medium not-italic text-[#5E687B]">{field.region.section} → {field.region.label}</span>
                    </p>
                  )}
                </div>

                {/* Right indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {field.confidence !== null && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${confColor(field.confidence)}`}>{field.confidence}%</span>
                  )}
                  {hasLocation && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isActive ? "bg-[#9000FF] text-white" : "bg-[#F0F4F8] text-[#9E9FAE] hover:bg-[#9000FF]/10 hover:text-[#9000FF]"}`}>
                      <FileText className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              </button>

              {/* Floating popover attached to active row */}
              {isActive && activeField && (
                <Popover field={activeField} onClose={() => setActiveKey(null)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
