import React, { useState, useRef, useEffect } from "react";
import { useListBuyers, useUpdateBuyer, useCreateBuyer } from "@workspace/api-client-react";
import type { BuyerSummary } from "@workspace/api-client-react";
import { Plus, Mail, Phone, User, Globe, Pencil, Check, X, Loader2, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

  useEffect(() => { setDraft(value ?? ""); }, [value]);

  function startEdit() {
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) onSave(trimmed === "" ? null : trimmed);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
  }

  return (
    <div className="group">
      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <input ref={inputRef} type={type} value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey}
            placeholder={placeholder}
            className="flex-1 h-7 text-[12px] px-2 border border-[#9000FF]/40 rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/20 bg-white text-[#212833]" />
          <button onClick={commit} className="text-[#9000FF] hover:text-[#7A00D9]"><Check className="w-4 h-4" /></button>
          <button onClick={() => { setEditing(false); setDraft(value ?? ""); }} className="text-[#9E9FAE] hover:text-[#5E687B]"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={startEdit} disabled={saving}
          className="w-full flex items-center justify-between h-7 px-2 rounded-md border border-transparent hover:border-[#E5EAF0] hover:bg-[#FAFBFC] group text-left transition-colors">
          <span className={`text-[12px] truncate ${value ? "text-[#212833]" : "text-[#9E9FAE] italic"}`}>{value || placeholder || "—"}</span>
          <Pencil className="w-3 h-3 text-[#9E9FAE] opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
        </button>
      )}
    </div>
  );
}

interface BuyerDetailPanelProps {
  buyer: BuyerSummary;
  onClose: () => void;
  onUpdate: (b: BuyerSummary) => void;
}

function BuyerDetailPanel({ buyer, onClose, onUpdate }: BuyerDetailPanelProps) {
  const updateMutation = useUpdateBuyer();
  const [saving, setSaving] = useState(false);
  const [localBuyer, setLocalBuyer] = useState(buyer);

  useEffect(() => { setLocalBuyer(buyer); }, [buyer]);

  async function save(field: Partial<BuyerSummary>) {
    setSaving(true);
    try {
      const updated = await updateMutation.mutateAsync({ id: localBuyer.id, data: field });
      setLocalBuyer(updated);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-[300px] shrink-0 border-l border-[#E5EAF0] bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-[10px] shrink-0">
            {localBuyer.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-bold text-sm text-[#212833] truncate">{localBuyer.name}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#F0F4F8] rounded-full text-[#5E687B]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <EditableField label="Name" value={localBuyer.name} icon={Building2} placeholder="Buyer name" onSave={v => save({ name: v ?? "" })} saving={saving} />
          <EditableField label="Contact Name" value={localBuyer.contactName} icon={User} placeholder="e.g. Jane Smith" onSave={v => save({ contactName: v })} saving={saving} />
          <EditableField label="Email" value={localBuyer.email} icon={Mail} type="email" placeholder="buyer@company.com" onSave={v => save({ email: v })} saving={saving} />
          <EditableField label="Phone" value={localBuyer.phone} icon={Phone} type="tel" placeholder="+1 (555) 000-0000" onSave={v => save({ phone: v })} saving={saving} />
          <EditableField label="Region" value={localBuyer.region} icon={Globe} placeholder="e.g. North America" onSave={v => save({ region: v })} saving={saving} />
        </div>
      </ScrollArea>
    </div>
  );
}

interface NewBuyerForm {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  region: string;
}

export function BuyersTab() {
  const { data: rawBuyers = [], isLoading } = useListBuyers();
  const createMutation = useCreateBuyer();
  const [buyers, setBuyers] = useState<BuyerSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<NewBuyerForm>({ name: "", contactName: "", email: "", phone: "", region: "" });
  const [newError, setNewError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { setBuyers(rawBuyers); }, [rawBuyers]);

  const filtered = buyers.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const selectedBuyer = buyers.find(b => b.id === selectedId) ?? null;

  async function submitNew() {
    setNewError(null);
    if (!newForm.name.trim()) { setNewError("Buyer name is required."); return; }
    try {
      const created = await createMutation.mutateAsync({
        data: {
          name: newForm.name.trim(),
          contactName: newForm.contactName.trim() || undefined,
          email: newForm.email.trim() || undefined,
          phone: newForm.phone.trim() || undefined,
          region: newForm.region.trim() || undefined,
        },
      });
      setBuyers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowNew(false);
      setNewForm({ name: "", contactName: "", email: "", phone: "", region: "" });
      setSelectedId(created.id);
    } catch {
      setNewError("Failed to create buyer. Name may already exist.");
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#9000FF]" />
          <span className="font-bold text-sm text-[#212833]">Buyers</span>
          <span className="text-[10px] bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full font-bold">{buyers.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="h-7 text-xs px-3 border border-[#E5EAF0] rounded-full outline-none focus:border-[#9000FF]/40 w-40"
            placeholder="Search buyers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button size="sm" onClick={() => setShowNew(true)} className="h-7 px-3 bg-[#9000FF] hover:bg-[#7200CC] text-white text-xs font-semibold">
            <Plus className="w-3 h-3 mr-1" /> Add Buyer
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#9000FF]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[#5E687B]">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">{search ? "No buyers match your search" : "No buyers yet"}</p>
                {!search && <Button size="sm" className="mt-4 bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={() => setShowNew(true)}><Plus className="w-3 h-3 mr-1" /> Add Buyer</Button>}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="min-w-[500px]">
                <div className="sticky top-0 z-10 bg-[#F7F9FA] border-b border-[#E5EAF0] grid grid-cols-[2fr_1.5fr_1.5fr_1fr] px-5 py-2">
                  {["Buyer", "Contact", "Email", "Region"].map(h => (
                    <div key={h} className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B]">{h}</div>
                  ))}
                </div>
                {filtered.map(b => {
                  const isSelected = selectedId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedId(isSelected ? null : b.id)}
                      className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr] px-5 py-3 border-b border-[#F0F4F8] cursor-pointer transition-colors items-center ${isSelected ? "bg-[#9000FF]/5 border-l-2 border-l-[#9000FF]" : "hover:bg-[#FAFBFC]"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-[10px] shrink-0">
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-[#212833] truncate">{b.name}</span>
                      </div>
                      <span className="text-[12px] text-[#5E687B] truncate">{b.contactName ?? "—"}</span>
                      <div className="flex items-center gap-1 min-w-0">
                        {b.email ? <><Mail className="w-3 h-3 text-blue-500 shrink-0" /><span className="text-[11px] text-[#5E687B] truncate">{b.email}</span></> : <span className="text-[12px] text-[#9E9FAE]">—</span>}
                      </div>
                      <span className="text-[12px] text-[#5E687B]">{b.region ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {selectedBuyer && (
          <BuyerDetailPanel
            buyer={selectedBuyer}
            onClose={() => setSelectedId(null)}
            onUpdate={updated => setBuyers(prev => prev.map(b => b.id === updated.id ? updated : b))}
          />
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Buyer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {newError && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{newError}</div>}
            <div>
              <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Name *</label>
              <input className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                placeholder="e.g. Forever 21" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Contact Name</label>
              <input className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                placeholder="e.g. Jane Smith" value={newForm.contactName} onChange={e => setNewForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Email</label>
              <input type="email" className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                placeholder="buyer@company.com" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Phone</label>
                <input type="tel" className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                  placeholder="+1 (555) 000-0000" value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wide">Region</label>
                <input className="mt-1 w-full h-8 text-xs px-3 border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40"
                  placeholder="North America" value={newForm.region} onChange={e => setNewForm(f => ({ ...f, region: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button size="sm" className="bg-[#9000FF] hover:bg-[#7200CC] text-white" onClick={submitNew} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Add Buyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
