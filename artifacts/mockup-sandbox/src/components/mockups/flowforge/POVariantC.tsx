/**
 * Variant C — Kanban Swimlane by Stage
 * Each pipeline stage is a column. PO cards sit in their current stage.
 * Click a card to select it; drag arrow advances to next stage (simulated).
 * Bottlenecks become immediately visible — crowded columns signal blockage.
 */
import React, { useState } from "react";
import {
  AlertCircle, Clock, Check, ChevronRight, Mail, MessageCircle,
  Sparkles, Send, Paperclip, Zap, Plus, X, MapPin,
  DollarSign, CreditCard, ArrowRight,
} from "lucide-react";

type ShipmentStatus = "on-track" | "at-risk" | "delayed";

const STAGE_COLS = [
  { id:"spec",       label:"Spec Sheet",       abbr:"Spec"    },
  { id:"quotes",     label:"Factory Quotes",   abbr:"Quotes"  },
  { id:"sample_ord", label:"Sample Order",     abbr:"Sample"  },
  { id:"sample_apr", label:"Sample Approval",  abbr:"Approval"},
  { id:"po_issued",  label:"PO Issued",        abbr:"PO"      },
  { id:"production", label:"Production",       abbr:"Prod."   },
  { id:"qc",         label:"QC Inspection",    abbr:"QC"      },
  { id:"ex_factory", label:"Ex-Factory",       abbr:"Ex-Fty"  },
  { id:"in_transit", label:"In Transit",       abbr:"Transit" },
  { id:"payment",    label:"Payment",          abbr:"Payment" },
  { id:"delivered",  label:"Delivered",        abbr:"Done"    },
];

interface POCard {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; stageId: string; eta: string; depPaid: boolean; balOverdue: boolean;
}

const INIT_CARDS: POCard[] = [
  { id:"s5", po:"PO-0168", product:"Grid Panel Display",       supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"on-track", stageId:"quotes",     eta:"Jun 10", depPaid:false, balOverdue:false },
  { id:"s8", po:"PO-0178", product:"LED Strip Kit",             supplier:"Shenzhen LEDPro",      customer:"Northbound Outfitters", status:"on-track", stageId:"spec",       eta:"Jul 10", depPaid:false, balOverdue:false },
  { id:"s7", po:"PO-0175", product:"Matte Shelf Bracket",       supplier:"Guangzhou Metalworks", customer:"Marlowe & Sons",        status:"on-track", stageId:"sample_ord", eta:"Jul 01", depPaid:true,  balOverdue:false },
  { id:"s1", po:"PO-0142", product:"Stainless Serving Fork",    supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"at-risk",  stageId:"sample_apr", eta:"May 17", depPaid:true,  balOverdue:true  },
  { id:"s6", po:"PO-0171", product:"Bamboo Serving Board",      supplier:"Hangzhou Timber Co.",  customer:"Pioneer Goods Co.",     status:"on-track", stageId:"po_issued",  eta:"Jun 15", depPaid:true,  balOverdue:false },
  { id:"s2", po:"PO-0157", product:"LED Display Cabinet Light", supplier:"Shenzhen LEDPro",      customer:"Northbound Outfitters", status:"delayed",  stageId:"production", eta:"May 18", depPaid:true,  balOverdue:false },
  { id:"s3", po:"PO-0160", product:"Engineered Oak Flooring",   supplier:"Hangzhou Timber Co.",  customer:"Pioneer Goods Co.",     status:"on-track", stageId:"qc",         eta:"May 22", depPaid:true,  balOverdue:false },
  { id:"s4", po:"PO-0165", product:"Chrome Retail Hanger",      supplier:"Tianjin Wire Works",   customer:"Marlowe & Sons",        status:"at-risk",  stageId:"ex_factory", eta:"Jun 02", depPaid:true,  balOverdue:false },
];

const MSGS = [
  { id:"m1", sender:"Guangzhou Metalworks", ch:"whatsapp" as const, time:"10:42 AM", body:"Hi team, the sample approval finish coat needs +2 days. Our polishing line is backed up. Ex-Factory moves to May 17.", draft:"Understood — proceed with delay. We'll update ex-factory to May 17. Please confirm revised schedule in writing.", po:"s1" },
  { id:"m2", sender:"Shenzhen LEDPro",      ch:"gmail"    as const, time:"Yesterday", body:"Production update: PCB soldering complete, now entering housing assembly. On track for May 18 ex-factory. Balance $11,900 due before release.", draft:"Thanks — noted. Please send final QC photos before release. We'll arrange balance wire once inspection passes.", po:"s2" },
  { id:"m3", sender:"Tianjin Wire Works",   ch:"whatsapp" as const, time:"Yesterday", body:"Major port congestion at Tianjin terminal. Export slot revised 4 days. New ex-factory: June 6. Please notify Marlowe & Sons.", draft:"Understood. Please send revised packing schedule. We'll notify Marlowe & Sons and update tracker.", po:"s4" },
];

const statusCls = (s: ShipmentStatus) => s==="delayed"?"border-red-200 bg-red-50/50":s==="at-risk"?"border-amber-200 bg-amber-50/50":"border-[#E5EAF0] bg-white";
const statusDot = (s: ShipmentStatus) => s==="delayed"?"bg-red-500":s==="at-risk"?"bg-amber-400":"bg-emerald-400";
type Ch = "whatsapp"|"gmail"|"pdf";
const chIcon = (ch: Ch, sz=10) => ch==="whatsapp"?<MessageCircle size={sz} className="text-emerald-500"/>:<Mail size={sz} className="text-blue-500"/>;

export function POVariantC() {
  const [cards, setCards] = useState<POCard[]>(INIT_CARDS);
  const [activeCardId, setActiveCardId] = useState<string|null>(null);
  const [composeText, setComposeText] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string|null>(null);

  const activeCard = cards.find(c => c.id === activeCardId);
  const activeMsg  = MSGS.find(m => m.po === activeCardId) ?? null;

  const advanceCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const idx = STAGE_COLS.findIndex(s => s.id === c.stageId);
      const next = STAGE_COLS[Math.min(idx+1, STAGE_COLS.length-1)];
      const updated = { ...c, stageId: next.id, status: "on-track" as ShipmentStatus };
      setToast(`${c.po} → ${next.label}`);
      setTimeout(() => setToast(null), 2500);
      return updated;
    }));
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#FAFBFC]" style={{fontFamily:"Inter,sans-serif",fontSize:13}}>
      {/* Header */}
      <div className="h-10 bg-white border-b border-[#E5EAF0] flex items-center px-4 gap-3 shrink-0">
        <div className="w-5 h-5 bg-[#9000FF] rounded flex items-center justify-center text-white font-bold text-[10px]">f</div>
        <span className="font-bold text-xs text-[#9000FF]">flowforge</span>
        <span className="text-[#E5EAF0]">/</span>
        <span className="text-xs text-[#5E687B] font-medium">Pipeline Board</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] text-[#9E9FAE]">Click → arrow button to advance stage</span>
          <button className="text-[9px] bg-[#9000FF] text-white px-2.5 py-1 rounded font-semibold flex items-center gap-1"><Plus size={9}/>New PO</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Kanban board */}
        <div className={`transition-all duration-300 ${activeCardId ? "w-[calc(100%-360px)]" : "w-full"} flex overflow-x-auto overflow-y-hidden`}>
          <div className="flex gap-2 p-3 min-w-max">
            {STAGE_COLS.map(col => {
              const colCards = cards.filter(c => c.stageId === col.id);
              const hasUrgent = colCards.some(c => c.status==="delayed"||c.status==="at-risk");
              return (
                <div key={col.id} className="w-[148px] shrink-0 flex flex-col">
                  {/* Column header */}
                  <div className={`mb-2 px-2.5 py-2 rounded-lg border ${hasUrgent?"border-amber-100 bg-amber-50":"border-[#E5EAF0] bg-[#F7F9FA]"}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${hasUrgent?"text-amber-700":"text-[#5E687B]"}`}>{col.abbr}</span>
                      <span className={`text-[8px] font-bold px-1 rounded ${colCards.length>0?"bg-white border border-[#E5EAF0] text-[#212833]":"text-[#9E9FAE]"}`}>{colCards.length||""}</span>
                    </div>
                    <div className="text-[8px] text-[#9E9FAE] truncate">{col.label}</div>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
                    {colCards.map(card => {
                      const isActive = activeCardId === card.id;
                      return (
                        <div key={card.id} onClick={() => setActiveCardId(isActive ? null : card.id)}
                          className={`border rounded-lg p-2.5 cursor-pointer transition-all group relative ${isActive ? "border-[#9000FF]/40 shadow-md bg-white" : statusCls(card.status) + " hover:shadow-sm"}`}>
                          {/* Status dot */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(card.status)}`}/>
                            <span className={`text-[9px] font-bold ${isActive?"text-[#9000FF]":"text-[#212833]"} truncate`}>{card.po}</span>
                          </div>
                          <div className="text-[9px] text-[#5E687B] leading-tight mb-1.5 line-clamp-2">{card.product}</div>
                          <div className="text-[8px] text-[#9E9FAE] truncate mb-2">{card.supplier}</div>

                          {/* Payment chips — ultra compact */}
                          <div className="flex gap-1 mb-2">
                            <span className={`text-[7px] font-bold px-1 py-0.5 rounded border ${card.depPaid?"bg-emerald-50 text-emerald-600 border-emerald-100":"bg-[#F0F4F8] text-[#9E9FAE] border-[#E5EAF0]"}`}>30%</span>
                            <span className={`text-[7px] font-bold px-1 py-0.5 rounded border ${card.balOverdue?"bg-red-50 text-red-500 border-red-100":"bg-[#F0F4F8] text-[#9E9FAE] border-[#E5EAF0]"}`}>{card.balOverdue?"!70%":"70%"}</span>
                          </div>

                          {/* ETA + advance button */}
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-[#9E9FAE]">{card.eta}</span>
                            {col.id !== "delivered" && (
                              <button onClick={e => advanceCard(card.id, e)}
                                title={`Advance to ${STAGE_COLS[STAGE_COLS.findIndex(s=>s.id===col.id)+1]?.label}`}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 bg-[#9000FF] text-white rounded flex items-center justify-center hover:bg-[#7A00D9]">
                                <ChevronRight size={10}/>
                              </button>
                            )}
                            {col.id === "delivered" && <Check size={10} className="text-emerald-400"/>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty slot */}
                    {colCards.length === 0 && (
                      <div className="border border-dashed border-[#E5EAF0] rounded-lg p-2 text-center">
                        <span className="text-[8px] text-[#D6E3EB]">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slide-in detail panel */}
        {activeCard && (
          <div className="w-[360px] border-l border-[#E5EAF0] bg-white flex flex-col shrink-0 shadow-[-4px_0_20px_rgba(0,0,0,0.06)]">
            {/* Panel header */}
            <div className="border-b border-[#E5EAF0] p-4 shrink-0 bg-[#FAFBFC]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-xs text-[#212833]">{activeCard.po}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${activeCard.status==="delayed"?"bg-red-50 text-red-600 border-red-100":activeCard.status==="at-risk"?"bg-amber-50 text-amber-600 border-amber-100":"bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                      {activeCard.status==="delayed"?"Delayed":activeCard.status==="at-risk"?"At Risk":"On Track"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5E687B]">{activeCard.product}</div>
                </div>
                <button onClick={() => setActiveCardId(null)} className="p-1 hover:bg-[#F0F4F8] rounded-md text-[#5E687B]"><X size={14}/></button>
              </div>
              {/* Stage position */}
              <div className="flex items-center gap-1.5 text-[9px] text-[#5E687B] mb-2">
                <MapPin size={9} className="text-[#9000FF]"/>
                <span className="font-semibold text-[#212833]">{STAGE_COLS.find(s=>s.id===activeCard.stageId)?.label}</span>
                <ChevronRight size={8} className="text-[#D6E3EB]"/>
                <span>{STAGE_COLS[STAGE_COLS.findIndex(s=>s.id===activeCard.stageId)+1]?.label ?? "—"}</span>
              </div>
              {/* Stage bar */}
              <div className="flex gap-px h-1.5">
                {STAGE_COLS.map((s,i)=>{
                  const idx = STAGE_COLS.findIndex(st=>st.id===activeCard.stageId);
                  return <div key={s.id} className={`flex-1 rounded-full transition-all ${i<idx?"bg-[#9000FF]":i===idx?(activeCard.status==="delayed"?"bg-red-400":activeCard.status==="at-risk"?"bg-amber-400":"bg-[#9000FF] opacity-60"):"bg-[#E5EAF0]"}`}/>;
                })}
              </div>
              {/* Payment chips */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded border ${activeCard.depPaid?"bg-emerald-50 text-emerald-600 border-emerald-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                  <DollarSign size={7}/>30% {activeCard.depPaid?"paid":"pending"}
                </div>
                <div className={`flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded border ${activeCard.balOverdue?"bg-red-50 text-red-600 border-red-100 animate-pulse":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                  <CreditCard size={7}/>70% {activeCard.balOverdue?"OVERDUE":"pending"}
                </div>
              </div>
            </div>

            {/* Thread or empty state */}
            {activeMsg ? (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-[#F0F4F8] flex items-center justify-center text-xs font-bold text-[#5E687B]">{activeMsg.sender.charAt(0)}</div>
                    <div>
                      <div className="font-bold text-xs text-[#212833]">{activeMsg.sender}</div>
                      <div className="text-[9px] text-[#5E687B] flex items-center gap-1">{chIcon(activeMsg.ch,9)}{activeMsg.time}</div>
                    </div>
                    {sent.has(activeCardId!)&&<span className="ml-auto text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Check size={9}/>Replied</span>}
                  </div>
                  <div className="bg-white border border-[#E5EAF0] rounded-xl p-3 shadow-sm mb-4 text-[11px] text-[#212833] leading-relaxed">{activeMsg.body}</div>
                  <div className="border border-[#9000FF]/20 bg-[#9000FF]/5 rounded-xl p-3">
                    <div className="text-[8px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Zap size={8}/>AI Suggested Reply</div>
                    <div className="text-[10px] text-[#5E687B] leading-relaxed mb-3 font-mono">"{activeMsg.draft}"</div>
                    {!sent.has(activeCardId!)?(
                      <div className="flex gap-2">
                        <button onClick={()=>{setSent(s=>new Set(s).add(activeCardId!));setComposeText("");setToast("Reply sent");setTimeout(()=>setToast(null),2500);}} className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-[9px] font-bold flex items-center gap-1"><Send size={9}/>Send & Update</button>
                        <button onClick={()=>setComposeText(activeMsg.draft)} className="bg-white border border-[#E5EAF0] text-xs px-3 py-1.5 rounded-md text-[9px] hover:bg-[#F0F4F8]">Edit</button>
                      </div>
                    ):<div className="text-emerald-600 text-[9px] font-semibold flex items-center gap-1"><Check size={10}/>Sent — stage advanced</div>}
                  </div>
                </div>

                <div className="p-3 border-t border-[#E5EAF0] bg-white shrink-0">
                  <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/30 transition-all">
                    <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="Reply..." className="w-full p-3 h-12 outline-none resize-none text-[11px] bg-transparent"/>
                    <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
                      <div className="flex gap-1 text-[#5E687B]"><button className="p-1 hover:bg-[#E5EAF0] rounded"><Paperclip size={12}/></button><button onClick={()=>setComposeText(activeMsg.draft)} className="p-1 hover:bg-[#E5EAF0] rounded"><Sparkles size={12} className="text-[#9000FF]"/></button></div>
                      <button onClick={()=>{if(composeText.trim()){setSent(s=>new Set(s).add(activeCardId!));setComposeText("");}}} className={`px-3 py-1.5 rounded-md text-[9px] font-bold flex items-center gap-1.5 ${composeText.trim()?"bg-[#212833] text-white":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>Reply <Send size={9}/></button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#9E9FAE] p-6">
                <Mail size={24} className="opacity-30"/>
                <p className="text-xs text-center">No messages yet for {activeCard.po}</p>
                <button className="mt-2 text-[10px] text-[#9000FF] font-semibold border border-[#9000FF]/20 px-3 py-1.5 rounded-lg hover:bg-[#9000FF]/5">Compose first message</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#212833] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 z-50">
          <Check size={13} className="text-emerald-400"/>{toast}
        </div>
      )}
    </div>
  );
}
