/**
 * Variant A — Vertical Sidebar with Smart Groups
 * POs live in a persistent left sidebar, grouped by urgency.
 * Scales cleanly to 30+ POs. Search at top.
 */
import React, { useState } from "react";
import {
  Search, AlertCircle, Clock, Check, Mail, MessageCircle, FileText,
  ChevronDown, ChevronRight, Sparkles, Send, Paperclip, Wand2,
  DollarSign, CreditCard, X, Layers, Plus, SlidersHorizontal, Zap,
} from "lucide-react";

type ShipmentStatus = "on-track" | "at-risk" | "delayed";

const STAGES = ["Spec Sheet","Factory Quotes","Sample Order","Sample Approval","PO Issued","Production","QC Inspection","Ex-Factory","In Transit","Payment Clearance","Delivered"];

const POS = [
  { id:"s1", po:"PO-0142", product:"Stainless Serving Fork",     supplier:"Guangzhou Metalworks", status:"at-risk"  as ShipmentStatus, stage:"Sample Approval", stageIdx:3, eta:"May 17", dep:{paid:true,  pct:30}, bal:{paid:false, pct:70, overdue:true } },
  { id:"s2", po:"PO-0157", product:"LED Display Cabinet Light",  supplier:"Shenzhen LEDPro",      status:"delayed"  as ShipmentStatus, stage:"Production",     stageIdx:5, eta:"May 18", dep:{paid:true,  pct:30}, bal:{paid:false, pct:70, overdue:false} },
  { id:"s3", po:"PO-0160", product:"Engineered Oak Flooring",    supplier:"Hangzhou Timber Co.",  status:"on-track" as ShipmentStatus, stage:"QC Inspection",  stageIdx:6, eta:"May 22", dep:{paid:true,  pct:30}, bal:{paid:false, pct:70, overdue:false} },
  { id:"s4", po:"PO-0165", product:"Chrome Retail Hanger",       supplier:"Tianjin Wire Works",   status:"at-risk"  as ShipmentStatus, stage:"Ex-Factory",     stageIdx:7, eta:"Jun 02", dep:{paid:true,  pct:30}, bal:{paid:false, pct:70, overdue:false} },
  { id:"s5", po:"PO-0168", product:"Powder-Coat Grid Panel",     supplier:"Guangzhou Metalworks", status:"on-track" as ShipmentStatus, stage:"Factory Quotes", stageIdx:1, eta:"Jun 10", dep:{paid:false, pct:30}, bal:{paid:false, pct:70, overdue:false} },
  // extra POs to show scale
  { id:"s6", po:"PO-0171", product:"Bamboo Serving Board",        supplier:"Hangzhou Timber Co.",  status:"on-track" as ShipmentStatus, stage:"PO Issued",      stageIdx:4, eta:"Jun 15", dep:{paid:true,  pct:30}, bal:{paid:false, pct:70, overdue:false} },
  { id:"s7", po:"PO-0175", product:"Matte Black Shelf Bracket",   supplier:"Guangzhou Metalworks", status:"on-track" as ShipmentStatus, stage:"Sample Order",   stageIdx:2, eta:"Jul 01", dep:{paid:true,  pct:30}, bal:{paid:false, pct:70, overdue:false} },
  { id:"s8", po:"PO-0178", product:"LED Strip Kit — 5m Warm",     supplier:"Shenzhen LEDPro",      status:"on-track" as ShipmentStatus, stage:"Spec Sheet",     stageIdx:0, eta:"Jul 10", dep:{paid:false, pct:30}, bal:{paid:false, pct:70, overdue:false} },
];

const MSGS = [
  { id:"m1", sender:"Guangzhou Metalworks", ch:"whatsapp" as const, time:"10:42 AM", snippet:"Strike-off finish coat needs +2 days, polishing line backed up.", body:"Hi team, the sample approval finish coat needs +2 days. Our polishing line is backed up. If we push this, Ex-Factory moves to May 17.", tags:["risk: delay 2d","milestone: sample approval"], po:"s1", draft:"Understood — please proceed with the delay. We'll update PO-2026-0142 ex-factory to May 17." },
  { id:"m2", sender:"Shenzhen LEDPro",      ch:"gmail"    as const, time:"Yesterday", snippet:"PCB soldering complete, entering housing assembly. On track for May 18.", body:"Production update on PO-2026-0157. PCB soldering is complete and units are now entering housing assembly. On track for May 18 ex-factory. Balance $11,900 due before release.", tags:["milestone: production","payment: balance due"], po:"s2", draft:"Thanks — noted on progress. Please send QC photos before release. We'll arrange balance wire once inspection passes." },
  { id:"m3", sender:"Tianjin Wire Works",   ch:"whatsapp" as const, time:"Yesterday", snippet:"Port congestion at Tianjin — export delay 4 days.", body:"Major port congestion at Tianjin terminal. Freight forwarder revised our export slot by 4 days. New ex-factory: June 6.", tags:["risk: port congestion","delay: 4d"], po:"s4", draft:"Understood. Please send revised schedule. We'll notify Marlowe & Sons." },
];

type Ch = "whatsapp"|"gmail"|"pdf"|"sheets";
const chIcon = (ch: Ch, sz=11) => ch==="whatsapp"?<MessageCircle size={sz} className="text-emerald-500"/>:ch==="gmail"?<Mail size={sz} className="text-blue-500"/>:<FileText size={sz} className="text-red-400"/>;
const statusDot = (s: ShipmentStatus) => s==="delayed"?"bg-red-500":s==="at-risk"?"bg-amber-400":"bg-emerald-400";
const statusText = (s: ShipmentStatus) => s==="delayed"?"Delayed":s==="at-risk"?"At Risk":"On Track";
const statusPill = (s: ShipmentStatus) => s==="delayed"?"bg-red-50 text-red-600 border-red-100":s==="at-risk"?"bg-amber-50 text-amber-600 border-amber-100":"bg-emerald-50 text-emerald-600 border-emerald-100";

export function POVariantA() {
  const [activePO, setActivePO] = useState("s1");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const [activeMsg, setActiveMsg] = useState("m1");
  const [composeText, setComposeText] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());

  const filtered = POS.filter(p =>
    !search.trim() ||
    p.po.toLowerCase().includes(search.toLowerCase()) ||
    p.product.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const groups = [
    { key:"urgent",   label:"Urgent",   items: filtered.filter(p => p.status==="delayed" || (p.status==="at-risk"&&p.bal.overdue)) },
    { key:"at-risk",  label:"At Risk",  items: filtered.filter(p => p.status==="at-risk"&&!p.bal.overdue) },
    { key:"on-track", label:"On Track", items: filtered.filter(p => p.status==="on-track") },
  ].filter(g => g.items.length > 0);

  const selectedPO = POS.find(p => p.id === activePO)!;
  const visibleMsgs = MSGS.filter(m => m.po === activePO);
  const msg = MSGS.find(m => m.id === activeMsg) || MSGS[0];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAFBFC]" style={{fontFamily:"Inter,sans-serif",fontSize:13}}>
      {/* Nav rail */}
      <div className="w-12 bg-white border-r border-[#E5EAF0] flex flex-col items-center py-4 gap-5 shrink-0">
        <div className="w-6 h-6 bg-[#9000FF] rounded-md flex items-center justify-center text-white font-bold text-xs">f</div>
        <Layers size={16} className="text-[#9000FF]"/>
        <Mail size={16} className="text-[#5E687B]"/>
      </div>

      {/* PO Sidebar — the key alternative */}
      <div className="w-[220px] bg-white border-r border-[#E5EAF0] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#E5EAF0]">
          <div className="text-[10px] font-bold text-[#212833] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Purchase Orders</span>
            <button className="p-0.5 hover:bg-[#F0F4F8] rounded"><Plus size={11} className="text-[#5E687B]"/></button>
          </div>
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9E9FAE]"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search POs..."
              className="w-full pl-6 pr-2 py-1.5 bg-[#F0F4F8] text-[11px] rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/20 placeholder:text-[#9E9FAE]"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {groups.map(group => (
            <div key={group.key}>
              <button onClick={() => setCollapsed(c => ({...c,[group.key]:!c[group.key]}))}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#5E687B] hover:bg-[#F0F4F8] transition-colors">
                {collapsed[group.key] ? <ChevronRight size={9}/> : <ChevronDown size={9}/>}
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${group.key==="urgent"?"bg-red-500":group.key==="at-risk"?"bg-amber-400":"bg-emerald-400"}`}/>
                {group.label}
                <span className="ml-auto text-[8px] bg-[#F0F4F8] border border-[#E5EAF0] px-1 rounded">{group.items.length}</span>
              </button>

              {!collapsed[group.key] && group.items.map(po => {
                const isActive = activePO === po.id;
                const pct = Math.round((po.stageIdx / (STAGES.length-1)) * 100);
                return (
                  <button key={po.id} onClick={() => { setActivePO(po.id); const m=MSGS.find(m=>m.po===po.id); if(m) setActiveMsg(m.id); }}
                    className={`w-full text-left px-3 py-2 border-l-2 transition-all relative ${isActive?"border-l-[#9000FF] bg-[#FAFBFF]":"border-l-transparent hover:bg-[#FAFBFC] hover:border-l-[#E5EAF0]"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(po.status)}`}/>
                      <span className={`text-[10px] font-bold ${isActive?"text-[#9000FF]":"text-[#212833]"}`}>{po.po}</span>
                      <span className="text-[8px] text-[#9E9FAE] ml-auto shrink-0">{po.eta}</span>
                    </div>
                    <div className="text-[10px] text-[#5E687B] truncate pl-3 mb-1">{po.product}</div>
                    <div className="pl-3">
                      <div className="h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${po.status==="delayed"?"bg-red-400":po.status==="at-risk"?"bg-amber-400":"bg-[#9000FF]"}`} style={{width:`${pct}%`}}/>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 text-[8px] text-[#9E9FAE]">
                        <span>{po.stage}</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    {po.bal.overdue && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>}
                  </button>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-1.5 text-[#9E9FAE]">
              <Search size={18} className="opacity-30"/>
              <p className="text-[10px]">No POs match "{search}"</p>
            </div>
          )}
        </div>

        {/* Footer count */}
        <div className="px-3 py-2 border-t border-[#E5EAF0] text-[9px] text-[#9E9FAE] flex items-center justify-between">
          <span>{POS.length} POs total</span>
          <button className="flex items-center gap-1 text-[#9000FF] hover:underline font-semibold text-[9px]"><SlidersHorizontal size={9}/>Stages</button>
        </div>
      </div>

      {/* Thread list */}
      <div className="w-[240px] border-r border-[#E5EAF0] flex flex-col shrink-0 bg-white">
        {/* PO header */}
        <div className="p-3 border-b border-[#E5EAF0] bg-[#FAFBFC]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-xs text-[#212833]">{selectedPO.po}</span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusPill(selectedPO.status)}`}>
              {statusText(selectedPO.status)}
            </span>
          </div>
          <div className="text-[10px] text-[#5E687B] truncate">{selectedPO.product}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${selectedPO.dep.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
              30% {selectedPO.dep.paid?"paid":"pending"}
            </div>
            <div className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${selectedPO.bal.overdue?"bg-red-50 text-red-600 border-red-100 animate-pulse":selectedPO.bal.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
              70% {selectedPO.bal.overdue?"OVERDUE":selectedPO.bal.paid?"paid":"pending"}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleMsgs.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-[#9E9FAE]"><Mail size={20} className="opacity-30"/><p className="text-[10px]">No messages for this PO</p></div>
          ) : visibleMsgs.map(m => (
            <div key={m.id} onClick={() => setActiveMsg(m.id)}
              className={`p-3 border-b border-[#E5EAF0] cursor-pointer hover:bg-[#FAFBFC] border-l-2 transition-all ${activeMsg===m.id?"border-l-[#9000FF] bg-[#FAFBFF]":"border-l-transparent"}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-[10px] text-[#212833] truncate">{m.sender}</span>
                {chIcon(m.ch)}
                <span className="text-[8px] text-[#9E9FAE] ml-auto">{m.time}</span>
              </div>
              <p className="text-[10px] text-[#5E687B] line-clamp-2 leading-relaxed">{m.snippet}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {m.tags.map(t => <span key={t} className="text-[7px] bg-[#F0F4F8] border border-[#E5EAF0] text-[#5E687B] px-1 rounded">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message detail + compose */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Toolbar */}
        <div className="border-b border-[#E5EAF0] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F0F4F8] flex items-center justify-center text-sm font-bold text-[#5E687B]">{msg.sender.charAt(0)}</div>
            <div>
              <div className="font-bold text-xs text-[#212833]">{msg.sender}</div>
              <div className="text-[9px] text-[#5E687B] flex items-center gap-1">{chIcon(msg.ch,9)}{msg.time}</div>
            </div>
            {sent.has(msg.id) && <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ml-2"><Check size={9}/>Replied</span>}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4 text-[11px] text-[#212833] leading-relaxed">{msg.body}</div>
          <div className="border border-[#9000FF]/20 bg-[#9000FF]/5 rounded-xl p-3.5">
            <div className="text-[8px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Zap size={8}/>AI Suggested Reply</div>
            <div className="text-[10px] text-[#5E687B] leading-relaxed mb-3 font-mono">"{msg.draft}"</div>
            {!sent.has(msg.id) ? (
              <div className="flex gap-2">
                <button onClick={() => { setSent(s => new Set(s).add(msg.id)); setComposeText(""); }} className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-[9px] font-bold hover:bg-[#7A00D9] flex items-center gap-1"><Send size={9}/>Send & Update</button>
                <button onClick={() => setComposeText(msg.draft)} className="bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md text-[9px] font-medium hover:bg-[#F0F4F8]">Edit Draft</button>
              </div>
            ) : <div className="text-emerald-600 text-[9px] font-semibold flex items-center gap-1"><Check size={10}/>Sent — stage advanced</div>}
          </div>
        </div>

        {/* Compose */}
        <div className="p-3 border-t border-[#E5EAF0] bg-white shrink-0">
          <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/30 transition-all">
            <textarea value={composeText} onChange={e=>setComposeText(e.target.value)}
              placeholder="Reply..." className="w-full p-3 h-12 outline-none resize-none text-[11px] bg-transparent"/>
            <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
              <div className="flex gap-1 text-[#5E687B]">
                <button className="p-1 hover:bg-[#E5EAF0] rounded"><Paperclip size={12}/></button>
                <button onClick={()=>setComposeText(msg.draft)} className="p-1 hover:bg-[#E5EAF0] rounded"><Sparkles size={12} className="text-[#9000FF]"/></button>
              </div>
              <button onClick={()=>{ if(composeText.trim()){setSent(s=>new Set(s).add(msg.id));setComposeText("");} }}
                className={`px-3 py-1.5 rounded-md text-[9px] font-bold flex items-center gap-1.5 ${composeText.trim()?"bg-[#212833] text-white":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>
                Reply <Send size={9}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
