import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import {
  useListSuppliers,
  useListShipments,
  useUpdateSupplier,
  useCreateSupplier,
  useGetRiskRadar,
} from "@workspace/api-client-react";
import type { SupplierSummary, Shipment } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search, Plus, Mail, MessageCircle, Globe, CreditCard,
  ChevronRight, Package, X, Check, Pencil, ArrowRight,
  Building2, User, AlertCircle, Sparkles, Bell,
} from "lucide-react";
import { shortDate } from "@/lib/adapters";

const TODAY = new Date("2026-05-18T00:00:00Z");

function fmtCountry(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function activePOs(shipments: Shipment[], supplierId: number) {
  return shipments.filter(
    s => s.supplierId === supplierId && s.status !== "delivered",
  ).length;
}

function onTimePct(shipments: Shipment[], supplierId: number) {
  const rows = shipments.filter(s => s.supplierId === supplierId);
  if (rows.length === 0) return null;
  const on = rows.filter(s => s.status === "on-track").length;
  return Math.round((on / rows.length) * 100);
}

function primaryContact(s: SupplierSummary): "WhatsApp" | "Email" | "None" {
  if (s.whatsAppNumber) return "WhatsApp";
  if (s.contactEmail) return "Email";
  return "None";
}

const statusCls = (status: string) =>
  status === "on-track"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : status === "delayed"
    ? "bg-red-50 text-red-700 border border-red-100"
    : "bg-amber-50 text-amber-700 border border-amber-100";

// ---------------------------------------------------------------------------
// Inline editable field
// ---------------------------------------------------------------------------
interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  onSave: (val: string | null) => void;
  saving?: boolean;
}

function EditableField({ label, value, icon: Icon, placeholder, type = "text", onSave, saving }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  function startEdit() {
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) {
      onSave(trimmed === "" ? null : trimmed);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
  }

  return (
    <div className="group">
      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="flex-1 h-7 text-[12px] px-2 border border-[#9000FF]/40 rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/20 bg-white text-[#212833]"
          />
          <button onClick={commit} className="text-[#9000FF] hover:text-[#7A00D9]">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setDraft(value ?? ""); }} className="text-[#9E9FAE] hover:text-[#5E687B]">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          disabled={saving}
          className="w-full flex items-center justify-between h-7 px-2 rounded-md border border-transparent hover:border-[#E5EAF0] hover:bg-[#FAFBFC] group text-left transition-colors"
        >
          <span className={`text-[12px] truncate ${value ? "text-[#212833]" : "text-[#9E9FAE] italic"}`}>
            {value || placeholder || "—"}
          </span>
          <Pencil className="w-3 h-3 text-[#9E9FAE] opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier detail panel
// ---------------------------------------------------------------------------
interface DetailPanelProps {
  supplier: SupplierSummary;
  shipments: Shipment[];
  onClose: () => void;
  onUpdate: (updated: SupplierSummary) => void;
}

function SupplierDetailPanel({ supplier, shipments, onClose, onUpdate }: DetailPanelProps) {
  const [, navigate] = useLocation();
  const updateMutation = useUpdateSupplier();
  const [saving, setSaving] = useState(false);
  const [localSupplier, setLocalSupplier] = useState(supplier);

  useEffect(() => {
    setLocalSupplier(supplier);
  }, [supplier]);

  async function saveField(field: Partial<SupplierSummary>) {
    setSaving(true);
    try {
      const updated = await updateMutation.mutateAsync({
        id: supplier.id,
        data: field,
      });
      setLocalSupplier(prev => ({ ...prev, ...updated }));
      onUpdate(updated);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  const supplierShipments = useMemo(
    () =>
      shipments
        .filter(s => s.supplierId === supplier.id)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [shipments, supplier.id],
  );

  const active = supplierShipments.filter(s => s.status !== "delivered");
  const recent = supplierShipments.filter(s => s.status === "delivered").slice(0, 3);

  return (
    <div className="w-[360px] border-l border-[#E5EAF0] bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9000FF]/10 to-[#9000FF]/20 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-[#9000FF]" />
          </div>
          <span className="text-sm font-semibold text-[#212833] truncate">{supplier.name}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-[#9E9FAE] hover:text-[#212833] hover:bg-[#F0F4F8] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Contact details */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-3">Contact Details</div>
            <div className="space-y-3">
              <EditableField
                label="Contact Name"
                value={localSupplier.contactName}
                icon={User}
                placeholder="Add contact name"
                onSave={v => void saveField({ contactName: v })}
                saving={saving}
              />
              <EditableField
                label="Email"
                value={localSupplier.contactEmail}
                icon={Mail}
                placeholder="Add email address"
                type="email"
                onSave={v => void saveField({ contactEmail: v })}
                saving={saving}
              />
              <EditableField
                label="WhatsApp"
                value={localSupplier.whatsAppNumber}
                icon={MessageCircle}
                placeholder="Add WhatsApp number"
                type="tel"
                onSave={v => void saveField({ whatsAppNumber: v })}
                saving={saving}
              />
              <EditableField
                label="Country"
                value={localSupplier.country}
                icon={Globe}
                placeholder="Country code (e.g. CN)"
                onSave={v => void saveField({ country: v ?? "CN" })}
                saving={saving}
              />
              <EditableField
                label="Payment Terms"
                value={localSupplier.paymentTerms}
                icon={CreditCard}
                placeholder="e.g. 30% deposit, 70% on B/L"
                onSave={v => void saveField({ paymentTerms: v })}
                saving={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Active shipments */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-2 flex items-center gap-1.5">
              <Package className="w-3 h-3" />
              Active POs
              <span className="text-[#9E9FAE] font-normal">({active.length})</span>
            </div>
            {active.length === 0 ? (
              <p className="text-xs text-[#9E9FAE]">No active purchase orders.</p>
            ) : (
              <div className="space-y-1.5">
                {active.map(s => {
                  const days = Math.ceil((new Date(s.dueDate).getTime() - TODAY.getTime()) / 86_400_000);
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/?shipment=${s.id}`)}
                      className="w-full text-left flex items-center gap-2 p-2 rounded-lg border border-[#E5EAF0] hover:border-[#9000FF]/30 hover:bg-[#FAFBFC] group transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[10px] text-[#5E687B] bg-[#F0F4F8] px-1.5 py-0.5 rounded">
                            {s.poNumber}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusCls(s.status)}`}>
                            {s.status === "on-track" ? "On Track" : s.status === "delayed" ? "Delayed" : "At Risk"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#212833] font-medium truncate">{s.product}</p>
                        <p className="text-[10px] text-[#9E9FAE]">Due {shortDate(s.dueDate)}{days < 0 ? ` · ${Math.abs(days)}d late` : days <= 7 ? ` · ${days}d` : ""}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9000FF] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {recent.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-2">Recent POs</div>
                <div className="space-y-1">
                  {recent.map(s => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/?shipment=${s.id}`)}
                      className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#FAFBFC] group transition-colors"
                    >
                      <span className="text-[11px] text-[#5E687B] truncate">{s.product}</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#9E9FAE] shrink-0 ml-2">
                        {shortDate(s.dueDate)}
                        <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Supplier dialog
// ---------------------------------------------------------------------------
interface NewSupplierDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (s: SupplierSummary) => void;
}

function NewSupplierDialog({ open, onClose, onCreate }: NewSupplierDialogProps) {
  const createMutation = useCreateSupplier();
  const [form, setForm] = useState({ name: "", country: "CN", contactName: "", contactEmail: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm({ name: "", country: "CN", contactName: "", contactEmail: "" });
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) { setError("Supplier name is required."); return; }
    if (!form.country.trim()) { setError("Country is required."); return; }
    if (!form.contactName.trim()) { setError("Contact name is required."); return; }
    const emailTrimmed = form.contactEmail.trim();
    if (!emailTrimmed) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      const created = await createMutation.mutateAsync({
        data: {
          name: form.name.trim(),
          country: form.country.trim(),
          contactName: form.contactName.trim(),
          contactEmail: emailTrimmed,
        },
      });
      onCreate(created);
      handleClose();
    } catch {
      setError("Failed to create supplier. Name may already exist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#212833]">New Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { label: "Supplier Name *", key: "name", placeholder: "e.g. Guangzhou Metalworks" },
            { label: "Country *", key: "country", placeholder: "e.g. CN, VN, BD" },
            { label: "Contact Name *", key: "contactName", placeholder: "e.g. Wei Zhang" },
            { label: "Email *", key: "contactEmail", placeholder: "e.g. wei@supplier.com" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold text-[#5E687B] mb-1 uppercase tracking-wide">{label}</label>
              <input
                type={key === "contactEmail" ? "email" : "text"}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && void handleSubmit()}
                placeholder={placeholder}
                className="w-full h-8 px-3 text-[13px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/50 focus:ring-1 focus:ring-[#9000FF]/10 bg-white text-[#212833] placeholder:text-[#9E9FAE]"
              />
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading} className="text-[13px]">Cancel</Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="bg-[#9000FF] hover:bg-[#7A00D9] text-white text-[13px]"
          >
            {loading ? "Creating…" : "Create Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function Suppliers() {
  const { data: suppliersData } = useListSuppliers();
  const { data: shipmentsData } = useListShipments();
  const { data: radarData } = useGetRiskRadar();
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const shipments: Shipment[] = shipmentsData ?? [];

  useEffect(() => {
    if (suppliersData) setSuppliers(suppliersData);
  }, [suppliersData]);

  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<"name" | "country" | "active" | "onTime">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === selectedId) ?? null;

  const enriched = useMemo(() => {
    return suppliers.map(s => ({
      ...s,
      activePOs: activePOs(shipments, s.id),
      onTimePct: onTimePct(shipments, s.id),
      primaryContact: primaryContact(s),
    }));
  }, [suppliers, shipments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enriched.filter(s =>
      !q
      || s.name.toLowerCase().includes(q)
      || (s.country ?? "").toLowerCase().includes(q)
      || (s.contactEmail ?? "").toLowerCase().includes(q)
      || (s.contactName ?? "").toLowerCase().includes(q)
      || fmtCountry(s.country).toLowerCase().includes(q),
    );
  }, [enriched, search]);

  const sorted = useMemo(() => {
    const mul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortCol === "name")    return mul * a.name.localeCompare(b.name);
      if (sortCol === "country") return mul * a.country.localeCompare(b.country);
      if (sortCol === "active")  return mul * (a.activePOs - b.activePOs);
      if (sortCol === "onTime")  return mul * ((a.onTimePct ?? -1) - (b.onTimePct ?? -1));
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortChevron({ col }: { col: typeof sortCol }) {
    if (sortCol !== col) return <span className="opacity-20">↕</span>;
    return <span className="text-[#9000FF]">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

        {/* LEFT NAV */}
        <NavSidebar
          counts={{
            riskRadar: radarData ? radarData.items.filter(i => i.riskScore >= 70).length : null,
          }}
        />

        <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <div className="h-12 bg-white border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0">
          <div className="font-bold text-sm flex items-center gap-2 w-[200px]">
            <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
              <img src="/flowforge-logo.png" alt="FlowForge" className="w-full h-full object-contain" />
            </div>
            <span className="text-[#9000FF] tracking-tight">flowforge</span>
            <span className="text-[#E5EAF0]">/</span>
            <span className="text-[#5E687B] font-medium text-xs">Suppliers</span>
          </div>
          <div className="flex-1 flex justify-center max-w-lg">
            <div className="relative w-full">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9000FF]" />
              <input type="text" placeholder="Ask FlowForge anything...  ⌘K"
                className="w-full h-8 bg-[#F0F4F8] hover:bg-[#E5EAF0] focus:bg-white border border-transparent focus:border-[#9000FF]/30 focus:ring-1 focus:ring-[#9000FF]/10 rounded-full pl-9 pr-4 text-xs outline-none transition-all placeholder:text-[#9E9FAE]" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-[200px] justify-end">
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8] transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <Separator orientation="vertical" className="h-4" />
            <div className="w-7 h-7 rounded-md border border-[#E5EAF0] bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">AX</div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Toolbar */}
          <div className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-[#212833]">Suppliers</h1>
              <span className="text-[10px] text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-0.5 rounded-full">
                {sorted.length} of {suppliers.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9FAE]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search suppliers…"
                  className="h-8 pl-8 pr-3 text-[12px] bg-[#F0F4F8] border border-transparent focus:border-[#9000FF]/30 focus:bg-white rounded-md outline-none w-52 transition-all placeholder:text-[#9E9FAE]"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9FAE] hover:text-[#5E687B]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowNewDialog(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-[#9000FF] hover:bg-[#7A00D9] px-3 py-1.5 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Supplier
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Table */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              <ScrollArea className="flex-1">
                <div className="min-w-[560px]">
                  {/* Table header */}
                  <div className="sticky top-0 z-10 bg-[#F7F9FA] border-b border-[#E5EAF0] grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-2">
                    {(
                      [
                        { label: "Supplier", col: "name" },
                        { label: "Country", col: "country" },
                        { label: "Active POs", col: "active" },
                        { label: "On-Time %", col: "onTime" },
                        { label: "Contact", col: null },
                      ] as const
                    ).map(({ label, col }) => (
                      <button
                        key={label}
                        onClick={() => col && toggleSort(col as typeof sortCol)}
                        disabled={!col}
                        className={`text-left text-[10px] font-bold uppercase tracking-wide text-[#5E687B] flex items-center gap-1 ${col ? "hover:text-[#212833] cursor-pointer" : "cursor-default"}`}
                      >
                        {label}
                        {col && <SortChevron col={col as typeof sortCol} />}
                      </button>
                    ))}
                  </div>

                  {/* Rows */}
                  {sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Building2 className="w-8 h-8 text-[#D6E3EB] mb-3" />
                      <p className="text-sm text-[#5E687B] font-medium">No suppliers found</p>
                      <p className="text-xs text-[#9E9FAE] mt-1">Try adjusting your search or add a new supplier.</p>
                    </div>
                  ) : (
                    sorted.map(s => {
                      const isSelected = selectedId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedId(isSelected ? null : s.id)}
                          className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-[#F0F4F8] cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#9000FF]/5 border-l-2 border-l-[#9000FF]"
                              : "hover:bg-[#FAFBFC]"
                          }`}
                        >
                          {/* Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9000FF]/10 to-[#9000FF]/20 flex items-center justify-center text-[#9000FF] font-bold text-[10px] shrink-0">
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#212833] truncate">{s.name}</p>
                              {s.contactName && (
                                <p className="text-[10px] text-[#9E9FAE] truncate">{s.contactName}</p>
                              )}
                            </div>
                          </div>

                          {/* Country */}
                          <div className="flex items-center">
                            <span className="text-[12px] text-[#5E687B]">{fmtCountry(s.country)}</span>
                          </div>

                          {/* Active POs */}
                          <div className="flex items-center">
                            {s.activePOs > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#212833]">
                                <Package className="w-3 h-3 text-[#9000FF]" />
                                {s.activePOs}
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#9E9FAE]">—</span>
                            )}
                          </div>

                          {/* On-time % */}
                          <div className="flex items-center">
                            {s.onTimePct !== null ? (
                              <span className={`text-[12px] font-semibold ${
                                s.onTimePct >= 70 ? "text-emerald-600"
                                : s.onTimePct >= 40 ? "text-amber-600"
                                : "text-red-600"
                              }`}>
                                {s.onTimePct}%
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#9E9FAE]">—</span>
                            )}
                          </div>

                          {/* Primary contact */}
                          <div className="flex items-center justify-between">
                            {s.primaryContact === "WhatsApp" ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </span>
                            ) : s.primaryContact === "Email" ? (
                              <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                                <Mail className="w-3 h-3" /> Email
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#9E9FAE]">—</span>
                            )}
                            <ChevronRight className={`w-3.5 h-3.5 text-[#9000FF] transition-transform ${isSelected ? "opacity-100" : "opacity-0"}`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Detail panel */}
            {selectedSupplier && (
              <SupplierDetailPanel
                supplier={selectedSupplier}
                shipments={shipments}
                onClose={() => setSelectedId(null)}
                onUpdate={updated => setSuppliers(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
              />
            )}
          </div>
        </div>
        </div>
        </div>

      <NewSupplierDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreate={s => setSuppliers(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))}
      />
    </div>
  );
}
