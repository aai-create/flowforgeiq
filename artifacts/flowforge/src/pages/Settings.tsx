import React, { useState, useEffect } from "react";
import { Settings2, Save, Eye, RefreshCw, MessageCircle, MessageSquare, Mail, Copy, Check, Smartphone, ChevronDown, ChevronRight, ExternalLink, Zap } from "lucide-react";
import { useGetPoNumberingConfig, useUpdatePoNumberingConfig, useGetInboundEmailAddress } from "@workspace/api-client-react";
import { NavSidebar } from "@/components/NavSidebar";

function BeeperSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E5EAF0] rounded-lg overflow-hidden mb-5">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-3.5 py-3 bg-[#FAFBFC] hover:bg-[#F0F4F8] transition-colors text-left">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#9000FF]"/>
          <span className="text-xs font-semibold text-[#212833]">Upgrade to full automation</span>
          <span className="text-[9px] font-bold bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/15 px-1.5 py-0.5 rounded-full">Beeper</span>
        </div>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-[#9E9FAE]"/> : <ChevronRight className="w-3.5 h-3.5 text-[#9E9FAE]"/>}
      </button>
      {open && (
        <div className="px-3.5 py-3 border-t border-[#E5EAF0] bg-white space-y-2.5">
          <p className="text-[11px] text-[#5E687B] leading-relaxed">
            The paste-to-process flow requires manual copying. Connect <strong className="text-[#212833]">Beeper</strong> to
            receive WhatsApp and iMessage chats automatically — no copy-paste needed.
          </p>
          <ul className="space-y-1.5">
            {[
              "Real-time ingest — messages arrive the moment they're sent",
              "Works with WhatsApp Business, iMessage, WeChat, and SMS",
              "Uses the same AI extraction pipeline as paste-to-process",
            ].map(item => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] text-[#5E687B]">
                <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5"/>
                {item}
              </li>
            ))}
          </ul>
          <a href="https://beeper.com/desktop-api" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9000FF] hover:text-[#7A00D9] transition-colors">
            <ExternalLink className="w-3 h-3"/>
            Learn about Beeper Desktop API
          </a>
        </div>
      )}
    </div>
  );
}

function buildPreview(prefix: string, format: string, suffix: string, seq: number) {
  const buyerPo = prefix + format.replace("{seq}", String(seq).padStart(4, "0"));
  return { buyerPo, supplierPo: buyerPo + suffix };
}

export function Settings() {
  const { data: config, isLoading } = useGetPoNumberingConfig();
  const updateMutation = useUpdatePoNumberingConfig();
  const { data: inboundEmailData } = useGetInboundEmailAddress();
  const inboundEmail = inboundEmailData?.inboundEmailAddress || "ai@flowforge.com";
  const [emailCopied, setEmailCopied] = useState(false);

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

            {/* Channels section */}
            <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#212833] mb-1">Chat Channels</h2>
              <p className="text-xs text-[#5E687B] mb-5 leading-relaxed">
                Ingest WhatsApp, WeChat, iMessage, and SMS messages into FlowForge. Use the
                paste-to-process button (<span className="font-mono text-[11px] bg-[#F0F4F8] px-1 rounded">clipboard icon</span>) in the inbox toolbar,
                or forward chat exports directly to the inbound email address below.
              </p>

              {/* Channel status grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { name: "WhatsApp", icon: <MessageCircle className="w-4 h-4 text-emerald-500"/>, desc: "Paste or forward WhatsApp exports" },
                  { name: "WeChat", icon: <MessageSquare className="w-4 h-4 text-teal-500"/>, desc: "Paste WeChat chat history" },
                  { name: "iMessage", icon: <MessageCircle className="w-4 h-4 text-blue-400"/>, desc: "Forward or paste iMessage threads" },
                  { name: "SMS", icon: <Smartphone className="w-4 h-4 text-slate-400"/>, desc: "Paste SMS message exports" },
                ].map(ch => (
                  <div key={ch.name} className="flex items-start gap-3 p-3 border border-[#E5EAF0] rounded-lg">
                    <div className="w-7 h-7 rounded-md bg-[#F0F4F8] flex items-center justify-center shrink-0">{ch.icon}</div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-[#212833]">{ch.name}</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 rounded-full">Active</span>
                      </div>
                      <p className="text-[10px] text-[#9E9FAE]">{ch.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Beeper automation upgrade */}
              <BeeperSection />

              {/* Inbound email */}
              <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Mail className="w-3 h-3 text-[#9000FF]"/>
                  <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Inbound email address</span>
                </div>
                <p className="text-[10px] text-[#9E9FAE] mb-2.5">
                  Forward supplier chat exports to this address to ingest them automatically.
                  Controlled by the <code className="font-mono bg-white border border-[#E5EAF0] px-1 rounded text-[10px] text-[#212833]">INBOUND_EMAIL_ADDRESS</code> environment variable.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm font-semibold text-[#212833] bg-white border border-[#E5EAF0] rounded-md px-3 py-1.5 truncate">
                    {inboundEmail}
                  </code>
                  <button
                    onClick={()=>{void navigator.clipboard.writeText(inboundEmail).then(()=>{setEmailCopied(true);setTimeout(()=>setEmailCopied(false),1800);});}}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-white hover:text-[#212833] transition-colors shrink-0">
                    {emailCopied ? <><Check className="w-3 h-3 text-emerald-500"/>Copied!</> : <><Copy className="w-3 h-3"/>Copy</>}
                  </button>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
