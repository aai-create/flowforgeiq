import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { AICopilotBar } from "@/components/AICopilotBar";
import { useCopilotHint } from "@/lib/CopilotContext";
import { useListShipments, useListStages, useListTasks, updateTask, updateShipment, updatePayment, useGetRiskRadar, useListSuppliers, useCreateShipment, useCreateSupplier, useCreateShipmentStageEvent, useGetPoNumberingConfig, useListDeals, useLinkDealToShipment, useUnlinkDealFromShipment, getListShipmentsQueryKey, useListMessages, useListDocuments, useUpdateShipment, usePatchShipmentDeal } from "@workspace/api-client-react";
import type { FactoryQuote, Message, DocumentWithExtraction } from "@workspace/api-client-react";
import { StageHistory } from "@/components/StageHistory";
import { adaptShipments, adaptStages, adaptTasks, shortDate, type UiShipment, type UiStage, type UiTask } from "@/lib/adapters";
import { QuotesTab } from "@/components/QuotesTab";
import {
  Search, Bell, Plus, Inbox, LayoutGrid,
  MessageCircle, Mail, FileText, CheckCircle2, Circle,
  Sparkles, AlertCircle, Clock, ChevronRight, Hash, X,
  Wand2, Send, Paperclip, MoreHorizontal, ChevronDown,
  DollarSign, CreditCard, CalendarClock, ListTodo, Zap,
  MapPin, Filter, SlidersHorizontal, Calendar, ShieldAlert, BarChart3, ArrowLeft, Upload,
  HelpCircle, Link2, Copy, Check as CheckIcon,
} from "lucide-react";
import { Link } from "wouter";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShipmentDrawer, type MarkPaidForm } from "@/components/ShipmentDrawer";

type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Payment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; }

interface Shipment {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; currentStage: string; dueDate: string;
  payments: [Payment, Payment];
}

const SHIPMENTS: Shipment[] = [
  {
    id: "s1", po: "PO-2026-0142", product: "Stainless Serving Fork — Brushed Nickel",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "at-risk", currentStage: "Sample Approval", dueDate: "May 17",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 3840,  paid: true,  dueDate: "Apr 02" },
      { label: "Balance (70%)", percent: 70, amountUsd: 8960,  paid: false, dueDate: "May 15" },
    ],
  },
  {
    id: "s2", po: "PO-2026-0157", product: "LED Display Cabinet Light — Warm White",
    supplier: "Shenzhen LEDPro", customer: "Northbound Outfitters",
    status: "delayed", currentStage: "Production", dueDate: "May 18",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 5100,  paid: true,  dueDate: "Mar 28" },
      { label: "Balance (70%)", percent: 70, amountUsd: 11900, paid: false, dueDate: "May 18" },
    ],
  },
  {
    id: "s3", po: "PO-2026-0160", product: "Engineered Oak Flooring — Herringbone",
    supplier: "Hangzhou Timber Co.", customer: "Pioneer Goods Co.",
    status: "on-track", currentStage: "QC Inspection", dueDate: "May 22",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 9300,  paid: true,  dueDate: "Apr 10" },
      { label: "Balance (70%)", percent: 70, amountUsd: 21700, paid: false, dueDate: "May 22" },
    ],
  },
  {
    id: "s4", po: "PO-2026-0165", product: "Chrome Retail Hanger — Heavy Duty",
    supplier: "Tianjin Wire Works", customer: "Marlowe & Sons",
    status: "at-risk", currentStage: "Ex-Factory", dueDate: "Jun 02",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 1620,  paid: true,  dueDate: "Apr 18" },
      { label: "Balance (70%)", percent: 70, amountUsd: 3780,  paid: false, dueDate: "Jun 02" },
    ],
  },
  {
    id: "s5", po: "PO-2026-0168", product: "Powder-Coat Grid Panel Display",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "on-track", currentStage: "Factory Quotes", dueDate: "Jun 10",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 2250,  paid: false, dueDate: "Jun 01" },
      { label: "Balance (70%)", percent: 70, amountUsd: 5250,  paid: false, dueDate: "Jun 25" },
    ],
  },
];

const CUSTOMERS = [
  { id: "c1", name: "Vellum Studio",         count: 2 },
  { id: "c2", name: "Northbound Outfitters", count: 1 },
  { id: "c3", name: "Pioneer Goods Co.",     count: 1 },
  { id: "c4", name: "Marlowe & Sons",        count: 1 },
];

interface Task {
  id: string; title: string; source: string; sourceAge: string;
  urgency: "high" | "medium" | "low"; done: boolean;
}

const INIT_TASKS: Task[] = [
  { id: "t1", title: "Approve 2-day delay — Guangzhou Metalworks (PO-0142)",      source: "WhatsApp",  sourceAge: "2h ago",    urgency: "high",   done: false },
  { id: "t2", title: "Balance payment overdue — PO-0142 ($8,960 due May 15)",    source: "Tracker",   sourceAge: "Today",     urgency: "high",   done: false },
  { id: "t3", title: "Port congestion reply needed — Tianjin Wire Works (PO-0165)", source: "WhatsApp", sourceAge: "Yesterday", urgency: "high",   done: false },
  { id: "t4", title: "Select factory quote — PO-0168 (Grid Panel Display)",       source: "Sheets",    sourceAge: "2d ago",    urgency: "medium", done: false },
  { id: "t5", title: "Book QC inspection — Shenzhen LEDPro entering final assembly", source: "Gmail",  sourceAge: "Yesterday", urgency: "medium", done: false },
  { id: "t6", title: "Arrange balance wire $21,700 — Hangzhou Timber (PO-0160)", source: "PDF / SGS", sourceAge: "Mon",       urgency: "medium", done: false },
];

// AI chat turns
const CHAT: { role: "user" | "ai"; text: React.ReactNode }[] = [
  { role: "user", text: "What's most urgent today?" },
  {
    role: "ai",
    text: (
      <span>
        <span className="font-semibold text-[#212833]">3 high-priority items</span> need decisions before end of day.
        <div className="mt-2 p-2 bg-[#FAFBFC] border border-[#E5EAF0] rounded-md space-y-1.5">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
            <span className="text-[11px]"><span className="font-medium text-[#212833]">PO-0142</span> — balance $8,960 overdue + supplier requesting 2d delay</span>
          </div>
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-[11px]"><span className="font-medium text-[#212833]">PO-0165</span> — Tianjin port congestion, 4d delay needs approval</span>
          </div>
        </div>
        <p className="mt-2 text-[12px]">Want me to draft replies for both?</p>
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusCls = (s: ShipmentStatus) =>
  s === "on-track" ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
  : s === "delayed"  ? "bg-red-50 text-red-700 border border-red-100"
  : "bg-amber-50 text-amber-700 border border-amber-100";

const urgencyDot = (u: Task["urgency"]) =>
  u === "high" ? "bg-red-500" : u === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-amber-900 rounded-[2px] px-[1px]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Atelier() {
  useLocation();
  useCopilotHint("Ask about PO status or draft a quick update", [
    "Which POs need attention today?",
    "Show me all delayed shipments",
    "Which tasks are still open this week?",
  ]);
  const { data: apiStages }    = useListStages();
  const { data: apiShipments } = useListShipments();
  const { data: apiTasks }     = useListTasks();
  const { data: radarData }    = useGetRiskRadar();
  const { data: suppliersData } = useListSuppliers();
  const apiSuppliers = suppliersData ?? [];
  const [shipments, setShipments] = useState<UiShipment[]>([]);
  const [stages, setStages] = useState<UiStage[]>([]);
  const [tasks, setTasks] = useState<UiTask[]>([]);
  useEffect(() => {
    if (!apiStages || !apiShipments) return;
    const adapted = adaptStages(apiStages);
    const ships = adaptShipments(apiShipments, adapted);
    setStages(adapted);
    setShipments(ships);
    if (apiTasks) setTasks(adaptTasks(apiTasks, ships));
  }, [apiStages, apiShipments, apiTasks]);

  const [advanceTarget, setAdvanceTarget] = useState<UiShipment | null>(null);
  const [advanceNote, setAdvanceNote] = useState("");
  const createStageEventMutation = useCreateShipmentStageEvent();

  const openAdvanceDialog = (shipment: UiShipment) => {
    const idx = stages.findIndex(st => st.id === shipment.currentStageId);
    const next = stages[Math.min(idx + 1, stages.length - 1)];
    if (!next || next.id === shipment.currentStageId) return;
    setAdvanceTarget(shipment);
    setAdvanceNote("");
  };

  const confirmAdvanceStage = async () => {
    if (!advanceTarget) return;
    const idx = stages.findIndex(st => st.id === advanceTarget.currentStageId);
    const next = stages[Math.min(idx + 1, stages.length - 1)];
    if (!next || next.id === advanceTarget.currentStageId) return;
    const fromStageId = advanceTarget.currentStageId;
    setShipments(prev => prev.map(s =>
      s.id === advanceTarget.id ? { ...s, currentStageId: next.id, currentStage: next.label, status: "on-track" } : s,
    ));
    setAdvanceTarget(null);
    setAdvanceNote("");
    createStageEventMutation.mutate({
      id: advanceTarget.shipmentId,
      data: { fromStageId, toStageId: next.id, note: advanceNote.trim() || undefined },
    });
  };

  const riskByShipmentId = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const item of radarData?.items ?? []) {
      map.set(item.shipmentId, item.riskScore);
    }
    return map;
  }, [radarData]);

  const [shipmentQuotesMap, setShipmentQuotesMap] = useState<Map<number, FactoryQuote[]>>(new Map());

  useEffect(() => {
    if (!apiShipments) return;
    setShipmentQuotesMap(prev => {
      const next = new Map(prev);
      for (const s of apiShipments) {
        if (!next.has(s.id)) {
          next.set(s.id, s.quotes);
        }
      }
      return next;
    });
  }, [apiShipments]);

  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);
  const [historyShipmentId, setHistoryShipmentId] = useState<number | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"threads" | "docs" | "quotes" | null>(null);
  const [moreMenuId, setMoreMenuId] = useState<number | null>(null);

  // Sync activeShipmentId ↔ URL param ?po=
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeShipmentId) {
      url.searchParams.set("po", activeShipmentId);
    } else {
      url.searchParams.delete("po");
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeShipmentId]);

  // Restore from URL on initial shipments load
  useEffect(() => {
    if (shipments.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const po = params.get("po");
    if (po && shipments.some(s => s.id === po)) {
      setActiveShipmentId(po);
    }
    // Run only once when shipments first populate
  }, [shipments.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: allMessages = [] } = useListMessages();
  const { data: allDocuments = [] } = useListDocuments();
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");
  const [poSearch, setPoSearch] = useState("");
  const [copiedPo, setCopiedPo] = useState<string | null>(null);

  const copyPo = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedPo(text);
    setTimeout(() => setCopiedPo(null), 1500);
  };
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Mark-paid form (rendered inside ShipmentDrawer)
  const [markPaidForm, setMarkPaidForm] = useState<MarkPaidForm | null>(null);
  const openMarkPaid = (shipmentId: string, paymentIdx: number) => {
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    const today = new Date().toISOString().split("T")[0];
    setMarkPaidForm({ shipmentId, paymentIdx, amount: String(ship.payments[paymentIdx].amountUsd), date: today, reference: "", method: "Wire", invoiceNumber: "", intermediarySupplierPaid: false, intermediarySupplierAmount: "", intermediarySupplierDate: today });
  };
  const confirmMarkPaid = () => {
    if (!markPaidForm) return;
    if (!markPaidForm.invoiceNumber.trim()) return;
    const { shipmentId, paymentIdx, amount, date, reference, method, invoiceNumber, intermediarySupplierPaid, intermediarySupplierAmount, intermediarySupplierDate } = markPaidForm;
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    const payment = ship.payments[paymentIdx];
    const paidAtIso = new Date(date).toISOString();
    const amountUsd = Math.round(Number(amount)) || payment.amountUsd;
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      const update = { ...payment, paid: true, amountUsd, paidAt: paidAtIso, paidMethod: method };
      return { ...s, payments: s.payments.map((p, idx) => idx === paymentIdx ? update : p) };
    }));
    const intermediarySupplierPaidUsd = intermediarySupplierPaid && intermediarySupplierAmount ? Math.round(Number(intermediarySupplierAmount)) || undefined : undefined;
    const intermediarySupplierPaidAt = intermediarySupplierPaid && intermediarySupplierDate ? new Date(intermediarySupplierDate).toISOString() : undefined;
    updatePayment(payment.paymentId, { paid: true, amountUsd, paidAt: paidAtIso, referenceNumber: reference || undefined, method, invoiceNumber: invoiceNumber.trim(), ...(intermediarySupplierPaidUsd ? { intermediarySupplierPaidUsd, intermediarySupplierPaidAt } : {}) }).catch(() => {});
    setToast("Payment marked as paid");
    setTimeout(() => setToast(null), 3000);
    setMarkPaidForm(null);
  };
  const undoPaymentPaid = (shipmentId: string, paymentIdx: number) => {
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    const payment = ship.payments[paymentIdx];
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      return { ...s, payments: s.payments.map((p, idx) => idx === paymentIdx ? { ...p, paid: false } : p) };
    }));
    updatePayment(payment.paymentId, { paid: false, paidAt: null, referenceNumber: null, method: null }).catch(() => {});
    setToast("Payment marked unpaid");
    setTimeout(() => setToast(null), 3000);
  };

  const [showNewPO, setShowNewPO] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<number | null>(null);
  const [buyerPoMode, setBuyerPoMode] = useState<"auto" | "provided">("auto");
  const { data: poConfig } = useGetPoNumberingConfig();
  const { data: existingDeals } = useListDeals();
  const queryClient = useQueryClient();
  const shipmentsQueryKey = getListShipmentsQueryKey();
  const updateShipmentMutation = useUpdateShipment();
  const { mutate: linkDeal } = useLinkDealToShipment({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: shipmentsQueryKey }); } },
  });
  const { mutate: unlinkDeal } = useUnlinkDealFromShipment({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: shipmentsQueryKey }); } },
  });
  const [linkPanelShipmentId, setLinkPanelShipmentId] = useState<number | null>(null);
  const [buyerPriceFormId, setBuyerPriceFormId] = useState<string | null>(null);
  const [buyerPriceDraft, setBuyerPriceDraft] = useState({ unitPrice: "", quantity: "" });
  const { mutate: patchDealForShipment, isPending: patchDealPending } = usePatchShipmentDeal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: shipmentsQueryKey });
        setBuyerPriceFormId(null);
      },
    },
  });
  const [newPOForm, setNewPOForm] = useState({
    poNumber: "", buyerPoNumber: "", product: "", category: "", customerName: "",
    supplierId: "", dueDate: "", exFactoryDate: "",
    destination: "", via: "OCEAN", notes: "",
    quantity: "", unitCostUsd: "",
    buyerUnitPrice: "", buyerQuantity: "",
  });
  type Milestone = { label: string; percent: string; dueDate: string };
  const defaultMilestones: Milestone[] = [
    { label: "Deposit", percent: "30", dueDate: "" },
    { label: "Balance", percent: "70", dueDate: "" },
  ];
  const [milestones, setMilestones] = useState<Milestone[]>(defaultMilestones);
  const [newPOError, setNewPOError] = useState<string | null>(null);
  const [poNumberError, setPoNumberError] = useState<string | null>(null);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [newPOFile, setNewPOFile] = useState<File | null>(null);
  const [newPODragOver, setNewPODragOver] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createShipmentMutation = useCreateShipment();
  const createSupplierMutation = useCreateSupplier();

  const toDateInput = (iso: string) => {
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ""; }
  };

  const resetNewPO = () => {
    setShowNewPO(false);
    setEditingShipmentId(null);
    setNewPOError(null);
    setPoNumberError(null);
    setMilestonesError(null);
    setNewPOFile(null);
    setNewPODragOver(false);
    setSupplierQuery("");
    setSupplierOpen(false);
    setMilestones(defaultMilestones);
    setBuyerPoMode("auto");
    setNewPOForm({ poNumber: "", buyerPoNumber: "", product: "", category: "", customerName: "", supplierId: "", dueDate: "", exFactoryDate: "", destination: "", via: "OCEAN", notes: "", quantity: "", unitCostUsd: "", buyerUnitPrice: "", buyerQuantity: "" });
  };

  const openEditPO = (shipment: UiShipment) => {
    setEditingShipmentId(shipment.shipmentId);
    setSupplierQuery(shipment.supplier);
    setNewPOForm({
      poNumber: shipment.po,
      buyerPoNumber: shipment.buyerPoNumber ?? "",
      product: shipment.product,
      category: shipment.category,
      customerName: shipment.customer,
      supplierId: String(shipment.supplierId),
      dueDate: toDateInput(shipment.rawDueDate),
      exFactoryDate: toDateInput(shipment.rawExFactoryDate),
      destination: shipment.destination,
      via: shipment.via,
      notes: shipment.notes ?? "",
      quantity: shipment.quantity != null ? String(shipment.quantity) : "",
      unitCostUsd: shipment.unitCostUsd != null ? String(shipment.unitCostUsd) : "",
      buyerUnitPrice: "",
      buyerQuantity: "",
    });
    setNewPOError(null);
    setPoNumberError(null);
    setMilestonesError(null);
    setShowNewPO(true);
  };

  const submitEditPO = async () => {
    setNewPOError(null);
    const resolvedSupplierId = newPOForm.supplierId;
    if (!newPOForm.product.trim() || !newPOForm.category.trim() || !newPOForm.customerName.trim() || !resolvedSupplierId || !newPOForm.dueDate || !newPOForm.exFactoryDate || !newPOForm.destination.trim()) {
      setNewPOError("Please fill in all required fields."); return;
    }
    try {
      const updated = await updateShipmentMutation.mutateAsync({
        id: editingShipmentId!,
        data: {
          supplierId: Number(resolvedSupplierId),
          product: newPOForm.product.trim(),
          category: newPOForm.category.trim(),
          customerName: newPOForm.customerName.trim(),
          dueDate: new Date(newPOForm.dueDate).toISOString(),
          exFactoryDate: new Date(newPOForm.exFactoryDate).toISOString(),
          destination: newPOForm.destination.trim(),
          via: newPOForm.via || undefined,
          notes: newPOForm.notes.trim() || null,
          quantity: newPOForm.quantity ? Number(newPOForm.quantity) : null,
          unitCostUsd: newPOForm.unitCostUsd ? Number(newPOForm.unitCostUsd) : null,
        },
      });
      const adapted = adaptShipments([updated], stages);
      setShipments(prev => prev.map(s => s.shipmentId === editingShipmentId ? (adapted[0] ?? s) : s));
      resetNewPO();
      setToast("PO updated");
      setTimeout(() => setToast(null), 3000);
    } catch {
      setNewPOError("Failed to update PO. Please try again.");
    }
  };

  const submitNewPO = async () => {
    setNewPOError(null);
    setPoNumberError(null);
    setMilestonesError(null);
    const resolvedSupplierId = newPOForm.supplierId;

    if (!newPOForm.buyerPoNumber.trim()) {
      setNewPOError("A buyer PO number is required. Generate one or enter a buyer-provided PO."); return;
    }
    if (!newPOForm.poNumber.trim() || !newPOForm.product.trim() || !newPOForm.category.trim() || !newPOForm.customerName.trim() || !resolvedSupplierId || !newPOForm.dueDate || !newPOForm.exFactoryDate || !newPOForm.destination.trim()) {
      setNewPOError("Please fill in all required fields."); return;
    }
    const totalPct = milestones.reduce((sum, m) => sum + (Number(m.percent) || 0), 0);
    if (totalPct !== 100) {
      setMilestonesError(`Payment percentages must sum to 100% (currently ${totalPct}%).`);
      return;
    }
    const qty = newPOForm.quantity ? Number(newPOForm.quantity) : undefined;
    const unitCost = newPOForm.unitCostUsd ? Number(newPOForm.unitCostUsd) : undefined;
    try {
      const created = await createShipmentMutation.mutateAsync({
        data: {
          poNumber: newPOForm.poNumber.trim(),
          buyerPoNumber: newPOForm.buyerPoNumber.trim() || undefined,
          product: newPOForm.product.trim(),
          category: newPOForm.category.trim(),
          customerName: newPOForm.customerName.trim(),
          supplierId: Number(resolvedSupplierId),
          dueDate: new Date(newPOForm.dueDate).toISOString(),
          exFactoryDate: new Date(newPOForm.exFactoryDate).toISOString(),
          destination: newPOForm.destination.trim(),
          via: newPOForm.via || undefined,
          notes: newPOForm.notes.trim() || undefined,
          status: "on-track",
          currentStageId: stages[0]?.id ?? "stage-1",
          quantity: qty,
          unitCostUsd: unitCost,
          buyerUnitPrice: newPOForm.buyerUnitPrice ? Number(newPOForm.buyerUnitPrice) : undefined,
          buyerQuantity: newPOForm.buyerQuantity ? Number(newPOForm.buyerQuantity) : undefined,
          payments: milestones.map(m => ({
            label: m.label,
            percent: Number(m.percent),
            dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : new Date(newPOForm.dueDate).toISOString(),
          })),
        },
      });
      const adapted = adaptShipments([created], stages);
      setShipments(prev => [...prev, ...adapted]);

      if (newPOFile) {
        const fd = new FormData();
        fd.append("file", newPOFile);
        fd.append("shipmentId", String(created.id));
        fd.append("sourceChannel", "upload");
        fetch(`${import.meta.env.BASE_URL}api/documents`, { method: "POST", body: fd }).catch(() => {});
      }

      resetNewPO();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setPoNumberError("A PO with this number already exists. Please use a different PO number.");
      } else {
        setNewPOError("Failed to create PO. Please try again.");
      }
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? aiInput).trim();
    if (!text || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", text }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const history = aiMessages.map(m => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));
      const res = await fetch(`${import.meta.env.BASE_URL}api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json() as { reply: string };
      setAiMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't connect to the AI. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleChipClick = (chip: string) => {
    void sendMessage(chip);
  };

  const focusShipment = (shipmentId: string) => {
    setActiveShipmentId(shipmentId);
    document.getElementById(`shipment-${shipmentId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const toggleTask = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const nextDone = !t.done;
    setTasks(prev => prev.map(x => x.id === id ? { ...x, done: nextDone } : x));
    updateTask(t.taskId, { done: nextDone }).catch(() => {});
  };

  const CUSTOMERS = (() => {
    const counts = new Map<string, number>();
    for (const s of shipments) counts.set(s.customer, (counts.get(s.customer) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, count], i) => ({ id: `c${i + 1}`, name, count }));
  })();

  const SUPPLIERS = (() => {
    const counts = new Map<string, number>();
    for (const s of shipments) counts.set(s.supplier, (counts.get(s.supplier) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, count], i) => ({ id: `s${i + 1}`, name, count }));
  })();

  const visibleShipments = shipments.filter(s => {
    if (customerFilter && s.customer !== customerFilter) return false;
    if (supplierFilter && s.supplier !== supplierFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (poSearch.trim()) {
      const q = poSearch.toLowerCase().trim();
      const matchesSupplier = s.po.toLowerCase().includes(q);
      const matchesBuyer = (s.buyerPoNumbers ?? []).some(bpo => bpo.toLowerCase().includes(q))
        || (s.buyerPoNumber ?? "").toLowerCase().includes(q);
      if (!matchesSupplier && !matchesBuyer) return false;
    }
    return true;
  });

  const highCount  = tasks.filter(t => t.urgency === "high"   && !t.done).length;
  const doneCount  = tasks.filter(t => t.done).length;

  return (
    <>
    {toast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#212833] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom-5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
      </div>
    )}
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

        {/* LEFT PANE — Nav + Tasks */}
        <NavSidebar
          counts={{
            myOrders: shipments.length,
            riskRadar: radarData ? radarData.items.filter(i => i.riskScore >= 70).length : null,
          }}
        >
          <ScrollArea className="flex-1">
            <div className="px-3 pb-3">

              {/* Today's Focus — top of sidebar */}
              <div className="px-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-[#5E687B] uppercase flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#9000FF]" /> Today's Focus
                </span>
                {doneCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <CheckCircle2 className="w-3 h-3" />{doneCount}/{tasks.length}
                  </span>
                )}
              </div>

              <div className="space-y-1 mb-4">
                {tasks.map(task => (
                  <div key={task.id}
                    onClick={() => focusShipment(task.shipmentId)}
                    className={`group flex items-start gap-2 p-2 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-[#9000FF]/20 cursor-pointer transition-all ${task.done ? "opacity-50" : ""} ${activeShipmentId === task.shipmentId ? "bg-white border-[#9000FF]/20 shadow-sm" : ""}`}>
                    <button onClick={e => { e.stopPropagation(); toggleTask(task.id); }}
                      className={`mt-0.5 shrink-0 transition-colors ${task.done ? "text-[#9000FF]" : "text-[#D6E3EB] hover:text-[#9000FF]"}`}>
                      {task.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDot(task.urgency)}`} />
                        <p className={`text-[12px] font-medium text-[#212833] leading-snug line-clamp-2 ${task.done ? "line-through text-[#5E687B]" : ""}`}>{task.title}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#5E687B] pl-3">
                        <CalendarClock className="w-2.5 h-2.5" />
                        <span>{task.source}</span>
                        <span className="opacity-40">·</span>
                        <span className={task.urgency === "high" && !task.done ? "text-red-500 font-semibold" : ""}>{task.sourceAge}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-3" />

              {/* Filters — collapsible, collapsed by default */}
              <button
                onClick={() => setFiltersOpen(o => !o)}
                className="w-full px-2 mb-1 flex items-center justify-between group hover:bg-[#E5EAF0] rounded-md py-1 transition-colors"
              >
                <span className="text-xs font-bold tracking-wider text-[#5E687B] uppercase flex items-center gap-1.5">
                  <Filter className="w-3 h-3" /> Filters
                  {(customerFilter || supplierFilter) && <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0" />}
                </span>
                {filtersOpen
                  ? <ChevronDown className="w-3 h-3 text-[#5E687B]" />
                  : <ChevronRight className="w-3 h-3 text-[#5E687B]" />}
              </button>

              {filtersOpen && (
                <div className="mt-1">
                  <div className="mb-1 px-2">
                    <span className="text-xs font-semibold tracking-wider text-[#9E9FAE] uppercase">Suppliers</span>
                  </div>
                  <div className="space-y-0.5 mb-3">
                    {SUPPLIERS.map(s => (
                      <button key={s.id} onClick={() => setSupplierFilter(supplierFilter === s.name ? null : s.name)}
                        className={`w-full flex items-center justify-between px-2 h-7 rounded-md transition-colors ${supplierFilter === s.name ? "bg-white border border-[#9000FF]/20 text-[#9000FF] font-semibold" : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                        <span className="flex items-center gap-1.5 truncate">
                          <Hash className="w-3 h-3 opacity-50 shrink-0" />
                          <span className="truncate text-xs">{s.name}</span>
                        </span>
                        <span className="text-xs bg-[#E5EAF0] px-1.5 rounded shrink-0 ml-1">{s.count}</span>
                      </button>
                    ))}
                    {supplierFilter && (
                      <button onClick={() => setSupplierFilter(null)}
                        className="w-full text-xs text-[#9000FF] hover:underline flex items-center gap-1 px-2 mt-1">
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  <div className="mb-1 px-2">
                    <span className="text-xs font-semibold tracking-wider text-[#9E9FAE] uppercase">Buyers</span>
                  </div>
                  <div className="space-y-0.5 mb-3">
                    {CUSTOMERS.map(c => (
                      <button key={c.id} onClick={() => setCustomerFilter(customerFilter === c.name ? null : c.name)}
                        className={`w-full flex items-center justify-between px-2 h-7 rounded-md transition-colors ${customerFilter === c.name ? "bg-white border border-[#9000FF]/20 text-[#9000FF] font-semibold" : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                        <span className="flex items-center gap-1.5 truncate">
                          <Hash className="w-3 h-3 opacity-50 shrink-0" />
                          <span className="truncate text-xs">{c.name}</span>
                        </span>
                        <span className="text-xs bg-[#E5EAF0] px-1.5 rounded shrink-0 ml-1">{c.count}</span>
                      </button>
                    ))}
                    {customerFilter && (
                      <button onClick={() => setCustomerFilter(null)}
                        className="w-full text-xs text-[#9000FF] hover:underline flex items-center gap-1 px-2 mt-1">
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </NavSidebar>

        <div className="flex-1 flex flex-col overflow-hidden">

        <div className="flex-1 flex overflow-hidden">

        {/* CENTER PANE — Shipment Command Horizon */}
        <div className="flex-1 bg-white flex flex-col min-w-0">
          <div className="h-12 border-b border-[#E5EAF0] flex items-center gap-3 px-5 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <h1 className="text-sm font-bold text-[#212833]">My Orders</h1>
              <span className="text-xs text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-0.5 rounded-full">
                {visibleShipments.length} of {shipments.length} POs
              </span>
            </div>
            {/* PO Search */}
            <div className="flex-1 max-w-[220px] relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9E9FAE] pointer-events-none" />
              <input
                type="text"
                value={poSearch}
                onChange={e => setPoSearch(e.target.value)}
                placeholder="Supplier or buyer PO…"
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#F0F4F8] border border-transparent rounded-lg outline-none focus:bg-white focus:border-[#9000FF]/30 focus:ring-1 focus:ring-[#9000FF]/10 placeholder:text-[#C0C8D4] transition-all"
              />
              {poSearch && (
                <button onClick={() => setPoSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9FAE] hover:text-[#5E687B]">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {/* Status filter chips */}
              {(["all", "on-track", "at-risk", "delayed"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${statusFilter === s
                    ? s === "all" ? "bg-[#212833] text-white border-[#212833]"
                      : s === "on-track" ? "bg-emerald-500 text-white border-emerald-500"
                      : s === "at-risk"  ? "bg-amber-500 text-white border-amber-500"
                      : "bg-red-500 text-white border-red-500"
                    : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#D6E3EB]"
                  }`}>
                  {s === "all" ? "All" : s === "on-track" ? "On Track" : s === "at-risk" ? "At Risk" : "Delayed"}
                </button>
              ))}
              <Separator orientation="vertical" className="h-5 mx-1" />
              <button onClick={() => setShowNewPO(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-[#9000FF] hover:bg-[#7A00D9] px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> New PO
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-4">
              {visibleShipments.map(shipment => {
                const stageIdx  = stages.findIndex(s => s.id === shipment.currentStageId);
                const stagePct  = stages.length > 1 ? (Math.max(0, stageIdx) / (stages.length - 1)) * 100 : 0;
                const isActive  = activeShipmentId === shipment.id;
                const balanceOverdue = shipment.payments[1] != null && !shipment.payments[1].paid && new Date(`${shipment.payments[1].dueDate} 2026`) < new Date();

                return (
                  <div key={shipment.id}
                    id={`shipment-${shipment.id}`}
                    onClick={() => { setActiveShipmentId(isActive ? null : shipment.id); }}
                    className={`border rounded-xl p-4 transition-all cursor-pointer ${isActive ? "border-[#9000FF]/30 shadow-md bg-[#FAFBFF]" : "border-[#E5EAF0] bg-white hover:border-[#D6E3EB] hover:shadow-sm"}`}>

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider">Supplier PO</span>
                            <button
                              type="button"
                              onClick={e => copyPo(shipment.po, e)}
                              title="Copy supplier PO"
                              className={`group/po flex items-center gap-1 font-mono text-xs font-bold px-1.5 py-0.5 rounded border transition-colors ${isActive ? "bg-[#9000FF]/10 text-[#9000FF] border-[#9000FF]/20 hover:bg-[#9000FF]/15" : "bg-[#FAFBFC] text-[#5E687B] border-[#E5EAF0] hover:border-[#D6E3EB]"}`}>
                              {highlightMatch(shipment.po, poSearch)}
                              {copiedPo === shipment.po
                                ? <CheckIcon className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                : <Copy className="w-2.5 h-2.5 opacity-0 group-hover/po:opacity-60 shrink-0 transition-opacity" />}
                            </button>
                            <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider ml-1">Buyer PO</span>
                            {shipment.buyerPoNumbers && shipment.buyerPoNumbers.length > 0 ? (
                              <>
                                {shipment.buyerPoNumbers.map((bpo) => (
                                  <button
                                    key={bpo}
                                    type="button"
                                    onClick={e => copyPo(bpo, e)}
                                    title="Copy buyer PO"
                                    className="group/bpo flex items-center gap-1 font-mono text-xs font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors">
                                    {highlightMatch(bpo, poSearch)}
                                    {copiedPo === bpo
                                      ? <CheckIcon className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                      : <Copy className="w-2.5 h-2.5 opacity-0 group-hover/bpo:opacity-60 shrink-0 transition-opacity" />}
                                  </button>
                                ))}
                              </>
                            ) : shipment.buyerPoNumber ? (
                              <button
                                type="button"
                                onClick={e => copyPo(shipment.buyerPoNumber!, e)}
                                title="Copy buyer PO"
                                className="group/bpo flex items-center gap-1 font-mono text-xs font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors">
                                {highlightMatch(shipment.buyerPoNumber!, poSearch)}
                                {copiedPo === shipment.buyerPoNumber
                                  ? <CheckIcon className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                  : <Copy className="w-2.5 h-2.5 opacity-0 group-hover/bpo:opacity-60 shrink-0 transition-opacity" />}
                              </button>
                            ) : (
                              <>
                                <span className="font-mono text-xs text-[#C0C8D4] px-1.5 py-0.5 rounded border border-dashed border-[#E5EAF0]">—</span>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); setActiveShipmentId(shipment.id); setLinkPanelShipmentId(shipment.shipmentId); }}
                                  className="text-[11px] font-semibold text-[#9000FF] hover:underline flex items-center gap-0.5 transition-colors">
                                  <Link2 className="w-2.5 h-2.5" />Link deal
                                </button>
                              </>
                            )}
                            <span className="text-xs bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] px-1.5 py-0.5 rounded font-medium">
                              {shipment.customer}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[#212833]">{shipment.product}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#5E687B]">
                            <div className="w-4 h-4 rounded bg-[#F0F4F8] flex items-center justify-center text-[11px] font-bold text-[#5E687B]">
                              {shipment.supplier.charAt(0)}
                            </div>
                            {shipment.supplier}
                          </div>
                          {(() => {
                            const sup = apiSuppliers.find(s => s.name === shipment.supplier);
                            return sup?.contactEmail
                              ? <span className="text-[11px] text-[#9E9FAE] truncate max-w-[140px]">{sup.contactEmail}</span>
                              : null;
                          })()}
                        </div>
                        <span className="text-[#D6E3EB]">·</span>
                        <div className="flex items-center gap-1 text-xs text-[#5E687B]">
                          <Clock className="w-3 h-3" />{shipment.dueDate}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCls(shipment.status)}`}>
                          {shipment.status === "at-risk" ? "At Risk" : shipment.status === "delayed" ? "Delayed" : "On Track"}
                        </span>
                        {shipment.spreadPct !== null ? (() => {
                          const pct = shipment.spreadPct!;
                          const cls = pct >= 25
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : pct >= 10
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200";
                          return (
                            <span className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded border ${cls}`} title="Your spread (buyer price − supplier cost)">
                              <DollarSign className="w-2.5 h-2.5" />
                              {pct.toFixed(1)}%{shipment.spreadUsd !== null ? ` · $${Math.round(shipment.spreadUsd!).toLocaleString()}` : ""}
                            </span>
                          );
                        })() : (
                          <span className="flex items-center gap-0.5 text-[11px] text-[#C0C8D4] px-1.5 py-0.5 rounded border border-[#E5EAF0]" title="No deal linked — add a buyer PO to see spread">
                            <DollarSign className="w-2.5 h-2.5" />—
                          </span>
                        )}
                        {riskByShipmentId.has(shipment.shipmentId) && (() => {
                          const score = riskByShipmentId.get(shipment.shipmentId)!;
                          return (
                            <span className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded border ${score >= 70 ? "bg-red-50 text-red-600 border-red-100" : score >= 45 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                              <ShieldAlert className="w-2.5 h-2.5" />{score}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Stage tracker header */}
                    <div className="flex items-center justify-between mb-1 mt-1">
                      <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider">Stage Tracker</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button onClick={e => e.stopPropagation()} className="text-[#C0C8D4] hover:text-[#9000FF] transition-colors">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 text-[12px]" align="end">
                          <p className="font-semibold text-[#212833] mb-1">Stage Tracker</p>
                          <p className="text-[#5E687B] leading-relaxed">Every shipment moves through {stages.length} milestones from {stages[0]?.label ?? "the first stage"} to {stages[stages.length - 1]?.label ?? "the last stage"}. Click "Advance Stage" to log a stage change with an optional note.</p>
                          <Link to="/help#track-shipment" className="mt-2 inline-flex items-center gap-1 text-[#9000FF] hover:underline text-[11px] font-medium">
                            Learn more →
                          </Link>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Visual stage timeline */}
                    <div className="relative py-3 mb-3">
                      {/* Track */}
                      <div className="absolute top-[18px] left-0 w-full h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${stagePct}%`,
                            background: shipment.status === "delayed" ? "#EF4444"
                              : shipment.status === "at-risk" ? "#F59E0B"
                              : "linear-gradient(to right, #9000FF, #B040FF)"
                          }} />
                      </div>

                      {/* Stage dots */}
                      <div className="relative flex justify-between">
                        {stages.map((stage, idx) => {
                          const isPast    = idx < stageIdx;
                          const isCurrent = idx === stageIdx;
                          return (
                            <div key={stage.id} className="flex flex-col items-center">
                              <div className={`w-2.5 h-2.5 rounded-full border-2 z-10 bg-white transition-all ${
                                isCurrent
                                  ? shipment.status === "delayed" ? "border-red-500 ring-4 ring-red-500/10"
                                    : shipment.status === "at-risk" ? "border-amber-500 ring-4 ring-amber-500/10"
                                    : "border-[#9000FF] ring-4 ring-[#9000FF]/10"
                                  : isPast
                                    ? shipment.status === "delayed" ? "border-red-400"
                                      : shipment.status === "at-risk" ? "border-amber-400"
                                      : "border-[#9000FF]"
                                    : "border-[#D6E3EB]"}`}
                              />
                              {isCurrent && (
                                <span className={`absolute top-6 text-[11px] font-bold whitespace-nowrap -translate-x-1/2 left-1/2 ${
                                  shipment.status === "delayed" ? "text-red-500"
                                  : shipment.status === "at-risk" ? "text-amber-600"
                                  : "text-[#9000FF]"}`}>
                                  {stage.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stage labels — compact, only boundaries */}
                    <div className="flex justify-between text-[11px] text-[#9E9FAE] mb-3 px-0.5">
                      <span>{stages[0]?.label}</span>
                      <span>{stages[Math.floor(stages.length / 2)]?.label}</span>
                      <span>{stages[stages.length - 1]?.label}</span>
                    </div>

                    {/* Payment chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {shipment.payments.map((p, i) => {
                        const overdue = !p.paid && new Date(`${p.dueDate} 2026`) < new Date();
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${
                              p.paid   ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : overdue ? "bg-red-50 text-red-600 border-red-100 animate-pulse"
                              : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                              {p.paid ? <CheckCircle2 className="w-2.5 h-2.5" /> : overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                              {p.label}: ${p.amountUsd.toLocaleString()} {p.paid ? `paid ${p.paidAt ? shortDate(p.paidAt) : ""}`.trim() : overdue ? "OVERDUE" : `due ${p.dueDate}`}
                            </div>

                            {isActive && !p.paid && markPaidForm?.shipmentId !== shipment.id && (
                              <button type="button" onClick={e => { e.stopPropagation(); openMarkPaid(shipment.id, i); }}
                                className="text-[11px] font-semibold px-1.5 py-0.5 rounded border bg-[#9000FF] text-white border-[#9000FF] hover:bg-[#7A00D9] transition-colors shrink-0">
                                Mark Paid
                              </button>
                            )}
                            {isActive && p.paid && (
                              <button type="button" onClick={e => { e.stopPropagation(); undoPaymentPaid(shipment.id, i); }}
                                className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-white text-[#5E687B] border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors shrink-0">
                                Undo
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Next stage hint */}
                      {stageIdx >= 0 && stageIdx < stages.length - 1 && (
                        <div className="ml-auto flex items-center gap-1 text-[11px] text-[#9E9FAE]">
                          <span>Next:</span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="font-medium text-[#5E687B]">{stages[stageIdx + 1]?.label}</span>
                        </div>
                      )}
                    </div>


                    {/* History section */}
                    {historyShipmentId === shipment.id && (
                      <div className="mt-3 pt-3 border-t border-[#E5EAF0]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="w-3 h-3 text-[#9000FF]" />
                          <span className="text-xs font-bold text-[#5E687B] uppercase tracking-wider">Stage History</span>
                        </div>
                        <StageHistory
                          shipmentId={shipment.shipmentId}
                          stageLabels={Object.fromEntries(stages.map(s => [s.id, s.label]))}
                        />
                      </div>
                    )}

                    {/* Buyer PO Links (many-to-many management) — visible when card is active */}
                    {isActive && (
                      <div className="mt-3 pt-3 border-t border-[#E5EAF0]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider flex items-center gap-1"><Link2 className="w-2.5 h-2.5"/>Buyer PO Links</span>
                          <button type="button"
                            onClick={() => setLinkPanelShipmentId(linkPanelShipmentId === shipment.shipmentId ? null : shipment.shipmentId)}
                            className="text-[11px] font-semibold text-[#9000FF] hover:underline">
                            {linkPanelShipmentId === shipment.shipmentId ? "Close" : "Manage"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {shipment.buyerPoNumbers.length === 0 && !shipment.buyerPoNumber && (
                            <span className="text-[11px] text-[#C0C8D4] italic">No buyer PO linked</span>
                          )}
                          {(shipment.buyerPoNumbers.length > 0 ? shipment.buyerPoNumbers : (shipment.buyerPoNumber ? [shipment.buyerPoNumber] : [])).map(bpo => {
                            const deal = existingDeals?.find(d => d.buyerPoNumber === bpo);
                            return (
                              <span key={bpo} className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                {bpo}
                                {deal && linkPanelShipmentId === shipment.shipmentId && (
                                  <button type="button" title="Unlink" onClick={() => unlinkDeal({ id: shipment.shipmentId, dealId: deal.id })}
                                    className="text-red-400 hover:text-red-600 ml-0.5">×</button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        {linkPanelShipmentId === shipment.shipmentId && existingDeals && (
                          <div className="border border-[#E5EAF0] rounded-md overflow-hidden max-h-[120px] overflow-y-auto">
                            {existingDeals
                              .filter(d => !shipment.buyerPoNumbers.includes(d.buyerPoNumber) && d.buyerPoNumber !== shipment.buyerPoNumber)
                              .map(d => (
                                <button key={d.id} type="button"
                                  onClick={() => linkDeal({ id: shipment.shipmentId, data: { dealId: d.id } })}
                                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50 border-b border-[#F0F4F8] last:border-b-0 transition-colors">
                                  <span className="text-xs font-mono font-semibold text-emerald-700">{d.buyerPoNumber}</span>
                                  <span className="text-[11px] text-[#5E687B] truncate">{d.customerName}</span>
                                  <span className="ml-auto text-[11px] text-[#9000FF] font-semibold shrink-0">+ Link</span>
                                </button>
                              ))}
                            {existingDeals.filter(d => !shipment.buyerPoNumbers.includes(d.buyerPoNumber) && d.buyerPoNumber !== shipment.buyerPoNumber).length === 0 && (
                              <p className="text-xs text-[#C0C8D4] italic px-3 py-2">All available deals are already linked</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buyer Price — edit buyer unit price & quantity for spread tracking */}
                    {isActive && (
                      <div className="mt-3 pt-3 border-t border-[#E5EAF0]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider flex items-center gap-1">
                            <DollarSign className="w-2.5 h-2.5"/>Buyer Price
                          </span>
                          <button type="button"
                            onClick={() => {
                              if (buyerPriceFormId === shipment.id) {
                                setBuyerPriceFormId(null);
                              } else {
                                setBuyerPriceFormId(shipment.id);
                                setBuyerPriceDraft({
                                  unitPrice: shipment.buyerUnitPrice != null ? String(shipment.buyerUnitPrice) : "",
                                  quantity: shipment.buyerQuantity != null ? String(shipment.buyerQuantity) : "",
                                });
                              }
                            }}
                            className="text-[11px] font-semibold text-[#9000FF] hover:underline">
                            {buyerPriceFormId === shipment.id ? "Cancel" : shipment.spreadPct !== null ? "Edit" : "Add"}
                          </button>
                        </div>
                        {shipment.spreadPct !== null && buyerPriceFormId !== shipment.id && (
                          <div className="text-xs text-[#5E687B]">
                            ${shipment.buyerUnitPrice?.toFixed(2) ?? "—"} × {shipment.buyerQuantity?.toLocaleString() ?? "—"} &nbsp;·&nbsp;
                            <span className={`font-semibold ${shipment.spreadPct >= 25 ? "text-emerald-700" : shipment.spreadPct >= 10 ? "text-amber-700" : "text-red-700"}`}>
                              {shipment.spreadPct.toFixed(1)}% spread
                            </span>
                          </div>
                        )}
                        {shipment.spreadPct === null && buyerPriceFormId !== shipment.id && (
                          <span className="text-[11px] text-[#C0C8D4] italic">No buyer price set — spread unavailable</span>
                        )}
                        {buyerPriceFormId === shipment.id && (
                          <>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Unit Price (USD)</label>
                                <input type="number" min="0" step="0.01"
                                  value={buyerPriceDraft.unitPrice}
                                  onChange={e => setBuyerPriceDraft(d => ({ ...d, unitPrice: e.target.value }))}
                                  placeholder="0.00"
                                  className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Quantity</label>
                                <input type="number" min="1" step="1"
                                  value={buyerPriceDraft.quantity}
                                  onChange={e => setBuyerPriceDraft(d => ({ ...d, quantity: e.target.value }))}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                              </div>
                              <button type="button"
                                disabled={!buyerPriceDraft.unitPrice || !buyerPriceDraft.quantity || patchDealPending}
                                onClick={() => {
                                  const up = Number(buyerPriceDraft.unitPrice);
                                  const qty = Number(buyerPriceDraft.quantity);
                                  if (!up || !qty) return;
                                  patchDealForShipment({ id: shipment.shipmentId, data: { buyerUnitPrice: up, buyerQuantity: qty } });
                                }}
                                className="text-[11px] bg-[#9000FF] text-white px-2 py-1 rounded-md font-semibold hover:bg-[#7A00D9] disabled:opacity-50 shrink-0">
                                {patchDealPending ? "…" : "Save"}
                              </button>
                            </div>
                            {buyerPriceDraft.unitPrice && buyerPriceDraft.quantity && (() => {
                              const buyerTotal = Number(buyerPriceDraft.unitPrice) * Number(buyerPriceDraft.quantity);
                              const supplierTotal = shipment.payments.reduce((s, p) => s + p.amountUsd, 0);
                              const spread = buyerTotal - supplierTotal;
                              const pct = buyerTotal > 0 ? (spread / buyerTotal) * 100 : 0;
                              const cls = pct >= 25 ? "text-emerald-700" : pct >= 10 ? "text-amber-700" : "text-red-700";
                              return (
                                <div className={`mt-1 text-[11px] font-semibold ${cls}`}>
                                  Preview: {pct.toFixed(1)}% · ${Math.round(spread).toLocaleString()}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}

                    {/* Mark-paid inline form */}
                    {isActive && markPaidForm?.shipmentId === shipment.id && (
                      <div className="mt-2 p-2.5 bg-white border border-[#9000FF]/20 rounded-lg shadow-sm space-y-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#9000FF] uppercase tracking-wider">Record Payment — {shipment.payments[markPaidForm.paymentIdx].label}</p>
                          <button type="button" onClick={() => setMarkPaidForm(null)} className="text-[#9E9FAE] hover:text-[#212833]"><X className="w-3 h-3"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Amount (USD)</label>
                            <input type="number" min="0" value={markPaidForm.amount}
                              onChange={e => setMarkPaidForm(f => f ? { ...f, amount: e.target.value } : f)}
                              className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                          </div>
                          <div>
                            <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Payment Date</label>
                            <input type="date" value={markPaidForm.date}
                              onChange={e => setMarkPaidForm(f => f ? { ...f, date: e.target.value } : f)}
                              className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                          </div>
                          <div>
                            <label className="text-xs text-[#5E687B] font-medium block mb-0.5">
                              Invoice # <span className="text-red-500">*</span>
                            </label>
                            <input type="text" value={markPaidForm.invoiceNumber} placeholder="e.g. INV-2026-001"
                              onChange={e => setMarkPaidForm(f => f ? { ...f, invoiceNumber: e.target.value } : f)}
                              className={`w-full px-2 py-1 text-xs border rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] placeholder:text-[#9E9FAE] ${!markPaidForm.invoiceNumber.trim() ? "border-red-300 focus:border-red-400" : "border-[#E5EAF0] focus:border-[#9000FF]/40"}`}/>
                          </div>
                          <div>
                            <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Reference # (optional)</label>
                            <input type="text" value={markPaidForm.reference} placeholder="e.g. TXN-2026-001"
                              onChange={e => setMarkPaidForm(f => f ? { ...f, reference: e.target.value } : f)}
                              className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] placeholder:text-[#9E9FAE]"/>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Method</label>
                            <select value={markPaidForm.method}
                              onChange={e => setMarkPaidForm(f => f ? { ...f, method: e.target.value } : f)}
                              className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] bg-white">
                              <option>Wire</option>
                              <option>Credit</option>
                              <option>Other</option>
                            </select>
                          </div>
                        </div>
                        {/* Intermediary payment to supplier */}
                        <div className="border border-[#E5EAF0] rounded-lg p-2 space-y-1.5">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={markPaidForm.intermediarySupplierPaid}
                              onChange={e => setMarkPaidForm(f => f ? { ...f, intermediarySupplierPaid: e.target.checked } : f)}
                              className="accent-[#9000FF] w-3 h-3"/>
                            <span className="text-[11px] font-semibold text-[#5E687B]">Intermediary paid supplier</span>
                          </label>
                          {markPaidForm.intermediarySupplierPaid && (
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <div>
                                <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Amount (USD)</label>
                                <input type="number" min="0" value={markPaidForm.intermediarySupplierAmount} placeholder="0"
                                  onChange={e => setMarkPaidForm(f => f ? { ...f, intermediarySupplierAmount: e.target.value } : f)}
                                  className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                              </div>
                              <div>
                                <label className="text-xs text-[#5E687B] font-medium block mb-0.5">Date Paid</label>
                                <input type="date" value={markPaidForm.intermediarySupplierDate}
                                  onChange={e => setMarkPaidForm(f => f ? { ...f, intermediarySupplierDate: e.target.value } : f)}
                                  className="w-full px-2 py-1 text-xs border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                              </div>
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={confirmMarkPaid} disabled={!markPaidForm.invoiceNumber.trim()}
                          className="w-full py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-[#9000FF] text-white hover:bg-[#7A00D9] disabled:hover:bg-[#9000FF]">
                          <CheckCircle2 className="w-3 h-3"/> Confirm Payment
                        </button>
                      </div>
                    )}

                    {/* Expanded detail row */}
                    {isActive && (
                      <div onClick={e => e.stopPropagation()}>
                        <div className="mt-3 pt-3 border-t border-[#E5EAF0] flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Open Threads tab */}
                            <button
                              onClick={e => { e.stopPropagation(); setActiveDetailTab(t => t === "threads" ? null : "threads"); }}
                              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${activeDetailTab === "threads" ? "bg-[#9000FF] text-white hover:bg-[#7A00D9]" : "bg-white border border-[#E5EAF0] text-[#212833] hover:bg-[#F0F4F8]"}`}>
                              <MessageCircle className="w-3 h-3" /> Open Threads
                            </button>
                            {/* View Docs tab */}
                            <button
                              onClick={e => { e.stopPropagation(); setActiveDetailTab(t => t === "docs" ? null : "docs"); }}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${activeDetailTab === "docs" ? "bg-[#9000FF] text-white font-semibold hover:bg-[#7A00D9]" : "bg-white border border-[#E5EAF0] text-[#212833] hover:bg-[#F0F4F8]"}`}>
                              <FileText className="w-3 h-3" /> View Docs
                            </button>
                            {/* Factory Quotes tab */}
                            <button
                              onClick={e => { e.stopPropagation(); setActiveDetailTab(t => t === "quotes" ? null : "quotes"); }}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${activeDetailTab === "quotes" ? "bg-[#9000FF] text-white font-semibold hover:bg-[#7A00D9]" : "bg-white border border-[#E5EAF0] text-[#212833] hover:bg-[#F0F4F8]"}`}>
                              <DollarSign className="w-3 h-3" /> Factory Quotes
                            </button>
                            {/* Advance Stage — unchanged */}
                            <button
                              onClick={e => { e.stopPropagation(); openAdvanceDialog(shipment); }}
                              className="text-xs bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md font-medium hover:bg-[#F0F4F8] transition-colors flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> Advance Stage
                            </button>
                            {/* History */}
                            <button
                              onClick={e => { e.stopPropagation(); setHistoryShipmentId(historyShipmentId === shipment.id ? null : shipment.id); }}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${historyShipmentId === shipment.id ? "bg-[#9000FF]/10 border border-[#9000FF]/20 text-[#9000FF]" : "bg-white border border-[#E5EAF0] text-[#212833] hover:bg-[#F0F4F8]"}`}>
                              <Clock className="w-3 h-3" /> History
                            </button>
                          </div>
                          <div className="relative">
                            <button
                              onClick={e => { e.stopPropagation(); setMoreMenuId(moreMenuId === shipment.id ? null : shipment.id); }}
                              className="text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8] p-1 rounded transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {moreMenuId === shipment.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-8 z-50 w-48 bg-white border border-[#E5EAF0] rounded-xl shadow-lg py-1 text-[11px]">
                                {[
                                  { label: "Edit PO", action: () => { openEditPO(shipment); setMoreMenuId(null); } },
                                  { label: "Mark as At Risk", action: () => { setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, status: "at-risk" as const } : s)); setMoreMenuId(null); } },
                                  { label: "Mark as On Track", action: () => { setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, status: "on-track" as const } : s)); setMoreMenuId(null); } },
                                  { label: "Ask AI about this PO", action: () => { setAiInput(`Tell me about ${shipment.po}`); setMoreMenuId(null); } },
                                  { label: "Copy PO number", action: () => { navigator.clipboard.writeText(shipment.po); setMoreMenuId(null); } },
                                ].map(({ label, action }) => (
                                  <button key={label} onClick={action}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F0F4F8] text-[#212833] transition-colors">
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline detail panel — shown when a tab is active */}
                        {activeDetailTab !== null && (
                          <div className="mt-3 border border-[#E5EAF0] rounded-xl bg-white overflow-hidden">
                            {/* Threads panel */}
                            {activeDetailTab === "threads" && (() => {
                              const msgs: Message[] = allMessages
                                .filter((m: Message) => m.shipmentId === shipment.shipmentId)
                                .sort((a: Message, b: Message) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
                                .slice(0, 5);
                              return (
                                <div>
                                  <div className="px-4 py-2.5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#FAFBFC]">
                                    <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider">Recent Threads</span>
                                    <span className="text-[11px] text-[#C0C8D4]">{msgs.length} of {allMessages.filter((m: Message) => m.shipmentId === shipment.shipmentId).length}</span>
                                  </div>
                                  {msgs.length === 0 ? (
                                    <p className="text-xs text-[#C0C8D4] italic px-4 py-4 text-center">No messages for this shipment</p>
                                  ) : (
                                    <ul>
                                      {msgs.map((msg: Message) => (
                                        <li key={msg.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#F0F4F8] last:border-b-0 hover:bg-[#FAFBFC] transition-colors">
                                          <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 text-[#9000FF] flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                                            {msg.sender.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[11px] font-semibold text-[#212833] truncate">{msg.sender}</span>
                                              <span className="text-[11px] text-[#C0C8D4] shrink-0">{new Date(msg.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                            </div>
                                            {msg.subject && <p className="text-xs text-[#5E687B] font-medium truncate mt-0.5">{msg.subject}</p>}
                                            <p className="text-xs text-[#9E9FAE] truncate mt-0.5">{msg.snippet}</p>
                                          </div>
                                          {msg.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0 mt-2" />}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Docs panel */}
                            {activeDetailTab === "docs" && (() => {
                              const docs: DocumentWithExtraction[] = allDocuments
                                .filter((d: DocumentWithExtraction) => d.shipmentId === shipment.shipmentId)
                                .sort((a: DocumentWithExtraction, b: DocumentWithExtraction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .slice(0, 5);
                              return (
                                <div>
                                  <div className="px-4 py-2.5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#FAFBFC]">
                                    <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider">Attached Documents</span>
                                    <span className="text-[11px] text-[#C0C8D4]">{docs.length} of {allDocuments.filter((d: DocumentWithExtraction) => d.shipmentId === shipment.shipmentId).length}</span>
                                  </div>
                                  {docs.length === 0 ? (
                                    <p className="text-xs text-[#C0C8D4] italic px-4 py-4 text-center">No documents attached to this shipment</p>
                                  ) : (
                                    <ul>
                                      {docs.map((doc: DocumentWithExtraction) => (
                                        <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F0F4F8] last:border-b-0 hover:bg-[#FAFBFC] transition-colors">
                                          <FileText className="w-4 h-4 text-[#9000FF] shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-[#212833] truncate">{doc.fileName}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[11px] text-[#9E9FAE] uppercase">{doc.fileType}</span>
                                              <span className="text-[11px] text-[#C0C8D4]">·</span>
                                              <span className="text-[11px] text-[#9E9FAE]">{doc.sourceChannel}</span>
                                              <span className="text-[11px] text-[#C0C8D4]">·</span>
                                              <span className="text-[11px] text-[#9E9FAE]">{new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                            </div>
                                          </div>
                                          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${doc.status === "extracted" ? "bg-emerald-50 text-emerald-700" : "bg-[#F0F4F8] text-[#9E9FAE]"}`}>
                                            {doc.status}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Factory Quotes panel */}
                            {activeDetailTab === "quotes" && (
                              <div>
                                <div className="px-4 py-2.5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#FAFBFC]">
                                  <span className="text-[11px] font-bold text-[#9E9FAE] uppercase tracking-wider">Factory Quotes</span>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button onClick={e => e.stopPropagation()} className="text-[#C0C8D4] hover:text-[#9000FF] transition-colors">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-3 text-[12px]" align="end">
                                      <p className="font-semibold text-[#212833] mb-1">Factory Quotes</p>
                                      <p className="text-[#5E687B] leading-relaxed">Compare quotes from multiple factories. Select the winning quote to lock in the unit price — FlowForgeIQ tracks the margin automatically.</p>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="p-3">
                                  <QuotesTab
                                    shipmentId={shipment.shipmentId}
                                    quotes={shipmentQuotesMap.get(shipment.shipmentId) ?? []}
                                    currentStage={shipment.currentStage}
                                    supplierNames={apiSuppliers.map(s => s.name)}
                                    onQuotesChange={(updated) =>
                                      setShipmentQuotesMap(prev => new Map(prev).set(shipment.shipmentId, updated))
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANE — FlowForgeIQ AI */}
        <div className="w-[340px] bg-white border-l border-[#E5EAF0] flex flex-col shrink-0">
          <div className="h-12 border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0 bg-[#FAFBFC]">
            <div className="flex items-center gap-2 text-[#9000FF]">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">FlowForgeIQ AI</span>
            </div>
            <button className="h-7 w-7 flex items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 bg-gradient-to-b from-[#FAFBFC] to-white">
            <div className="p-4 space-y-4">

              {/* Briefing card */}
              <div className="bg-white border border-[#E5EAF0] shadow-sm rounded-xl p-3.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#9000FF] rounded-l-xl" />
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-3.5 h-3.5 text-[#9000FF]" />
                  <span className="text-xs font-bold text-[#212833] uppercase tracking-wider">Daily Briefing — May 15</span>
                </div>
                <p className="text-[12px] text-[#5E687B] leading-relaxed">
                  <span className="font-semibold text-red-500">2 overdue items</span> across 5 active POs.{" "}
                  <span className="font-medium text-[#212833]">PO-0142</span> balance of $8,960 missed its due date and Guangzhou is requesting a delay.{" "}
                  <span className="font-medium text-[#212833]">PO-0160</span> QC has passed — balance wire of $21,700 needed to release the container.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => handleChipClick("Draft all replies for overdue POs")} className="text-[11px] bg-[#9000FF] text-white px-2.5 py-1 rounded-full font-semibold hover:bg-[#7A00D9] transition-colors">
                    Draft all replies
                  </button>
                  <button onClick={() => handleChipClick("Show payment plan for all active POs")} className="text-[11px] bg-[#F0F4F8] text-[#5E687B] px-2.5 py-1 rounded-full font-medium hover:bg-[#E5EAF0] transition-colors">
                    Show payment plan
                  </button>
                </div>
              </div>

              {/* Chat history */}
              {CHAT.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                      <Sparkles className="w-3 h-3 text-[#9000FF]" />
                    </div>
                  )}
                  <div className={`max-w-[88%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#F0F4F8] text-[#212833] rounded-tr-sm"
                      : "bg-white border border-[#E5EAF0] shadow-sm text-[#212833] rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Additional messages */}
              {aiMessages.map((msg, i) => (
                <div key={`extra-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                      <Sparkles className="w-3 h-3 text-[#9000FF]" />
                    </div>
                  )}
                  <div className={`max-w-[88%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#F0F4F8] text-[#212833] rounded-tr-sm"
                      : "bg-white border border-[#E5EAF0] shadow-sm text-[#212833] rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Loading bubble */}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                    <Sparkles className="w-3 h-3 text-[#9000FF]" />
                  </div>
                  <div className="bg-white border border-[#E5EAF0] shadow-sm px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{animationDelay:"0ms"}} />
                    <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{animationDelay:"150ms"}} />
                    <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{animationDelay:"300ms"}} />
                  </div>
                </div>
              )}

              {/* Action chips */}
              {!aiLoading && (
                <div className="flex flex-wrap gap-2 ml-8">
                  {["Draft reply to Guangzhou", "Approve Tianjin delay", "Initiate wire $21,700", "Show PO-0168 quotes"].map(c => (
                    <button key={c} onClick={() => handleChipClick(c)} className="text-[11px] bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/15 transition-colors font-semibold">
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* AI input */}
          <div className="p-3 bg-white border-t border-[#E5EAF0]">
            <div className="flex items-center bg-[#F0F4F8] rounded-xl border border-transparent focus-within:border-[#9000FF]/30 focus-within:bg-white transition-colors">
              <button className="h-9 w-9 flex items-center justify-center shrink-0 text-[#5E687B] hover:text-[#212833]">
                <Paperclip className="w-4 h-4" />
              </button>
              <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void sendMessage(); }}
                disabled={aiLoading}
                placeholder="Ask about a shipment, supplier..."
                className="flex-1 bg-transparent text-xs h-10 focus:outline-none placeholder:text-[#A0ABB8] disabled:opacity-60" />
              <button onClick={() => void sendMessage()} disabled={aiLoading || !aiInput.trim()} className={`h-7 w-7 rounded-lg mr-1 shrink-0 flex items-center justify-center transition-colors ${aiInput.trim() && !aiLoading ? "bg-[#9000FF] hover:bg-[#7A00D9]" : "bg-[#E5EAF0]"}`}>
                {aiLoading
                  ? <span className="w-3 h-3 border-2 border-[#9000FF]/30 border-t-[#9000FF] rounded-full animate-spin" />
                  : <Send className={`w-3.5 h-3.5 ${aiInput.trim() ? "text-white" : "text-[#9E9FAE]"}`} />
                }
              </button>
            </div>
            <div className="mt-1.5 text-center">
              <span className="text-[11px] text-[#A0ABB8]">
                Press <kbd className="font-mono bg-[#F0F4F8] px-1 rounded border border-[#E5EAF0]">⌘</kbd> + <kbd className="font-mono bg-[#F0F4F8] px-1 rounded border border-[#E5EAF0]">K</kbd> to open command bar
              </span>
            </div>
          </div>
        </div>
        </div>

        </div>
    </div>

    {/* ── SHIPMENT DRAWER ── */}
    <ShipmentDrawer
      shipment={activeShipmentId ? (shipments.find(s => s.id === activeShipmentId) ?? null) : null}
      stages={stages}
      allMessages={allMessages}
      allDocuments={allDocuments}
      apiSuppliers={apiSuppliers}
      shipmentQuotesMap={shipmentQuotesMap}
      existingDeals={existingDeals}
      riskScore={activeShipmentId ? riskByShipmentId.get(shipments.find(s => s.id === activeShipmentId)?.shipmentId ?? -1) : undefined}
      markPaidForm={markPaidForm}
      setMarkPaidForm={setMarkPaidForm}
      openMarkPaid={openMarkPaid}
      confirmMarkPaid={confirmMarkPaid}
      undoPaymentPaid={undoPaymentPaid}
      buyerPriceFormId={buyerPriceFormId}
      setBuyerPriceFormId={setBuyerPriceFormId}
      buyerPriceDraft={buyerPriceDraft}
      setBuyerPriceDraft={setBuyerPriceDraft}
      patchDealForShipment={patchDealForShipment}
      patchDealPending={patchDealPending}
      linkPanelShipmentId={linkPanelShipmentId}
      setLinkPanelShipmentId={setLinkPanelShipmentId}
      linkDeal={linkDeal}
      unlinkDeal={unlinkDeal}
      openAdvanceDialog={openAdvanceDialog}
      openEditPO={openEditPO}
      setShipments={setShipments}
      setAiInput={setAiInput}
      setShipmentQuotesMap={setShipmentQuotesMap}
      onClose={() => setActiveShipmentId(null)}
    />

    {/* ── ADVANCE STAGE CONFIRMATION DIALOG ── */}
    {advanceTarget && (() => {
      const idx = stages.findIndex(st => st.id === advanceTarget.currentStageId);
      const next = stages[Math.min(idx + 1, stages.length - 1)];
      return (
        <Dialog open={true} onOpenChange={open => { if (!open) { setAdvanceTarget(null); setAdvanceNote(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#212833]">Advance Shipment Stage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <p className="text-xs text-[#5E687B]">
                <span className="font-semibold text-[#212833]">{advanceTarget.po}</span> — {advanceTarget.product}
              </p>
              <div className="flex items-center gap-3 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3">
                <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wider">Current</span>
                  <span className="text-[12px] font-semibold text-[#212833] text-center">{stages[idx]?.label ?? advanceTarget.currentStageId}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9000FF] shrink-0" />
                <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-[#9000FF] uppercase tracking-wider">Next</span>
                  <span className="text-[12px] font-bold text-[#9000FF] text-center">{next?.label ?? "—"}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1.5">
                  Note <span className="text-[#9E9FAE] font-normal">(optional — e.g. "QC passed, cert attached")</span>
                </label>
                <textarea
                  value={advanceNote}
                  onChange={e => setAdvanceNote(e.target.value)}
                  placeholder="Add context about this stage change..."
                  rows={3}
                  className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => { setAdvanceTarget(null); setAdvanceNote(""); }}
                className="px-4 py-2 text-xs font-semibold text-[#5E687B] hover:text-[#212833] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => void confirmAdvanceStage()}
                className="px-5 py-2 bg-[#9000FF] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#7A00D9] transition-colors">
                Confirm Advance
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    })()}

    {/* ── NEW PO / EDIT PO DIALOG ── */}
    <Dialog open={showNewPO} onOpenChange={open => { if (!open) resetNewPO(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#212833]">
            {editingShipmentId !== null ? "Edit Purchase Order" : "New Purchase Order"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* PO Document upload — create mode only */}
          {editingShipmentId === null && (
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1.5">PO Document <span className="text-[#9E9FAE] font-normal">(optional — PDF, Excel, Word)</span></label>
            {newPOFile ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#F7F9FA] border border-[#E5EAF0] rounded-md">
                <FileText className="w-4 h-4 text-[#9000FF] shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#212833] truncate">{newPOFile.name}</div>
                  <div className="text-xs text-[#9E9FAE]">{(newPOFile.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={() => setNewPOFile(null)} className="text-[#9E9FAE] hover:text-[#5E687B] transition-colors">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setNewPODragOver(true); }}
                onDragLeave={() => setNewPODragOver(false)}
                onDrop={e => { e.preventDefault(); setNewPODragOver(false); const f = e.dataTransfer.files[0]; if (f) setNewPOFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center gap-1.5 py-5 border-2 border-dashed rounded-md cursor-pointer transition-colors ${newPODragOver ? "border-[#9000FF] bg-[#9000FF]/5" : "border-[#E5EAF0] hover:border-[#9000FF]/40 hover:bg-[#F7F9FA]"}`}>
                <Upload className="w-5 h-5 text-[#9E9FAE]"/>
                <span className="text-xs text-[#5E687B]">Drop a file here or <span className="text-[#9000FF] font-medium">browse</span></span>
                <input ref={fileInputRef} type="file"
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setNewPOFile(f); }}/>
              </div>
            )}
          </div>
          )}

          {/* PO Numbers — create mode: full form; edit mode: read-only display */}
          {editingShipmentId !== null ? (
          <div className="space-y-2 bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
            <span className="text-xs font-bold text-[#5E687B] uppercase tracking-wider">PO Numbers (read-only)</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">Buyer PO</label>
                <input readOnly value={newPOForm.buyerPoNumber || "—"}
                  className="w-full border border-[#E5EAF0] bg-[#F0F4F8] rounded-md px-2 py-1.5 text-[11px] text-[#5E687B] font-mono outline-none cursor-default"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">Supplier PO</label>
                <input readOnly value={newPOForm.poNumber}
                  className="w-full border border-[#E5EAF0] bg-[#F0F4F8] rounded-md px-2 py-1.5 text-[11px] text-[#5E687B] font-mono outline-none cursor-default"/>
              </div>
            </div>
          </div>
          ) : (
          <div className="space-y-3 bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5E687B] uppercase tracking-wider">PO Numbers</span>
              {/* Mode toggle */}
              <div className="flex items-center border border-[#E5EAF0] rounded-md overflow-hidden text-xs font-semibold">
                <button type="button"
                  onClick={() => setBuyerPoMode("auto")}
                  className={`px-2.5 py-1 transition-colors ${buyerPoMode === "auto" ? "bg-[#9000FF] text-white" : "bg-white text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                  Auto-generate
                </button>
                <button type="button"
                  onClick={() => setBuyerPoMode("provided")}
                  className={`px-2.5 py-1 border-l border-[#E5EAF0] transition-colors ${buyerPoMode === "provided" ? "bg-[#9000FF] text-white" : "bg-white text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                  Buyer provided
                </button>
              </div>
            </div>

            {buyerPoMode === "auto" ? (
              <div className="space-y-2">
                <p className="text-xs text-[#9E9FAE]">
                  Click to auto-generate the next buyer + supplier PO pair from your numbering scheme. The counter advances on each use.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${import.meta.env.BASE_URL}api/settings/po-numbering/next`, { method: "POST" });
                      const data = await res.json() as { buyerPo: string; supplierPo: string };
                      setNewPOForm(p => ({ ...p, buyerPoNumber: data.buyerPo, poNumber: data.supplierPo }));
                      setPoNumberError(null);
                    } catch {}
                  }}
                  className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold text-[#9000FF] border border-[#9000FF]/30 px-3 py-2 rounded-md hover:bg-[#9000FF]/5 transition-colors">
                  ✦ Auto-fill next PO pair
                </button>
                {newPOForm.buyerPoNumber ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#5E687B] mb-1">Buyer PO <span className="text-[#9E9FAE] font-normal">(generated)</span></label>
                      <input readOnly value={newPOForm.buyerPoNumber}
                        className="w-full border border-emerald-200 bg-emerald-50 rounded-md px-2 py-1.5 text-[11px] text-emerald-700 font-mono outline-none cursor-default"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5E687B] mb-1">Supplier PO <span className="text-[#9E9FAE] font-normal">(override allowed)</span></label>
                      <input value={newPOForm.poNumber}
                        onChange={e => { setNewPOForm(p => ({ ...p, poNumber: e.target.value })); setPoNumberError(null); }}
                        className={`w-full border rounded-md px-2 py-1.5 text-[11px] font-mono outline-none focus:ring-1 transition-colors ${poNumberError ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-[#E5EAF0] focus:border-[#9000FF] focus:ring-[#9000FF]/20"}`}/>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 text-center">Click above to generate PO numbers before submitting.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                    Buyer PO <span className="text-[#9E9FAE] font-normal">(buyer → trader) — link existing or enter new</span>
                  </label>
                  {existingDeals && existingDeals.length > 0 && (
                    <div className="mb-2 border border-[#E5EAF0] rounded-md overflow-hidden divide-y divide-[#F0F4F8] max-h-28 overflow-y-auto">
                      {existingDeals.map(deal => (
                        <button
                          key={deal.id}
                          type="button"
                          onClick={() => {
                            const suffix = poConfig?.supplierSuffix ?? "S";
                            setNewPOForm(p => ({
                              ...p,
                              buyerPoNumber: deal.buyerPoNumber,
                              customerName: p.customerName || deal.customerName,
                              poNumber: p.poNumber || (deal.buyerPoNumber + suffix),
                            }));
                          }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50 transition-colors ${newPOForm.buyerPoNumber === deal.buyerPoNumber ? "bg-emerald-50" : "bg-white"}`}>
                          <span className="text-xs font-mono font-semibold text-emerald-700">{deal.buyerPoNumber}</span>
                          <span className="text-xs text-[#5E687B] truncate">{deal.customerName}</span>
                          {newPOForm.buyerPoNumber === deal.buyerPoNumber && (
                            <span className="ml-auto text-[11px] font-bold text-emerald-600">selected</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    value={newPOForm.buyerPoNumber}
                    onChange={e => {
                      const bpo = e.target.value;
                      const suffix = poConfig?.supplierSuffix ?? "S";
                      setNewPOForm(p => ({
                        ...p,
                        buyerPoNumber: bpo,
                        poNumber: bpo.trim() ? bpo.trim() + suffix : p.poNumber,
                      }));
                    }}
                    placeholder="Type a new buyer PO or select above"
                    className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors font-mono"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                    Supplier PO <span className="text-red-500">*</span>
                    <span className="text-[#9E9FAE] font-normal ml-1">(auto-derived from buyer PO + suffix, override below)</span>
                  </label>
                  <input value={newPOForm.poNumber} onChange={e => { setNewPOForm(p => ({ ...p, poNumber: e.target.value })); setPoNumberError(null); }}
                    placeholder={newPOForm.buyerPoNumber ? newPOForm.buyerPoNumber + (poConfig?.supplierSuffix ?? "S") : "e.g. PO-0001S"}
                    className={`w-full border rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:ring-1 transition-colors font-mono ${poNumberError ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-[#E5EAF0] focus:border-[#9000FF] focus:ring-[#9000FF]/20"}`}/>
                </div>
              </div>
            )}
            {poNumberError && (
              <p className="text-xs text-red-600">{poNumberError}</p>
            )}
          </div>
          )}

          {/* Product */}
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Product Description <span className="text-red-500">*</span></label>
            <input value={newPOForm.product} onChange={e => setNewPOForm(p => ({ ...p, product: e.target.value }))}
              placeholder="e.g. Chrome Retail Hanger — Heavy Duty Top"
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
          </div>

          {/* Category + Via */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Category <span className="text-red-500">*</span></label>
              <input value={newPOForm.category} onChange={e => setNewPOForm(p => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Hangers"
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Shipping via</label>
              <select value={newPOForm.via} onChange={e => setNewPOForm(p => ({ ...p, via: e.target.value }))}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors bg-white">
                <option value="OCEAN">Ocean</option>
                <option value="AIR">Air</option>
                <option value="RAIL">Rail</option>
                <option value="ROAD">Road</option>
              </select>
            </div>
          </div>

          {/* Buyer */}
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">
              Buyer <span className="text-red-500">*</span>
              <span className="text-[#9E9FAE] font-normal ml-1">— type to add a new buyer</span>
            </label>
            <input value={newPOForm.customerName} onChange={e => setNewPOForm(p => ({ ...p, customerName: e.target.value }))}
              list="buyer-options-new" placeholder="e.g. Marlowe & Sons"
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
            <datalist id="buyer-options-new">
              {CUSTOMERS.map(c => <option key={c.id} value={c.name}/>)}
            </datalist>
          </div>

          {/* Supplier combobox */}
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">
              Supplier <span className="text-red-500">*</span>
              <span className="text-[#9E9FAE] font-normal ml-1">— type to search or add a new one</span>
            </label>
            <div className="relative">
              <input
                value={supplierQuery}
                onChange={e => {
                  setSupplierQuery(e.target.value);
                  setNewPOForm(p => ({ ...p, supplierId: "" }));
                  setSupplierOpen(true);
                }}
                onFocus={() => setSupplierOpen(true)}
                onBlur={() => setTimeout(() => setSupplierOpen(false), 150)}
                placeholder="e.g. Guangzhou Metalworks"
                disabled={createSupplierMutation.isPending}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors disabled:opacity-60"/>
              {newPOForm.supplierId && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9000FF] font-medium pointer-events-none">✓</span>
              )}
              {supplierOpen && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-[#E5EAF0] rounded-md shadow-lg max-h-44 overflow-y-auto">
                  {(() => {
                    const q = supplierQuery.trim().toLowerCase();
                    const filtered = apiSuppliers.filter(s => !q || s.name.toLowerCase().includes(q));
                    const exactMatch = apiSuppliers.some(s => s.name.toLowerCase() === q);
                    return (
                      <>
                        {filtered.length === 0 && !supplierQuery.trim() && (
                          <div className="px-3 py-2.5 text-sm text-[#9E9FAE]">Start typing to search…</div>
                        )}
                        {filtered.map(s => (
                          <button key={s.id} onMouseDown={() => {
                            setNewPOForm(p => ({ ...p, supplierId: String(s.id) }));
                            setSupplierQuery(s.name);
                            setSupplierOpen(false);
                          }} className="w-full text-left px-3 py-2 text-sm text-[#212833] hover:bg-[#F7F9FA] flex items-center gap-2">
                            {s.name}
                            <span className="text-xs text-[#9E9FAE] ml-auto">{s.country}</span>
                          </button>
                        ))}
                        {supplierQuery.trim() && !exactMatch && (
                          <button onMouseDown={async () => {
                            try {
                              const created = await createSupplierMutation.mutateAsync({ data: { name: supplierQuery.trim(), country: "CN" } });
                              setNewPOForm(p => ({ ...p, supplierId: String(created.id) }));
                              setSupplierOpen(false);
                            } catch {
                              setNewPOError("Failed to create supplier.");
                            }
                          }} className="w-full text-left px-3 py-2 text-sm text-[#9000FF] hover:bg-[#9000FF]/5 flex items-center gap-1.5 border-t border-[#E5EAF0]">
                            <Plus className="w-3.5 h-3.5 shrink-0"/>
                            Create "{supplierQuery.trim()}"
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            {createSupplierMutation.isPending && (
              <p className="text-xs text-[#9000FF] mt-1 flex items-center gap-1">
                <span className="w-2.5 h-2.5 border border-[#9000FF]/40 border-t-[#9000FF] rounded-full animate-spin"/>
                Creating supplier…
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Ex-Factory Date <span className="text-red-500">*</span></label>
              <input type="date" value={newPOForm.exFactoryDate} onChange={e => setNewPOForm(p => ({ ...p, exFactoryDate: e.target.value }))}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Delivery Due Date <span className="text-red-500">*</span></label>
              <input type="date" value={newPOForm.dueDate} onChange={e => setNewPOForm(p => ({ ...p, dueDate: e.target.value }))}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Destination <span className="text-red-500">*</span></label>
            <input value={newPOForm.destination} onChange={e => setNewPOForm(p => ({ ...p, destination: e.target.value }))}
              placeholder="e.g. Los Angeles, CA"
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
          </div>

          {/* Quantity + Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Quantity <span className="text-[#9E9FAE] font-normal">(optional)</span></label>
              <input type="number" min="1" value={newPOForm.quantity} onChange={e => setNewPOForm(p => ({ ...p, quantity: e.target.value }))}
                placeholder="e.g. 5000"
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Unit Cost (USD) <span className="text-[#9E9FAE] font-normal">(optional)</span></label>
              <input type="number" min="0" value={newPOForm.unitCostUsd} onChange={e => setNewPOForm(p => ({ ...p, unitCostUsd: e.target.value }))}
                placeholder="e.g. 4"
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
            </div>
          </div>
          {newPOForm.quantity && newPOForm.unitCostUsd && (
            <div className="flex items-center gap-1.5 text-xs text-[#5E687B] bg-[#F7F9FA] rounded-md px-3 py-2">
              <span className="font-medium">Supplier total:</span>
              <span className="text-[#212833] font-semibold">${(Number(newPOForm.quantity) * Number(newPOForm.unitCostUsd)).toLocaleString()}</span>
            </div>
          )}

          {/* Buyer Price (for spread tracking) */}
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">
              Buyer Price <span className="text-[#9E9FAE] font-normal">(optional — sets your spread for this PO)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E687B] mb-1">Buyer Unit Price (USD)</label>
                <input type="number" min="0" step="0.01" value={newPOForm.buyerUnitPrice}
                  onChange={e => setNewPOForm(p => ({ ...p, buyerUnitPrice: e.target.value }))}
                  placeholder="e.g. 6.50"
                  className="w-full border border-[#E5EAF0] rounded-md px-2 py-1.5 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors"/>
              </div>
              <div>
                <label className="block text-xs text-[#5E687B] mb-1">Buyer Quantity</label>
                <input type="number" min="1" value={newPOForm.buyerQuantity}
                  onChange={e => setNewPOForm(p => ({ ...p, buyerQuantity: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full border border-[#E5EAF0] rounded-md px-2 py-1.5 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors"/>
              </div>
            </div>
            {newPOForm.buyerUnitPrice && newPOForm.buyerQuantity && newPOForm.quantity && newPOForm.unitCostUsd && (() => {
              const buyerTotal = Number(newPOForm.buyerUnitPrice) * Number(newPOForm.buyerQuantity);
              const supplierTotal = Number(newPOForm.quantity) * Number(newPOForm.unitCostUsd);
              const spreadUsd = buyerTotal - supplierTotal;
              const spreadPct = buyerTotal > 0 ? (spreadUsd / buyerTotal) * 100 : 0;
              const spreadCls = spreadPct >= 25 ? "text-emerald-700" : spreadPct >= 10 ? "text-amber-700" : "text-red-700";
              return (
                <div className={`mt-1.5 flex items-center gap-1.5 text-xs bg-[#F7F9FA] rounded-md px-3 py-2 ${spreadCls}`}>
                  <DollarSign className="w-3 h-3 shrink-0"/>
                  <span className="font-semibold">Your spread: {spreadPct.toFixed(1)}% · ${Math.round(spreadUsd).toLocaleString()}</span>
                  <span className="text-[#9E9FAE] font-normal ml-1">(buyer ${buyerTotal.toLocaleString()} − supplier ${supplierTotal.toLocaleString()})</span>
                </div>
              );
            })()}
          </div>

          {/* Payment Milestones — create mode only */}
          {editingShipmentId === null && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#5E687B]">Payment Milestones</label>
              {milestones.length < 3 && (
                <button type="button"
                  onClick={() => setMilestones(prev => [...prev, { label: "Milestone", percent: "0", dueDate: "" }])}
                  className="text-xs font-medium text-[#9000FF] hover:text-[#7A00D9] flex items-center gap-0.5 transition-colors">
                  <Plus className="w-3 h-3"/>Add row
                </button>
              )}
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => {
                const qty = newPOForm.quantity ? Number(newPOForm.quantity) : null;
                const cost = newPOForm.unitCostUsd ? Number(newPOForm.unitCostUsd) : null;
                const pct = Number(m.percent) || 0;
                const amountStr = qty != null && cost != null ? `$${Math.round(pct / 100 * qty * cost).toLocaleString()}` : "—";
                return (
                  <div key={i} className="space-y-1">
                    <div className="grid grid-cols-[1fr_52px_24px] gap-1.5 items-center">
                      <input value={m.label} onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                        placeholder="Label"
                        className="border border-[#E5EAF0] rounded-md px-2 py-1.5 text-xs text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
                      <div className="relative">
                        <input type="number" min="0" max="100" value={m.percent}
                          onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, percent: e.target.value } : x))}
                          className="w-full border border-[#E5EAF0] rounded-md pl-2 pr-5 py-1.5 text-xs text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#9E9FAE] pointer-events-none">%</span>
                      </div>
                      <button type="button" onClick={() => setMilestones(prev => prev.filter((_, j) => j !== i))}
                        disabled={milestones.length <= 1}
                        className="text-[#C0C8D4] hover:text-[#9E9FAE] disabled:opacity-30 transition-colors flex items-center justify-center">
                        <X className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-1.5 items-center pl-0">
                      <input type="date" value={m.dueDate} onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x))}
                        className="border border-[#E5EAF0] rounded-md px-2 py-1 text-xs text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"/>
                      <span className="text-xs text-[#5E687B] font-medium whitespace-nowrap">{amountStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const total = milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
              return total !== 100 ? (
                <p className="text-xs text-amber-600 mt-1.5">Percentages sum to {total}% — must equal 100% to save.</p>
              ) : (
                <p className="text-xs text-emerald-600 mt-1.5">✓ Percentages sum to 100%</p>
              );
            })()}
            {milestonesError && (
              <p className="text-xs text-red-600 mt-1">{milestonesError}</p>
            )}
          </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Notes <span className="text-[#9E9FAE] font-normal">(optional)</span></label>
            <textarea value={newPOForm.notes} onChange={e => setNewPOForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="e.g. Verbal order from buyer call on May 20 — confirmed by email"
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors resize-none"/>
          </div>

          {newPOError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{newPOError}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button onClick={resetNewPO} className="px-4 py-2 text-sm text-[#5E687B] hover:text-[#212833] transition-colors">
            Cancel
          </button>
          {editingShipmentId !== null ? (
            <button onClick={submitEditPO}
              disabled={updateShipmentMutation.isPending || createSupplierMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors">
              {(updateShipmentMutation.isPending || createSupplierMutation.isPending)
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Saving…</>
                : <>Save Changes</>}
            </button>
          ) : (
            <button onClick={submitNewPO}
              disabled={createShipmentMutation.isPending || createSupplierMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors">
              {(createShipmentMutation.isPending || createSupplierMutation.isPending)
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Creating…</>
                : <><Plus className="w-3.5 h-3.5"/>Create PO{newPOFile ? " + upload doc" : ""}</>}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
