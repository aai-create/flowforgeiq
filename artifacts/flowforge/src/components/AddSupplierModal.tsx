import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useCreateSupplier } from "@workspace/api-client-react";
import type { SupplierSummary } from "@workspace/api-client-react";

interface AddSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: SupplierSummary) => void;
}

const FIELDS = [
  { key: "name",          label: "Supplier Name",   placeholder: "e.g. Guangzhou Metalworks", required: true,  type: "text"  },
  { key: "country",       label: "Country",          placeholder: "e.g. CN, VN, BD",           required: false, type: "text"  },
  { key: "contactName",   label: "Contact Name",     placeholder: "e.g. David Chen",            required: false, type: "text"  },
  { key: "contactEmail",  label: "Contact Email",    placeholder: "e.g. david@supplier.com",    required: false, type: "email" },
  { key: "whatsAppNumber",label: "WhatsApp Number",  placeholder: "e.g. +86 138 0000 0000",     required: false, type: "tel"   },
  { key: "paymentTerms",  label: "Payment Terms",    placeholder: "e.g. 30% deposit, 70% balance", required: false, type: "text" },
] as const;

type FormKey = (typeof FIELDS)[number]["key"];

const EMPTY_FORM: Record<FormKey, string> = {
  name: "",
  country: "",
  contactName: "",
  contactEmail: "",
  whatsAppNumber: "",
  paymentTerms: "",
};

export function AddSupplierModal({ open, onClose, onCreated }: AddSupplierModalProps) {
  const createMutation = useCreateSupplier();
  const [form, setForm] = useState<Record<FormKey, string>>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm(EMPTY_FORM);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    setLoading(true);
    try {
      const optionals: Partial<Record<"country" | "contactName" | "contactEmail" | "whatsAppNumber" | "paymentTerms", string>> = {};
      for (const key of ["country", "contactName", "contactEmail", "whatsAppNumber", "paymentTerms"] as const) {
        const val = form[key].trim();
        if (val) optionals[key] = val;
      }
      const created = await createMutation.mutateAsync({ data: { name: form.name.trim(), ...optionals } });
      onCreated(created);
      reset();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to create supplier. The name may already be in use.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#212833]">Add New Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {FIELDS.map(({ key, label, placeholder, required, type }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-[#5E687B] mb-1 uppercase tracking-wide">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") void handleSubmit(); }}
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
          <Button variant="outline" onClick={handleClose} disabled={loading} className="text-[13px]">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="bg-[#9000FF] hover:bg-[#7A00D9] text-white text-[13px]"
          >
            {loading ? "Creating…" : "Add Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
