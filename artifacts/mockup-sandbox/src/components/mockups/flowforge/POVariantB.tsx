/**
 * Variant B — Compact Sortable Table
 * POs displayed as a dense, sortable data table above the inbox.
 * Column headers clickable to sort. Rows 28px tall — fits 20+ at once.
 * Collapses to just a header bar to reclaim vertical space.
 */
import React, { useState } from "react";
import {
  ChevronUp, ChevronDown, ArrowUpDown, Check, AlertCircle, Clock,
  Mail, MessageCircle, FileText, Sparkles, Send, Paperclip, X, Zap,
  CreditCard, DollarSign, Plus, ChevronRight, Wand2, Filter,
} from "lucide-react";

type ShipmentStatus = "on-track" | "at-risk" | "delayed";
type SortDir = "asc" | "desc";

interface PO {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; stage: string; stageIdx: number; eta: string;
  depPaid: boolean; balPaid: boolean; balOverdue: boolean;
  depAmt: number; balAmt: number;
}

const STAGES = ["Spec Sheet","Factory Quotes","Sample Order","Sample Approval","PO Issued","Production","QC Inspection","Ex-Factory","In Transit","Payment Clearance","Delivered"];

const ALL_POS: PO[] = [
  { id:"s1", po:"PO-0142", product:"Stainless Serving Fork",     supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"at-risk",  stage:"Sample Approval", stageIdx:3,  eta:"May 17", depPaid:true,  balPaid:false, balOverdue:true,  depAmt:3840,  balAmt:8960  },
  { id:"s2", po:"PO-0157", product:"LED Display Cabinet Light",  supplier:"Shenzhen LEDPro",      customer:"Northbound Outfitters", status:"delayed",  stage:"Production",      stageIdx:5,  eta:"May 18", depPaid:true,  balPaid:false, balOverdue:false, depAmt:5100,  balAmt:11900 },
  { id:"s3", po:"PO-0160", product:"Engineered Oak Flooring",    supplier:"Hangzhou Timber Co.",  customer:"Pioneer Goods Co.",     status:"on-track", stage:"QC Inspection",   stageIdx:6,  eta:"May 22", depPaid:true,  balPaid:false, balOverdue:false, depAmt:9300,  balAmt:21700 },
  { id:"s4", po:"PO-0165", product:"Chrome Retail Hanger",       supplier:"Tianjin Wire Works",   customer:"Marlowe & Sons",        status:"at-risk",  stage:"Ex-Factory",      stageIdx:7,  eta:"Jun 02", depPaid:true,  balPaid:false, balOverdue:false, depAmt:1620,  balAmt:3780  },
  { id:"s5", po:"PO-0168", product:"Powder-Coat Grid Panel",     supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"on-track", stage:"Factory Quotes",  stageIdx:1,  eta:"Jun 10", depPaid:false, balPaid:false, balOverdue:false, depAmt:2250,  balAmt:5250  },
  { id:"s6", po:"PO-0171", product:"Bamboo Serving Board",        supplier:"Hangzhou Timber Co.",  customer:"Pioneer Goods Co.",     status:"on-track", stage:"PO Issued",       stageIdx:4,  eta:"Jun 15", depPaid:true,  balPaid:false, balOverdue:false, depAmt:4200,  balAmt:9800  },
  { id:"s7", po:"PO-0175", product:"Matte Black Shelf Bracket",   supplier:"Guangzhou Metalworks", customer:"Marlowe & Sons",        status:"on-track", stage:"Sample Order",    stageIdx:2,  eta:"Jul 01", depPaid:true,  balPaid:false, balOverdue:false, depAmt:1800,  balAmt:4200  },
  { id:"s8", po:"PO-0178", product:"LED Strip Kit — 5m Warm",     supplier:"Shenzhen LEDPro",      customer:"Northbound Outfitters", status:"on-track", stage:"Spec Sheet",      stageIdx:0,  eta:"Jul 10", depPaid:false, balPaid:false, balOverdue:false, depAmt:3600,  balAmt:8400  },
];

const MSGS = [
  { id:"m1", sender:"Guangzhou Metalworks", ch:"whatsapp" as const, time:"10:42 AM", snippet:"Strike-off finish coat needs +2 days.", body:"Hi team, the sample approval finish coat needs +2 days. Our polishing line is backed up. Ex-Factory moves to May 17.", tags:["risk: delay 2d","milestone: sample approval"], po:"s1", draft:"Understood — proceed with the delay. We'll update ex-factory to May 17." },
  { id:"m2", sender:"Shenzhen LEDPro",      ch:"gmail"    as const, time:"Yesterday", snippet:"PCB soldering complete, entering housing assembly.", body:"Production update on PO-2026-0157. PCB soldering complete, now in housing assembly. On track for May 18. Balance $11,900 due before release.", tags:["milestone: production","payment: balance due"], po:"s2", draft:"Thanks — send QC photos before release. We'll arrange balance wire once inspection passes." },
  { id:"m3", sender:"Tianjin Wire Works",   ch:"whatsapp" as const, time:"Yesterday", snippet:"Port congestion — export delay 4 days.", body:"Major port congestion at Tianjin terminal. Export slot revised by 4 days. New ex-factory: June 6. Please notify Marlowe & Sons.", tags:["risk: port congestion","delay: 4d"], po:"s4", draft:"Understood. Please send revised packing schedule. We'll notify Marlowe & Sons." },
];

const statusPill = (s: ShipmentStatus) => s==="delayed"?"bg-red-50 text-red-600 border-red-100":s==="at-risk"?"bg-amber-50 text-amber-600 border-amber-100":"bg-emerald-50 text-emerald-600 border-emerald-100";
const statusLabel = (s: ShipmentStatus) => s==="delayed"?"Delayed":s==="at-risk"?"At Risk":"On Track";
type Ch = "whatsapp"|"gmail"|"pdf";
const chIcon = (ch: Ch, sz=10) => ch==="whatsapp"?<MessageCircle size={sz} className="text-emerald-500"/>:<Mail size={sz} className="text-blue-500"/>;

export function POVariantB() {
  const [activePO, setActivePO] = useState("s1");
  const [activeMsg, setActiveMsg] = useState("m1");
  const [tableExpanded, setTableExpanded] = useState(true);
  const [sortCol, setSortCol] = useState<keyof PO>("eta");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus|"all">("all");
  const [composeText, setComposeText] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());

  const sortedPOs = [...ALL_POS]
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .sort((a, b) => {
      const va = a[sortCol] ?? ""; const vb = b[sortCol] ?? "";
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSort = (col: keyof PO) => {
    if (sortCol === col) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: keyof PO }) =>
    sortCol === col ? (sortDir==="asc" ? <ChevronUp size={9}/> : <ChevronDown size={9}/>) : <ArrowUpDown size={9} className="opacity-30"/>;

  const selectedPO = ALL_POS.find(p => p.id === activePO)!;
  const visibleMsgs = MSGS.filter(m => m.po === activePO);
  const msg = MSGS.find(m => m.id === activeMsg) || MSGS[0];

  const COLS: { key: keyof PO; label: string; w: string }[] = [
    { key:"status",  label:"Status",   w:"w-[90px]" },
    { key:"po",      label:"PO #",     w:"w-[80px]" },
    { key:"product", label:"Product",  w:"flex-1"   },
    { key:"supplier",label:"Supplier", w:"w-[160px]"},
    { key:"stage",   label:"Stage",    w:"w-[130px]"},
    { key:"eta",     label:"ETA",      w:"w-[70px]" },
    { key:"depPaid", label:"30%",      w:"w-[52px]" },
    { key:"balPaid", label:"70%",      w:"w-[80px]" },
  ];

  const pct = (po: PO) => Math.round((po.stageIdx / (STAGES.length-1)) * 100);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#FAFBFC]" style={{fontFamily:"Inter,sans-serif",fontSize:13}}>
      {/* App header */}
      <div className="h-10 bg-white border-b border-[#E5EAF0] flex items-center px-4 gap-3 shrink-0">
        <div className="w-5 h-5 bg-[#9000FF] rounded flex items-center justify-center text-white font-bold text-[10px]">f</div>
        <span className="font-bold text-xs text-[#9000FF]">flowforge</span>
        <span className="text-[#E5EAF0]">/</span>
        <span className="text-xs text-[#5E687B] font-medium">Inbox</span>
        <div className="ml-auto flex items-center gap-2">
          {/* Status filter chips */}
          {(["all","on-track","at-risk","delayed"] as const).map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${statusFilter===s
                ? s==="all"?"bg-[#212833] text-white border-[#212833]":s==="on-track"?"bg-emerald-500 text-white border-emerald-500":s==="at-risk"?"bg-amber-500 text-white border-amber-500":"bg-red-500 text-white border-red-500"
                : "bg-white text-[#5E687B] border-[#E5EAF0]"}`}>
              {s==="all"?"All":s==="on-track"?"On Track":s==="at-risk"?"At Risk":"Delayed"}
            </button>
          ))}
          <button className="text-[9px] bg-[#9000FF] text-white px-2.5 py-1 rounded font-semibold flex items-center gap-1"><Plus size={9}/>New PO</button>
        </div>
      </div>

      {/* PO Table — collapsible */}
      <div className={`bg-white border-b border-[#E5EAF0] shrink-0 transition-all duration-300 overflow-hidden ${tableExpanded?"max-h-[320px]":"max-h-[36px]"}`}>
        {/* Table header / toggle bar */}
        <div className="flex items-center border-b border-[#E5EAF0] px-3 h-9 gap-3 sticky top-0 bg-white z-10">
          <button onClick={() => setTableExpanded(v=>!v)} className="flex items-center gap-1.5 text-[9px] font-bold text-[#5E687B] uppercase tracking-wider hover:text-[#212833] transition-colors">
            {tableExpanded ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
            Purchase Orders
            <span className="bg-[#9000FF] text-white text-[8px] px-1.5 rounded-full font-bold">{sortedPOs.length}</span>
          </button>
          <div className="text-[9px] text-[#9E9FAE]">Click headers to sort · click row to filter inbox</div>
        </div>

        {/* Column headers */}
        {tableExpanded && (
          <div className="overflow-y-auto max-h-[282px]">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-[#F7F9FA] border-b border-[#E5EAF0]">
                <tr>
                  {COLS.map(col=>(
                    <th key={col.key} onClick={()=>handleSort(col.key)} className={`${col.w} px-2.5 py-1.5 text-left font-bold text-[#5E687B] uppercase tracking-wider cursor-pointer hover:text-[#212833] transition-colors whitespace-nowrap`}>
                      <span className="flex items-center gap-1">{col.label}<SortIcon col={col.key}/></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPOs.map(po => {
                  const isActive = activePO === po.id;
                  return (
                    <tr key={po.id} onClick={() => { setActivePO(po.id); const m=MSGS.find(m=>m.po===po.id); if(m) setActiveMsg(m.id); }}
                      className={`border-b border-[#F0F4F8] cursor-pointer transition-colors ${isActive?"bg-[#FAFBFF]":"hover:bg-[#FAFBFC]"}`}>
                      <td className="px-2.5 py-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusPill(po.status)}`}>{statusLabel(po.status)}</span>
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-[9px] text-[#5E687B]">{po.po}</td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className={`font-semibold truncate max-w-[200px] ${isActive?"text-[#9000FF]":"text-[#212833]"}`}>{po.product}</span>
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-20 bg-[#F0F4F8] rounded-full overflow-hidden"><div className={`h-full rounded-full ${po.status==="delayed"?"bg-red-400":po.status==="at-risk"?"bg-amber-400":"bg-emerald-400"}`} style={{width:`${pct(po)}%`}}/></div>
                            <span className="text-[8px] text-[#9E9FAE]">{pct(po)}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5 text-[10px] text-[#5E687B] truncate max-w-[160px]">{po.supplier}</td>
                      <td className="px-2.5 py-1.5 text-[10px] text-[#5E687B] whitespace-nowrap">{po.stage}</td>
                      <td className="px-2.5 py-1.5 text-[10px] font-medium text-[#212833] whitespace-nowrap">{po.eta}</td>
                      <td className="px-2.5 py-1.5">
                        {po.depPaid ? <Check size={11} className="text-emerald-500"/> : <span className="text-[8px] text-[#9E9FAE]">—</span>}
                      </td>
                      <td className="px-2.5 py-1.5">
                        {po.balPaid ? <Check size={11} className="text-emerald-500"/> : po.balOverdue ? <span className="text-[8px] text-red-500 font-bold animate-pulse">OVERDUE</span> : <span className="text-[8px] text-[#9E9FAE]">pending</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2-col inbox below */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread list */}
        <div className="w-[260px] border-r border-[#E5EAF0] bg-white flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-[#E5EAF0] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-[#212833]">{selectedPO.po}</div>
              <div className="text-[9px] text-[#5E687B] truncate">{selectedPO.product}</div>
            </div>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusPill(selectedPO.status)}`}>{statusLabel(selectedPO.status)}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visibleMsgs.length===0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-[#9E9FAE]"><Mail size={20} className="opacity-30"/><p className="text-[10px]">No messages</p></div>
            ) : visibleMsgs.map(m=>(
              <div key={m.id} onClick={()=>setActiveMsg(m.id)}
                className={`p-3 border-b border-[#E5EAF0] cursor-pointer border-l-2 transition-all ${activeMsg===m.id?"border-l-[#9000FF] bg-[#FAFBFF]":"border-l-transparent hover:bg-[#FAFBFC]"}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-[10px] text-[#212833] truncate">{m.sender}</span>
                  {chIcon(m.ch)}
                  <span className="text-[8px] text-[#9E9FAE] ml-auto">{m.time}</span>
                </div>
                <p className="text-[10px] text-[#5E687B] line-clamp-2">{m.snippet}</p>
                <div className="flex gap-1 mt-1">{m.tags.map(t=><span key={t} className="text-[7px] bg-[#F0F4F8] border border-[#E5EAF0] px-1 rounded text-[#5E687B]">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Message detail */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="border-b border-[#E5EAF0] px-5 py-3 flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#F0F4F8] flex items-center justify-center text-xs font-bold text-[#5E687B]">{msg.sender.charAt(0)}</div>
            <div><div className="font-bold text-xs text-[#212833]">{msg.sender}</div><div className="text-[9px] text-[#5E687B] flex items-center gap-1">{chIcon(msg.ch,9)}{msg.time}</div></div>
            {sent.has(msg.id)&&<span className="ml-auto text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Check size={9}/>Replied</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4 text-[11px] text-[#212833] leading-relaxed">{msg.body}</div>
            <div className="border border-[#9000FF]/20 bg-[#9000FF]/5 rounded-xl p-3.5">
              <div className="text-[8px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Zap size={8}/>AI Suggested Reply</div>
              <div className="text-[10px] text-[#5E687B] leading-relaxed mb-3 font-mono">"{msg.draft}"</div>
              {!sent.has(msg.id)?(
                <div className="flex gap-2">
                  <button onClick={()=>{setSent(s=>new Set(s).add(msg.id));setComposeText("");}} className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-[9px] font-bold hover:bg-[#7A00D9] flex items-center gap-1"><Send size={9}/>Send & Update</button>
                  <button onClick={()=>setComposeText(msg.draft)} className="bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md text-[9px] font-medium hover:bg-[#F0F4F8]">Edit Draft</button>
                </div>
              ):<div className="text-emerald-600 text-[9px] font-semibold flex items-center gap-1"><Check size={10}/>Sent — stage advanced</div>}
            </div>
          </div>

          <div className="p-3 border-t border-[#E5EAF0] bg-white shrink-0">
            <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/30 transition-all">
              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)}
                placeholder="Reply..." className="w-full p-3 h-12 outline-none resize-none text-[11px] bg-transparent"/>
              <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
                <div className="flex gap-1 text-[#5E687B]"><button className="p-1 hover:bg-[#E5EAF0] rounded"><Paperclip size={12}/></button><button onClick={()=>setComposeText(msg.draft)} className="p-1 hover:bg-[#E5EAF0] rounded"><Sparkles size={12} className="text-[#9000FF]"/></button></div>
                <button onClick={()=>{if(composeText.trim()){setSent(s=>new Set(s).add(msg.id));setComposeText("");}}} className={`px-3 py-1.5 rounded-md text-[9px] font-bold flex items-center gap-1.5 ${composeText.trim()?"bg-[#212833] text-white":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>Reply <Send size={9}/></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
