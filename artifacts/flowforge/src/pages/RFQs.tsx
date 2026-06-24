import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { AICopilotBar } from "@/components/AICopilotBar";
import { useCopilotHint } from "@/lib/CopilotContext";
import { useTranslation } from "react-i18next";
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
import type { RfqWithQuotes, RfqQuote } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, FileText, CheckCircle2, AlertCircle,
  X, Trash2, Edit2, Check, TrendingDown, TrendingUp, Minus,
  Download, ArrowRight, RefreshCw, Info, Mail, ChevronsUpDown,
} from "lucide-react";
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
  const { t } = useTranslation();
  useLocation();
  useCopilotHint("Ask about RFQ status or factory quote comparisons", [
    "Which RFQs are awaiting quotes?",
    "Compare factory quotes for open RFQs",
  ]);
  const queryClient = useQueryClient();
  const rfqsQueryKey = getListRfqsQueryKey();
  const shipmentsQueryKey = getListShipmentsQueryKey();

  const { data: rfqs = [], refetch: refetchRfqs } = useListRfqs();
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
  const [showNewRfq, setShowNewRfq] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [convertedPoNumber, setConvertedPoNumber] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const [buyerComboboxOpen, setBuyerComboboxOpen] = useState(false);
  const [buyerInput, setBuyerInput] = useState("");

  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendEmailForm, setSendEmailForm] = useState({ to: "", subject: "", body: "" });
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);

  const [newRfqForm, setNewRfqForm] = useState<NewRfqFormState>({
    product: "", category: "", buyerName: "", targetPriceUsd: "", quantity: "", deadline: "", notes: "",
  });
  const [newRfqError, setNewRfqError] = useState<string | null>(null);

  const [convertForm, setConvertForm] = useState<ConvertFormState>({
    acceptedQuoteId: null, poNumber: "", supplierId: "", dueDate: "", exFactoryDate: "",
    destination: "", via: "OCEAN", depositPct: "30",
  });
  const [convertError, setConvertError] = useState<string | null>(null);

  const [newQuoteForm, setNewQuoteForm] = useState<NewQuoteFormState>({
    factoryName: "", country: "CN", unitPriceUsd: "", leadTimeDays: "", moq: "", notes: "", supplierId: "",
  });
  const [editQuoteForm, setEditQuoteForm] = useState<NewQuoteFormState>({
    factoryName: "", country: "CN", unitPriceUsd: "", leadTimeDays: "", moq: "", notes: "", supplierId: "",
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const selectedRfq = rfqs.find(r => r.id === selectedRfqId) ?? null;

  useEffect(() => {
    if (rfqs.length > 0 && selectedRfqId === null) {
      setSelectedRfqId(rfqs[0].id);
    }
  }, [rfqs, selectedRfqId]);

  const submitNewRfq = async () => {
    setNewRfqError(null);
    if (!newRfqForm.product.trim() || !newRfqForm.buyerName.trim() || !newRfqForm.targetPriceUsd || !newRfqForm.quantity || !newRfqForm.deadline) {
      setNewRfqError("Please fill in all required fields."); return;
    }
    try {
      const created = await createRfqMutation.mutateAsync({
        data: {
          product: newRfqForm.product.trim(),
          category: newRfqForm.category.trim(),
          buyerName: newRfqForm.buyerName.trim(),
          targetPriceUsd: Number(newRfqForm.targetPriceUsd),
          quantity: Number(newRfqForm.quantity),
          deadline: new Date(newRfqForm.deadline).toISOString(),
          notes: newRfqForm.notes.trim() || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      setSelectedRfqId(created.id);
      setShowNewRfq(false);
      setNewRfqForm({ product: "", category: "", buyerName: "", targetPriceUsd: "", quantity: "", deadline: "", notes: "" });
      setBuyerInput("");
      showToast("RFQ created");
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
      showToast("Quote added");
    } catch {
      showToast("Failed to add quote");
    }
  };

  const submitEditQuote = async () => {
    if (!editingQuoteId || !editQuoteForm.factoryName.trim()) return;
    try {
      await updateQuoteMutation.mutateAsync({
        id: selectedRfqId!,
        quoteId: editingQuoteId,
        data: {
          factoryName: editQuoteForm.factoryName.trim(),
          country: editQuoteForm.country || "CN",
          unitPriceUsd: Number(editQuoteForm.unitPriceUsd),
          leadTimeDays: Number(editQuoteForm.leadTimeDays),
          moq: Number(editQuoteForm.moq),
          notes: editQuoteForm.notes.trim() || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
      setEditingQuoteId(null);
      showToast("Quote updated");
    } catch {
      showToast("Failed to update quote");
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

  const cancelRfq = async (id: number) => {
    await updateRfqMutation.mutateAsync({ id, data: { status: "cancelled" } });
    queryClient.invalidateQueries({ queryKey: rfqsQueryKey });
    showToast("RFQ cancelled");
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

      <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        <NavSidebar counts={{ myOrders: null }}>
          <div className="px-3 py-2 border-t border-[#E5EAF0]">
            <div className="mb-1.5 px-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase">{t("rfqs.sidebarTitle")}</span>
              <button onClick={() => setShowNewRfq(true)} className="p-0.5 hover:bg-[#E5EAF0] rounded transition-colors">
                <Plus className="w-3 h-3 text-[#5E687B]" />
              </button>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-0.5 pb-2">
                {rfqs.length === 0 && (
                  <div className="text-center py-8 text-[#5E687B] text-xs">
                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>{t("rfqs.noRfqs")}</p>
                    <button onClick={() => setShowNewRfq(true)} className="mt-2 text-[#9000FF] font-semibold hover:underline">
                      {t("rfqs.createFirst")}
                    </button>
                  </div>
                )}
                {rfqs.map(rfq => (
                  <button key={rfq.id} onClick={() => setSelectedRfqId(rfq.id)}
                    className={`w-full text-left px-2 py-2 rounded-md transition-colors ${selectedRfqId === rfq.id ? "bg-white border border-[#9000FF]/20 shadow-sm" : "hover:bg-[#E5EAF0]"}`}>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-[#212833] truncate text-xs">{rfq.product}</span>
                      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusCls[rfq.status] ?? "bg-slate-100"}`}>
                        {getStatusLabel(t)[rfq.status] ?? rfq.status}
                      </span>
                    </div>
                    <div className="text-[#5E687B] text-[10px]">
                      {rfq.buyerName} · {rfq.quantity.toLocaleString()} units · {rfq.quotes.length} quote{rfq.quotes.length !== 1 ? "s" : ""}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </NavSidebar>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#9000FF]" />
              <span className="font-bold text-sm text-[#212833]">{t("rfqs.sidebarTitle")}</span>
              {rfqs.length > 0 && (
                <span className="text-[10px] bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full font-bold">{rfqs.filter(r => r.status === "open").length} {t("rfqs.openBadge")}</span>
              )}
            </div>
            <Button size="sm" onClick={() => setShowNewRfq(true)}
              className="h-7 px-3 bg-[#9000FF] hover:bg-[#7200CC] text-white text-xs font-semibold">
              <Plus className="w-3 h-3 mr-1" /> {t("rfqs.newRfq")}
            </Button>
          </div>

          {/* Main content */}
          {!selectedRfq ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[#5E687B]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">{t("rfqs.noRfqSelected")}</p>
                <p className="text-xs mt-1">{t("rfqs.noRfqSelectedDesc")}</p>
                <Button size="sm" className="mt-4 bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={() => setShowNewRfq(true)}>
                  <Plus className="w-3 h-3 mr-1" /> {t("rfqs.newRfq")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto p-6">
                {/* RFQ Header */}
                <div className="bg-white border border-[#E5EAF0] rounded-xl p-5 mb-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-[#212833] truncate">{selectedRfq.product}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls[selectedRfq.status]}`}>
                          {getStatusLabel(t)[selectedRfq.status]}
                        </span>
                      </div>
                      {selectedRfq.category && (
                        <span className="text-xs text-[#5E687B] bg-[#F0F2F5] px-2 py-0.5 rounded-full">{selectedRfq.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRfq.status === "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => handleDownloadProforma(selectedRfq)}
                          className="h-7 px-3 text-xs border-[#9000FF]/30 text-[#9000FF] hover:bg-[#9000FF]/5">
                          <Download className="w-3 h-3 mr-1.5" /> {t("rfqs.proformaPdf")}
                        </Button>
                      )}
                      {selectedRfq.status === "accepted" && selectedRfq.convertedShipmentId && (
                        <Button size="sm" variant="outline" onClick={() => navigate("/")}
                          className="h-7 px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          <ArrowRight className="w-3 h-3 mr-1.5" /> {t("rfqs.viewPo")}
                        </Button>
                      )}
                      {selectedRfq.status === "open" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openSendEmail(selectedRfq)}
                            className="h-7 px-3 text-xs border-[#E5EAF0] text-[#5E687B] hover:bg-[#F0F2F5]">
                            <Mail className="w-3 h-3 mr-1.5" /> {t("rfqs.sendRfq")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelRfq(selectedRfq.id)}
                            className="h-7 px-3 text-xs text-[#5E687B] hover:text-red-600 hover:bg-red-50">
                            {t("rfqs.cancelRfq")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">{t("rfqs.buyer")}</div>
                      <div className="text-sm font-semibold text-[#212833]">{selectedRfq.buyerName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">{t("rfqs.targetPrice")}</div>
                      <div className="text-sm font-semibold text-[#212833]">{usd(selectedRfq.targetPriceUsd)} {t("common.perUnit")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">{t("rfqs.quantity")}</div>
                      <div className="text-sm font-semibold text-[#212833]">{selectedRfq.quantity.toLocaleString()} {t("common.units")}</div>
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5 cursor-default">
                              Deadline <Info className="w-3 h-3 text-[#5E687B]/60" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] text-left leading-snug">
                            {t("rfqs.deadlineTip")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="text-sm font-semibold text-[#212833]">{shortDate(selectedRfq.deadline)}</div>
                    </div>
                  </div>
                  {selectedRfq.notes && (
                    <div className="mt-3 pt-3 border-t border-[#F0F2F5] text-[#5E687B] text-xs">{selectedRfq.notes}</div>
                  )}
                </div>

                {/* Quote Comparison Table */}
                <div className="bg-white border border-[#E5EAF0] rounded-xl">
                  <div className="px-5 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#212833]">{t("rfqs.quoteTable")}</h3>
                      <p className="text-[11px] text-[#5E687B] mt-0.5">{t("rfqs.quoteTableDesc")}</p>
                    </div>
                    {selectedRfq.status === "open" && (
                      <Button size="sm" onClick={() => setShowAddQuote(true)}
                        className="h-7 px-3 text-xs bg-[#9000FF] hover:bg-[#7200CC] text-white">
                        <Plus className="w-3 h-3 mr-1" /> {t("rfqs.addQuote")}
                      </Button>
                    )}
                  </div>

                  {selectedRfq.quotes.length === 0 ? (
                    <div className="p-10 text-center text-[#5E687B]">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-semibold mb-1">{t("rfqs.noQuotes")}</p>
                      <p className="text-xs">{t("rfqs.noQuotesDesc")}</p>
                      {selectedRfq.status === "open" && (
                        <Button size="sm" className="mt-3 bg-[#9000FF] hover:bg-[#7200CC] text-white text-xs" onClick={() => setShowAddQuote(true)}>
                          <Plus className="w-3 h-3 mr-1" /> {t("rfqs.addFirstQuote")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#F0F2F5]">
                            <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-5 py-3">{t("rfqs.colFactory")}</th>
                            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-4 py-3">{t("rfqs.colUnitPrice")}</th>
                            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-4 py-3">{t("rfqs.colSpread")}</th>
                            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-4 py-3">{t("rfqs.colTotal")}</th>
                            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-4 py-3">{t("rfqs.colLeadTime")}</th>
                            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-4 py-3">{t("rfqs.colMoq")}</th>
                            <th className="text-center text-[10px] font-bold text-[#5E687B] uppercase tracking-wider px-4 py-3">{t("rfqs.colStatus")}</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRfq.quotes.map((q, i) => {
                            const spread = selectedRfq.targetPriceUsd - q.unitPriceUsd;
                            const totalEst = q.unitPriceUsd * selectedRfq.quantity;
                            const isLowest = selectedRfq.quotes.length > 1 &&
                              q.unitPriceUsd === Math.min(...selectedRfq.quotes.map(x => x.unitPriceUsd));
                            const isEditing = editingQuoteId === q.id;

                            return (
                              <tr key={q.id} className={`border-b border-[#F0F2F5] last:border-0 transition-colors ${q.status === "accepted" ? "bg-emerald-50/40" : isLowest ? "bg-[#F9F6FF]/60" : "hover:bg-[#FAFBFC]"}`}>
                                {isEditing ? (
                                  <>
                                    <td className="px-5 py-2">
                                      <input className="border border-[#E5EAF0] rounded px-2 py-1 text-xs w-full" value={editQuoteForm.factoryName}
                                        onChange={e => setEditQuoteForm(f => ({ ...f, factoryName: e.target.value }))} placeholder="Factory name" />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input className="border border-[#E5EAF0] rounded px-2 py-1 text-xs w-24 text-right" type="number" value={editQuoteForm.unitPriceUsd}
                                        onChange={e => setEditQuoteForm(f => ({ ...f, unitPriceUsd: e.target.value }))} placeholder="0.00" />
                                    </td>
                                    <td className="px-4 py-2" colSpan={2} />
                                    <td className="px-4 py-2">
                                      <input className="border border-[#E5EAF0] rounded px-2 py-1 text-xs w-16 text-right" type="number" value={editQuoteForm.leadTimeDays}
                                        onChange={e => setEditQuoteForm(f => ({ ...f, leadTimeDays: e.target.value }))} placeholder="days" />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input className="border border-[#E5EAF0] rounded px-2 py-1 text-xs w-20 text-right" type="number" value={editQuoteForm.moq}
                                        onChange={e => setEditQuoteForm(f => ({ ...f, moq: e.target.value }))} placeholder="MOQ" />
                                    </td>
                                    <td className="px-4 py-2" />
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-1 justify-end">
                                        <button onClick={submitEditQuote} className="p-1 hover:bg-emerald-50 rounded text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setEditingQuoteId(null)} className="p-1 hover:bg-red-50 rounded text-red-400"><X className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        {q.status === "accepted" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                        {isLowest && q.status !== "accepted" && <span className="text-[9px] font-bold text-[#9000FF] bg-[#9000FF]/10 px-1.5 rounded">{t("rfqs.badgeLowest")}</span>}
                                        <div>
                                          <div className="font-semibold text-[#212833]">{q.factoryName}</div>
                                          <div className="text-[10px] text-[#5E687B]">{q.country}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-[#212833]">{usd(q.unitPriceUsd)}</td>
                                    <td className="px-4 py-3 text-right">
                                      <div className={`flex items-center justify-end gap-1 font-semibold text-sm ${spread > 0 ? "text-emerald-600" : spread < 0 ? "text-red-500" : "text-[#5E687B]"}`}>
                                        {spread > 0 ? <TrendingDown className="w-3.5 h-3.5" /> : spread < 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                        {spread >= 0 ? "+" : ""}{usd(Math.abs(spread))}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-[#5E687B]">{usd(totalEst)}</td>
                                    <td className="px-4 py-3 text-right text-[#5E687B]">{q.leadTimeDays}d</td>
                                    <td className="px-4 py-3 text-right text-[#5E687B]">{q.moq.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${quoteStatusCls[q.status]}`}>{q.status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1 justify-end">
                                        {selectedRfq.status === "open" && q.status !== "accepted" && (
                                          <button onClick={() => openConvert(q.id)}
                                            className="px-2 py-1 text-[10px] font-bold bg-[#9000FF] text-white rounded hover:bg-[#7200CC] whitespace-nowrap transition-colors">
                                            {t("rfqs.useThisQuote")}
                                          </button>
                                        )}
                                        {selectedRfq.status === "open" && (
                                          <>
                                            <button onClick={() => {
                                              setEditingQuoteId(q.id);
                                              setEditQuoteForm({ factoryName: q.factoryName, country: q.country, unitPriceUsd: String(q.unitPriceUsd), leadTimeDays: String(q.leadTimeDays), moq: String(q.moq), notes: q.notes ?? "", supplierId: q.supplierId ? String(q.supplierId) : "" });
                                            }} className="p-1 hover:bg-[#E5EAF0] rounded text-[#5E687B]">
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => deleteQuote(q.id)} className="p-1 hover:bg-red-50 rounded text-[#5E687B] hover:text-red-500">
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Summary footer */}
                      {selectedRfq.quotes.length > 0 && (
                        <div className="px-5 py-3 border-t border-[#F0F2F5] bg-[#FAFBFC] flex items-center gap-6 text-xs text-[#5E687B]">
                          <span>
                            <span className="font-bold text-[#212833]">{selectedRfq.quotes.length}</span> quote{selectedRfq.quotes.length !== 1 ? "s" : ""}
                          </span>
                          <span>
                            Best: <span className="font-bold text-emerald-600">{usd(Math.min(...selectedRfq.quotes.map(q => q.unitPriceUsd)))}</span>
                          </span>
                          <span>
                            Target: <span className="font-bold text-[#212833]">{usd(selectedRfq.targetPriceUsd)}</span>
                          </span>
                          <span>
                            Best spread: <span className={`font-bold ${selectedRfq.targetPriceUsd - Math.min(...selectedRfq.quotes.map(q => q.unitPriceUsd)) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {usd(selectedRfq.targetPriceUsd - Math.min(...selectedRfq.quotes.map(q => q.unitPriceUsd)))}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedRfq.quotes.length > 0 && selectedRfq.status === "open" && (
                  <p className="text-xs text-[#5E687B] mt-3 text-center">
                    Click <span className="font-bold text-[#9000FF]">Use this quote</span> on the winning row to accept it and convert this RFQ to a live PO.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <AICopilotBar />
      </div>

      {/* New RFQ Modal */}
      <Dialog open={showNewRfq} onOpenChange={open => { if (!open) { setShowNewRfq(false); setNewRfqError(null); } }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("rfqs.dialogNewTitle")}</DialogTitle>
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
            <Button variant="ghost" size="sm" onClick={() => { setShowNewRfq(false); setNewRfqError(null); }}>{t("common.cancel")}</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitNewRfq}
              disabled={createRfqMutation.isPending}>
              {createRfqMutation.isPending ? t("common.creating") : t("rfqs.createRfq")}
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
            <Button variant="ghost" size="sm" onClick={() => setShowAddQuote(false)}>{t("common.cancel")}</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitAddQuote}
              disabled={addQuoteMutation.isPending}>
              {addQuoteMutation.isPending ? t("common.adding") : t("rfqs.addQuote")}
            </Button>
          </DialogFooter>
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
