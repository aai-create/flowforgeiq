import React, { useState } from "react";
import {
  CheckCircle2, Plus, Building2, Clock, Package, CalendarDays, StickyNote,
  Star, Award, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCreateFactoryQuote, useSelectFactoryQuote } from "@workspace/api-client-react";
import type { FactoryQuote } from "@workspace/api-client-react";

interface QuotesTabProps {
  shipmentId: number;
  quotes: FactoryQuote[];
  currentStage: string;
  supplierNames: string[];
  onQuotesChange: (quotes: FactoryQuote[]) => void;
}

interface AddQuoteForm {
  factory: string;
  country: string;
  unitPrice: string;
  moq: string;
  leadDays: string;
  validityDate: string;
  notes: string;
}

const EMPTY_FORM: AddQuoteForm = {
  factory: "",
  country: "CN",
  unitPrice: "",
  moq: "",
  leadDays: "",
  validityDate: "",
  notes: "",
};

const COUNTRY_OPTIONS = [
  { code: "CN", label: "China" },
  { code: "VN", label: "Vietnam" },
  { code: "BD", label: "Bangladesh" },
  { code: "IN", label: "India" },
  { code: "TR", label: "Turkey" },
  { code: "ID", label: "Indonesia" },
  { code: "PK", label: "Pakistan" },
  { code: "MX", label: "Mexico" },
  { code: "KH", label: "Cambodia" },
  { code: "TH", label: "Thailand" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

export function QuotesTab({ shipmentId, quotes, currentStage, supplierNames, onQuotesChange }: QuotesTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddQuoteForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateFactoryQuote();
  const selectMutation = useSelectFactoryQuote();

  const isFactoryQuotesStage = currentStage === "Factory Quotes";

  const handleSelect = (quoteId: number) => {
    const prevQuotes = quotes;
    const optimistic = quotes.map(q => ({ ...q, selected: q.id === quoteId }));
    onQuotesChange(optimistic);
    selectMutation.mutate(
      { id: shipmentId, data: { quoteId } },
      {
        onSuccess: (updated) => onQuotesChange(updated),
        onError: () => onQuotesChange(prevQuotes),
      },
    );
  };

  const handleAddSubmit = () => {
    setFormError(null);
    const unitPrice = parseFloat(form.unitPrice);
    const moq = parseInt(form.moq, 10);
    const leadDays = parseInt(form.leadDays, 10);

    if (!form.factory.trim()) { setFormError("Factory / supplier name is required."); return; }
    if (isNaN(unitPrice) || unitPrice <= 0) { setFormError("Unit cost must be a positive number."); return; }
    if (isNaN(moq) || moq <= 0) { setFormError("MOQ must be a positive integer."); return; }
    if (isNaN(leadDays) || leadDays <= 0) { setFormError("Lead time must be a positive integer."); return; }

    createMutation.mutate(
      {
        id: shipmentId,
        data: {
          factory: form.factory.trim(),
          country: form.country || "CN",
          unitPrice,
          moq,
          leadDays,
          validityDate: form.validityDate || undefined,
          notes: form.notes.trim() || undefined,
        },
      },
      {
        onSuccess: (created) => {
          onQuotesChange([...quotes, created]);
          setShowAdd(false);
          setForm(EMPTY_FORM);
        },
        onError: () => setFormError("Failed to save quote. Please try again."),
      },
    );
  };

  const lowestPrice = quotes.length > 0 ? Math.min(...quotes.map(q => q.unitPrice)) : null;
  const shortestLead = quotes.length > 0 ? Math.min(...quotes.map(q => q.leadDays)) : null;

  if (quotes.length === 0) {
    return (
      <div className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-[#212833] uppercase tracking-wider">Factory Quotes</span>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="h-7 text-[11px] gap-1 bg-[#9000FF] hover:bg-[#7A00D9] text-white">
            <Plus className="w-3 h-3" /> Add Quote
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-[#E5EAF0] rounded-xl bg-[#FAFBFC]">
          <Building2 className="w-8 h-8 text-[#D6E3EB] mb-2" />
          <p className="text-xs font-medium text-[#5E687B] mb-1">No quotes yet</p>
          <p className="text-[11px] text-[#9E9FAE] mb-3">Add factory quotes to compare unit costs, MOQ, and lead times before committing.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(true)}
            className="h-7 text-[11px] gap-1 border-[#9000FF]/30 text-[#9000FF] hover:bg-[#9000FF]/5">
            <Plus className="w-3 h-3" /> Add first quote
          </Button>
        </div>
        <AddQuoteDialog
          open={showAdd}
          onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); setFormError(null); }}
          form={form}
          setForm={setForm}
          onSubmit={handleAddSubmit}
          error={formError}
          loading={createMutation.isPending}
          supplierNames={supplierNames}
        />
      </div>
    );
  }

  const multiQuote = quotes.length >= 2;

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#212833] uppercase tracking-wider">Factory Quotes</span>
          <span className="text-[10px] bg-[#F0F4F8] border border-[#E5EAF0] px-1.5 py-0.5 rounded text-[#5E687B]">{quotes.length}</span>
          {isFactoryQuotesStage && (
            <span className="text-[9px] font-semibold bg-[#9000FF]/10 text-[#9000FF] px-1.5 py-0.5 rounded-full border border-[#9000FF]/20">
              Action required
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          className="h-7 text-[11px] gap-1 bg-[#9000FF] hover:bg-[#7A00D9] text-white">
          <Plus className="w-3 h-3" /> Add Quote
        </Button>
      </div>

      {multiQuote ? (
        /* Comparison table */
        <div className="overflow-x-auto rounded-xl border border-[#E5EAF0]">
          <table className="w-full text-[11px]" style={{ minWidth: 420 }}>
            <thead>
              <tr className="bg-[#FAFBFC] border-b border-[#E5EAF0]">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-[#5E687B] uppercase tracking-wider w-32">Factory</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Unit Cost</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">MOQ</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Lead Time</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Valid Until</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, idx) => {
                const isCheapest = lowestPrice !== null && q.unitPrice === lowestPrice && quotes.filter(x => x.unitPrice === lowestPrice).length === 1;
                const isFastest = shortestLead !== null && q.leadDays === shortestLead && quotes.filter(x => x.leadDays === shortestLead).length === 1;
                return (
                  <tr
                    key={q.id}
                    className={`border-b border-[#E5EAF0] last:border-0 transition-colors ${
                      q.selected
                        ? "bg-[#9000FF]/5 border-l-2 border-l-[#9000FF]"
                        : idx % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {q.selected && <Award className="w-3 h-3 text-[#9000FF] shrink-0" />}
                        <div>
                          <div className={`font-semibold truncate max-w-[110px] ${q.selected ? "text-[#9000FF]" : "text-[#212833]"}`}>{q.factory}</div>
                          <div className="text-[9px] text-[#9E9FAE]">{q.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className={`font-bold ${isCheapest ? "text-emerald-600" : "text-[#212833]"}`}>
                        {fmt(q.unitPrice)}
                      </div>
                      {isCheapest && <div className="text-[9px] text-emerald-500 font-semibold">Best price</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#5E687B]">
                      {q.moq.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className={`font-medium ${isFastest ? "text-emerald-600" : "text-[#5E687B]"}`}>
                        {q.leadDays}d
                      </div>
                      {isFastest && <div className="text-[9px] text-emerald-500 font-semibold">Fastest</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#9E9FAE]">
                      {q.validityDate ? new Date(q.validityDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {q.selected ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#9000FF] bg-[#9000FF]/10 px-2 py-1 rounded-full border border-[#9000FF]/20">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelect(q.id); }}
                          disabled={selectMutation.isPending}
                          className="text-[9px] font-semibold text-[#5E687B] border border-[#E5EAF0] px-2 py-1 rounded-full hover:border-[#9000FF]/30 hover:text-[#9000FF] hover:bg-[#9000FF]/5 transition-colors disabled:opacity-50">
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Notes row if any quote has notes */}
          {quotes.some(q => q.notes) && (
            <div className="border-t border-[#E5EAF0] bg-[#FAFBFC] px-3 py-2 space-y-1">
              {quotes.filter(q => q.notes).map(q => (
                <div key={q.id} className="flex items-start gap-1.5 text-[10px] text-[#5E687B]">
                  <StickyNote className="w-3 h-3 text-[#C0C8D4] shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-[#212833]">{q.factory}:</span> {q.notes}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Single quote card */
        <div className={`rounded-xl border p-3.5 transition-colors ${
          quotes[0].selected
            ? "border-[#9000FF]/30 bg-[#9000FF]/5"
            : "border-[#E5EAF0] bg-[#FAFBFC]"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {quotes[0].selected && <Award className="w-4 h-4 text-[#9000FF] shrink-0" />}
              <div>
                <div className={`text-xs font-bold ${quotes[0].selected ? "text-[#9000FF]" : "text-[#212833]"}`}>{quotes[0].factory}</div>
                <div className="text-[10px] text-[#9E9FAE]">{quotes[0].country}</div>
              </div>
            </div>
            {quotes[0].selected ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#9000FF] bg-[#9000FF]/10 px-2 py-1 rounded-full border border-[#9000FF]/20 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> Selected
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleSelect(quotes[0].id); }}
                disabled={selectMutation.isPending}
                className="text-[10px] font-semibold text-[#9000FF] border border-[#9000FF]/30 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/5 transition-colors disabled:opacity-50 shrink-0">
                Select this quote
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white rounded-lg border border-[#E5EAF0] p-2 text-center">
              <DollarSign className="w-3 h-3 text-[#9E9FAE] mx-auto mb-0.5" />
              <div className="text-xs font-bold text-[#212833]">{fmt(quotes[0].unitPrice)}</div>
              <div className="text-[9px] text-[#9E9FAE]">Unit Cost</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5EAF0] p-2 text-center">
              <Package className="w-3 h-3 text-[#9E9FAE] mx-auto mb-0.5" />
              <div className="text-xs font-bold text-[#212833]">{quotes[0].moq.toLocaleString()}</div>
              <div className="text-[9px] text-[#9E9FAE]">MOQ</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5EAF0] p-2 text-center">
              <Clock className="w-3 h-3 text-[#9E9FAE] mx-auto mb-0.5" />
              <div className="text-xs font-bold text-[#212833]">{quotes[0].leadDays}d</div>
              <div className="text-[9px] text-[#9E9FAE]">Lead Time</div>
            </div>
          </div>
          {quotes[0].validityDate && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-[#9E9FAE]">
              <CalendarDays className="w-3 h-3" />
              Valid until {new Date(quotes[0].validityDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          {quotes[0].notes && (
            <div className="flex items-start gap-1.5 mt-2 text-[10px] text-[#5E687B] bg-white border border-[#E5EAF0] rounded-md px-2 py-1.5">
              <StickyNote className="w-3 h-3 text-[#C0C8D4] shrink-0 mt-0.5" />
              {quotes[0].notes}
            </div>
          )}
        </div>
      )}

      <AddQuoteDialog
        open={showAdd}
        onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); setFormError(null); }}
        form={form}
        setForm={setForm}
        onSubmit={handleAddSubmit}
        error={formError}
        loading={createMutation.isPending}
        supplierNames={supplierNames}
      />
    </div>
  );
}

interface AddQuoteDialogProps {
  open: boolean;
  onClose: () => void;
  form: AddQuoteForm;
  setForm: React.Dispatch<React.SetStateAction<AddQuoteForm>>;
  onSubmit: () => void;
  error: string | null;
  loading: boolean;
  supplierNames: string[];
}

function AddQuoteDialog({ open, onClose, form, setForm, onSubmit, error, loading, supplierNames }: AddQuoteDialogProps) {
  const set = (field: keyof AddQuoteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-[#212833]">Add Factory Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">
              Factory / Supplier <span className="text-red-500">*</span>
            </label>
            <input
              value={form.factory}
              onChange={set("factory")}
              list="quote-supplier-list"
              placeholder="e.g. Guangzhou Metalworks"
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            <datalist id="quote-supplier-list">
              {supplierNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Country</label>
            <select
              value={form.country}
              onChange={set("country")}
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors bg-white">
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                Unit Cost (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={set("unitPrice")}
                placeholder="0.00"
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                MOQ (units) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.moq}
                onChange={set("moq")}
                placeholder="500"
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                Lead Time (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.leadDays}
                onChange={set("leadDays")}
                placeholder="45"
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Valid Until</label>
              <input
                type="date"
                value={form.validityDate}
                onChange={set("validityDate")}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Notes <span className="text-[#9E9FAE] font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any additional context, conditions, or remarks…"
              rows={2}
              className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={loading}
            className="text-xs bg-[#9000FF] hover:bg-[#7A00D9] text-white">
            {loading ? "Saving…" : "Add Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
