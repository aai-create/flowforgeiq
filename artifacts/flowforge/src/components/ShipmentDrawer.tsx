import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StageHistory } from "@/components/StageHistory";
import { QuotesTab } from "@/components/QuotesTab";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { Message, DocumentWithExtraction, FactoryQuote, SupplierSummary, DealWithSpread } from "@workspace/api-client-react";
import type { UiShipment, UiStage } from "@/lib/adapters";
import { shortDate } from "@/lib/adapters";
import { getDisplayLocale } from "@/lib/locale";
import {
  X, MessageCircle, FileText, DollarSign, Clock, MapPin,
  CheckCircle2, AlertCircle, CreditCard, MoreHorizontal,
  ChevronRight, Link2, HelpCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MarkPaidForm {
  shipmentId: string;
  paymentIdx: number;
  amount: string;
  date: string;
  reference: string;
  method: string;
  invoiceNumber: string;
  intermediarySupplierPaid: boolean;
  intermediarySupplierAmount: string;
  intermediarySupplierDate: string;
}

interface ShipmentDrawerProps {
  shipment: UiShipment | null;
  stages: UiStage[];
  allMessages: Message[];
  allDocuments: DocumentWithExtraction[];
  apiSuppliers: SupplierSummary[];
  shipmentQuotesMap: Map<number, FactoryQuote[]>;
  existingDeals: DealWithSpread[] | undefined;
  riskScore: number | undefined;

  markPaidForm: MarkPaidForm | null;
  setMarkPaidForm: React.Dispatch<React.SetStateAction<MarkPaidForm | null>>;
  openMarkPaid: (shipmentId: string, paymentIdx: number) => void;
  confirmMarkPaid: () => void;
  undoPaymentPaid: (shipmentId: string, paymentIdx: number) => void;

  buyerPriceFormId: string | null;
  setBuyerPriceFormId: React.Dispatch<React.SetStateAction<string | null>>;
  buyerPriceDraft: { unitPrice: string; quantity: string };
  setBuyerPriceDraft: React.Dispatch<React.SetStateAction<{ unitPrice: string; quantity: string }>>;
  patchDealForShipment: (args: { id: number; data: { buyerUnitPrice: number; buyerQuantity: number } }) => void;
  patchDealPending: boolean;

  linkPanelShipmentId: number | null;
  setLinkPanelShipmentId: React.Dispatch<React.SetStateAction<number | null>>;
  linkDeal: (args: { id: number; data: { dealId: number } }) => void;
  unlinkDeal: (args: { id: number; dealId: number }) => void;

  openAdvanceDialog: (shipment: UiShipment) => void;
  openEditPO: (shipment: UiShipment) => void;
  setShipments: React.Dispatch<React.SetStateAction<UiShipment[]>>;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  setShipmentQuotesMap: React.Dispatch<React.SetStateAction<Map<number, FactoryQuote[]>>>;

  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const statusCls = (s: UiShipment["status"]) =>
  s === "on-track"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : s === "delayed"
    ? "bg-red-50 text-red-700 border border-red-100"
    : "bg-amber-50 text-amber-700 border border-amber-100";

const statusLabel = (s: UiShipment["status"]) =>
  s === "at-risk" ? "At Risk" : s === "delayed" ? "Delayed" : "On Track";

// ── Component ──────────────────────────────────────────────────────────────

export function ShipmentDrawer({
  shipment,
  stages,
  allMessages,
  allDocuments,
  apiSuppliers,
  shipmentQuotesMap,
  existingDeals,
  riskScore,
  markPaidForm,
  setMarkPaidForm,
  openMarkPaid,
  confirmMarkPaid,
  undoPaymentPaid,
  buyerPriceFormId,
  setBuyerPriceFormId,
  buyerPriceDraft,
  setBuyerPriceDraft,
  patchDealForShipment,
  patchDealPending,
  linkPanelShipmentId,
  setLinkPanelShipmentId,
  linkDeal,
  unlinkDeal,
  openAdvanceDialog,
  openEditPO,
  setShipments,
  setAiInput,
  setShipmentQuotesMap,
  onClose,
}: ShipmentDrawerProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isOpen = shipment !== null;

  const stageLabels = stages.map((s) => s.label);
  const stageIdx = shipment ? stageLabels.indexOf(shipment.currentStage) : -1;
  const stagePct =
    stageLabels.length > 1 && stageIdx >= 0
      ? (stageIdx / (stageLabels.length - 1)) * 100
      : 0;

  const supplierInfo = shipment
    ? apiSuppliers.find((s) => s.name === shipment.supplier)
    : undefined;

  const msgs: Message[] = shipment
    ? allMessages
        .filter((m) => m.shipmentId === shipment.shipmentId)
        .sort(
          (a, b) =>
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        )
    : [];

  const docs: DocumentWithExtraction[] = shipment
    ? allDocuments
        .filter((d) => d.shipmentId === shipment.shipmentId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    : [];

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* Subtle overlay — doesn't completely obscure the list */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-[540px] bg-white shadow-2xl border-l border-[#E5EAF0] flex flex-col",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-in-out"
          )}
          style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}
          aria-describedby={undefined}
        >
          {/* ── HEADER ── */}
          {shipment && (
            <>
              <div className="shrink-0 border-b border-[#E5EAF0] bg-[#FAFBFC] px-5 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#212833] leading-snug mb-1 pr-2">
                      {shipment.product}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-1.5 py-0.5 rounded">
                        {shipment.po}
                      </span>
                      {(
                        shipment.buyerPoNumbers.length > 0
                          ? shipment.buyerPoNumbers
                          : shipment.buyerPoNumber
                          ? [shipment.buyerPoNumber]
                          : []
                      ).map((bpo) => (
                        <span
                          key={bpo}
                          className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                        >
                          {bpo}
                        </span>
                      ))}
                      <span className="text-[10px] text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-1.5 py-0.5 rounded">
                        {shipment.customer}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* More menu */}
                    <div className="relative">
                      <button
                        onClick={() => setMoreMenuOpen((v) => !v)}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {moreMenuOpen && (
                        <div className="absolute right-0 top-8 z-50 w-52 bg-white border border-[#E5EAF0] rounded-xl shadow-xl py-1 text-[11px]">
                          {[
                            {
                              label: "Edit PO",
                              action: () => {
                                openEditPO(shipment);
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: "Mark as At Risk",
                              action: () => {
                                setShipments((prev) =>
                                  prev.map((s) =>
                                    s.id === shipment.id
                                      ? { ...s, status: "at-risk" as const }
                                      : s
                                  )
                                );
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: "Mark as On Track",
                              action: () => {
                                setShipments((prev) =>
                                  prev.map((s) =>
                                    s.id === shipment.id
                                      ? { ...s, status: "on-track" as const }
                                      : s
                                  )
                                );
                                setMoreMenuOpen(false);
                              },
                            },
                            {
                              label: "Ask AI about this PO",
                              action: () => {
                                setAiInput(`Tell me about ${shipment.po}`);
                                setMoreMenuOpen(false);
                                onClose();
                              },
                            },
                            {
                              label: "Copy PO number",
                              action: () => {
                                navigator.clipboard
                                  .writeText(shipment.po)
                                  .catch(() => {});
                                setMoreMenuOpen(false);
                              },
                            },
                          ].map(({ label, action }) => (
                            <button
                              key={label}
                              onClick={action}
                              className="w-full text-left px-3 py-2 hover:bg-[#F0F4F8] text-[#212833] transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Close */}
                    <DialogPrimitive.Close className="h-7 w-7 flex items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors">
                      <X className="w-4 h-4" />
                      <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-[10px] text-[#5E687B]">
                    <div className="w-3.5 h-3.5 rounded bg-[#F0F4F8] flex items-center justify-center text-[8px] font-bold text-[#5E687B]">
                      {shipment.supplier.charAt(0)}
                    </div>
                    {shipment.supplier}
                    {supplierInfo?.contactEmail && (
                      <span className="text-[9px] text-[#9E9FAE] ml-1">
                        · {supplierInfo.contactEmail}
                      </span>
                    )}
                  </div>
                  <span className="text-[#D6E3EB]">·</span>
                  <div className="flex items-center gap-1 text-[10px] text-[#5E687B]">
                    <Clock className="w-3 h-3" />
                    {shipment.dueDate}
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls(shipment.status)}`}
                  >
                    {statusLabel(shipment.status)}
                  </span>
                  {shipment.spreadPct !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border",
                        shipment.spreadPct >= 25
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : shipment.spreadPct >= 10
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      )}
                    >
                      <DollarSign className="w-2.5 h-2.5" />
                      {shipment.spreadPct.toFixed(1)}%
                      {shipment.spreadUsd !== null
                        ? ` · $${Math.round(shipment.spreadUsd!).toLocaleString()}`
                        : ""}
                    </span>
                  )}
                  {riskScore !== undefined && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border",
                        riskScore >= 70
                          ? "bg-red-50 text-red-600 border-red-100"
                          : riskScore >= 45
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}
                    >
                      {riskScore}
                    </span>
                  )}
                </div>
              </div>

              {/* ── TABS ── */}
              <Tabs defaultValue="finance" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="shrink-0 w-full justify-start rounded-none border-b border-[#E5EAF0] bg-[#FAFBFC] px-4 h-10 gap-1">
                  {[
                    { value: "finance", label: "Finance", icon: <CreditCard className="w-3 h-3" /> },
                    { value: "threads", label: `Threads${msgs.length ? ` (${msgs.length})` : ""}`, icon: <MessageCircle className="w-3 h-3" /> },
                    { value: "docs", label: `Docs${docs.length ? ` (${docs.length})` : ""}`, icon: <FileText className="w-3 h-3" /> },
                    { value: "quotes", label: "Quotes", icon: <DollarSign className="w-3 h-3" /> },
                    { value: "history", label: "History", icon: <Clock className="w-3 h-3" /> },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 h-7 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#9000FF] data-[state=active]:shadow-sm text-[#5E687B]"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* ── FINANCE TAB ── */}
                <TabsContent value="finance" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-5 space-y-5">

                      {/* Stage tracker */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider">
                            Stage Tracker
                          </span>
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="text-[#C0C8D4] hover:text-[#9000FF] transition-colors">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3 text-[12px]" align="end">
                                <p className="font-semibold text-[#212833] mb-1">Stage Tracker</p>
                                <p className="text-[#5E687B] leading-relaxed">
                                  Every shipment moves through milestones. Click "Advance Stage" to log a stage change.
                                </p>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => openAdvanceDialog(shipment)}
                              className="text-[10px] bg-white border border-[#E5EAF0] text-[#212833] px-2.5 py-1 rounded-md font-medium hover:bg-[#F0F4F8] transition-colors flex items-center gap-1.5"
                            >
                              <MapPin className="w-3 h-3" /> Advance Stage
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="relative py-3 mb-1">
                          <div className="absolute top-[18px] left-0 w-full h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${stagePct}%`,
                                background:
                                  shipment.status === "delayed"
                                    ? "#EF4444"
                                    : shipment.status === "at-risk"
                                    ? "#F59E0B"
                                    : "linear-gradient(to right, #9000FF, #B040FF)",
                              }}
                            />
                          </div>
                          <div className="relative flex justify-between">
                            {stageLabels.map((stage, idx) => {
                              const isPast = idx < stageIdx;
                              const isCurrent = idx === stageIdx;
                              return (
                                <div key={stage} className="flex flex-col items-center">
                                  <div
                                    className={cn(
                                      "w-2.5 h-2.5 rounded-full border-2 z-10 bg-white transition-all",
                                      isCurrent
                                        ? shipment.status === "delayed"
                                          ? "border-red-500 ring-4 ring-red-500/10"
                                          : shipment.status === "at-risk"
                                          ? "border-amber-500 ring-4 ring-amber-500/10"
                                          : "border-[#9000FF] ring-4 ring-[#9000FF]/10"
                                        : isPast
                                        ? shipment.status === "delayed"
                                          ? "border-red-400"
                                          : shipment.status === "at-risk"
                                          ? "border-amber-400"
                                          : "border-[#9000FF]"
                                        : "border-[#D6E3EB]"
                                    )}
                                  />
                                  {isCurrent && (
                                    <span
                                      className={cn(
                                        "absolute top-6 text-[8px] font-bold whitespace-nowrap -translate-x-1/2 left-1/2",
                                        shipment.status === "delayed"
                                          ? "text-red-500"
                                          : shipment.status === "at-risk"
                                          ? "text-amber-600"
                                          : "text-[#9000FF]"
                                      )}
                                    >
                                      {stage}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between text-[8px] text-[#9E9FAE] px-0.5">
                          <span>{stageLabels[0]}</span>
                          <span>{stageLabels[Math.floor(stageLabels.length / 2)]}</span>
                          <span>{stageLabels[stageLabels.length - 1]}</span>
                        </div>
                      </div>

                      {/* Payments */}
                      <div>
                        <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider">
                          Payments
                        </span>
                        <div className="mt-2 space-y-2">
                          {shipment.payments.map((p, i) => {
                            const overdue =
                              !p.paid &&
                              new Date(`${p.dueDate} 2026`) < new Date();
                            const isFormOpen =
                              markPaidForm?.shipmentId === shipment.id &&
                              markPaidForm?.paymentIdx === i;
                            return (
                              <div key={i} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border flex-1",
                                      p.paid
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : overdue
                                        ? "bg-red-50 text-red-600 border-red-100 animate-pulse"
                                        : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"
                                    )}
                                  >
                                    {p.paid ? (
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                    ) : overdue ? (
                                      <AlertCircle className="w-2.5 h-2.5" />
                                    ) : (
                                      <CreditCard className="w-2.5 h-2.5" />
                                    )}
                                    {p.label}: ${p.amountUsd.toLocaleString()}{" "}
                                    {p.paid
                                      ? `paid ${p.paidAt ? shortDate(p.paidAt) : ""}`.trim()
                                      : overdue
                                      ? "OVERDUE"
                                      : `due ${p.dueDate}`}
                                  </div>
                                  {!p.paid && !isFormOpen && (
                                    <button
                                      type="button"
                                      onClick={() => openMarkPaid(shipment.id, i)}
                                      className="text-[9px] font-semibold px-2 py-1 rounded-md border bg-[#9000FF] text-white border-[#9000FF] hover:bg-[#7A00D9] transition-colors shrink-0"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                  {p.paid && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        undoPaymentPaid(shipment.id, i)
                                      }
                                      className="text-[9px] font-medium px-2 py-1 rounded-md border bg-white text-[#5E687B] border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors shrink-0"
                                    >
                                      Undo
                                    </button>
                                  )}
                                </div>

                                {/* Mark-paid form */}
                                {isFormOpen && markPaidForm && (
                                  <div className="p-3 bg-white border border-[#9000FF]/20 rounded-lg shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider">
                                        Record Payment — {p.label}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => setMarkPaidForm(null)}
                                        className="text-[#9E9FAE] hover:text-[#212833]"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                          Amount (USD)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={markPaidForm.amount}
                                          onChange={(e) =>
                                            setMarkPaidForm((f) =>
                                              f ? { ...f, amount: e.target.value } : f
                                            )
                                          }
                                          className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                          Payment Date
                                        </label>
                                        <input
                                          type="date"
                                          value={markPaidForm.date}
                                          onChange={(e) =>
                                            setMarkPaidForm((f) =>
                                              f ? { ...f, date: e.target.value } : f
                                            )
                                          }
                                          className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                          Invoice #{" "}
                                          <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={markPaidForm.invoiceNumber}
                                          placeholder="e.g. INV-2026-001"
                                          onChange={(e) =>
                                            setMarkPaidForm((f) =>
                                              f
                                                ? { ...f, invoiceNumber: e.target.value }
                                                : f
                                            )
                                          }
                                          className={cn(
                                            "w-full px-2 py-1 text-[10px] border rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] placeholder:text-[#9E9FAE]",
                                            !markPaidForm.invoiceNumber.trim()
                                              ? "border-red-300 focus:border-red-400"
                                              : "border-[#E5EAF0] focus:border-[#9000FF]/40"
                                          )}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                          Reference # (optional)
                                        </label>
                                        <input
                                          type="text"
                                          value={markPaidForm.reference}
                                          placeholder="e.g. TXN-2026-001"
                                          onChange={(e) =>
                                            setMarkPaidForm((f) =>
                                              f
                                                ? { ...f, reference: e.target.value }
                                                : f
                                            )
                                          }
                                          className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] placeholder:text-[#9E9FAE]"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                          Method
                                        </label>
                                        <select
                                          value={markPaidForm.method}
                                          onChange={(e) =>
                                            setMarkPaidForm((f) =>
                                              f ? { ...f, method: e.target.value } : f
                                            )
                                          }
                                          className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] bg-white"
                                        >
                                          <option>Wire</option>
                                          <option>Credit</option>
                                          <option>Other</option>
                                        </select>
                                      </div>
                                    </div>
                                    {/* Intermediary */}
                                    <div className="border border-[#E5EAF0] rounded-lg p-2 space-y-1.5">
                                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={markPaidForm.intermediarySupplierPaid}
                                          onChange={(e) =>
                                            setMarkPaidForm((f) =>
                                              f
                                                ? {
                                                    ...f,
                                                    intermediarySupplierPaid: e.target.checked,
                                                  }
                                                : f
                                            )
                                          }
                                          className="accent-[#9000FF] w-3 h-3"
                                        />
                                        <span className="text-[9px] font-semibold text-[#5E687B]">
                                          Intermediary paid supplier
                                        </span>
                                      </label>
                                      {markPaidForm.intermediarySupplierPaid && (
                                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                                          <div>
                                            <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                              Amount (USD)
                                            </label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={markPaidForm.intermediarySupplierAmount}
                                              placeholder="0"
                                              onChange={(e) =>
                                                setMarkPaidForm((f) =>
                                                  f
                                                    ? {
                                                        ...f,
                                                        intermediarySupplierAmount: e.target.value,
                                                      }
                                                    : f
                                                )
                                              }
                                              className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                              Date Paid
                                            </label>
                                            <input
                                              type="date"
                                              value={markPaidForm.intermediarySupplierDate}
                                              onChange={(e) =>
                                                setMarkPaidForm((f) =>
                                                  f
                                                    ? {
                                                        ...f,
                                                        intermediarySupplierDate: e.target.value,
                                                      }
                                                    : f
                                                )
                                              }
                                              className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={confirmMarkPaid}
                                      disabled={!markPaidForm.invoiceNumber.trim()}
                                      className="w-full py-1.5 text-[10px] font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-[#9000FF] text-white hover:bg-[#7A00D9] disabled:hover:bg-[#9000FF]"
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> Confirm Payment
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Next stage hint */}
                        {stageIdx < stageLabels.length - 1 && (
                          <div className="mt-2 flex items-center gap-1 text-[9px] text-[#9E9FAE]">
                            <span>Next:</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="font-medium text-[#5E687B]">
                              {stageLabels[stageIdx + 1]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Buyer Price */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider flex items-center gap-1">
                            <DollarSign className="w-2.5 h-2.5" />
                            Buyer Price
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (buyerPriceFormId === shipment.id) {
                                setBuyerPriceFormId(null);
                              } else {
                                setBuyerPriceFormId(shipment.id);
                                setBuyerPriceDraft({
                                  unitPrice:
                                    shipment.buyerUnitPrice != null
                                      ? String(shipment.buyerUnitPrice)
                                      : "",
                                  quantity:
                                    shipment.buyerQuantity != null
                                      ? String(shipment.buyerQuantity)
                                      : "",
                                });
                              }
                            }}
                            className="text-[9px] font-semibold text-[#9000FF] hover:underline"
                          >
                            {buyerPriceFormId === shipment.id
                              ? "Cancel"
                              : shipment.spreadPct !== null
                              ? "Edit"
                              : "Add"}
                          </button>
                        </div>
                        {shipment.spreadPct !== null &&
                          buyerPriceFormId !== shipment.id && (
                            <div className="text-[10px] text-[#5E687B]">
                              $
                              {shipment.buyerUnitPrice?.toFixed(2) ?? "—"} ×{" "}
                              {shipment.buyerQuantity?.toLocaleString() ?? "—"}
                              &nbsp;·&nbsp;
                              <span
                                className={cn(
                                  "font-semibold",
                                  shipment.spreadPct >= 25
                                    ? "text-emerald-700"
                                    : shipment.spreadPct >= 10
                                    ? "text-amber-700"
                                    : "text-red-700"
                                )}
                              >
                                {shipment.spreadPct.toFixed(1)}% spread
                              </span>
                            </div>
                          )}
                        {shipment.spreadPct === null &&
                          buyerPriceFormId !== shipment.id && (
                            <span className="text-[9px] text-[#C0C8D4] italic">
                              No buyer price set — spread unavailable
                            </span>
                          )}
                        {buyerPriceFormId === shipment.id && (
                          <>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                  Unit Price (USD)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={buyerPriceDraft.unitPrice}
                                  onChange={(e) =>
                                    setBuyerPriceDraft((d) => ({
                                      ...d,
                                      unitPrice: e.target.value,
                                    }))
                                  }
                                  placeholder="0.00"
                                  className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={buyerPriceDraft.quantity}
                                  onChange={(e) =>
                                    setBuyerPriceDraft((d) => ({
                                      ...d,
                                      quantity: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={
                                  !buyerPriceDraft.unitPrice ||
                                  !buyerPriceDraft.quantity ||
                                  patchDealPending
                                }
                                onClick={() => {
                                  const up = Number(buyerPriceDraft.unitPrice);
                                  const qty = Number(buyerPriceDraft.quantity);
                                  if (!up || !qty) return;
                                  patchDealForShipment({
                                    id: shipment.shipmentId,
                                    data: { buyerUnitPrice: up, buyerQuantity: qty },
                                  });
                                }}
                                className="text-[9px] bg-[#9000FF] text-white px-2 py-1 rounded-md font-semibold hover:bg-[#7A00D9] disabled:opacity-50 shrink-0"
                              >
                                {patchDealPending ? "…" : "Save"}
                              </button>
                            </div>
                            {buyerPriceDraft.unitPrice &&
                              buyerPriceDraft.quantity &&
                              (() => {
                                const buyerTotal =
                                  Number(buyerPriceDraft.unitPrice) *
                                  Number(buyerPriceDraft.quantity);
                                const supplierTotal = shipment.payments.reduce(
                                  (s, p) => s + p.amountUsd,
                                  0
                                );
                                const spread = buyerTotal - supplierTotal;
                                const pct =
                                  buyerTotal > 0
                                    ? (spread / buyerTotal) * 100
                                    : 0;
                                const cls =
                                  pct >= 25
                                    ? "text-emerald-700"
                                    : pct >= 10
                                    ? "text-amber-700"
                                    : "text-red-700";
                                return (
                                  <div
                                    className={cn("mt-1 text-[9px] font-semibold", cls)}
                                  >
                                    Preview: {pct.toFixed(1)}% · $
                                    {Math.round(spread).toLocaleString()}
                                  </div>
                                );
                              })()}
                          </>
                        )}
                      </div>

                      {/* Buyer PO Links */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider flex items-center gap-1">
                            <Link2 className="w-2.5 h-2.5" />
                            Buyer PO Links
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setLinkPanelShipmentId(
                                linkPanelShipmentId === shipment.shipmentId
                                  ? null
                                  : shipment.shipmentId
                              )
                            }
                            className="text-[9px] font-semibold text-[#9000FF] hover:underline"
                          >
                            {linkPanelShipmentId === shipment.shipmentId
                              ? "Close"
                              : "Manage"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {shipment.buyerPoNumbers.length === 0 &&
                            !shipment.buyerPoNumber && (
                              <span className="text-[9px] text-[#C0C8D4] italic">
                                No buyer PO linked
                              </span>
                            )}
                          {(
                            shipment.buyerPoNumbers.length > 0
                              ? shipment.buyerPoNumbers
                              : shipment.buyerPoNumber
                              ? [shipment.buyerPoNumber]
                              : []
                          ).map((bpo) => {
                            const deal = existingDeals?.find(
                              (d) => d.buyerPoNumber === bpo
                            );
                            return (
                              <span
                                key={bpo}
                                className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                              >
                                {bpo}
                                {deal &&
                                  linkPanelShipmentId === shipment.shipmentId && (
                                    <button
                                      type="button"
                                      title="Unlink"
                                      onClick={() =>
                                        unlinkDeal({
                                          id: shipment.shipmentId,
                                          dealId: deal.id,
                                        })
                                      }
                                      className="text-red-400 hover:text-red-600 ml-0.5"
                                    >
                                      ×
                                    </button>
                                  )}
                              </span>
                            );
                          })}
                        </div>
                        {linkPanelShipmentId === shipment.shipmentId &&
                          existingDeals && (
                            <div className="border border-[#E5EAF0] rounded-md overflow-hidden max-h-[120px] overflow-y-auto">
                              {existingDeals
                                .filter(
                                  (d) =>
                                    !shipment.buyerPoNumbers.includes(
                                      d.buyerPoNumber
                                    ) && d.buyerPoNumber !== shipment.buyerPoNumber
                                )
                                .map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() =>
                                      linkDeal({
                                        id: shipment.shipmentId,
                                        data: { dealId: d.id },
                                      })
                                    }
                                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50 border-b border-[#F0F4F8] last:border-b-0 transition-colors"
                                  >
                                    <span className="text-[10px] font-mono font-semibold text-emerald-700">
                                      {d.buyerPoNumber}
                                    </span>
                                    <span className="text-[9px] text-[#5E687B] truncate">
                                      {d.customerName}
                                    </span>
                                    <span className="ml-auto text-[8px] text-[#9000FF] font-semibold shrink-0">
                                      + Link
                                    </span>
                                  </button>
                                ))}
                              {existingDeals.filter(
                                (d) =>
                                  !shipment.buyerPoNumbers.includes(d.buyerPoNumber) &&
                                  d.buyerPoNumber !== shipment.buyerPoNumber
                              ).length === 0 && (
                                <p className="text-[9px] text-[#C0C8D4] italic px-3 py-2">
                                  All available deals are already linked
                                </p>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ── THREADS TAB ── */}
                <TabsContent value="threads" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider">
                          Messages
                        </span>
                        <span className="text-[9px] text-[#C0C8D4]">
                          {msgs.length} total
                        </span>
                      </div>
                      {msgs.length === 0 ? (
                        <p className="text-[11px] text-[#C0C8D4] italic text-center py-8">
                          No messages for this shipment
                        </p>
                      ) : (
                        <ul className="border border-[#E5EAF0] rounded-xl overflow-hidden">
                          {msgs.map((msg) => (
                            <li
                              key={msg.id}
                              className="flex items-start gap-3 px-4 py-3 border-b border-[#F0F4F8] last:border-b-0 hover:bg-[#FAFBFC] transition-colors"
                            >
                              <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 text-[#9000FF] flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5">
                                {msg.sender.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-[#212833] truncate">
                                    {msg.sender}
                                  </span>
                                  <span className="text-[9px] text-[#C0C8D4] shrink-0">
                                    {new Date(msg.receivedAt).toLocaleDateString(
                                      getDisplayLocale(),
                                      { month: "short", day: "numeric" }
                                    )}
                                  </span>
                                </div>
                                {msg.subject && (
                                  <p className="text-[10px] text-[#5E687B] font-medium truncate mt-0.5">
                                    {msg.subject}
                                  </p>
                                )}
                                <p className="text-[10px] text-[#9E9FAE] truncate mt-0.5">
                                  {msg.snippet}
                                </p>
                              </div>
                              {msg.unread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0 mt-2" />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ── DOCS TAB ── */}
                <TabsContent value="docs" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider">
                          Attached Documents
                        </span>
                        <span className="text-[9px] text-[#C0C8D4]">
                          {docs.length} total
                        </span>
                      </div>
                      {docs.length === 0 ? (
                        <p className="text-[11px] text-[#C0C8D4] italic text-center py-8">
                          No documents attached to this shipment
                        </p>
                      ) : (
                        <ul className="border border-[#E5EAF0] rounded-xl overflow-hidden">
                          {docs.map((doc) => (
                            <li
                              key={doc.id}
                              className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F4F8] last:border-b-0 hover:bg-[#FAFBFC] transition-colors"
                            >
                              <FileText className="w-4 h-4 text-[#9000FF] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-[#212833] truncate">
                                  {doc.fileName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-[#9E9FAE] uppercase">
                                    {doc.fileType}
                                  </span>
                                  <span className="text-[9px] text-[#C0C8D4]">·</span>
                                  <span className="text-[9px] text-[#9E9FAE]">
                                    {doc.sourceChannel}
                                  </span>
                                  <span className="text-[9px] text-[#C0C8D4]">·</span>
                                  <span className="text-[9px] text-[#9E9FAE]">
                                    {new Date(doc.createdAt).toLocaleDateString(
                                      getDisplayLocale(),
                                      { month: "short", day: "numeric" }
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold px-1.5 py-0.5 rounded",
                                  doc.status === "extracted"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-[#F0F4F8] text-[#9E9FAE]"
                                )}
                              >
                                {doc.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ── QUOTES TAB ── */}
                <TabsContent value="quotes" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider">
                          Factory Quotes
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-[#C0C8D4] hover:text-[#9000FF] transition-colors">
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 text-[12px]" align="end">
                            <p className="font-semibold text-[#212833] mb-1">
                              Factory Quotes
                            </p>
                            <p className="text-[#5E687B] leading-relaxed">
                              Compare quotes from multiple factories. Select the winning
                              quote to lock in the unit price — FlowForgeIQ tracks the
                              margin automatically.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <QuotesTab
                        shipmentId={shipment.shipmentId}
                        quotes={shipmentQuotesMap.get(shipment.shipmentId) ?? []}
                        currentStage={shipment.currentStage}
                        supplierNames={apiSuppliers.map((s) => s.name)}
                        onQuotesChange={(updated) =>
                          setShipmentQuotesMap(
                            (prev) => new Map(prev).set(shipment.shipmentId, updated)
                          )
                        }
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ── HISTORY TAB ── */}
                <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-5">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Clock className="w-3 h-3 text-[#9000FF]" />
                        <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">
                          Stage History
                        </span>
                      </div>
                      <StageHistory
                        shipmentId={shipment.shipmentId}
                        stageLabels={Object.fromEntries(
                          stages.map((s) => [s.id, s.label])
                        )}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
