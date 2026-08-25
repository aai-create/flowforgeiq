import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleHelp,
  ClipboardList,
  Clock3,
  DollarSign,
  FilePlus2,
  Inbox,
  LayoutGrid,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Send,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Quote = {
  id: string;
  factory: string;
  location: string;
  unitPrice: number;
  moq: number;
  leadTime: string;
  status: "New" | "Reviewing" | "Accepted";
  submitted: string;
};

type Rfq = {
  id: string;
  product: string;
  spec: string;
  buyer: string;
  initials: string;
  quantity: number;
  targetPrice: number;
  deadline: string;
  deadlineLabel: string;
  status: "Open" | "Accepted" | "Draft";
  assignee: string;
  quotes: Quote[];
  accent: string;
};

const RFQS: Rfq[] = [
  {
    id: "RFQ-2418",
    product: "Chrome Retail Hanger",
    spec: "Velvet Grip",
    buyer: "Forever 21",
    initials: "F21",
    quantity: 12000,
    targetPrice: 0.68,
    deadline: "Jun 18, 2024",
    deadlineLabel: "Due in 2 days",
    status: "Open",
    assignee: "JM",
    quotes: [],
    accent: "bg-[#f7e8df] text-[#9b4f2a]",
  },
  {
    id: "RFQ-2415",
    product: "Powder-Coat Hanger",
    spec: "Matte White Slim",
    buyer: "Cedar Hollow Homes",
    initials: "CH",
    quantity: 8400,
    targetPrice: 0.92,
    deadline: "Jun 20, 2024",
    deadlineLabel: "Due in 4 days",
    status: "Open",
    assignee: "JM",
    quotes: [
      { id: "q-1", factory: "Ningbo Form & Finish", location: "Ningbo, CN", unitPrice: 0.86, moq: 5000, leadTime: "28 days", status: "Reviewing", submitted: "Today, 9:24 AM" },
      { id: "q-2", factory: "Hanoi Housewares", location: "Hanoi, VN", unitPrice: 1.04, moq: 3000, leadTime: "34 days", status: "New", submitted: "Yesterday, 4:52 PM" },
    ],
    accent: "bg-[#e7edf7] text-[#3d5d91]",
  },
  {
    id: "RFQ-2409",
    product: "LED Track Light",
    spec: "4000K Wash · 18W",
    buyer: "Vellum Studio",
    initials: "VS",
    quantity: 480,
    targetPrice: 14.5,
    deadline: "Jun 14, 2024",
    deadlineLabel: "Accepted yesterday",
    status: "Accepted",
    assignee: "AL",
    quotes: [
      { id: "q-3", factory: "Shenzhen Luma Works", location: "Shenzhen, CN", unitPrice: 13.8, moq: 100, leadTime: "21 days", status: "Accepted", submitted: "Jun 12, 11:08 AM" },
    ],
    accent: "bg-[#f2e6f2] text-[#845276]",
  },
  {
    id: "RFQ-2407",
    product: "LED Display Spot",
    spec: "3000K · 12W",
    buyer: "Pioneer Goods Co.",
    initials: "PG",
    quantity: 960,
    targetPrice: 9.75,
    deadline: "Jun 22, 2024",
    deadlineLabel: "Due in 6 days",
    status: "Open",
    assignee: "JM",
    quotes: [
      { id: "q-4", factory: "Guangzhou Beamline", location: "Guangzhou, CN", unitPrice: 10.2, moq: 500, leadTime: "24 days", status: "New", submitted: "Today, 8:15 AM" },
    ],
    accent: "bg-[#e5f1ee] text-[#367568]",
  },
  {
    id: "RFQ-2402",
    product: "LED Pendant Light",
    spec: "2700K Warm · 15W",
    buyer: "Atelier Nord",
    initials: "AN",
    quantity: 260,
    targetPrice: 22,
    deadline: "Jun 28, 2024",
    deadlineLabel: "Due in 12 days",
    status: "Open",
    assignee: "AL",
    quotes: [
      { id: "q-5", factory: "Haining Orbital Lighting", location: "Haining, CN", unitPrice: 21.1, moq: 100, leadTime: "30 days", status: "Reviewing", submitted: "Jun 13, 2:46 PM" },
      { id: "q-6", factory: "Lumen Foundry", location: "Ho Chi Minh City, VN", unitPrice: 23.4, moq: 150, leadTime: "26 days", status: "New", submitted: "Jun 13, 1:20 PM" },
      { id: "q-7", factory: "Kanto Lightcraft", location: "Osaka, JP", unitPrice: 24.8, moq: 100, leadTime: "38 days", status: "New", submitted: "Jun 12, 5:42 PM" },
    ],
    accent: "bg-[#f4eedf] text-[#8a6b2e]",
  },
];

const navItems = [
  { label: "Inbox", icon: Inbox, count: "8" },
  { label: "Shipments", icon: PackageCheck },
  { label: "Orders", icon: ShoppingCart },
  { label: "RFQs", icon: ClipboardList, active: true },
  { label: "Reports", icon: BarChart3 },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function statusClasses(status: Rfq["status"]) {
  if (status === "Accepted") return "border-[#bedbd1] bg-[#edf8f3] text-[#25705e]";
  if (status === "Draft") return "border-[#d9dce4] bg-[#f4f5f7] text-[#697386]";
  return "border-[#e7d4a8] bg-[#fff8e9] text-[#896d2d]";
}

function quoteStatusClasses(status: Quote["status"]) {
  if (status === "Accepted") return "bg-[#edf8f3] text-[#28725f]";
  if (status === "Reviewing") return "bg-[#f1edfb] text-[#6d53a3]";
  return "bg-[#fff6e2] text-[#9a7428]";
}

export function CommandCenter() {
  const [activeId, setActiveId] = useState("RFQ-2415");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All RFQs" | "Needs review" | "No quotes">("All RFQs");
  const [showNewRfq, setShowNewRfq] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteNotice, setQuoteNotice] = useState("");
  const [acceptedQuoteId, setAcceptedQuoteId] = useState<string | null>(null);
  const [converted, setConverted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const active = RFQS.find((rfq) => rfq.id === activeId) ?? RFQS[1];
  const filteredRfqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return RFQS.filter((rfq) => {
      const matchesSearch = !query || [rfq.product, rfq.spec, rfq.buyer, rfq.id].join(" ").toLowerCase().includes(query);
      const matchesFilter =
        filter === "All RFQs" ||
        (filter === "Needs review" && rfq.quotes.length > 0 && rfq.status === "Open") ||
        (filter === "No quotes" && rfq.quotes.length === 0);
      return matchesSearch && matchesFilter;
    });
  }, [filter, search]);

  const totalQuotes = RFQS.reduce((total, rfq) => total + rfq.quotes.length, 0);
  const selectedQuote = active.quotes.find((quote) => quote.id === acceptedQuoteId) ?? active.quotes[0];

  return (
    <div className="min-h-[100dvh] w-full overflow-hidden bg-[#f6f7f9] text-[#202632]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <div className="flex h-7 items-center justify-between bg-[#e8752c] px-4 text-[10px] font-semibold tracking-[0.01em] text-white">
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.13em]">Platform admin</span>
          <span className="text-white/85">FlowForgeIQ workspace controls</span>
        </div>
        <div className="flex items-center gap-4 text-white/85">
          <span>Beta environment</span>
          <span className="flex items-center gap-1"><Circle size={6} fill="currentColor" /> All systems operational</span>
        </div>
      </div>

      <div className="flex h-[calc(100dvh-28px)] min-h-[720px]">
        <aside className="flex w-[62px] shrink-0 flex-col items-center border-r border-[#e3e6eb] bg-[#252832] py-3 text-white">
          <div className="mb-7 flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#8a6ae5] text-[13px] font-bold shadow-[0_4px_12px_rgba(138,106,229,0.32)]">F</div>
          <div className="flex flex-col items-center gap-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  title={item.label}
                  onClick={() => item.label === "RFQs" && setActiveId(activeId)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors ${item.active ? "bg-[#8062d5] text-white" : "text-[#a7acba] hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  {item.count && <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ed8a45] px-1 text-[8px] font-bold text-white">{item.count}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col items-center gap-3">
            <button type="button" title="Help" className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#a7acba] hover:bg-white/10 hover:text-white"><CircleHelp size={16} /></button>
            <button type="button" title="Settings" className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#a7acba] hover:bg-white/10 hover:text-white"><Settings size={16} /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#d9b39c] text-[10px] font-bold text-[#603d34]">JM</div>
          </div>
        </aside>

        <aside className="flex w-[174px] shrink-0 flex-col border-r border-[#e3e6eb] bg-[#fbfbfc]">
          <div className="flex h-[56px] items-center gap-2 border-b border-[#e9ebef] px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eeeaf9] text-[#7657c7]"><Sparkles size={14} /></div>
            <div>
              <p className="text-[11px] font-bold leading-3 text-[#272c37]">Sourcing</p>
              <p className="mt-0.5 text-[9px] text-[#9299a7]">Northstar team</p>
            </div>
            <ChevronDown size={13} className="ml-auto text-[#9da4b0]" />
          </div>
          <div className="flex-1 px-2.5 py-4">
            <p className="px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#a0a6b1]">Workspace</p>
            <button type="button" className="mt-2 flex w-full items-center gap-2 rounded-lg bg-[#eeebfb] px-2.5 py-2 text-left text-[#7354c5]">
              <ClipboardList size={14} />
              <span className="flex-1 text-[11px] font-semibold">RFQ command center</span>
            </button>
            <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[#697386] hover:bg-[#f0f1f4]">
              <LayoutGrid size={14} />
              <span className="text-[11px] font-medium">All sourcing</span>
            </button>
            <p className="mt-7 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#a0a6b1]">Views</p>
            {[
              ["Open RFQs", "4"],
              ["Awaiting quotes", "2"],
              ["Accepted", "1"],
              ["Drafts", "3"],
            ].map(([label, count]) => (
              <button type="button" key={label} onClick={() => label === "Awaiting quotes" ? setFilter("No quotes") : label === "Open RFQs" ? setFilter("All RFQs") : undefined} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[#697386] hover:bg-[#f0f1f4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c1c6ce]" />
                <span className="flex-1 text-[11px]">{label}</span>
                <span className="text-[10px] font-semibold text-[#a4aab5]">{count}</span>
              </button>
            ))}
            <div className="mt-7 rounded-xl border border-[#e8e5f2] bg-[#f8f6fd] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#6044a9]"><Sparkles size={11} /> Sourcing pulse</p>
              <p className="mt-1.5 text-[10px] leading-4 text-[#75708a]">2 quote decisions are ready for review this week.</p>
              <button type="button" onClick={() => setFilter("Needs review")} className="mt-2 text-[10px] font-bold text-[#7657c7] hover:text-[#5d42a8]">Review now <ArrowUpRight size={10} className="inline" /></button>
            </div>
          </div>
          <div className="border-t border-[#e9ebef] px-4 py-3">
            <button type="button" className="flex items-center gap-2 text-[10px] font-medium text-[#7d8491] hover:text-[#4c5564]"><Users size={13} /> Team directory</button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[56px] shrink-0 items-center gap-4 border-b border-[#e3e6eb] bg-white px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <p className="text-[12px] font-semibold text-[#858d9b]">Sourcing</p>
              <ChevronRight size={13} className="text-[#c4c8d0]" />
              <h1 className="truncate text-[13px] font-bold text-[#262c37]">RFQ Command Center</h1>
              <span className="rounded-full bg-[#f0eff7] px-2 py-1 text-[9px] font-bold text-[#7256bb]">Q2 2024</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" title="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#8c95a3] hover:bg-[#f5f6f8]"><Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e8752c]" /></button>
              <div className="h-5 w-px bg-[#e6e8ec]" />
              <span className="text-[10px] text-[#858d9b]">Last synced 2m ago</span>
              <button type="button" title="Workspace menu" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8c95a3] hover:bg-[#f5f6f8]"><MoreHorizontal size={16} /></button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="min-w-0 flex-1 overflow-y-auto bg-[#f6f7f9] px-6 py-5">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8d95a3]">Active sourcing portfolio</p>
                  <h2 className="mt-1.5 text-[25px] font-bold tracking-[-0.035em] text-[#252b36]">Find the next best quote.</h2>
                  <p className="mt-1 text-[12px] text-[#858d9b]">A live view of every request, from first send to factory selection.</p>
                </div>
                <button type="button" onClick={() => setShowNewRfq(true)} className="flex shrink-0 items-center gap-2 rounded-lg bg-[#7457c7] px-3.5 py-2.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(116,87,199,0.22)] transition-transform hover:-translate-y-0.5"><Plus size={14} /> New RFQ</button>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                {[
                  { label: "Total RFQs", value: "12", sub: "this quarter", icon: ClipboardList, tone: "text-[#7256bb] bg-[#eeebfb]" },
                  { label: "Open requests", value: "4", sub: "2 need attention", icon: Clock3, tone: "text-[#a36d2a] bg-[#fff4df]" },
                  { label: "Factory quotes", value: String(totalQuotes), sub: "across 4 requests", icon: DollarSign, tone: "text-[#287765] bg-[#e9f6f1]" },
                  { label: "Avg. response", value: "3.8d", sub: "down 0.6d vs May", icon: BarChart3, tone: "text-[#496796] bg-[#e9eff8]" },
                ].map(({ label, value, sub, icon: Icon, tone }) => (
                  <div key={label} className="rounded-xl border border-[#e4e7ec] bg-white p-3.5 shadow-[0_1px_2px_rgba(27,33,45,0.02)]">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tone}`}><Icon size={13} /></span>
                      <span className="text-[10px] font-semibold text-[#858d9b]">{label}</span>
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="text-[21px] font-bold tracking-[-0.04em] text-[#242a35]">{value}</p>
                      <p className="text-[9px] text-[#a0a6b1]">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba2ae]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, buyer, or RFQ number" className="h-9 w-full rounded-lg border border-[#dfe3e9] bg-white pl-9 pr-3 text-[11px] text-[#313844] outline-none transition-colors placeholder:text-[#a6adb8] focus:border-[#a494dc] focus:ring-2 focus:ring-[#8062d5]/10" />
                </div>
                <div className="flex items-center rounded-lg border border-[#dfe3e9] bg-white p-0.5">
                  {(["All RFQs", "Needs review", "No quotes"] as const).map((option) => (
                    <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${filter === option ? "bg-[#eeebfb] text-[#6e51bb]" : "text-[#89919d] hover:text-[#5c6572]"}`}>{option}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setMoreOpen(!moreOpen)} className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${moreOpen ? "border-[#a494dc] text-[#7457c7]" : "border-[#dfe3e9] text-[#8d95a2]"} hover:bg-[#faf9fe]`}><SlidersHorizontal size={14} /></button>
              </div>
              {moreOpen && <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#e6e1f5] bg-[#fbfaff] px-3 py-2 text-[10px] text-[#766c8f]"><span className="font-bold text-[#6e51bb]">Sort:</span><button type="button" className="rounded bg-[#eeeaf9] px-2 py-1 font-semibold text-[#6e51bb]">Deadline</button><button type="button" className="rounded px-2 py-1 hover:bg-[#efeff3]">Newest activity</button><button type="button" className="rounded px-2 py-1 hover:bg-[#efeff3]">Quote count</button></div>}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#858d9b]">{filteredRfqs.length} requests <span className="font-normal text-[#b0b5be]">· updated moments ago</span></p>
                <button type="button" className="flex items-center gap-1 text-[10px] font-semibold text-[#7457c7] hover:text-[#5b419f]"><CalendarDays size={12} /> June 2024 <ChevronDown size={11} /></button>
              </div>

              <div className="mt-2 overflow-hidden rounded-xl border border-[#e1e4e9] bg-white shadow-[0_2px_5px_rgba(27,33,45,0.025)]">
                <div className="grid grid-cols-[minmax(220px,1.7fr)_minmax(105px,.8fr)_90px_100px_88px] items-center gap-3 border-b border-[#e9ebef] bg-[#fbfbfc] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1ad]">
                  <span>Request</span><span>Buyer / owner</span><span>Deadline</span><span>Quotes</span><span className="text-right">Target</span>
                </div>
                {filteredRfqs.length > 0 ? filteredRfqs.map((rfq) => {
                  const isSelected = rfq.id === active.id;
                  const bestQuote = rfq.quotes.length ? Math.min(...rfq.quotes.map((quote) => quote.unitPrice)) : null;
                  return (
                    <button type="button" key={rfq.id} onClick={() => { setActiveId(rfq.id); setAcceptedQuoteId(null); setConverted(false); }} className={`group grid w-full grid-cols-[minmax(220px,1.7fr)_minmax(105px,.8fr)_90px_100px_88px] items-center gap-3 border-b border-[#eef0f3] px-4 py-3 text-left transition-colors last:border-b-0 ${isSelected ? "bg-[#fbfaff] shadow-[inset_3px_0_0_#8062d5]" : "hover:bg-[#fcfcfd]"}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${rfq.accent}`}>{rfq.product.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-[#2c333f]">{rfq.product} <span className="font-medium text-[#8a929f]">— {rfq.spec}</span></p>
                            <div className="mt-1 flex items-center gap-2"><span className="font-mono text-[9px] text-[#a0a6b1]">{rfq.id}</span><span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${statusClasses(rfq.status)}`}>{rfq.status}</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0"><p className="truncate text-[10px] font-semibold text-[#4f5866]">{rfq.buyer}</p><p className="mt-1 flex items-center gap-1 text-[9px] text-[#a0a6b1]"><UserRound size={10} /> {rfq.assignee === "JM" ? "Jordan M." : "Alex L."}</p></div>
                      <div><p className="text-[10px] font-semibold text-[#4f5866]">{rfq.deadline.split(",")[0]}</p><p className={`mt-1 text-[9px] ${rfq.deadlineLabel.includes("2 days") ? "font-bold text-[#c87336]" : "text-[#a0a6b1]"}`}>{rfq.deadlineLabel}</p></div>
                      <div><div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${rfq.quotes.length ? "bg-[#eeeaf9] text-[#7256bb]" : "bg-[#f0f1f3] text-[#a0a6b1]"}`}>{rfq.quotes.length}</span><span className="text-[10px] text-[#78818e]">{rfq.quotes.length === 1 ? "quote" : "quotes"}</span></div>{bestQuote && <p className="mt-1 text-[9px] text-[#a0a6b1]">from {money(bestQuote)}</p>}</div>
                      <div className="text-right"><p className="text-[11px] font-bold text-[#3b4350]">{money(rfq.targetPrice)}</p><p className="mt-1 text-[9px] text-[#a0a6b1]">per unit</p></div>
                    </button>
                  );
                }) : <div className="flex flex-col items-center justify-center py-14 text-center"><Search size={20} className="text-[#b5bbc5]" /><p className="mt-3 text-[12px] font-semibold text-[#626c7a]">No RFQs match those filters</p><button type="button" onClick={() => { setSearch(""); setFilter("All RFQs"); }} className="mt-1 text-[10px] font-bold text-[#7457c7]">Clear filters</button></div>}
              </div>
            </section>

            <aside className="flex w-[344px] shrink-0 flex-col border-l border-[#e1e4e9] bg-white">
              <div className="border-b border-[#e8eaee] px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${active.accent}`}>{active.initials}</div>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] font-bold text-[#9aa1ad]">{active.id}</p>
                      <h3 className="mt-1 text-[14px] font-bold leading-5 tracking-[-0.01em] text-[#272e39]">{active.product}</h3>
                      <p className="text-[11px] text-[#7d8693]">{active.spec}</p>
                    </div>
                  </div>
                  <button type="button" title="More request actions" className="flex h-7 w-7 items-center justify-center rounded-md text-[#9aa1ad] hover:bg-[#f4f5f7]"><MoreHorizontal size={15} /></button>
                </div>
                <div className="mt-4 flex items-center gap-2"><span className={`rounded border px-2 py-1 text-[9px] font-bold ${statusClasses(active.status)}`}>{active.status}</span><span className="text-[10px] text-[#9aa1ad]">·</span><span className="text-[10px] text-[#7e8794]">{active.quotes.length} factory {active.quotes.length === 1 ? "quote" : "quotes"}</span></div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Buyer", value: active.buyer, icon: Building2 },
                    { label: "Quantity", value: `${active.quantity.toLocaleString()} pcs`, icon: ClipboardList },
                    { label: "Target price", value: `${money(active.targetPrice)} / unit`, icon: DollarSign },
                    { label: "Deadline", value: active.deadline.split(",")[0], icon: CalendarDays },
                  ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-[#e8eaee] bg-[#fbfbfc] p-2.5"><div className="flex items-center gap-1.5 text-[#a0a7b2]"><Icon size={11} /><span className="text-[9px] font-semibold">{label}</span></div><p className="mt-1.5 truncate text-[10px] font-bold text-[#495362]">{value}</p></div>)}
                </div>

                <div className="mt-5 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#737d8b]">Quote snapshot</p><button type="button" onClick={() => setShowQuoteForm(!showQuoteForm)} className="flex items-center gap-1 text-[10px] font-bold text-[#7457c7] hover:text-[#5e42a7]"><Plus size={12} /> Add quote</button></div>
                {showQuoteForm && <div className="mt-2 rounded-lg border border-[#ded7f2] bg-[#fbfaff] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-[#6044a9]">Add factory quote</p><button type="button" onClick={() => setShowQuoteForm(false)} className="text-[#a0a6b1]"><X size={13} /></button></div><input placeholder="Factory name" className="mt-2 h-7 w-full rounded border border-[#dddfe5] bg-white px-2 text-[10px] outline-none focus:border-[#a494dc]" /><div className="mt-2 grid grid-cols-2 gap-2"><input placeholder="Unit price" className="h-7 rounded border border-[#dddfe5] bg-white px-2 text-[10px] outline-none focus:border-[#a494dc]" /><input placeholder="Lead time" className="h-7 rounded border border-[#dddfe5] bg-white px-2 text-[10px] outline-none focus:border-[#a494dc]" /></div><button type="button" onClick={() => { setShowQuoteForm(false); setQuoteNotice("Quote draft saved to this RFQ."); }} className="mt-2 w-full rounded bg-[#7457c7] py-1.5 text-[10px] font-bold text-white">Save quote</button></div>}
                {quoteNotice && <div className="mt-2 flex items-center justify-between rounded-lg bg-[#edf8f3] px-2.5 py-2 text-[10px] font-semibold text-[#28725f]"><span>{quoteNotice}</span><button type="button" onClick={() => setQuoteNotice("")}><X size={12} /></button></div>}

                {active.quotes.length > 0 ? <div className="mt-2 space-y-2">{active.quotes.map((quote) => { const spread = ((quote.unitPrice - active.targetPrice) / active.targetPrice) * 100; const isAccepted = acceptedQuoteId === quote.id || quote.status === "Accepted"; return <div key={quote.id} className={`rounded-lg border p-3 ${isAccepted ? "border-[#bedbd1] bg-[#f4fbf8]" : "border-[#e6e8ec] bg-white"}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] font-bold text-[#3c4552]">{quote.factory}</p><p className="mt-0.5 flex items-center gap-1 text-[9px] text-[#a0a6b1]"><Building2 size={10} /> {quote.location}</p></div><span className={`rounded px-1.5 py-1 text-[8px] font-bold ${isAccepted ? "bg-[#dff3ea] text-[#24705d]" : quoteStatusClasses(quote.status)}`}>{isAccepted ? "Accepted" : quote.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2 border-y border-[#eef0f2] py-2"><div><p className="text-[8px] uppercase tracking-wide text-[#a0a6b1]">Unit price</p><p className="mt-1 text-[11px] font-bold text-[#303946]">{money(quote.unitPrice)}</p></div><div><p className="text-[8px] uppercase tracking-wide text-[#a0a6b1]">Vs target</p><p className={`mt-1 text-[11px] font-bold ${spread <= 0 ? "text-[#287765]" : "text-[#ba6c3b]"}`}>{spread > 0 ? "+" : ""}{spread.toFixed(1)}%</p></div><div><p className="text-[8px] uppercase tracking-wide text-[#a0a6b1]">Lead time</p><p className="mt-1 text-[11px] font-bold text-[#303946]">{quote.leadTime}</p></div></div><div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-[#a0a6b1]">MOQ {quote.moq.toLocaleString()} · {quote.submitted}</span>{!isAccepted && active.status === "Open" && <button type="button" onClick={() => { setAcceptedQuoteId(quote.id); setQuoteNotice(`${quote.factory} marked as your preferred quote.`); }} className="flex items-center gap-1 text-[9px] font-bold text-[#7457c7] hover:text-[#5e42a7]"><Check size={11} /> Use quote</button>}</div></div>; })}</div> : <div className="mt-2 rounded-lg border border-dashed border-[#d9dde4] bg-[#fbfbfc] px-3 py-5 text-center"><div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f1f4] text-[#9ea6b2]"><DollarSign size={13} /></div><p className="mt-2 text-[10px] font-semibold text-[#6e7785]">No factory quotes yet</p><p className="mt-1 text-[9px] leading-4 text-[#a0a6b1]">Send this request to your saved factory network to start collecting options.</p></div>}

                <div className="mt-5 rounded-lg bg-[#f8f7fc] p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold text-[#6044a9]"><Sparkles size={11} /> Next best action</p><p className="mt-1.5 text-[10px] leading-4 text-[#726b85]">{active.quotes.length === 0 ? "Send this RFQ to 6 matched factories before the deadline." : active.status === "Accepted" ? "Quote selected. Convert this request into a purchase order." : "Compare lead time and landed cost before choosing a supplier."}</p></div>
              </div>

              <div className="border-t border-[#e8eaee] bg-[#fbfbfc] px-5 py-3">
                {converted ? <div className="flex items-center justify-center gap-2 rounded-lg bg-[#e9f6f1] py-2 text-[10px] font-bold text-[#287765]"><CheckCircle2 size={14} /> PO draft created · PO-10482</div> : <div className="flex gap-2">{active.status === "Open" && <button type="button" onClick={() => { setQuoteNotice(active.quotes.length ? "RFQ reminder sent to participating factories." : "RFQ sent to 6 matched factories."); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#dcdfe5] bg-white py-2 text-[10px] font-bold text-[#5d6674] hover:border-[#c9cdd5] hover:bg-[#f7f7f9]"><Send size={12} /> {active.quotes.length ? "Remind factories" : "Send RFQ"}</button>}{(active.status === "Accepted" || acceptedQuoteId) && <button type="button" onClick={() => setConverted(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7457c7] py-2 text-[10px] font-bold text-white hover:bg-[#674bb5]"><ShoppingCart size={12} /> Convert to PO</button>}{active.status === "Open" && !acceptedQuoteId && active.quotes.length > 0 && <button type="button" onClick={() => { setAcceptedQuoteId(active.quotes[0].id); setQuoteNotice("Preferred quote selected."); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7457c7] py-2 text-[10px] font-bold text-white hover:bg-[#674bb5]"><Check size={12} /> Select quote</button>}{active.status === "Open" && active.quotes.length === 0 && <button type="button" onClick={() => setShowQuoteForm(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dcdfe5] bg-white text-[#8a93a0] hover:bg-[#f5f6f8]" title="Add quote"><FilePlus2 size={13} /></button>}</div>}
              </div>
            </aside>
          </div>
        </main>
      </div>

      {showNewRfq && <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#252832]/25 p-6 backdrop-blur-[2px]"><div className="w-[390px] rounded-2xl border border-[#e3e5eb] bg-white p-5 shadow-[0_20px_55px_rgba(32,38,50,0.2)]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8d95a3]">New request</p><h3 className="mt-1 text-[18px] font-bold tracking-[-0.03em] text-[#2b313d]">Start a sourcing brief</h3></div><button type="button" onClick={() => setShowNewRfq(false)} className="text-[#9ba2ae] hover:text-[#5d6674]"><X size={17} /></button></div><div className="mt-5 space-y-3"><label className="block text-[10px] font-semibold text-[#697382]">Product name<input autoFocus placeholder="e.g. Brushed steel shelf bracket" className="mt-1.5 h-9 w-full rounded-lg border border-[#dfe3e9] px-3 text-[11px] outline-none focus:border-[#a494dc]" /></label><label className="block text-[10px] font-semibold text-[#697382]">Buyer or account<input placeholder="Choose a buyer" className="mt-1.5 h-9 w-full rounded-lg border border-[#dfe3e9] px-3 text-[11px] outline-none focus:border-[#a494dc]" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-semibold text-[#697382]">Quantity<input placeholder="0" className="mt-1.5 h-9 w-full rounded-lg border border-[#dfe3e9] px-3 text-[11px] outline-none focus:border-[#a494dc]" /></label><label className="block text-[10px] font-semibold text-[#697382]">Target / unit<input placeholder="$0.00" className="mt-1.5 h-9 w-full rounded-lg border border-[#dfe3e9] px-3 text-[11px] outline-none focus:border-[#a494dc]" /></label></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowNewRfq(false)} className="rounded-lg px-3 py-2 text-[10px] font-bold text-[#747d8b] hover:bg-[#f4f5f7]">Cancel</button><button type="button" onClick={() => { setShowNewRfq(false); setQuoteNotice("Draft RFQ created. Add specifications when ready."); }} className="rounded-lg bg-[#7457c7] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#674bb5]">Create draft</button></div></div></div>}
    </div>
  );
}