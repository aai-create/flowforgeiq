import React, { useState, useEffect } from "react";
import { Settings2, Save, Eye, RefreshCw } from "lucide-react";
import { useGetPoNumberingConfig, useUpdatePoNumberingConfig } from "@workspace/api-client-react";
import { NavSidebar } from "@/components/NavSidebar";

function buildPreview(prefix: string, format: string, suffix: string, seq: number) {
  const buyerPo = prefix + format.replace("{seq}", String(seq).padStart(4, "0"));
  return { buyerPo, supplierPo: buyerPo + suffix };
}

export function Settings() {
  const { data: config, isLoading } = useGetPoNumberingConfig();
  const updateMutation = useUpdatePoNumberingConfig();

  const [prefix, setPrefix] = useState("PO-");
  const [sequenceFormat, setSequenceFormat] = useState("{seq}");
  const [supplierSuffix, setSupplierSuffix] = useState("S");
  const [resetSeq, setResetSeq] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setPrefix(config.prefix);
      setSequenceFormat(config.sequenceFormat);
      setSupplierSuffix(config.supplierSuffix);
    }
  }, [config]);

  const nextSeq = config ? (resetSeq ? Number(resetSeq) : config.nextSeq) : 1;
  const preview = buildPreview(prefix, sequenceFormat, supplierSuffix, nextSeq);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        data: {
          prefix,
          sequenceFormat,
          supplierSuffix,
          ...(resetSeq ? { resetSeq: Number(resetSeq) } : {}),
        },
      });
      setResetSeq("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  return (
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <NavSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-[#E5EAF0] flex items-center px-6 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#9000FF]" />
            <h1 className="text-sm font-bold text-[#212833]">Settings</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-8">

            <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#212833] mb-1">PO Numbering Scheme</h2>
              <p className="text-xs text-[#5E687B] mb-5 leading-relaxed">
                Configure how buyer-facing and supplier-facing PO numbers are generated.
                Both sides share the same prefix and sequence; the supplier PO gets an extra suffix to distinguish
                the two sides of each deal.
              </p>

              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-[#9E9FAE]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#5E687B] mb-1">Prefix</label>
                      <input value={prefix} onChange={e => setPrefix(e.target.value)}
                        placeholder="PO-"
                        className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5E687B] mb-1">Supplier suffix</label>
                      <input value={supplierSuffix} onChange={e => setSupplierSuffix(e.target.value)}
                        placeholder="S"
                        className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                      Sequence format
                      <span className="text-[#9E9FAE] font-normal ml-1">
                        — use <code className="font-mono bg-[#F0F4F8] px-1 rounded text-[11px]">{"{seq}"}</code> as the counter placeholder
                      </span>
                    </label>
                    <input value={sequenceFormat} onChange={e => setSequenceFormat(e.target.value)}
                      placeholder="{seq}"
                      className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors font-mono" />
                    <p className="text-[10px] text-[#9E9FAE] mt-1">
                      Examples: <code className="font-mono">{"{seq}"}</code> → 0001 &nbsp;·&nbsp;
                      <code className="font-mono">2026-{"{seq}"}</code> → 2026-0001
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                      Reset counter to
                      <span className="text-[#9E9FAE] font-normal ml-1">(optional — leave blank to keep the current counter)</span>
                    </label>
                    <input type="number" min="1" value={resetSeq} onChange={e => setResetSeq(e.target.value)}
                      placeholder={String(config?.nextSeq ?? 1)}
                      className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors" />
                  </div>

                  <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Eye className="w-3 h-3 text-[#9000FF]" />
                      <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Live preview — next PO pair</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-1.5">Buyer PO (buyer → trader)</div>
                        <code className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {preview.buyerPo}
                        </code>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-1.5">Supplier PO (trader → supplier)</div>
                        <code className="text-sm font-mono font-bold text-[#9000FF] bg-[#9000FF]/8 px-2 py-0.5 rounded border border-[#9000FF]/20">
                          {preview.supplierPo}
                        </code>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#9E9FAE] mt-2.5">
                      Counter is currently at <strong className="text-[#5E687B]">{config?.nextSeq ?? "—"}</strong>.
                      It advances by 1 each time you use "Auto-fill" in the New PO form.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={() => void handleSave()}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors">
                      {updateMutation.isPending
                        ? <><RefreshCw className="w-3 h-3 animate-spin" />Saving…</>
                        : saved
                          ? <><span className="text-emerald-300">✓</span> Saved!</>
                          : <><Save className="w-3 h-3" />Save settings</>}
                    </button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
