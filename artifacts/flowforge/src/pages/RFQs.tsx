import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useCopilotHint } from "@/lib/CopilotContext";
import { useTranslation } from "react-i18next";
import { fmtCountry } from "@/lib/locale";
import {
  useListRfqs,
  useCreateRfq,
  useUpdateRfq,
  useAddRfqQuote,
  useUpdateRfqQuote,
  useDeleteRfqQuote,
  useConvertRfqToPo,
  useListSuppliers,
  useListStages,
  useListRfqBuyers,
  useSendRfqEmail,
  getListShipmentsQueryKey,
  getListRfqsQueryKey,
} from "@workspace/api-client-react";
import { AssigneePicker, AssigneeBadge } from "@/components/AssigneePicker";
import type { RfqWithQuotes, RfqQuote } from "@workspace/api-client-react";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Plus, FileText, CheckCircle2, AlertCircle,
  X, Trash2, Edit2, Check, TrendingDown, TrendingUp, Minus,
  Download, ArrowRight, RefreshCw, Info, Mail, ChevronsUpDown, Package,
  ArrowUpRight, BarChart3, Building2, CalendarDays,
  ClipboardList, Clock3, DollarSign, MoreHorizontal,
  Search, SlidersHorizontal, Sparkles, UserRound,
} from "lucide-react";
import { SamplesTab } from "./SamplesTab";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortDate } from "@/lib/adapters";
import { getDisplayLocale } from "@/lib/locale";
import { SECTION_LABEL, SECTION_HEADING } from "@/lib/typography";

function getStatusLabel(t: ReturnType<typeof useTranslation>["t"]): Record<string, string> {
  return {
    open:      t("rfqs.status.open"),
    accepted:  t("rfqs.status.accepted"),
    cancelled: t("rfqs.status.cancelled"),
    quoted:    t("rfqs.status.quoted"),
    awarded:   t("rfqs.status.awarded"),
    closed:    t("rfqs.status.closed"),
  };
}

const statusCls: Record<string, string> = {
  open:      "bg-blue-50 text-blue-700 border border-blue-100",
  accepted:  "bg-emerald-50 text-emerald-700 border border-emerald-100",
  cancelled: "bg-slate-100 text-slate-500 border border-slate-200",
};

const quoteStatusCls: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-600 border border-amber-100",
  received: "bg-blue-50 text-blue-700 border border-blue-100",
  accepted: "bg-emerald-50 text-emerald-700 border border-emerald-100",
};

function usd(val: number) {
  return `$${val.toLocaleString(getDisplayLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateProformaPdf(data: {
  rfq: RfqWithQuotes;
  poNumber: string;
  acceptedQuote: RfqQuote;
  supplierName: string;
  depositPct: number;
}) {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const total = data.acceptedQuote.unitPriceUsd * data.rfq.quantity;
    const depositUsd = total * data.depositPct / 100;
    const balanceUsd = total - depositUsd;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(144, 0, 255);
    doc.text("PROFORMA INVOICE", 20, 28);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 100, 120);
    doc.text(`Generated: ${new Date().toLocaleDateString(getDisplayLocale(), { year: "numeric", month: "long", day: "numeric" })}`, 20, 36);

    doc.setDrawColor(229, 234, 240);
    doc.line(20, 40, 190, 40);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);
    doc.text("BILL TO", 20, 50);
    doc.text("SUPPLIER", 110, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(33, 40, 51);
    doc.text(data.rfq.buyerName, 20, 57);
    doc.text(data.supplierName, 110, 57);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);
    doc.text("PO NUMBER", 20, 70);
    doc.text("PRODUCT", 80, 70);
    doc.text("DEADLINE", 150, 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(33, 40, 51);
    doc.text(data.poNumber, 20, 77);
    doc.text(data.rfq.product, 80, 77, { maxWidth: 60 });
    doc.text(shortDate(data.rfq.deadline), 150, 77);

    doc.line(20, 90, 190, 90);

    doc.setFillColor(250, 251, 252);
    doc.rect(20, 92, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);
    doc.text("DESCRIPTION", 24, 97.5);
    doc.text("QTY", 110, 97.5);
    doc.text("UNIT PRICE", 130, 97.5);
    doc.text("TOTAL", 165, 97.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33, 40, 51);
    doc.text(data.rfq.product, 24, 108);
    doc.text(data.rfq.quantity.toLocaleString(), 110, 108);
    doc.text(usd(data.acceptedQuote.unitPriceUsd), 130, 108);
    doc.text(usd(total), 165, 108);

    doc.line(20, 115, 190, 115);

    const rightX = 135;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 100, 120);
    doc.text("Subtotal:", rightX, 122);
    doc.text(usd(total), 165, 122);
    doc.text(`Deposit (${data.depositPct}%):`, rightX, 130);
    doc.setTextColor(33, 40, 51);
    doc.text(usd(depositUsd), 165, 130);
    doc.text(`Balance (${100 - data.depositPct}%):`, rightX, 138);
    doc.text(usd(balanceUsd), 165, 138);

    doc.line(rightX, 143, 190, 143);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(33, 40, 51);
    doc.text("TOTAL DUE:", rightX, 151);
    doc.setTextColor(144, 0, 255);
    doc.text(usd(total), 165, 151);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);
    doc.text("PAYMENT TERMS", 20, 165);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33, 40, 51);
    doc.text(`${data.depositPct}% deposit (${usd(depositUsd)}) due upon order confirmation`, 20, 172);
    doc.text(`${100 - data.depositPct}% balance (${usd(balanceUsd)}) due before shipment`, 20, 179);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 120);
    doc.text("LEAD TIME", 20, 193);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33, 40, 51);
    doc.text(`${data.acceptedQuote.leadTimeDays} days from deposit receipt`, 20, 200);

    doc.line(20, 270, 190, 270);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 165);
    doc.text("This proforma invoice is generated by FlowForgeIQ. Valid for 30 days from issue date.", 20, 276);

    doc.save(`Proforma-${data.poNumber}-${data.rfq.buyerName.replace(/\s+/g, "-")}.pdf`);
  });
}

interface NewRfqFormState {
  product: string;
  category: string;
  buyerName: string;
  targetPriceUsd: string;
  quantity: string;
  deadline: string;
  notes: string;
}

interface ConvertFormState {
  acceptedQuoteId: number | null;
  poNumber: string;
  supplierId: string;
  dueDate: string;
  exFactoryDate: string;
  destination: string;
  via: string;
  depositPct: string;
}

interface NewQuoteFormState {
  factoryName: string;
  country: string;
  unitPriceUsd: string;
  leadTimeDays: string;
  moq: string;
  notes: string;
  supplierId: string;
}

export function RFQs() {
  const { t, i18n } = useTranslation();
  useLocation();
  useCopilotHint("Ask about RFQ status or factory quote comparisons", [
    "Which RFQs are awaiting quotes?",
    "Compare factory quotes for open RFQs",
  ]);
  const [activeTab, setActiveTab] = useState<"rfqs" | "samples">("rfqs");
  const queryClient = useQueryClient();
  const rfqsQueryKey = getListRfqsQueryKey();
  const shipmentsQueryKey = getListShipmentsQueryKey();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rfqs = [], isLoading, isFetching, refetch: refetchRfqs } = useListRfqs({ query: { placeholderData: keepPreviousData } as any });
  const { data: suppliers = [] } = useListSuppliers();
  const { data: stages = [] } = useListStages();
  const { data: knownBuyers = [] } = useListRfqBuyers();
  const firstStageId = stages.length > 0 ? stages.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id : "";

  const createRfqMutation = useCreateRfq();
  const updateRfqMutation = useUpdateRfq();
  const addQuoteMutation = useAddRfqQuote();
  const updateQuoteMutation = useUpdateRfqQuote();
  const deleteQuoteMutation = useDeleteRfqQuote();
  const convertMutation = useConvertRfqToPo();
  const sendEmailMutation = useSendRfqEmail();

  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState<"all" | "needs-review" | "no-quotes" | "accepted">("all");
  const [showPortfolioFilters, setShowPortfolioFilters] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(() => {
    try { return !!sessionStorage.getItem("rfq_quote_draft"); } catch {} return false;
  });
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [convertedPoNumber, setConvertedPoNumber] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const [buyerComboboxOpen, setBuyerComboboxOpen] = useState(false);
  const [buyerInput, setBuyerInput] = useState("");

  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendEmailForm, setSendEmailForm] = useState({ to: "", subject: "", body: "" });
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);

  const RFQ_DRAFT_KEY = "rfq_new_draft";

  const [newRfqForm, setNewRfqForm] = useState<NewRfqFormState>(() => {
    try {
      const stored = sessionStorage.getItem(RFQ_DRAFT_KEY);
      if (stored) return JSON.parse(stored) as NewRfqFormState;
    } catch {}
    return { product: "", category: "", buyerName: "", targetPriceUsd: "", quantity: "", deadline: "", notes: "" };
  });
  const [newRfqError, setNewRfqError] = useState<string | null>(null);

  const [showNewRfq, setShowNewRfq] = useState(() => {
    try {
      return !!sessionStorage.getItem(RFQ_DRAFT_KEY);
    } catch {}
    return false;
  });
  const [editingRfqId, setEditingRfqId] = useState<number | null>(null);

  const [convertForm, setConvertForm] = useState<ConvertFormState>({
    acceptedQuoteId: null, poNumber: "", supplierId: "", dueDate: "", exFactoryDate: "",
    destination: "", via: "OCEAN", depositPct: "30",
  });
  const [convertError, setConvertError] = useState<string | null>(null);

  const QUOTE_DRAFT_KEY = "rfq_quote_draft";

  const [newQuoteForm, setNewQuoteForm] = useState<NewQuoteFormState>(() => {
    try {
      const stored = sessionStorage.getItem("rfq_quote_draft");
      if (stored) {
        const parsed = JSON.parse(stored) as { form: NewQuoteFormState; rfqId: number };
        return parsed.form;
      }
    } catch {}
    return { factoryName: "", country: "CN", unitPriceUsd: "", leadTimeDays: "", moq: "", notes: "", supplierId: "" };
  });
  const [editQuoteForm, setEditQuoteForm] = useState<NewQuoteFormState>({
    factoryName: "", country: "CN", unitPriceUsd: "", leadTimeDays: "", moq: "", notes: "", supplierId: "",
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const selectedRfq = rfqs.find(r => r.id === selectedRfqId) ?? null;
  const filteredRfqs = useMemo(() => {
    const query = portfolioSearch.trim().toLowerCase();
    return rfqs.filter(rfq => {
      const matchesSearch = !query || [rfq.product, rfq.category, rfq.buyerName, String(rfq.id)]
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesFilter =
        portfolioFilter === "all" ||
        (portfolioFilter === "needs-review" && rfq.status === "open" && rfq.quotes.length > 0) ||
        (portfolioFilter === "no-quotes" && rfq.status === "open" && rfq.quotes.length === 0) ||
        (portfolioFilter === "accepted" && rfq.status === "accepted");
      return matchesSearch && matchesFilter;
    });
  }, [portfolioFilter, portfolioSearch, rfqs]);
  const totalQuotes = useMemo(() => rfqs.reduce((total, rfq) => total + rfq.quotes.length, 0), [rfqs]);
  const selectedPreviewQuote = selectedRfq?.quotes.find(q => q.id === selectedQuoteId)
    ?? selectedRfq?.quotes.find(q => q.status === "accepted")
    ?? selectedRfq?.quotes.reduce<RfqQuote | undefined>((best, quote) => !best || quote.unitPriceUsd < best.unitPriceUsd ? quote : best, undefined);

  useEffect(() => {
    if (rfqs.length > 0 && selectedRfqId === null) {
      try {
        const stored = sessionStorage.getItem(QUOTE_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { form: NewQuoteFormState; rfqId: number };
          if (rfqs.some(r => r.id === parsed.rfqId)) {
            setSelectedRfqId(parsed.rfqId);
            return;
          }
        }
      } catch {}
      setSelectedRfqId(rfqs[0].id);
    }
  }, [rfqs, selectedRfqId]);

  useEffect(() => {
    if (showNewRfq && editingRfqId === null) {
      try { sessionStorage.setItem(RFQ_DRAFT_KEY, JSON.stringify(newRfqForm)); } catch {}
    }
  }, [showNewRfq, newRfqForm, editingRfqId]);

  useEffect(() => {
    if (showAddQuote && selectedRfqId !== null) {
      try { sessionStorage.setItem(QUOTE_DRAFT_KEY, JSON.stringify({ form: newQuoteForm, rfqId: selectedRfqId })); } catch {}
    }
  }, [showAddQuote, newQuoteForm, selectedRfqId]);

  const submitNewRfq = async () => {
    setNewRfqError(null);
    if (!newRfqForm.product.trim() || !newRfqForm.buyerName.trim() || !newRfqForm.targetPriceUsd || !newRfqForm.quantity || !newRfqForm.deadline) {
      setNewRfqError("Please fill in all required fields."); return;
    }
    try {
      const data = {
        product: newRfqForm.product.trim(),
        category: newRfqForm.category.trim(),
        buyerName: newRfqForm.buyerName.trim(),
        targetPriceUsd: Number(newRfqForm.targetPriceUsd),
        quantity: Number(newRfqForm.quantity),
        deadline: new Date(newRfqForm.deadline).toISOString(),
        notes: newRfqForm.notes.trim() || undefined,
      };
      const saved = editingRfqId !== null
        ? await updateRfqMutation.mutateAsync({ id: editingRfqId, data })
        : await createRfqMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      setSelectedRfqId(saved.id);
      setShowNewRfq(false);
      setEditingRfqId(null);
      setNewRfqForm({ product: "", category: "", buyerName: "", targetPriceUsd: "", quantity: "", deadline: "", notes: "" });
      try { sessionStorage.removeItem(RFQ_DRAFT_KEY); } catch {}
      setBuyerInput("");
      showToast(editingRfqId !== null ? t("rfqs.rfqUpdated") : t("rfqs.rfqCreated"));
    } catch {
      setNewRfqError("Failed to create RFQ. Please try again.");
    }
  };

  const submitAddQuote = async () => {
    if (!selectedRfqId || !newQuoteForm.factoryName.trim() || !newQuoteForm.unitPriceUsd || !newQuoteForm.leadTimeDays || !newQuoteForm.moq) return;
    try {
      await addQuoteMutation.mutateAsync({
        id: selectedRfqId,
        data: {
          factoryName: newQuoteForm.factoryName.trim(),
          country: newQuoteForm.country || "CN",
          unitPriceUsd: Number(newQuoteForm.unitPriceUsd),
          leadTimeDays: Number(newQuoteForm.leadTimeDays),
          moq: Number(newQuoteForm.moq),
          notes: newQuoteForm.notes.trim() || undefined,
          supplierId: newQuoteForm.supplierId ? Number(newQuoteForm.supplierId) : undefined,
          status: "received",
        },
      });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      setShowAddQuote(false);
      setNewQuoteForm({ factoryName: "", country: "CN", unitPriceUsd: "", leadTimeDays: "", moq: "", notes: "", supplierId: "" });
      try { sessionStorage.removeItem(QUOTE_DRAFT_KEY); } catch {}
      showToast("Quote added");
    } catch {
      showToast("Failed to add quote");
    }
  };

  const submitEditQuote = async () => {
    if (!editingQuoteId) return;
    const unitPriceUsd = Number(editQuoteForm.unitPriceUsd);
    const leadTimeDays = Number(editQuoteForm.leadTimeDays);
    const moq = Number(editQuoteForm.moq);
    if (!editQuoteForm.factoryName.trim()) { showToast(t("rfqs.factoryNameRequired")); return; }
    if (!Number.isFinite(unitPriceUsd) || unitPriceUsd <= 0 || !Number.isInteger(leadTimeDays) || leadTimeDays <= 0 || !Number.isInteger(moq) || moq <= 0) { showToast(t("rfqs.validQuoteNumbersRequired")); return; }
    try {
      await updateQuoteMutation.mutateAsync({
        id: selectedRfqId!,
        quoteId: editingQuoteId,
        data: {
          factoryName: editQuoteForm.factoryName.trim(),
          country: editQuoteForm.country || "CN",
          unitPriceUsd,
          leadTimeDays,
          moq,
          notes: editQuoteForm.notes.trim() || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      setEditingQuoteId(null);
      showToast(t("rfqs.quoteUpdated"));
    } catch {
      showToast(t("rfqs.quoteUpdateFailed"));
    }
  };

  const deleteQuote = async (quoteId: number) => {
    if (!selectedRfqId) return;
    try {
      await deleteQuoteMutation.mutateAsync({ id: selectedRfqId, quoteId });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      showToast("Quote removed");
    } catch {
      showToast("Failed to delete quote");
    }
  };

  const handleUseThisQuote = (q: RfqQuote, rfq: RfqWithQuotes) => {
    const supplierName = q.supplierId
      ? (suppliers.find(s => s.id === q.supplierId)?.name ?? q.factoryName)
      : q.factoryName;
    try {
      sessionStorage.setItem("rfq_po_prefill", JSON.stringify({
        rfqQuoteId: q.id,
        supplierId: q.supplierId ? String(q.supplierId) : "",
        supplierName,
        product: rfq.product,
        quantity: String(rfq.quantity),
        unitCostUsd: String(q.unitPriceUsd),
      }));
    } catch {}
    navigate(`/orders?new=1&rfqQuoteId=${q.id}`);
  };

  const openConvert = (quoteId: number) => {
    setConvertForm({ acceptedQuoteId: quoteId, poNumber: "", supplierId: "", dueDate: "", exFactoryDate: "", destination: "", via: "OCEAN", depositPct: "30" });
    setConvertError(null);
    setShowConvert(true);
  };

  const submitConvert = async () => {
    setConvertError(null);
    if (!convertForm.acceptedQuoteId || !convertForm.poNumber.trim() || !convertForm.supplierId || !convertForm.dueDate || !convertForm.exFactoryDate || !convertForm.destination.trim()) {
      setConvertError("Please fill in all required fields."); return;
    }
    try {
      const shipment = await convertMutation.mutateAsync({
        id: selectedRfqId!,
        data: {
          acceptedQuoteId: convertForm.acceptedQuoteId,
          poNumber: convertForm.poNumber.trim(),
          supplierId: Number(convertForm.supplierId),
          dueDate: new Date(convertForm.dueDate).toISOString(),
          exFactoryDate: new Date(convertForm.exFactoryDate).toISOString(),
          destination: convertForm.destination.trim(),
          via: convertForm.via || undefined,
          depositPct: Number(convertForm.depositPct),
        },
      });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      queryClient.invalidateQueries({ queryKey: shipmentsQueryKey });
      setConvertedPoNumber(shipment.poNumber);
      setShowConvert(false);
      showToast(`PO ${shipment.poNumber} created — shipment is now live`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      setConvertError(msg ?? "Failed to convert RFQ. Please try again.");
    }
  };

  const handleDownloadProforma = (rfq: RfqWithQuotes) => {
    const acceptedQ = rfq.quotes.find(q => q.status === "accepted");
    if (!acceptedQ) { showToast("No accepted quote found."); return; }
    const supplierName = suppliers.find(s => s.id === acceptedQ.supplierId)?.name ?? acceptedQ.factoryName;
    generateProformaPdf({
      rfq,
      poNumber: convertedPoNumber ?? `RFQ-${rfq.id}`,
      acceptedQuote: acceptedQ,
      supplierName,
      depositPct: 30,
    });
  };

  const handleRfqAssigneeChange = (id: number, assigneeId: string | null) => {
    updateRfqMutation.mutate({ id, data: { assigneeId } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: rfqsQueryKey }); },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
        showToast("Failed to update assignee — please try again");
      },
    });
  };

  const cancelRfq = async (id: number) => {
    setCancelTargetId(id);
  };

  const confirmCancelRfq = async () => {
    if (cancelTargetId === null) return;
    try {
      await updateRfqMutation.mutateAsync({ id: cancelTargetId, data: { status: "cancelled" } });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      setCancelTargetId(null);
      showToast(t("rfqs.rfqCancelled"));
    } catch {
      showToast(t("rfqs.rfqCancelFailed"));
    }
  };

  const openSendEmail = (rfq: RfqWithQuotes) => {
    const recipientEmails = rfq.quotes
      .map(q => suppliers.find(s => s.id === q.supplierId)?.contactEmail)
      .filter((e): e is string => !!e);
    const unique = [...new Set(recipientEmails)];
    const deadline = shortDate(rfq.deadline);
    const body = [
      `Dear Factory Partner,`,
      ``,
      `We are pleased to invite you to submit a quotation for the following product:`,
      ``,
      `Product:      ${rfq.product}`,
      rfq.category ? `Category:     ${rfq.category}` : null,
      `Target Price: $${rfq.targetPriceUsd.toFixed(2)} / unit`,
      `Quantity:     ${rfq.quantity.toLocaleString()} units`,
      `Quote Deadline: ${deadline}`,
      rfq.notes ? `\nAdditional Notes:\n${rfq.notes}` : null,
      ``,
      `Please submit your best unit price, lead time, and MOQ by the deadline above.`,
      ``,
      `Best regards,`,
      `FlowForgeIQ Sourcing Team`,
    ].filter(line => line !== null).join("\n");

    setSendEmailForm({
      to: unique.join(", "),
      subject: `RFQ: ${rfq.product}`,
      body,
    });
    setSendEmailError(null);
    setShowSendEmail(true);
  };

  const submitSendEmail = async () => {
    if (!selectedRfqId) return;
    setSendEmailError(null);
    const toList = sendEmailForm.to.split(",").map(e => e.trim()).filter(Boolean);
    if (toList.length === 0) { setSendEmailError("Enter at least one recipient email."); return; }
    const invalidEmail = toList.find(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalidEmail) { setSendEmailError(`"${invalidEmail}" is not a valid email address.`); return; }
    try {
      await sendEmailMutation.mutateAsync({
        id: selectedRfqId,
        data: { to: toList, subject: sendEmailForm.subject, body: sendEmailForm.body },
      });
      setShowSendEmail(false);
      showToast("RFQ email sent");
    } catch (err: unknown) {
      setSendEmailError((err as { message?: string })?.message ?? "Failed to send email. Check POSTMARK_SERVER_TOKEN.");
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#212833] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}

      <div className="h-screen w-full overflow-hidden bg-[#FAFBFC] text-[#212833]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        <GlobalHeader breadcrumb={activeTab === "samples" ? t("rfqs.samples") : t("rfqs.title")} />

        {activeTab === "samples" ? (
          <div className="flex h-[calc(100vh-48px)] flex-col overflow-hidden">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e3e6eb] bg-white px-5">
              <div className="flex items-center gap-2"><Package className="h-4 w-4 text-[#7457c7]" /><span className="text-sm font-bold text-[#272c37]">Samples</span></div>
              <button onClick={() => setActiveTab("rfqs")} className="rounded-lg border border-[#dfe3e9] px-3 py-1.5 text-[10px] font-bold text-[#5d6674] hover:bg-[#f7f7f9]">Back to RFQs</button>
            </div>
            <div className="min-h-0 flex-1"><SamplesTab /></div>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-48px)] min-h-0 overflow-hidden">
            <NavSidebar showBrand={false} counts={{ myOrders: null }} />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <header className="flex min-h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-[#E5EAF0] bg-white px-3 sm:px-5">
                <div className="flex shrink-0 items-center gap-2"><h1 className="text-sm font-bold text-[#212833]">{t("rfqs.title")}</h1><span className="rounded-full bg-[#F0F4F8] px-2 py-0.5 text-[10px] font-semibold text-[#5E687B]">{filteredRfqs.length}/{rfqs.length}</span></div>
                <div className="mx-1 hidden h-5 w-px bg-[#E5EAF0] sm:block" />
                <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-[#E5EAF0] bg-white p-0.5" role="tablist" aria-label={t("rfqs.views")}>
                  {(["all", "needs-review", "no-quotes", "accepted"] as const).map(option => <button key={option} role="tab" aria-selected={portfolioFilter === option} onClick={() => setPortfolioFilter(option)} className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold transition-colors ${portfolioFilter === option ? "bg-[#9000FF] text-white" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>{option === "all" ? t("common.all") : option === "needs-review" ? t("rfqs.needsReview") : option === "no-quotes" ? t("rfqs.awaitingQuotes") : t("rfqs.status.accepted")}</button>)}
                </div>
                <div className="relative ml-auto min-w-[150px] max-w-[240px] flex-1 sm:min-w-[190px]"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9E9FAE]" /><input value={portfolioSearch} onChange={e => setPortfolioSearch(e.target.value)} placeholder={t("rfqs.searchPlaceholder")} aria-label={t("common.search")} className="w-full rounded-md border border-transparent bg-[#F0F4F8] py-1.5 pl-8 pr-7 text-[11px] outline-none placeholder:text-[#9E9FAE] focus:border-[#9000FF]/30 focus:bg-white focus:ring-1 focus:ring-[#9000FF]/10" />{portfolioSearch && <button onClick={() => setPortfolioSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9FAE]" aria-label={t("common.clear")}><X size={12} /></button>}</div>
                <button onClick={() => setShowPortfolioFilters(v => !v)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${showPortfolioFilters ? "border-[#9000FF]/30 bg-[#9000FF]/5 text-[#9000FF]" : "border-[#E5EAF0] text-[#5E687B] hover:bg-[#F0F4F8]"}`} aria-label={t("rfqs.filterButton")} aria-pressed={showPortfolioFilters}><SlidersHorizontal size={14} /></button>
                <button onClick={() => void refetchRfqs()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8]" aria-label={t("common.refresh")} disabled={isFetching}><RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /></button>
                {selectedRfq && <button onClick={() => { setEditingRfqId(selectedRfq.id); setNewRfqForm({ product: selectedRfq.product, category: selectedRfq.category, buyerName: selectedRfq.buyerName, targetPriceUsd: String(selectedRfq.targetPriceUsd), quantity: String(selectedRfq.quantity), deadline: selectedRfq.deadline.slice(0, 10), notes: selectedRfq.notes ?? "" }); setShowNewRfq(true); }} className="hidden shrink-0 items-center gap-1.5 rounded-md border border-[#E5EAF0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5E687B] hover:bg-[#F0F4F8] lg:flex"><Edit2 size={12} /> {t("common.edit")}</button>}
                <button onClick={() => { setEditingRfqId(null); setShowNewRfq(true); }} className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#9000FF] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#7200CC]"><Plus size={13} /> <span className="hidden sm:inline">{t("rfqs.newRfq")}</span></button>
              </header>
              {showPortfolioFilters && <div className="flex shrink-0 items-center gap-2 border-b border-[#E5EAF0] bg-[#FAFBFC] px-3 py-2 text-[10px] sm:px-5"><span className="font-semibold text-[#5E687B]">{t("rfqs.filterLabel")}</span><button onClick={() => setPortfolioFilter("accepted")} className="rounded px-2 py-1 font-semibold text-[#9000FF] hover:bg-[#F0EEFF]">{t("rfqs.status.accepted")}</button><button onClick={() => { setPortfolioSearch(""); setPortfolioFilter("all"); }} className="rounded px-2 py-1 text-[#5E687B] hover:bg-white">{t("rfqs.clearFilters")}</button></div>}

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <section className={`${selectedRfq ? "hidden lg:block" : "block"} min-w-0 flex-1 overflow-y-auto bg-[#FAFBFC] p-3 sm:p-5`}>
                  <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold text-[#5E687B]">{t("rfqs.activePortfolio")}</p><p className="mt-0.5 text-[11px] text-[#9E9FAE]">{t("rfqs.portfolioDesc")}</p></div><div className="hidden items-center gap-2 text-[10px] text-[#9E9FAE] sm:flex"><span>{totalQuotes} {t("rfqs.factoryQuotes")}</span><span className="text-[#E5EAF0]">·</span><span>{isFetching ? t("rfqs.syncing") : t("rfqs.updatedMomentsAgo")}</span></div></div>
                  <div className="flex items-center gap-3">
                    <div className="relative min-w-0 flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba2ae]" /><input value={portfolioSearch} onChange={e => setPortfolioSearch(e.target.value)} placeholder={t("rfqs.searchPlaceholder")} aria-label={t("common.search")} className="h-9 w-full rounded-lg border border-[#dfe3e9] bg-white pl-9 pr-3 text-[11px] text-[#313844] outline-none placeholder:text-[#a6adb8] focus:border-[#a494dc] focus:ring-2 focus:ring-[#8062d5]/10" /></div>
                    <div className="hidden items-center rounded-lg border border-[#dfe3e9] bg-white p-0.5 md:flex">
                      {(["all", "needs-review", "no-quotes"] as const).map(option => <button key={option} onClick={() => setPortfolioFilter(option)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${portfolioFilter === option ? "bg-[#eeebfb] text-[#6e51bb]" : "text-[#89919d] hover:text-[#5c6572]"}`}>{option === "all" ? "All RFQs" : option === "needs-review" ? "Needs review" : "No quotes"}</button>)}
                    </div>
                    <button onClick={() => setShowPortfolioFilters(!showPortfolioFilters)} className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${showPortfolioFilters ? "border-[#a494dc] text-[#7457c7]" : "border-[#dfe3e9] text-[#8d95a2]"}`} aria-label={t("rfqs.filterButton")} aria-pressed={showPortfolioFilters}><SlidersHorizontal size={14} /></button>
                  </div>
                  {showPortfolioFilters && <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#e6e1f5] bg-[#fbfaff] px-3 py-2 text-[10px] text-[#766c8f]"><span className="font-bold text-[#6e51bb]">{t("rfqs.filterLabel")}</span><button onClick={() => setPortfolioFilter("accepted")} className="rounded bg-[#eeeaf9] px-2 py-1 font-semibold text-[#6e51bb]">{t("rfqs.status.accepted")}</button><button onClick={() => { setPortfolioSearch(""); setPortfolioFilter("all"); }} className="rounded px-2 py-1 hover:bg-[#efeff3]">{t("rfqs.clearFilters")}</button></div>}

                  {isLoading && <div className="mt-3 flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-[#E5EAF0] bg-white"><RefreshCw size={18} className="animate-spin text-[#9000FF]" /><span className="text-xs text-[#5E687B]">{t("common.loading")}</span></div>}
                  <div className="mt-3 flex items-center justify-between"><p className="text-[10px] font-semibold text-[#858d9b]">{filteredRfqs.length} {t("rfqs.requests")} <span className="font-normal text-[#b0b5be]">· {isFetching ? t("rfqs.syncing") : t("rfqs.updatedMomentsAgo")}</span></p><button onClick={() => setActiveTab("samples")} className="flex items-center gap-1 text-[10px] font-semibold text-[#7457c7]"><Package size={12} /> {t("rfqs.samples")} <ArrowRight size={11} /></button></div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#e1e4e9] bg-white shadow-[0_2px_5px_rgba(27,33,45,0.025)]">
                    <div className="hidden grid-cols-[minmax(220px,1.7fr)_minmax(105px,.8fr)_90px_100px_88px] items-center gap-3 border-b border-[#e9ebef] bg-[#fbfbfc] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1ad] md:grid"><span>{t("rfqs.request")}</span><span>{t("rfqs.buyerOwner")}</span><span>{t("rfqs.deadline")}</span><span>{t("rfqs.quotes")}</span><span className="text-right">{t("rfqs.targetPrice")}</span></div>
                    {filteredRfqs.length > 0 ? filteredRfqs.map(rfq => {
                      const isSelected = rfq.id === selectedRfq?.id;
                      const best = rfq.quotes.length ? Math.min(...rfq.quotes.map(q => q.unitPriceUsd)) : null;
                      const deadlineLabel = rfq.status === "accepted" ? "Accepted" : rfq.quotes.length ? "Quotes in" : "Awaiting quotes";
                      return <button type="button" key={rfq.id} onClick={() => { setSelectedRfqId(rfq.id); setSelectedQuoteId(null); }} className={`hidden group w-full grid-cols-[minmax(220px,1.7fr)_minmax(105px,.8fr)_90px_100px_88px] items-center gap-3 border-b border-[#eef0f3] px-4 py-3 text-left transition-colors last:border-b-0 md:grid ${isSelected ? "bg-[#fbfaff] shadow-[inset_3px_0_0_#8062d5]" : "hover:bg-[#fcfcfd]"}`}>
                        <div className="min-w-0"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eeeaf9] text-[9px] font-bold text-[#7256bb]">{rfq.product.split(" ").slice(0, 2).map(part => part[0]).join("")}</span><div className="min-w-0"><p className="truncate text-[11px] font-bold text-[#2c333f]">{rfq.product} <span className="font-medium text-[#8a929f]">— {rfq.category || "General"}</span></p><div className="mt-1 flex items-center gap-2"><span className="font-mono text-[9px] text-[#a0a6b1]">RFQ-{rfq.id}</span><span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${statusCls[rfq.status] ?? "bg-slate-100"}`}>{getStatusLabel(t)[rfq.status] ?? rfq.status}</span></div></div></div></div>
                        <div className="min-w-0"><p className="truncate text-[10px] font-semibold text-[#4f5866]">{rfq.buyerName}</p><p className="mt-1 flex items-center gap-1 text-[9px] text-[#a0a6b1]"><UserRound size={10} /> {rfq.assigneeName || "Unassigned"}</p></div>
                        <div><p className="text-[10px] font-semibold text-[#4f5866]">{shortDate(rfq.deadline)}</p><p className={`mt-1 text-[9px] ${rfq.status === "open" && !rfq.quotes.length ? "font-bold text-[#c87336]" : "text-[#a0a6b1]"}`}>{deadlineLabel}</p></div>
                        <div><div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${rfq.quotes.length ? "bg-[#eeeaf9] text-[#7256bb]" : "bg-[#f0f1f3] text-[#a0a6b1]"}`}>{rfq.quotes.length}</span><span className="text-[10px] text-[#78818e]">{rfq.quotes.length === 1 ? "quote" : "quotes"}</span></div>{best !== null && <p className="mt-1 text-[9px] text-[#a0a6b1]">from {usd(best)}</p>}</div>
                        <div className="text-right"><p className="text-[11px] font-bold text-[#3b4350]">{usd(rfq.targetPriceUsd)}</p><p className="mt-1 text-[9px] text-[#a0a6b1]">per unit</p></div>
                      </button>;
                    }) : <div className="flex flex-col items-center justify-center py-14 text-center"><Search size={20} className="text-[#b5bbc5]" /><p className="mt-3 text-[12px] font-semibold text-[#626c7a]">No RFQs match those filters</p><button onClick={() => { setPortfolioSearch(""); setPortfolioFilter("all"); }} className="mt-1 text-[10px] font-bold text-[#7457c7]">Clear filters</button></div>}
                  </div>
                  <div className="space-y-2 p-2 md:hidden">
                    {filteredRfqs.length > 0 ? filteredRfqs.map(rfq => (
                      <button type="button" key={`mobile-${rfq.id}`} onClick={() => { setSelectedRfqId(rfq.id); setSelectedQuoteId(null); }} className="w-full rounded-lg border border-[#E5EAF0] bg-white p-3 text-left shadow-[0_1px_2px_rgba(33,40,51,0.03)]">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[#212833]">{rfq.product}</p><p className="mt-1 text-[10px] text-[#9E9FAE]">RFQ-{rfq.id} · {rfq.buyerName}</p></div><span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold ${statusCls[rfq.status] ?? "bg-slate-100"}`}>{getStatusLabel(t)[rfq.status] ?? rfq.status}</span></div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><span><b className="block text-[#9E9FAE]">{t("rfqs.deadline")}</b><span className="font-semibold text-[#4F5866]">{shortDate(rfq.deadline)}</span></span><span><b className="block text-[#9E9FAE]">{t("rfqs.quotes")}</b><span className="font-semibold text-[#4F5866]">{rfq.quotes.length}</span></span><span className="text-right"><b className="block text-[#9E9FAE]">{t("rfqs.targetPrice")}</b><span className="font-semibold text-[#4F5866]">{usd(rfq.targetPriceUsd)}</span></span></div>
                      </button>
                    )) : <div className="rounded-lg border border-dashed border-[#DCE1E8] bg-white py-12 text-center text-xs text-[#5E687B]">{t("rfqs.noMatches")}</div>}
                  </div>
                </section>

                <aside className={`${selectedRfq ? "flex" : "hidden lg:flex"} w-full shrink-0 flex-col border-l border-[#E5EAF0] bg-white lg:w-[390px]`}>
                  {selectedRfq ? <>
                    <div className="mx-5 mt-3 flex items-center justify-between lg:hidden"><button onClick={() => setSelectedRfqId(null)} className="text-[10px] font-semibold text-[#9000FF] hover:underline">{t("common.back")}</button><button onClick={() => { setEditingRfqId(selectedRfq.id); setNewRfqForm({ product: selectedRfq.product, category: selectedRfq.category, buyerName: selectedRfq.buyerName, targetPriceUsd: String(selectedRfq.targetPriceUsd), quantity: String(selectedRfq.quantity), deadline: selectedRfq.deadline.slice(0, 10), notes: selectedRfq.notes ?? "" }); setShowNewRfq(true); }} className="flex items-center gap-1 text-[10px] font-semibold text-[#5E687B]"><Edit2 size={11} />{t("common.edit")}</button></div>
                    <div className="border-b border-[#e8eaee] px-5 pb-4 pt-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eeeaf9] text-[10px] font-bold text-[#7256bb]">{selectedRfq.product.split(" ").slice(0, 2).map(part => part[0]).join("")}</div><div className="min-w-0"><p className="font-mono text-[9px] font-bold text-[#9aa1ad]">RFQ-{selectedRfq.id}</p><h3 className="mt-1 text-[14px] font-bold leading-5 tracking-[-0.01em] text-[#272e39]">{selectedRfq.product}</h3><p className="text-[11px] text-[#7d8693]">{selectedRfq.category || "General sourcing"}</p></div></div><button onClick={() => selectedRfq.status === "open" && cancelRfq(selectedRfq.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#9aa1ad] hover:bg-[#f4f5f7]" aria-label="Cancel RFQ"><MoreHorizontal size={15} /></button></div><div className="mt-4 flex items-center gap-2"><span className={`rounded border px-2 py-1 text-[9px] font-bold ${statusCls[selectedRfq.status] ?? "bg-slate-100"}`}>{getStatusLabel(t)[selectedRfq.status] ?? selectedRfq.status}</span><span className="text-[10px] text-[#9aa1ad]">·</span><span className="text-[10px] text-[#7e8794]">{selectedRfq.quotes.length} factory {selectedRfq.quotes.length === 1 ? "quote" : "quotes"}</span></div></div>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      <div className="mb-3 flex items-center justify-between rounded-lg border border-[#E5EAF0] bg-[#F7F9FA] p-2.5"><span className="text-[10px] font-semibold text-[#5E687B]">{t("rfqs.assignee")}</span><AssigneePicker assigneeId={selectedRfq.assigneeId ?? null} assigneeName={selectedRfq.assigneeName} onChange={id => handleRfqAssigneeChange(selectedRfq.id, id)} /></div>
                      <div className="grid grid-cols-2 gap-2">{[{ label: t("rfqs.buyer"), value: selectedRfq.buyerName, icon: Building2 }, { label: t("rfqs.quantity"), value: `${selectedRfq.quantity.toLocaleString()} ${t("common.units")}`, icon: ClipboardList }, { label: t("rfqs.targetPrice"), value: `${usd(selectedRfq.targetPriceUsd)} ${t("common.perUnit")}`, icon: DollarSign }, { label: t("rfqs.deadline"), value: shortDate(selectedRfq.deadline), icon: CalendarDays }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-[#e8eaee] bg-[#fbfbfc] p-2.5"><div className="flex items-center gap-1.5 text-[#a0a7b2]"><Icon size={11} /><span className="text-[9px] font-semibold">{label}</span></div><p className="mt-1.5 truncate text-[10px] font-bold text-[#495362]">{value}</p></div>)}</div>
                      <div className="mt-5 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#737d8b]">Quote snapshot</p>{selectedRfq.status === "open" && <button onClick={() => setShowAddQuote(true)} className="flex items-center gap-1 text-[10px] font-bold text-[#7457c7]"><Plus size={12} /> Add quote</button>}</div>
                      {selectedPreviewQuote && <div className="mt-2 rounded-lg border border-[#ded7f2] bg-[#fbfaff] p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold text-[#3c4552]">{selectedPreviewQuote.factoryName}</p><p className="mt-0.5 text-[9px] text-[#a0a6b1]">{fmtCountry(selectedPreviewQuote.country, i18n.language)}</p></div><span className={`rounded px-1.5 py-1 text-[8px] font-bold ${quoteStatusCls[selectedPreviewQuote.status]}`}>{selectedPreviewQuote.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2 border-y border-[#eef0f2] py-2"><div><p className="text-[8px] uppercase tracking-wide text-[#a0a6b1]">Unit price</p><p className="mt-1 text-[11px] font-bold text-[#303946]">{usd(selectedPreviewQuote.unitPriceUsd)}</p></div><div><p className="text-[8px] uppercase tracking-wide text-[#a0a6b1]">Vs target</p><p className={`mt-1 text-[11px] font-bold ${selectedPreviewQuote.unitPriceUsd <= selectedRfq.targetPriceUsd ? "text-[#287765]" : "text-[#ba6c3b]"}`}>{selectedPreviewQuote.unitPriceUsd <= selectedRfq.targetPriceUsd ? "" : "+"}{((selectedPreviewQuote.unitPriceUsd - selectedRfq.targetPriceUsd) / selectedRfq.targetPriceUsd * 100).toFixed(1)}%</p></div><div><p className="text-[8px] uppercase tracking-wide text-[#a0a6b1]">Lead time</p><p className="mt-1 text-[11px] font-bold text-[#303946]">{selectedPreviewQuote.leadTimeDays} days</p></div></div><div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-[#a0a6b1]">MOQ {selectedPreviewQuote.moq.toLocaleString()}</span>{selectedRfq.status === "open" && selectedPreviewQuote.status !== "accepted" && <button onClick={() => { setSelectedQuoteId(selectedPreviewQuote.id); handleUseThisQuote(selectedPreviewQuote, selectedRfq); }} className="flex items-center gap-1 text-[9px] font-bold text-[#7457c7]"><Check size={11} /> Use quote</button>}</div></div>}
                       {selectedPreviewQuote && <div className="mt-2 flex items-center justify-end gap-2"><button onClick={() => { setEditingQuoteId(selectedPreviewQuote.id); setEditQuoteForm({ factoryName: selectedPreviewQuote.factoryName, country: selectedPreviewQuote.country, unitPriceUsd: String(selectedPreviewQuote.unitPriceUsd), leadTimeDays: String(selectedPreviewQuote.leadTimeDays), moq: String(selectedPreviewQuote.moq), notes: selectedPreviewQuote.notes ?? "", supplierId: selectedPreviewQuote.supplierId ? String(selectedPreviewQuote.supplierId) : "" }); }} className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold text-[#5E687B] hover:bg-[#F0F4F8]"><Edit2 size={11} />{t("common.edit")}</button><button onClick={() => { if (window.confirm(t("rfqs.deleteQuoteConfirm"))) void deleteQuote(selectedPreviewQuote.id); }} className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold text-red-600 hover:bg-red-50"><Trash2 size={11} />{t("common.delete")}</button>{selectedRfq.status === "open" && <button onClick={() => openConvert(selectedPreviewQuote.id)} className="rounded bg-[#9000FF] px-2 py-1 text-[9px] font-semibold text-white hover:bg-[#7200CC]">{t("rfqs.convertToPo")}</button>}</div>}
                       {!selectedPreviewQuote && <div className="mt-2 rounded-lg border border-dashed border-[#d9dde4] bg-[#fbfbfc] px-3 py-5 text-center"><DollarSign size={16} className="mx-auto text-[#9ea6b2]" /><p className="mt-2 text-[10px] font-semibold text-[#6e7785]">{t("rfqs.noQuotes")}</p><p className="mt-1 text-[9px] leading-4 text-[#a0a6b1]">{t("rfqs.noQuotesDesc")}</p></div>}
                      {selectedRfq.notes && <div className="mt-4 rounded-lg bg-[#f8f7fc] p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8d95a3]">Brief notes</p><p className="mt-1.5 text-[10px] leading-4 text-[#726b85]">{selectedRfq.notes}</p></div>}
                      <div className="mt-5 rounded-lg bg-[#f8f7fc] p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold text-[#6044a9]"><Sparkles size={11} /> Next best action</p><p className="mt-1.5 text-[10px] leading-4 text-[#726b85]">{selectedRfq.quotes.length === 0 ? "Send this RFQ to your factory network before the deadline." : selectedRfq.status === "accepted" ? "Quote selected. Review the live purchase order." : "Compare lead time and landed cost before choosing a supplier."}</p></div>
                    </div>
                    <div className="border-t border-[#e8eaee] bg-[#fbfbfc] px-5 py-3">{selectedRfq.status === "accepted" ? <div className="flex gap-2"><button onClick={() => handleDownloadProforma(selectedRfq)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#dcdfe5] bg-white py-2 text-[10px] font-bold text-[#5d6674]"><Download size={12} /> Proforma PDF</button><button onClick={() => navigate("/")} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7457c7] py-2 text-[10px] font-bold text-white"><ArrowRight size={12} /> View PO</button></div> : <div className="flex gap-2"><button onClick={() => openSendEmail(selectedRfq)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#dcdfe5] bg-white py-2 text-[10px] font-bold text-[#5d6674]"><Mail size={12} /> {selectedRfq.quotes.length ? "Remind factories" : "Send RFQ"}</button>{selectedPreviewQuote ? <button onClick={() => { setSelectedQuoteId(selectedPreviewQuote.id); handleUseThisQuote(selectedPreviewQuote, selectedRfq); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7457c7] py-2 text-[10px] font-bold text-white"><Check size={12} /> Select quote</button> : <button onClick={() => setShowAddQuote(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dcdfe5] bg-white text-[#8a93a0]" title="Add quote"><Plus size={13} /></button>}</div>}</div>
                  </> : <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><FileText size={28} className="text-[#b5bbc5]" /><p className="mt-3 text-[12px] font-semibold text-[#626c7a]">{t("rfqs.noRfqSelected")}</p><button onClick={() => setShowNewRfq(true)} className="mt-3 rounded-lg bg-[#7457c7] px-3 py-2 text-[10px] font-bold text-white"><Plus size={12} className="mr-1 inline" /> New RFQ</button></div>}
                </aside>
              </div>
            </main>
          </div>
        )}
      </div>

      <Dialog open={cancelTargetId !== null} onOpenChange={open => { if (!open) setCancelTargetId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("rfqs.cancelConfirmTitle")}</DialogTitle></DialogHeader>
          <p className="py-1 text-sm text-[#5E687B]">{t("rfqs.cancelConfirmDesc")}</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelTargetId(null)}>{t("common.cancel")}</Button>
            <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => void confirmCancelRfq()} disabled={updateRfqMutation.isPending}>{t("rfqs.cancelRfq")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New RFQ Modal */}
      <Dialog open={showNewRfq} onOpenChange={open => { if (!open) { setShowNewRfq(false); setEditingRfqId(null); setNewRfqError(null); try { sessionStorage.removeItem(RFQ_DRAFT_KEY); } catch {} } }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingRfqId !== null ? t("rfqs.editRfqTitle") : t("rfqs.dialogNewTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {newRfqError && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{newRfqError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldProduct")} *</label>
                <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 focus:border-[#9000FF]/40"
                  placeholder="e.g. Stainless Serving Fork — Brushed Nickel"
                  value={newRfqForm.product} onChange={e => setNewRfqForm(f => ({ ...f, product: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldCategory")}</label>
                <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                  placeholder="e.g. Kitchenware"
                  value={newRfqForm.category} onChange={e => setNewRfqForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldBuyer")} *</label>
                <Popover open={buyerComboboxOpen} onOpenChange={setBuyerComboboxOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 bg-white flex items-center justify-between"
                    >
                      <span className={newRfqForm.buyerName ? "text-[#212833]" : "text-[#9BA5B3]"}>
                        {newRfqForm.buyerName || "e.g. Vellum Studio"}
                      </span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-[#9BA5B3] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-64" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type a buyer…"
                        value={buyerInput}
                        onValueChange={val => { setBuyerInput(val); setNewRfqForm(f => ({ ...f, buyerName: val })); }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {buyerInput.trim() ? (
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-[#9000FF] font-semibold hover:bg-[#F9F6FF]"
                              onClick={() => { setNewRfqForm(f => ({ ...f, buyerName: buyerInput.trim() })); setBuyerComboboxOpen(false); setBuyerInput(""); }}
                            >
                              Add "{buyerInput.trim()}"
                            </button>
                          ) : "No buyers found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {knownBuyers
                            .filter(b => b.toLowerCase().includes(buyerInput.toLowerCase()))
                            .map(b => (
                              <CommandItem
                                key={b}
                                value={b}
                                onSelect={() => { setNewRfqForm(f => ({ ...f, buyerName: b })); setBuyerComboboxOpen(false); setBuyerInput(""); }}
                              >
                                {b}
                                {newRfqForm.buyerName === b && <Check className="ml-auto w-3.5 h-3.5" />}
                              </CommandItem>
                            ))}
                          {buyerInput.trim() && !knownBuyers.some(b => b.toLowerCase() === buyerInput.toLowerCase()) && (
                            <CommandItem
                              value={`__add__${buyerInput.trim()}`}
                              onSelect={() => { setNewRfqForm(f => ({ ...f, buyerName: buyerInput.trim() })); setBuyerComboboxOpen(false); setBuyerInput(""); }}
                              className="text-[#9000FF] font-semibold"
                            >
                              Add "{buyerInput.trim()}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldTargetPrice")} *</label>
                <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                  placeholder="0.00" type="number" step="0.01"
                  value={newRfqForm.targetPriceUsd} onChange={e => setNewRfqForm(f => ({ ...f, targetPriceUsd: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldQuantity")} *</label>
                <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                  placeholder="e.g. 5000" type="number"
                  value={newRfqForm.quantity} onChange={e => setNewRfqForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E687B] mb-1 cursor-default">
                        {t("rfqs.fieldDeadline")} * <Info className="w-3 h-3 text-[#5E687B]/60" />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] text-left leading-snug">
                      {t("rfqs.deadlineTip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                  type="date"
                  value={newRfqForm.deadline} onChange={e => setNewRfqForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldNotes")}</label>
                <textarea className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 resize-none"
                  rows={2} placeholder="Any special requirements or notes for factories..."
                  value={newRfqForm.notes} onChange={e => setNewRfqForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowNewRfq(false); setEditingRfqId(null); setNewRfqError(null); try { sessionStorage.removeItem(RFQ_DRAFT_KEY); } catch {} }}>{t("common.cancel")}</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitNewRfq}
              disabled={createRfqMutation.isPending || updateRfqMutation.isPending}>
              {createRfqMutation.isPending || updateRfqMutation.isPending ? t("common.saving") : editingRfqId !== null ? t("rfqs.saveRfq") : t("rfqs.createRfq")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Quote Modal */}
      <Dialog open={showAddQuote} onOpenChange={open => { if (!open) setShowAddQuote(false); }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("rfqs.dialogAddQuoteTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); void submitAddQuote(); }}>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldFactoryName")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    placeholder="e.g. Guangzhou Metalworks"
                    value={newQuoteForm.factoryName} onChange={e => setNewQuoteForm(f => ({ ...f, factoryName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldCountry")}</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    placeholder="CN"
                    value={newQuoteForm.country} onChange={e => setNewQuoteForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldSupplierLink")}</label>
                  <select className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 bg-white"
                    value={newQuoteForm.supplierId} onChange={e => setNewQuoteForm(f => ({ ...f, supplierId: e.target.value }))}>
                    <option value="">— None —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldUnitPrice")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    type="number" step="0.01" placeholder="0.00"
                    value={newQuoteForm.unitPriceUsd} onChange={e => setNewQuoteForm(f => ({ ...f, unitPriceUsd: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldLeadTime")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    type="number" placeholder="e.g. 45"
                    value={newQuoteForm.leadTimeDays} onChange={e => setNewQuoteForm(f => ({ ...f, leadTimeDays: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldMoq")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    type="number" placeholder="e.g. 1000"
                    value={newQuoteForm.moq} onChange={e => setNewQuoteForm(f => ({ ...f, moq: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldNotes")}</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    placeholder="Any conditions, validity, remarks..."
                    value={newQuoteForm.notes} onChange={e => setNewQuoteForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setShowAddQuote(false);
                setNewQuoteForm({ factoryName: "", country: "CN", unitPriceUsd: "", leadTimeDays: "", moq: "", notes: "", supplierId: "" });
                try { sessionStorage.removeItem(QUOTE_DRAFT_KEY); } catch {}
              }}>{t("common.cancel")}</Button>
              <Button type="submit" size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white"
                disabled={addQuoteMutation.isPending}>
                {addQuoteMutation.isPending ? t("common.adding") : t("rfqs.addQuote")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingQuoteId !== null} onOpenChange={open => { if (!open) setEditingQuoteId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("rfqs.editQuoteTitle")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold text-[#5E687B]">{t("rfqs.fieldFactoryName")}</label><input value={editQuoteForm.factoryName} onChange={e => setEditQuoteForm(f => ({ ...f, factoryName: e.target.value }))} className="w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9000FF]/20" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-[#5E687B]">{t("rfqs.fieldCountry")}</label><input value={editQuoteForm.country} onChange={e => setEditQuoteForm(f => ({ ...f, country: e.target.value }))} className="w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9000FF]/20" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-[#5E687B]">{t("rfqs.fieldUnitPrice")}</label><input type="number" step="0.01" value={editQuoteForm.unitPriceUsd} onChange={e => setEditQuoteForm(f => ({ ...f, unitPriceUsd: e.target.value }))} className="w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9000FF]/20" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-[#5E687B]">{t("rfqs.fieldLeadTime")}</label><input type="number" value={editQuoteForm.leadTimeDays} onChange={e => setEditQuoteForm(f => ({ ...f, leadTimeDays: e.target.value }))} className="w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9000FF]/20" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-[#5E687B]">{t("rfqs.fieldMoq")}</label><input type="number" value={editQuoteForm.moq} onChange={e => setEditQuoteForm(f => ({ ...f, moq: e.target.value }))} className="w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9000FF]/20" /></div>
            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold text-[#5E687B]">{t("rfqs.fieldNotes")}</label><input value={editQuoteForm.notes} onChange={e => setEditQuoteForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9000FF]/20" /></div>
          </div>
          <DialogFooter><Button variant="ghost" size="sm" onClick={() => setEditingQuoteId(null)}>{t("common.cancel")}</Button><Button size="sm" className="bg-[#9000FF] text-white hover:bg-[#7200CC]" onClick={() => void submitEditQuote()} disabled={updateQuoteMutation.isPending}>{updateQuoteMutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to PO Modal */}
      <Dialog open={showConvert} onOpenChange={open => { if (!open) setShowConvert(false); }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("rfqs.dialogConvertTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            {(() => {
              const q = selectedRfq?.quotes.find(x => x.id === convertForm.acceptedQuoteId);
              if (!q) return null;
              return (
                <div className="mb-4 p-3 bg-[#9000FF]/5 border border-[#9000FF]/15 rounded-lg">
                  <div className="text-xs font-bold text-[#9000FF] mb-1">{t("rfqs.winningQuote")}</div>
                  <div className="font-semibold text-sm text-[#212833]">{q.factoryName}</div>
                  <div className="text-xs text-[#5E687B] mt-0.5">
                    {usd(q.unitPriceUsd)} / unit · {q.leadTimeDays}d lead time · MOQ {q.moq.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#5E687B] mt-0.5">
                    Est. total: <span className="font-semibold text-[#212833]">{usd(q.unitPriceUsd * (selectedRfq?.quantity ?? 0))}</span>
                  </div>
                </div>
              );
            })()}
            {convertError && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs mb-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{convertError}
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldPoNumber")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    placeholder="e.g. PO-2026-0201S"
                    value={convertForm.poNumber} onChange={e => setConvertForm(f => ({ ...f, poNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldAssignSupplier")} *</label>
                  <select className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 bg-white"
                    value={convertForm.supplierId} onChange={e => setConvertForm(f => ({ ...f, supplierId: e.target.value }))}>
                    <option value="">— Select supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldDueDate")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    type="date"
                    value={convertForm.dueDate} onChange={e => setConvertForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldExFactory")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    type="date"
                    value={convertForm.exFactoryDate} onChange={e => setConvertForm(f => ({ ...f, exFactoryDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldDestination")} *</label>
                  <input className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                    placeholder="e.g. Los Angeles, CA"
                    value={convertForm.destination} onChange={e => setConvertForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldVia")}</label>
                  <select className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 bg-white"
                    value={convertForm.via} onChange={e => setConvertForm(f => ({ ...f, via: e.target.value }))}>
                    <option value="OCEAN">Ocean</option>
                    <option value="AIR">Air</option>
                    <option value="RAIL">Rail</option>
                    <option value="TRUCK">Truck</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldDeposit")}</label>
                  <div className="flex items-center gap-3">
                    {[20, 30, 40, 50].map(pct => (
                      <button key={pct} onClick={() => setConvertForm(f => ({ ...f, depositPct: String(pct) }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${convertForm.depositPct === String(pct) ? "bg-[#9000FF] text-white border-[#9000FF]" : "border-[#E5EAF0] text-[#5E687B] hover:border-[#9000FF]/40"}`}>
                        {pct}%
                      </button>
                    ))}
                    <input className="w-20 border border-[#E5EAF0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                      type="number" min="1" max="99"
                      value={convertForm.depositPct} onChange={e => setConvertForm(f => ({ ...f, depositPct: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowConvert(false)}>{t("common.cancel")}</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitConvert}
              disabled={convertMutation.isPending}>
              {convertMutation.isPending ? t("common.creating") : t("rfqs.createPo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send RFQ Email Modal */}
      <Dialog open={showSendEmail} onOpenChange={open => { if (!open) { setShowSendEmail(false); setSendEmailError(null); } }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#9000FF]" /> {t("rfqs.dialogSendEmailTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {sendEmailError && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{sendEmailError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldRecipients")} *</label>
              <input
                className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                placeholder="factory@example.com, another@example.com"
                value={sendEmailForm.to}
                onChange={e => setSendEmailForm(f => ({ ...f, to: e.target.value }))}
              />
              <p className="text-[10px] text-[#9BA5B3] mt-1">Separate multiple addresses with commas.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldSubject")} *</label>
              <input
                className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20"
                value={sendEmailForm.subject}
                onChange={e => setSendEmailForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("rfqs.fieldMessage")} *</label>
              <textarea
                className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9000FF]/20 resize-none font-mono"
                rows={10}
                value={sendEmailForm.body}
                onChange={e => setSendEmailForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowSendEmail(false); setSendEmailError(null); }}>{t("common.cancel")}</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitSendEmail}
              disabled={sendEmailMutation.isPending}>
              {sendEmailMutation.isPending ? t("rfqs.sending") : t("common.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
