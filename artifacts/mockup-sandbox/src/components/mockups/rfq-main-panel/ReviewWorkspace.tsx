import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleDot,
  ClipboardList,
  Clock3,
  FileText,
  Factory,
  Filter,
  Layers3,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  UserRound,
  X,
} from "lucide-react";

type RfqStatus = "open" | "accepted";
type QuoteStatus = "received" | "reviewing" | "accepted";

type Quote = {
  id: string;
  supplier: string;
  location: string;
  unitPrice: number;
  leadTime: string;
  moq: number;
  status: QuoteStatus;
  rating: number;
  updated: string;
  note: string;
};

type Rfq = {
  id: string;
  product: string;
  buyer: string;
  status: RfqStatus;
  quotes: number;
  quantity: number;
  target: number;
  deadline: string;
  assignee: string;
  initials: string;
  updated: string;
  category: string;
  description: string;
  specs: string[];
  quoteList: Quote[];
};

const SEEDED_RFQS: Rfq[] = [
  {
    id: "rfq-1048",
    product: "Chrome Retail Hanger — Velvet Grip",
    buyer: "Forever 21",
    status: "open",
    quotes: 0,
    quantity: 2400,
    target: 1.42,
    deadline: "Sep 18, 2025",
    assignee: "Maya Chen",
    initials: "MC",
    updated: "18 min ago",
    category: "Store fixtures",
    description: "Slim retail hanger with a soft-touch velvet grip and polished chrome hook.",
    specs: ["360 mm shoulder width", "Black velvet grip", "Swivel chrome hook"],
    quoteList: [],
  },
  {
    id: "rfq-1052",
    product: "Powder-Coat Hanger — Matte White Slim",
    buyer: "Cedar Hollow Homes",
    status: "open",
    quotes: 2,
    quantity: 1800,
    target: 2.2,
    deadline: "Sep 24, 2025",
    assignee: "Maya Chen",
    initials: "MC",
    updated: "42 min ago",
    category: "Store fixtures",
    description: "Minimalist slimline hanger for Cedar Hollow's new home organization range.",
    specs: ["400 mm shoulder width", "Matte white powder coat", "Anti-slip trouser bar"],
    quoteList: [
      { id: "q-2201", supplier: "Ningbo Form & Finish", location: "Ningbo, CN", unitPrice: 1.86, leadTime: "28 days", moq: 1000, status: "received", rating: 4.8, updated: "Today, 09:42", note: "Can hold current price through the production window." },
      { id: "q-2202", supplier: "Eastline Housewares", location: "Ho Chi Minh City, VN", unitPrice: 2.08, leadTime: "21 days", moq: 500, status: "reviewing", rating: 4.6, updated: "Yesterday, 16:18", note: "Fastest lead time; includes pre-production color chip." },
    ],
  },
  {
    id: "rfq-1055",
    product: "LED Track Light — 4000K Wash — 18W",
    buyer: "Vellum Studio",
    status: "accepted",
    quotes: 1,
    quantity: 640,
    target: 18.5,
    deadline: "Oct 02, 2025",
    assignee: "Jon Bell",
    initials: "JB",
    updated: "Yesterday",
    category: "Lighting",
    description: "Compact track head for gallery-like illumination across Vellum Studio locations.",
    specs: ["4000K neutral white", "18W / 1,650 lm", "CRI 90+"],
    quoteList: [
      { id: "q-2210", supplier: "LumaWorks Shenzhen", location: "Shenzhen, CN", unitPrice: 17.9, leadTime: "35 days", moq: 300, status: "accepted", rating: 4.9, updated: "Sep 11, 11:04", note: "Approved by buyer. Dimming driver included." },
    ],
  },
  {
    id: "rfq-1059",
    product: "LED Display Spot — 3000K — 12W",
    buyer: "Pioneer Goods Co.",
    status: "open",
    quotes: 1,
    quantity: 420,
    target: 14.75,
    deadline: "Sep 29, 2025",
    assignee: "Jon Bell",
    initials: "JB",
    updated: "2 hrs ago",
    category: "Lighting",
    description: "Warm display spot with a narrow beam for small-format product merchandising.",
    specs: ["3000K warm white", "12W / 980 lm", "24° beam angle"],
    quoteList: [
      { id: "q-2214", supplier: "Arcbeam Electrical", location: "Dongguan, CN", unitPrice: 15.2, leadTime: "26 days", moq: 200, status: "received", rating: 4.4, updated: "Today, 08:26", note: "Quote includes mounting adapter and sample unit." },
    ],
  },
  {
    id: "rfq-1064",
    product: "LED Pendant Light — 2700K Warm — 15W",
    buyer: "Atelier Nord",
    status: "open",
    quotes: 3,
    quantity: 280,
    target: 31,
    deadline: "Oct 14, 2025",
    assignee: "Sofia Reyes",
    initials: "SR",
    updated: "3 hrs ago",
    category: "Lighting",
    description: "Small warm pendant with a linen shade and a low-profile ceiling canopy.",
    specs: ["2700K warm white", "15W / 900 lm", "Linen shade, 180 mm"],
    quoteList: [
      { id: "q-2220", supplier: "Morrow Lighting Co.", location: "Hangzhou, CN", unitPrice: 29.4, leadTime: "42 days", moq: 100, status: "reviewing", rating: 4.7, updated: "Today, 07:18", note: "Lowest unit price with a longer production window." },
      { id: "q-2221", supplier: "Northstar Illumination", location: "Jaipur, IN", unitPrice: 32.1, leadTime: "31 days", moq: 50, status: "received", rating: 4.5, updated: "Yesterday, 18:05", note: "Lower MOQ and a 31-day ready-to-ship estimate." },
      { id: "q-2222", supplier: "LumaWorks Shenzhen", location: "Shenzhen, CN", unitPrice: 34.6, leadTime: "24 days", moq: 200, status: "received", rating: 4.9, updated: "Yesterday, 14:37", note: "Fastest option with strongest delivery record." },
    ],
  },
];

const navItems = [
  { label: "Overview", icon: Boxes },
  { label: "Shipments", icon: Truck },
  { label: "RFQs", icon: ClipboardList },
  { label: "Suppliers", icon: Factory },
  { label: "Reports", icon: BarChart3 },
];

const money = (value: number) => `$${value.toFixed(2)}`;
const wholeMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;

function StatusPill({ status }: { status: RfqStatus | QuoteStatus }) {
  const config = {
    open: { label: "Open", cls: "bg-[#f5f1ff] text-[#6841c6] border-[#dfd3ff]", icon: CircleDot },
    accepted: { label: "Accepted", cls: "bg-[#eaf8f0] text-[#26774a] border-[#c6ead4]", icon: CheckCircle2 },
    received: { label: "Received", cls: "bg-[#f1f4f8] text-[#536174] border-[#dfe5ec]", icon: CircleDot },
    reviewing: { label: "Reviewing", cls: "bg-[#fff6e8] text-[#a96413] border-[#f5dfbd]", icon: Clock3 },
  }[status];
  const Icon = config.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.cls}`}><Icon size={10} strokeWidth={2.4} />{config.label}</span>;
}

function Avatar({ initials, tone = "purple" }: { initials: string; tone?: "purple" | "orange" | "slate" }) {
  const tones = { purple: "bg-[#eee8ff] text-[#6841c6]", orange: "bg-[#fff0df] text-[#a96318]", slate: "bg-[#e8edf3] text-[#526174]" };
  return <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${tones[tone]}`}>{initials}</span>;
}

export function ReviewWorkspace() {
  const [rfqs, setRfqs] = useState(SEEDED_RFQS);
  const [selectedId, setSelectedId] = useState("rfq-1052");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "accepted">("all");
  const [activeNav, setActiveNav] = useState("RFQs");
  const [selectedQuoteId, setSelectedQuoteId] = useState("q-2201");
  const [quoteModal, setQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [sent, setSent] = useState(false);
  const [converted, setConverted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState("");

  const selected = rfqs.find((rfq) => rfq.id === selectedId) ?? rfqs[0];
  const filteredRfqs = useMemo(() => rfqs.filter((rfq) => {
    const matchesFilter = filter === "all" || rfq.status === filter;
    const haystack = `${rfq.product} ${rfq.buyer} ${rfq.category}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, query, rfqs]);
  const selectedQuote = selected.quoteList.find((quote) => quote.id === selectedQuoteId) ?? selected.quoteList[0];
  const bestQuote = selected.quoteList.length ? [...selected.quoteList].sort((a, b) => a.unitPrice - b.unitPrice)[0] : undefined;
  const spread = bestQuote ? ((bestQuote.unitPrice - selected.target) / selected.target) * 100 : 0;

  const selectRfq = (rfq: Rfq) => {
    setSelectedId(rfq.id);
    setSelectedQuoteId(rfq.quoteList[0]?.id ?? "");
    setSent(false);
    setConverted(false);
    setMoreOpen(false);
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const acceptQuote = () => {
    if (!selectedQuote) return;
    setRfqs((current) => current.map((rfq) => rfq.id === selected.id ? {
      ...rfq,
      status: "accepted",
      quoteList: rfq.quoteList.map((quote) => quote.id === selectedQuote.id ? { ...quote, status: "accepted" } : quote),
    } : rfq));
    notify(`${selectedQuote.supplier} marked as the selected quote`);
  };

  const saveQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplier = String(form.get("supplier") || "New supplier");
    const unitPrice = Number(form.get("unitPrice") || 0);
    const quote: Quote = {
      id: editingQuote?.id ?? `q-${Date.now()}`,
      supplier,
      location: String(form.get("location") || "Supplier portal"),
      unitPrice,
      leadTime: String(form.get("leadTime") || "30 days"),
      moq: Number(form.get("moq") || 100),
      status: editingQuote?.status ?? "received",
      rating: editingQuote?.rating ?? 4.5,
      updated: "Just now",
      note: "Added from review workspace.",
    };
    setRfqs((current) => current.map((rfq) => rfq.id === selected.id ? { ...rfq, quotes: rfq.quoteList.length + (editingQuote ? 0 : 1), quoteList: editingQuote ? rfq.quoteList.map((item) => item.id === quote.id ? quote : item) : [...rfq.quoteList, quote] } : rfq));
    setSelectedQuoteId(quote.id);
    setQuoteModal(false);
    setEditingQuote(null);
    notify(editingQuote ? "Quote details updated" : "Quote added to comparison");
  };

  return (
    <div className="min-h-[100dvh] min-w-[1120px] bg-[#f3f5f7] font-sans text-[#202634] antialiased">
      <div className="flex h-6 items-center justify-between bg-[#e8752f] px-4 text-[10px] font-semibold tracking-[0.01em] text-white">
        <span className="flex items-center gap-2"><ShieldCheck size={12} /> FLOWFORGEIQ · PLATFORM ADMIN</span>
        <span className="opacity-85">Workspace: Northbound Buying Team <ChevronDown size={11} className="ml-1 inline" /></span>
      </div>

      <header className="flex h-12 items-center border-b border-[#dde2e8] bg-white px-4">
        <div className="flex w-[226px] items-center gap-2.5 border-r border-[#edf0f3]">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#202634] text-[11px] font-black tracking-[-0.08em] text-white">FF</div>
          <div><div className="text-[13px] font-bold tracking-[-0.02em] text-[#202634]">FlowForge<span className="text-[#7b52d1]">IQ</span></div><div className="text-[9px] text-[#8a95a5]">Buyer workspace</div></div>
        </div>
        <div className="ml-5 flex items-center gap-2 text-[11px] text-[#758094]"><span>Procurement</span><ChevronRight size={12} /><span className="font-semibold text-[#202634]">RFQ review</span></div>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => notify("Help center opened")} className="text-[10px] font-semibold text-[#677388] hover:text-[#6841c6]">Help center</button>
          <button onClick={() => notify("No new notifications")} aria-label="Notifications" className="relative text-[#6d788a] hover:text-[#6841c6]"><Bell size={16} /><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#e8752f]" /></button>
          <div className="h-5 w-px bg-[#e6e9ed]" />
          <Avatar initials="MC" tone="orange" /><ChevronDown size={13} className="text-[#8a95a5]" />
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-72px)]">
        <aside className="flex w-[68px] shrink-0 flex-col items-center border-r border-[#dfe4e9] bg-[#202634] py-3">
          <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#2d3647] text-[#c4b6ff]"><Layers3 size={16} /></div>
          <nav className="flex w-full flex-1 flex-col items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return <button key={item.label} onClick={() => { setActiveNav(item.label); notify(`${item.label} view selected`); }} title={item.label} className={`group relative flex h-10 w-12 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-[#6950af] text-white" : "text-[#98a3b5] hover:bg-[#2d3647] hover:text-white"}`}><Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />{isActive && <span className="absolute -right-[8px] h-4 w-0.5 rounded-l bg-[#c5b7ff]" />}</button>;
            })}
          </nav>
          <button onClick={() => notify("Settings opened")} title="Settings" className="flex h-10 w-12 items-center justify-center rounded-lg text-[#98a3b5] hover:bg-[#2d3647] hover:text-white"><Settings2 size={17} /></button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#dfe4e9] bg-white px-6">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8791a1]"><span>Procurement</span><span className="text-[#c3cad3]">/</span><span className="text-[#6841c6]">RFQs</span></div>
              <h1 className="text-[20px] font-bold tracking-[-0.035em] text-[#202634]">RFQ review workspace</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="mr-2 flex items-center gap-1.5 text-[10px] text-[#8490a1]"><span className="h-1.5 w-1.5 rounded-full bg-[#35a66a]" />Last synced 2 min ago</span>
              <button onClick={() => setQuoteModal(true)} className="flex h-8 items-center gap-1.5 rounded-md border border-[#d9dfe7] bg-white px-3 text-[11px] font-semibold text-[#4d596b] shadow-[0_1px_2px_rgba(25,35,50,.03)] hover:border-[#b8a5ef] hover:text-[#6841c6]"><Plus size={14} />Add quote</button>
              <button onClick={() => { setSent(true); notify("RFQ reminder sent to suppliers"); }} className="flex h-8 items-center gap-1.5 rounded-md bg-[#6841c6] px-3 text-[11px] font-semibold text-white shadow-[0_2px_4px_rgba(104,65,198,.2)] hover:bg-[#5935af]"><Send size={13} />{sent ? "Reminder sent" : "Send RFQ"}</button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <section className="flex w-[350px] shrink-0 flex-col border-r border-[#dfe4e9] bg-[#fafbfc]">
              <div className="border-b border-[#e4e8ed] px-4 pb-3 pt-4">
                <div className="mb-1 flex items-center justify-between"><h2 className="text-[12px] font-bold text-[#202634]">All requests</h2><span className="rounded-full bg-[#e9edf2] px-1.5 py-0.5 text-[9px] font-bold text-[#697588]">{rfqs.length}</span></div>
                <p className="mb-3 text-[10px] text-[#8a95a5]">Select an RFQ to review supplier quotes</p>
                <label className="flex h-8 items-center gap-2 rounded-md border border-[#dfe4e9] bg-white px-2.5 text-[#8a95a5] focus-within:border-[#b9a7ee]"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or buyer" className="min-w-0 flex-1 bg-transparent text-[10px] text-[#202634] outline-none placeholder:text-[#a3adba]" /></label>
              </div>
              <div className="flex items-center gap-1 border-b border-[#e4e8ed] px-4 py-2.5">
                <Filter size={12} className="mr-1 text-[#8b96a6]" />
                {(["all", "open", "accepted"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-2.5 py-1 text-[9px] font-semibold capitalize ${filter === item ? "bg-[#e9e2ff] text-[#6841c6]" : "text-[#7f8a9b] hover:bg-[#eef1f4]"}`}>{item === "all" ? "All" : item}</button>)}
                <button onClick={() => notify("Advanced filters are ready")} className="ml-auto text-[#8490a1] hover:text-[#6841c6]" aria-label="Advanced filters"><SlidersHorizontal size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5">
                {filteredRfqs.map((rfq) => {
                  const isSelected = selected.id === rfq.id;
                  const quoteLabel = rfq.quotes === 0 ? "Awaiting quotes" : `${rfq.quotes} quote${rfq.quotes === 1 ? "" : "s"}`;
                  return <button key={rfq.id} onClick={() => selectRfq(rfq)} className={`mb-1.5 w-full rounded-lg border p-3 text-left transition-colors ${isSelected ? "border-[#c8b8f2] bg-[#f6f2ff] shadow-[0_1px_2px_rgba(65,40,125,.04)]" : "border-transparent bg-transparent hover:border-[#e1e6eb] hover:bg-white"}`}>
                    <div className="mb-2 flex items-start justify-between gap-2"><span className={`text-[11px] font-bold leading-[1.35] ${isSelected ? "text-[#4e3193]" : "text-[#2f3847]"}`}>{rfq.product}</span><StatusPill status={rfq.status} /></div>
                    <div className="mb-2.5 flex items-center gap-1.5 text-[10px] text-[#7a8697]"><span className="font-semibold text-[#596678]">{rfq.buyer}</span><span className="text-[#ccd1d8]">·</span><span>{rfq.category}</span></div>
                    <div className="flex items-center justify-between"><span className={`flex items-center gap-1 text-[9px] font-semibold ${rfq.quotes === 0 ? "text-[#a56d25]" : "text-[#697588]"}`}><FileText size={11} />{quoteLabel}</span><span className="text-[9px] text-[#a0a9b6]">{rfq.updated}</span></div>
                    <div className="mt-2.5 flex items-center gap-2 border-t border-[#e6e8ed] pt-2.5"><Avatar initials={rfq.initials} tone={rfq.assignee === "Maya Chen" ? "purple" : "slate"} /><span className="text-[9px] text-[#7b8798]">{rfq.assignee}</span><span className="ml-auto flex items-center gap-1 text-[9px] text-[#8893a2]"><CalendarDays size={10} />Due {rfq.deadline.replace(", 2025", "")}</span></div>
                  </button>;
                })}
                {filteredRfqs.length === 0 && <div className="px-4 py-12 text-center"><Search size={19} className="mx-auto mb-2 text-[#b0b8c4]" /><p className="text-[11px] font-semibold text-[#687487]">No RFQs found</p><p className="mt-1 text-[10px] text-[#9ca5b1]">Try another product or buyer.</p></div>}
              </div>
              <div className="border-t border-[#e4e8ed] px-4 py-3"><button onClick={() => notify("RFQ creation started")} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#c8ced7] py-2 text-[10px] font-semibold text-[#737f90] hover:border-[#a994e9] hover:bg-[#f7f4ff] hover:text-[#6841c6]"><Plus size={13} />Create new RFQ</button></div>
            </section>

            <section className="min-w-0 flex-1 overflow-y-auto bg-[#f3f5f7]">
              <div className="mx-auto max-w-[1040px] p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="min-w-0 pr-5">
                    <div className="mb-2 flex items-center gap-2"><StatusPill status={selected.status} /><span className="text-[10px] text-[#8a95a5]">RFQ-{selected.id.slice(-4)} · Updated {selected.updated}</span></div>
                    <h2 className="max-w-[660px] text-[22px] font-bold leading-[1.15] tracking-[-0.04em] text-[#202634]">{selected.product}</h2>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#687487]"><span className="font-semibold text-[#414d5e]">{selected.buyer}</span><span className="text-[#c5cbd3]">·</span>{selected.category}<span className="text-[#c5cbd3]">·</span><UserRound size={12} />{selected.assignee}</p>
                  </div>
                  <div className="relative flex items-center gap-1">
                    <button onClick={() => { setEditingQuote(selectedQuote ?? null); setQuoteModal(true); }} disabled={!selectedQuote} className="flex h-8 items-center gap-1.5 rounded-md border border-[#d8dee6] bg-white px-2.5 text-[10px] font-semibold text-[#687487] hover:border-[#b9a7ee] hover:text-[#6841c6] disabled:cursor-not-allowed disabled:opacity-40"><Pencil size={12} />Edit quote</button>
                    <button onClick={() => setMoreOpen((value) => !value)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d8dee6] bg-white text-[#687487] hover:border-[#b9a7ee] hover:text-[#6841c6]" aria-label="More RFQ actions"><MoreHorizontal size={15} /></button>
                    {moreOpen && <div className="absolute right-0 top-10 z-10 w-36 rounded-lg border border-[#dfe4e9] bg-white p-1.5 shadow-[0_8px_24px_rgba(32,38,52,.12)]"><button onClick={() => { setMoreOpen(false); notify("RFQ link copied"); }} className="w-full rounded px-2 py-1.5 text-left text-[10px] text-[#566275] hover:bg-[#f5f1ff]">Copy RFQ link</button><button onClick={() => { setMoreOpen(false); notify("RFQ archived"); }} className="w-full rounded px-2 py-1.5 text-left text-[10px] text-[#566275] hover:bg-[#f5f1ff]">Archive RFQ</button></div>}
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-px overflow-hidden rounded-lg border border-[#dfe4e9] bg-[#dfe4e9]">
                  <div className="bg-white p-3.5"><div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909aaa]">Buying brief</div><p className="text-[11px] leading-[1.45] text-[#4d596b]">{selected.description}</p></div>
                  <div className="bg-white p-3.5"><div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909aaa]">Quantity</div><p className="text-[17px] font-bold tracking-[-0.03em] text-[#202634]">{selected.quantity.toLocaleString()} <span className="text-[10px] font-medium text-[#7f8998]">units</span></p><p className="mt-0.5 text-[9px] text-[#919aa8]">Requested volume</p></div>
                  <div className="bg-white p-3.5"><div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909aaa]">Target price</div><p className="text-[17px] font-bold tracking-[-0.03em] text-[#202634]">{money(selected.target)} <span className="text-[10px] font-medium text-[#7f8998]">/ unit</span></p><p className="mt-0.5 text-[9px] text-[#919aa8]">Ex-works, USD</p></div>
                  <div className="bg-white p-3.5"><div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909aaa]">Decision due</div><p className="text-[14px] font-bold tracking-[-0.02em] text-[#202634]">{selected.deadline.replace(", 2025", "")}</p><p className="mt-1 flex items-center gap-1 text-[9px] text-[#b16c1e]"><Clock3 size={10} />{selected.status === "accepted" ? "Decision made" : "12 days remaining"}</p></div>
                </div>

                {selected.quoteList.length > 0 ? <div className="grid grid-cols-[minmax(0,1fr)_230px] items-start gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between"><div><h3 className="text-[13px] font-bold text-[#202634]">Quote comparison</h3><p className="mt-0.5 text-[10px] text-[#8893a2]">Decision-quality view across {selected.quoteList.length} supplier quotes</p></div><button onClick={() => notify("Comparison exported")} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#6841c6] hover:text-[#5030a1]"><ArrowUpRight size={13} />Export comparison</button></div>
                    <div className="overflow-hidden rounded-lg border border-[#dfe4e9] bg-white">
                      <div className="grid grid-cols-[minmax(180px,1.45fr)_78px_90px_78px_90px_36px] items-center gap-2 border-b border-[#e7eaee] bg-[#fafbfc] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929baa]"><span>Supplier</span><span>Unit price</span><span>vs target</span><span>Lead time</span><span>MOQ</span><span /></div>
                      {selected.quoteList.map((quote) => {
                        const isQuoteSelected = selectedQuote?.id === quote.id;
                        const delta = ((quote.unitPrice - selected.target) / selected.target) * 100;
                        return <button key={quote.id} onClick={() => setSelectedQuoteId(quote.id)} className={`grid w-full grid-cols-[minmax(180px,1.45fr)_78px_90px_78px_90px_36px] items-center gap-2 border-b border-[#edf0f3] px-3 py-3 text-left last:border-b-0 ${isQuoteSelected ? "bg-[#f8f5ff]" : "hover:bg-[#fbfcfd]"}`}>
                          <span className="flex min-w-0 items-center gap-2.5"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isQuoteSelected ? "bg-[#e7deff] text-[#6841c6]" : "bg-[#eef1f4] text-[#657285]"}`}><Factory size={14} /></span><span className="min-w-0"><span className={`block truncate text-[11px] font-bold ${isQuoteSelected ? "text-[#50319c]" : "text-[#303a4a]"}`}>{quote.supplier}</span><span className="mt-0.5 flex items-center gap-1 text-[9px] text-[#8993a1]"><MapPin size={9} />{quote.location}<span className="text-[#c5cbd3]">·</span><span className="text-[#c78b35]">★ {quote.rating}</span></span></span></span>
                          <span className="text-[12px] font-bold text-[#263040]">{money(quote.unitPrice)}</span>
                          <span className={`text-[10px] font-semibold ${delta <= 0 ? "text-[#2a8151]" : "text-[#b46821]"}`}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}%</span>
                          <span className="text-[10px] text-[#586577]">{quote.leadTime}</span>
                          <span className="text-[10px] text-[#586577]">{quote.moq.toLocaleString()}</span>
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${isQuoteSelected ? "border-[#8568d5] bg-[#6841c6] text-white" : "border-[#d3d9e1] text-transparent"}`}><Check size={11} strokeWidth={3} /></span>
                        </button>;
                      })}
                      <div className="flex items-center gap-2 border-t border-[#edf0f3] bg-[#fcfcfd] px-3 py-2"><Sparkles size={12} className="text-[#7957d0]" /><span className="text-[9px] text-[#778294]">Sorted by total landed estimate · prices shown in USD</span><button onClick={() => notify("Sort options opened")} className="ml-auto text-[#8792a1]" aria-label="Sort comparison"><ChevronsUpDown size={12} /></button></div>
                    </div>

                    <div className="mt-4 rounded-lg border border-[#dfe4e9] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between"><div><h3 className="text-[12px] font-bold text-[#202634]">Selected quote detail</h3><p className="mt-0.5 text-[10px] text-[#8791a1]">A closer look at the active supplier offer</p></div>{selectedQuote && <StatusPill status={selectedQuote.status} />}</div>
                      {selectedQuote && <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-4"><div><div className="mb-1 text-[9px] uppercase tracking-[0.1em] text-[#929baa]">Supplier note</div><p className="text-[10px] leading-[1.5] text-[#596678]">{selectedQuote.note}</p></div><div><div className="mb-1 text-[9px] uppercase tracking-[0.1em] text-[#929baa]">Estimated total</div><p className="text-[19px] font-bold tracking-[-0.04em] text-[#202634]">{wholeMoney(selectedQuote.unitPrice * selected.quantity)}</p><p className="mt-0.5 text-[9px] text-[#919aa8]">{money(selectedQuote.unitPrice)} × {selected.quantity.toLocaleString()} units</p></div><div><div className="mb-1 text-[9px] uppercase tracking-[0.1em] text-[#929baa]">Commercial fit</div><div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#2d7d50]"><CheckCircle2 size={13} />{selectedQuote.moq <= selected.quantity ? "MOQ fits order" : "MOQ exceeds order"}</div><p className="mt-1 text-[9px] text-[#8993a1]">Payment terms · Net 30</p></div></div>}
                      <div className="mt-4 flex items-center gap-2 border-t border-[#edf0f3] pt-3"><button onClick={acceptQuote} disabled={!selectedQuote || selectedQuote.status === "accepted"} className="flex h-8 items-center gap-1.5 rounded-md bg-[#6841c6] px-3 text-[10px] font-semibold text-white hover:bg-[#5935af] disabled:cursor-not-allowed disabled:bg-[#d6d0eb]"><Check size={13} />{selectedQuote?.status === "accepted" ? "Quote accepted" : "Use this quote"}</button><button onClick={() => { setEditingQuote(selectedQuote ?? null); setQuoteModal(true); }} className="flex h-8 items-center gap-1.5 rounded-md border border-[#d9dfe7] px-3 text-[10px] font-semibold text-[#687487] hover:border-[#b9a7ee] hover:text-[#6841c6]"><Pencil size={12} />Edit details</button>{selected.status === "accepted" && <button onClick={() => { setConverted(true); notify("Purchase order draft created"); }} className="ml-auto flex h-8 items-center gap-1.5 rounded-md border border-[#9bcfaf] bg-[#effaf3] px-3 text-[10px] font-semibold text-[#26774a] hover:bg-[#e5f7ec]">{converted ? <CheckCircle2 size={13} /> : <ArrowRight size={13} />}{converted ? "PO draft created" : "Convert to PO"}</button>}</div>
                    </div>
                  </div>
                  <aside className="space-y-3">
                    <div className="rounded-lg border border-[#cfc2f2] bg-[#f8f5ff] p-3.5"><div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#6841c6]"><Sparkles size={12} />Recommendation</div>{bestQuote && <><p className="text-[12px] font-bold leading-[1.35] text-[#3d2875]">{bestQuote.supplier}</p><p className="mt-1 text-[10px] leading-[1.45] text-[#6c5a98]">Best price with a workable 28-day lead time. Saves {wholeMoney((selected.target - bestQuote.unitPrice) * selected.quantity)} vs target.</p><div className="mt-3 flex items-end justify-between border-t border-[#e3dafa] pt-2.5"><div><p className="text-[9px] text-[#816fb0]">Best unit price</p><p className="text-[18px] font-bold tracking-[-0.04em] text-[#50319c]">{money(bestQuote.unitPrice)}</p></div><span className="mb-1 rounded-full bg-[#e8f7ee] px-2 py-1 text-[9px] font-bold text-[#287b4d]">{Math.abs(spread).toFixed(1)}% under target</span></div></>}</div>
                    <div className="rounded-lg border border-[#dfe4e9] bg-white p-3.5"><div className="mb-3 flex items-center justify-between"><h3 className="text-[11px] font-bold text-[#303a4a]">Tradeoffs at a glance</h3><button onClick={() => notify("Tradeoff guide opened")} className="text-[#8993a1]" aria-label="Tradeoff guide"><ArrowUpRight size={13} /></button></div>{bestQuote && <><div className="mb-3"><div className="mb-1 flex justify-between text-[9px]"><span className="text-[#7f8998]">Lead time</span><span className="font-semibold text-[#3b4656]">{bestQuote.leadTime}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f3]"><div className="h-full w-[64%] rounded-full bg-[#8b6ddb]" /></div></div><div className="mb-3"><div className="mb-1 flex justify-between text-[9px]"><span className="text-[#7f8998]">MOQ coverage</span><span className="font-semibold text-[#3b4656]">{Math.round((selected.quantity / bestQuote.moq) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f3]"><div className="h-full w-[82%] rounded-full bg-[#5eb481]" /></div></div><div className="flex items-center justify-between border-t border-[#edf0f3] pt-2.5"><span className="text-[9px] text-[#7f8998]">Target variance</span><span className={`text-[10px] font-bold ${spread <= 0 ? "text-[#2a8151]" : "text-[#b46821]"}`}>{spread > 0 ? "+" : ""}{spread.toFixed(1)}%</span></div></>}</div>
                    <div className="rounded-lg border border-[#dfe4e9] bg-white p-3.5"><h3 className="mb-2.5 text-[11px] font-bold text-[#303a4a]">Request specifications</h3>{selected.specs.map((spec) => <div key={spec} className="mb-2 flex items-center gap-2 text-[10px] text-[#687487] last:mb-0"><Check size={12} className="text-[#54a978]" />{spec}</div>)}</div>
                    <div className="rounded-lg border border-[#dfe4e9] bg-white p-3.5"><div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-bold text-[#303a4a]">Review checklist</h3><span className="text-[9px] font-semibold text-[#2c8151]">3 / 4 done</span></div><div className="mb-2 h-1 overflow-hidden rounded-full bg-[#edf0f3]"><div className="h-full w-3/4 rounded-full bg-[#5eb481]" /></div><div className="text-[9px] text-[#8993a1]">Confirm packaging spec before PO</div></div>
                  </aside>
                </div> : <div className="rounded-lg border border-dashed border-[#cfd6df] bg-white px-8 py-16 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f1ecff] text-[#7957d0]"><FileText size={18} /></div><h3 className="text-[13px] font-bold text-[#303a4a]">No supplier quotes yet</h3><p className="mx-auto mt-1 max-w-[280px] text-[10px] leading-[1.5] text-[#8993a1]">Send this RFQ to your supplier network or add a quote received outside FlowForgeIQ.</p><div className="mt-4 flex justify-center gap-2"><button onClick={() => { setSent(true); notify("RFQ sent to supplier network"); }} className="flex h-8 items-center gap-1.5 rounded-md bg-[#6841c6] px-3 text-[10px] font-semibold text-white"><Send size={12} />Send RFQ</button><button onClick={() => setQuoteModal(true)} className="flex h-8 items-center gap-1.5 rounded-md border border-[#d9dfe7] px-3 text-[10px] font-semibold text-[#687487]"><Plus size={12} />Add quote</button></div></div>}
              </div>
            </section>
          </div>
        </main>
      </div>

      {quoteModal && <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#202634]/25 p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) { setQuoteModal(false); setEditingQuote(null); } }}><form onSubmit={saveQuote} className="w-[410px] rounded-xl border border-[#dfe4e9] bg-white p-5 shadow-[0_20px_50px_rgba(32,38,52,.18)]"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[15px] font-bold text-[#202634]">{editingQuote ? "Edit supplier quote" : "Add supplier quote"}</h2><p className="mt-1 text-[10px] text-[#8893a2]">Add commercial details for the comparison view.</p></div><button type="button" onClick={() => { setQuoteModal(false); setEditingQuote(null); }} className="text-[#8993a1] hover:text-[#303a4a]" aria-label="Close quote form"><X size={16} /></button></div><div className="space-y-3"><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#596678]">Supplier</span><input name="supplier" required defaultValue={editingQuote?.supplier} placeholder="e.g. Meridian Home Goods" className="h-8 w-full rounded-md border border-[#dfe4e9] px-2.5 text-[11px] outline-none focus:border-[#a994e9]" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#596678]">Unit price (USD)</span><input name="unitPrice" type="number" step="0.01" required defaultValue={editingQuote?.unitPrice} placeholder="2.40" className="h-8 w-full rounded-md border border-[#dfe4e9] px-2.5 text-[11px] outline-none focus:border-[#a994e9]" /></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#596678]">MOQ (units)</span><input name="moq" type="number" required defaultValue={editingQuote?.moq} placeholder="500" className="h-8 w-full rounded-md border border-[#dfe4e9] px-2.5 text-[11px] outline-none focus:border-[#a994e9]" /></label></div><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#596678]">Location</span><input name="location" defaultValue={editingQuote?.location} placeholder="Shenzhen, CN" className="h-8 w-full rounded-md border border-[#dfe4e9] px-2.5 text-[11px] outline-none focus:border-[#a994e9]" /></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#596678]">Lead time</span><input name="leadTime" defaultValue={editingQuote?.leadTime} placeholder="30 days" className="h-8 w-full rounded-md border border-[#dfe4e9] px-2.5 text-[11px] outline-none focus:border-[#a994e9]" /></label></div></div><div className="mt-5 flex justify-end gap-2 border-t border-[#edf0f3] pt-4"><button type="button" onClick={() => { setQuoteModal(false); setEditingQuote(null); }} className="h-8 rounded-md px-3 text-[10px] font-semibold text-[#687487] hover:bg-[#f4f6f8]">Cancel</button><button type="submit" className="h-8 rounded-md bg-[#6841c6] px-3 text-[10px] font-semibold text-white hover:bg-[#5935af]">{editingQuote ? "Save changes" : "Add quote"}</button></div></form></div>}
      {toast && <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-[#202634] px-3.5 py-2.5 text-[10px] font-semibold text-white shadow-[0_8px_24px_rgba(32,38,52,.2)]"><CheckCircle2 size={13} className="text-[#8fdbaf]" />{toast}</div>}
    </div>
  );
}