import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSampleRequests,
  useCreateSampleRequest,
  useUpdateSampleRequest,
  useConvertSampleRequestToPo,
  useListSuppliers,
  useListBuyers,
  useCreateBuyer,
  useListStages,
  getListSampleRequestsQueryKey,
  getListShipmentsQueryKey,
} from "@workspace/api-client-react";
import type { SampleRequest } from "@workspace/api-client-react";
import {
  Plus, Package, X, Check, ChevronRight, Loader2,
  Truck, CheckCircle2, XCircle, Clock, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shortDate } from "@/lib/adapters";

type SampleMilestone = "sample_requested" | "sample_shipped" | "sample_received" | "changes_requested" | "approved" | "rejected";

const MILESTONES: SampleMilestone[] = [
  "sample_requested",
  "sample_shipped",
  "sample_received",
  "changes_requested",
  "approved",
  "rejected",
];

const MILESTONE_LABELS: Record<SampleMilestone, string> = {
  sample_requested: "Requested",
  sample_shipped: "Shipped",
  sample_received: "Received",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
};

const MILESTONE_COLORS: Record<SampleMilestone, string> = {
  sample_requested: "bg-slate-100 text-slate-600 border-slate-200",
  sample_shipped: "bg-blue-50 text-blue-700 border-blue-100",
  sample_received: "bg-amber-50 text-amber-700 border-amber-100",
  changes_requested: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

function MilestoneBadge({ milestone }: { milestone: SampleMilestone }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${MILESTONE_COLORS[milestone]}`}>
      {milestone === "approved" && <CheckCircle2 className="w-2.5 h-2.5" />}
      {milestone === "rejected" && <XCircle className="w-2.5 h-2.5" />}
      {milestone === "sample_shipped" && <Truck className="w-2.5 h-2.5" />}
      {milestone === "sample_requested" && <Clock className="w-2.5 h-2.5" />}
      {MILESTONE_LABELS[milestone]}
    </span>
  );
}

interface NewSampleFormState {
  supplierId: string;
  buyerId: string;
  product: string;
  quantity: string;
  notes: string;
  newSupplierMode: boolean;
  newBuyerName: string;
  newBuyerEmail: string;
}

interface ConvertFormState {
  poNumber: string;
  supplierId: string;
  dueDate: string;
  exFactoryDate: string;
  destination: string;
  via: string;
  depositPct: string;
}

interface SampleDetailPanelProps {
  sample: SampleRequest;
  onClose: () => void;
  onUpdate: () => void;
  onConvert: (sample: SampleRequest) => void;
  suppliers: { id: number; name: string }[];
  buyers: { id: number; name: string }[];
}

function SampleDetailPanel({ sample, onClose, onUpdate, onConvert, suppliers, buyers }: SampleDetailPanelProps) {
  const updateMutation = useUpdateSampleRequest();
  const [trackingCode, setTrackingCode] = useState(sample.trackingCode ?? "");
  const [carrierName, setCarrierName] = useState(sample.carrierName ?? "");
  const [editingTracking, setEditingTracking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const supplierName = sample.supplierName ?? suppliers.find(s => s.id === sample.supplierId)?.name ?? "—";
  const buyerName = sample.buyerName ?? buyers.find(b => b.id === sample.buyerId)?.name ?? "—";

  const FORWARD_MILESTONES = MILESTONES.filter(m => m !== "rejected");
  const currentIdx = FORWARD_MILESTONES.indexOf(sample.milestone as Exclude<SampleMilestone, "rejected">);
  const isRejected = sample.milestone === "rejected";

  async function advanceMilestone(to: SampleMilestone) {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: sample.id, data: { milestone: to } });
      onUpdate();
      showToast(`Milestone updated to ${MILESTONE_LABELS[to]}`);
    } finally {
      setSaving(false);
    }
  }

  async function saveTracking() {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: sample.id, data: { trackingCode: trackingCode || null, carrierName: carrierName || null } });
      setEditingTracking(false);
      onUpdate();
      showToast("Tracking info saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-[340px] shrink-0 border-l border-[#E5EAF0] bg-white flex flex-col overflow-hidden">
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#212833] text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5EAF0]">
        <span className="font-bold text-sm text-[#212833] truncate">{sample.product}</span>
        <button onClick={onClose} className="p-1 hover:bg-[#F0F4F8] rounded-full text-[#5E687B]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Basic info */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#5E687B]">Supplier</span>
              <span className="font-semibold text-[#212833]">{supplierName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#5E687B]">Buyer</span>
              <span className="font-semibold text-[#212833]">{buyerName}</span>
            </div>
            {sample.quantity && (
              <div className="flex justify-between text-xs">
                <span className="text-[#5E687B]">Quantity</span>
                <span className="font-semibold text-[#212833]">{sample.quantity.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-[#5E687B]">Created</span>
              <span className="font-semibold text-[#212833]">{shortDate(sample.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#5E687B]">Status</span>
              <MilestoneBadge milestone={sample.milestone as SampleMilestone} />
            </div>
          </div>

          {/* Milestone timeline */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-2">Timeline</p>
            <div className="space-y-1.5">
              {FORWARD_MILESTONES.map((m, idx) => {
                const done = idx < currentIdx || (sample.milestone === m && !isRejected);
                const current = sample.milestone === m;
                return (
                  <div key={m} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      done ? "bg-[#9000FF] text-white" : "bg-[#F0F2F5] text-[#9E9FAE]"
                    }`}>
                      {done ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </div>
                    <span className={`text-xs ${current ? "font-bold text-[#212833]" : done ? "text-[#5E687B]" : "text-[#9E9FAE]"}`}>
                      {MILESTONE_LABELS[m]}
                    </span>
                  </div>
                );
              })}
              {isRejected && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <XCircle className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-red-600">Rejected</span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking code (visible when shipped) */}
          {sample.milestone === "sample_shipped" && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-2">Tracking</p>
              {editingTracking ? (
                <div className="space-y-1.5">
                  <input
                    className="w-full h-7 text-xs px-2 border border-[#9000FF]/40 rounded-md outline-none"
                    placeholder="Tracking code (e.g. 1Z999AA10..."
                    value={trackingCode}
                    onChange={e => setTrackingCode(e.target.value)}
                  />
                  <input
                    className="w-full h-7 text-xs px-2 border border-[#9000FF]/40 rounded-md outline-none"
                    placeholder="Carrier (e.g. UPS, DHL)"
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 px-3 text-xs bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={saveTracking} disabled={saving}>
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingTracking(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {sample.trackingCode ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#212833]">{sample.trackingCode}</p>
                        {sample.carrierName && <p className="text-[10px] text-[#5E687B]">{sample.carrierName}</p>}
                      </div>
                      <button onClick={() => setEditingTracking(true)} className="text-[10px] text-[#9000FF] hover:underline">Edit</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingTracking(true)} className="text-xs text-[#9000FF] hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add tracking code
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {sample.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-1">Notes</p>
              <p className="text-xs text-[#5E687B]">{sample.notes}</p>
            </div>
          )}

          {/* Converted PO link */}
          {sample.convertedShipmentId && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700">Converted to PO #{sample.convertedShipmentId}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="p-4 border-t border-[#E5EAF0] space-y-2">
        {/* Advance milestone */}
        {!isRejected && !sample.convertedShipmentId && sample.milestone !== "approved" && (
          (() => {
            const nextIdx = currentIdx + 1;
            const nextMilestone = FORWARD_MILESTONES[nextIdx] as SampleMilestone | undefined;
            if (!nextMilestone) return null;
            return (
              <Button
                className="w-full h-8 text-xs bg-[#9000FF] hover:bg-[#7200CC] text-white"
                disabled={saving}
                onClick={() => advanceMilestone(nextMilestone)}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                Mark as {MILESTONE_LABELS[nextMilestone]}
              </Button>
            );
          })()
        )}

        {/* Reject button */}
        {!isRejected && sample.milestone !== "approved" && !sample.convertedShipmentId && (
          <Button
            variant="outline"
            className="w-full h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
            disabled={saving}
            onClick={() => advanceMilestone("rejected")}
          >
            <XCircle className="w-3 h-3 mr-1" /> Reject Sample
          </Button>
        )}

        {/* Convert to PO */}
        {sample.milestone === "approved" && !sample.convertedShipmentId && (
          <Button
            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onConvert(sample)}
          >
            <Package className="w-3 h-3 mr-1" /> Convert to PO
          </Button>
        )}
      </div>
    </div>
  );
}

export function SamplesTab() {
  const queryClient = useQueryClient();
  const samplesQK = getListSampleRequestsQueryKey();
  const shipmentsQK = getListShipmentsQueryKey();
  const { data: rawSamples = [], isLoading, refetch } = useListSampleRequests({ includeArchived: true });
  const { data: suppliers = [] } = useListSuppliers();
  const { data: buyers = [] } = useListBuyers();
  const { data: stages = [] } = useListStages();
  const createSampleMutation = useCreateSampleRequest();
  const convertMutation = useConvertSampleRequestToPo();
  const createBuyerMutation = useCreateBuyer();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [convertingSample, setConvertingSample] = useState<SampleRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [newForm, setNewForm] = useState<NewSampleFormState>({
    supplierId: "", buyerId: "", product: "", quantity: "", notes: "",
    newSupplierMode: false, newBuyerName: "", newBuyerEmail: "",
  });
  const [newError, setNewError] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertFormState>({
    poNumber: "", supplierId: "", dueDate: "", exFactoryDate: "", destination: "", via: "OCEAN", depositPct: "30",
  });
  const [convertError, setConvertError] = useState<string | null>(null);

  const firstStageId = [...stages].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? "";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const samples = showArchived ? rawSamples : rawSamples.filter(s => s.milestone !== "rejected");
  const selectedSample = rawSamples.find(s => s.id === selectedId) ?? null;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: samplesQK });
    void refetch();
  }

  async function submitNew() {
    setNewError(null);
    if (!newForm.product.trim()) { setNewError("Product is required."); return; }
    try {
      let finalBuyerId: number | undefined = newForm.buyerId ? Number(newForm.buyerId) : undefined;
      if (newForm.newBuyerName.trim()) {
        const created = await createBuyerMutation.mutateAsync({
          data: { name: newForm.newBuyerName.trim(), email: newForm.newBuyerEmail.trim() || undefined },
        });
        finalBuyerId = created.id;
      }
      await createSampleMutation.mutateAsync({
        data: {
          supplierId: newForm.supplierId ? Number(newForm.supplierId) : undefined,
          buyerId: finalBuyerId,
          product: newForm.product.trim(),
          quantity: newForm.quantity ? Number(newForm.quantity) : undefined,
          notes: newForm.notes.trim() || undefined,
        },
      });
      refresh();
      setShowNew(false);
      setNewForm({ supplierId: "", buyerId: "", product: "", quantity: "", notes: "", newSupplierMode: false, newBuyerName: "", newBuyerEmail: "" });
      showToast("Sample request created");
    } catch {
      setNewError("Failed to create sample request. Please try again.");
    }
  }

  function openConvert(sample: SampleRequest) {
    setConvertingSample(sample);
    const supplierId = sample.supplierId ? String(sample.supplierId) : "";
    setConvertForm({ poNumber: "", supplierId, dueDate: "", exFactoryDate: "", destination: "", via: "OCEAN", depositPct: "30" });
    setConvertError(null);
    setShowConvert(true);
  }

  async function submitConvert() {
    setConvertError(null);
    if (!convertingSample) return;
    if (!convertForm.poNumber.trim() || !convertForm.supplierId || !convertForm.dueDate || !convertForm.exFactoryDate || !convertForm.destination.trim()) {
      setConvertError("Please fill in all required fields."); return;
    }
    try {
      await convertMutation.mutateAsync({
        id: convertingSample.id,
        data: {
          poNumber: convertForm.poNumber.trim(),
          supplierId: Number(convertForm.supplierId),
          dueDate: new Date(convertForm.dueDate).toISOString(),
          exFactoryDate: new Date(convertForm.exFactoryDate).toISOString(),
          destination: convertForm.destination.trim(),
          via: convertForm.via || undefined,
          depositPct: Number(convertForm.depositPct),
        },
      });
      queryClient.invalidateQueries({ queryKey: samplesQK });
      queryClient.invalidateQueries({ queryKey: shipmentsQK });
      setShowConvert(false);
      setSelectedId(null);
      showToast(`PO ${convertForm.poNumber} created`);
    } catch (err: unknown) {
      setConvertError((err as { message?: string })?.message ?? "Failed to convert. Please try again.");
    }
  }

  void firstStageId;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#212833] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#9000FF]" />
          <span className="font-bold text-sm text-[#212833]">Sample Requests</span>
          <span className="text-[10px] bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full font-bold">
            {samples.filter(s => s.milestone !== "approved" && s.milestone !== "rejected").length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${showArchived ? "bg-[#9000FF]/10 border-[#9000FF]/30 text-[#9000FF]" : "border-[#E5EAF0] text-[#5E687B] hover:bg-[#F0F4F8]"}`}
          >
            {showArchived ? "Hide rejected" : "Show rejected"}
          </button>
          <Button size="sm" onClick={() => setShowNew(true)} className="h-7 px-3 bg-[#9000FF] hover:bg-[#7200CC] text-white text-xs font-semibold">
            <Plus className="w-3 h-3 mr-1" /> New Sample
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#9000FF]" />
            </div>
          ) : samples.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[#5E687B]">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No sample requests yet</p>
                <p className="text-xs mt-1">Create one to track pre-production samples</p>
                <Button size="sm" className="mt-4 bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={() => setShowNew(true)}>
                  <Plus className="w-3 h-3 mr-1" /> New Sample Request
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="min-w-[600px]">
                {/* Table header */}
                <div className="sticky top-0 z-10 bg-[#F7F9FA] border-b border-[#E5EAF0] grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_auto] px-5 py-2">
                  {["Supplier", "Buyer", "Product", "Milestone", "Date", ""].map(h => (
                    <div key={h} className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B]">{h}</div>
                  ))}
                </div>

                {samples.map(s => {
                  const isSelected = selectedId === s.id;
                  const supplierName = s.supplierName ?? suppliers.find(x => x.id === s.supplierId)?.name ?? "—";
                  const buyerName = s.buyerName ?? buyers.find(x => x.id === s.buyerId)?.name ?? "—";
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedId(isSelected ? null : s.id)}
                      className={`grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_auto] px-5 py-3 border-b border-[#F0F4F8] cursor-pointer transition-colors items-center ${
                        isSelected ? "bg-[#9000FF]/5 border-l-2 border-l-[#9000FF]" : "hover:bg-[#FAFBFC]"
                      }`}
                    >
                      <span className="text-[12px] font-semibold text-[#212833] truncate">{supplierName}</span>
                      <span className="text-[12px] text-[#5E687B] truncate">{buyerName}</span>
                      <div>
                        <p className="text-[12px] font-semibold text-[#212833] truncate">{s.product}</p>
                        {s.quantity && <p className="text-[10px] text-[#9E9FAE]">{s.quantity.toLocaleString()} units</p>}
                        {s.rfqId != null && <button type="button" onClick={event => { event.stopPropagation(); window.location.href = `/rfqs?rfqId=${s.rfqId}`; }} className="mt-1 text-[9px] font-bold text-[#7457c7] hover:underline">RFQ-{s.rfqId}</button>}
                      </div>
                      <div><MilestoneBadge milestone={s.milestone as SampleMilestone} /></div>
                      <span className="text-[11px] text-[#9E9FAE]">{shortDate(s.createdAt)}</span>
                      <ChevronRight className={`w-4 h-4 text-[#9000FF] transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Detail panel */}
        {selectedSample && (
          <SampleDetailPanel
            sample={selectedSample}
            onClose={() => setSelectedId(null)}
            onUpdate={refresh}
            onConvert={openConvert}
            suppliers={suppliers}
            buyers={buyers}
          />
        )}
      </div>

      {/* New Sample Request Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Sample Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {newError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{newError}</div>
            )}
            <div>
              <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Product *</label>
              <input
                className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                placeholder="e.g. Women's Denim Jacket"
                value={newForm.product}
                onChange={e => setNewForm(f => ({ ...f, product: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Supplier</label>
                <select
                  className="mt-1 w-full h-8 text-xs px-2 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 bg-white"
                  value={newForm.supplierId}
                  onChange={e => setNewForm(f => ({ ...f, supplierId: e.target.value }))}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                  placeholder="Units"
                  value={newForm.quantity}
                  onChange={e => setNewForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Buyer</label>
              <select
                className="mt-1 w-full h-8 text-xs px-2 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 bg-white"
                value={newForm.buyerId}
                onChange={e => setNewForm(f => ({ ...f, buyerId: e.target.value, newBuyerName: "" }))}
              >
                <option value="">Select buyer</option>
                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                <option value="__new">+ Create new buyer</option>
              </select>
            </div>
            {newForm.buyerId === "__new" && (
              <div className="p-3 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">New Buyer</p>
                <input
                  className="w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                  placeholder="Buyer name *"
                  value={newForm.newBuyerName}
                  onChange={e => setNewForm(f => ({ ...f, newBuyerName: e.target.value }))}
                />
                <input
                  className="w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                  placeholder="Contact email (optional)"
                  value={newForm.newBuyerEmail}
                  onChange={e => setNewForm(f => ({ ...f, newBuyerEmail: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Notes</label>
              <textarea
                className="mt-1 w-full text-xs px-3 py-2 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 resize-none"
                rows={2}
                placeholder="Any additional notes..."
                value={newForm.notes}
                onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitNew}
              disabled={createSampleMutation.isPending}>
              {createSampleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to PO dialog */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to PO</DialogTitle>
          </DialogHeader>
          {convertingSample && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg text-xs text-[#5E687B]">
                Converting: <span className="font-semibold text-[#212833]">{convertingSample.product}</span>
                {convertingSample.quantity && ` · ${convertingSample.quantity.toLocaleString()} units`}
              </div>
              {convertError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{convertError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">PO Number *</label>
                  <input className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                    placeholder="e.g. PO-2026-001" value={convertForm.poNumber}
                    onChange={e => setConvertForm(f => ({ ...f, poNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Supplier *</label>
                  <select className="mt-1 w-full h-8 text-xs px-2 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 bg-white"
                    value={convertForm.supplierId}
                    onChange={e => setConvertForm(f => ({ ...f, supplierId: e.target.value }))}>
                    <option value="">Select</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Due Date *</label>
                  <input type="date" className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                    value={convertForm.dueDate} onChange={e => setConvertForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Ex-Factory *</label>
                  <input type="date" className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                    value={convertForm.exFactoryDate} onChange={e => setConvertForm(f => ({ ...f, exFactoryDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Destination *</label>
                  <input className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                    placeholder="e.g. Los Angeles" value={convertForm.destination}
                    onChange={e => setConvertForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Deposit %</label>
                  <input type="number" className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                    value={convertForm.depositPct} onChange={e => setConvertForm(f => ({ ...f, depositPct: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submitConvert}
              disabled={convertMutation.isPending}>
              {convertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Package className="w-3 h-3 mr-1" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
