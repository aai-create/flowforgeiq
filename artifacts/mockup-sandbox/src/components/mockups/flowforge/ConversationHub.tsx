import React, { useState } from "react";
import { 
  Mail, MessageCircle, Sheet, FileText, Sparkles, Wand2, Search, 
  Bell, ChevronDown, Check, AlertCircle, Clock, MoreHorizontal, 
  Paperclip, Send, ArrowRight, Home, Inbox, FileBox, Users, Settings, Filter,
  Tag, MapPin, Truck, Package, Box, LayoutGrid, MessagesSquare
} from "lucide-react";
import { Atelier } from "./Atelier";

type ViewMode = 'inbox' | 'command';

function ViewSwitcher({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  const [pos, setPos] = React.useState({ x: window.innerWidth - 320, y: window.innerHeight - 60 });
  const [dragging, setDragging] = React.useState(false);
  const offset = React.useRef({ x: 0, y: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - (ref.current?.offsetWidth ?? 240), e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - (ref.current?.offsetHeight ?? 40), e.clientY - offset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 50, userSelect: 'none' }}
      className="bg-white border border-[#E5EAF0] rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] p-1 flex items-center gap-0.5"
    >
      {/* drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="pl-2 pr-1 flex items-center cursor-grab active:cursor-grabbing text-[#C0C8D4] hover:text-[#9000FF] transition-colors"
        title="Drag to move"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="4" r="1.5"/><circle cx="9" cy="4" r="1.5"/>
          <circle cx="3" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/>
          <circle cx="3" cy="12" r="1.5"/><circle cx="9" cy="12" r="1.5"/>
        </svg>
      </div>
      <button
        onClick={() => setMode('inbox')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          mode === 'inbox' ? 'bg-[#9000FF] text-white shadow-sm' : 'text-[#5E687B] hover:text-[#212833]'
        }`}
      >
        <MessagesSquare size={13} />
        Conversation Hub
      </button>
      <button
        onClick={() => setMode('command')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          mode === 'command' ? 'bg-[#9000FF] text-white shadow-sm' : 'text-[#5E687B] hover:text-[#212833]'
        }`}
      >
        <LayoutGrid size={13} />
        Command Center
      </button>
    </div>
  );
}

// Types & Mock Data
type ShipmentStatus = 'on-track' | 'at-risk' | 'delayed';
type Channel = 'gmail' | 'whatsapp' | 'sheets' | 'pdf';

interface Shipment {
  id: string;
  po: string;
  product: string;
  supplier: string;
  customer: string;
  status: ShipmentStatus;
  currentStage: number;
  stages: string[];
  dueDate: string;
}

interface Message {
  id: string;
  sender: string;
  channel: Channel;
  timestamp: string;
  snippet: string;
  fullBody?: string;
  unread: boolean;
  aiTags: string[];
  shipmentId: string;
}

const STAGES = ['Tech Pack', 'Sample Request', 'Proto Sample', 'Fit Sample', 'PP Sample', 'Bulk', 'Inline QC', 'Final QC', 'Ex-Factory', 'Delivered'];

const SHIPMENTS: Shipment[] = [
  { id: 's1', po: 'PO-2026-0142', product: 'Heavyweight 14oz Selvedge Jean — Indigo', supplier: 'Lahore Denim Co.', customer: 'Vellum Studio', status: 'on-track', currentStage: 4, stages: STAGES, dueDate: 'May 15' },
  { id: 's2', po: 'PO-2026-0157', product: 'Organic Cotton Crewneck — Stone', supplier: 'Yangtze Knit Mills', customer: 'Northbound Outfitters', status: 'delayed', currentStage: 2, stages: STAGES, dueDate: 'May 18' },
  { id: 's3', po: 'PO-2026-0160', product: 'Merino Half-Zip — Forest', supplier: 'Porto Bordados', customer: 'Pioneer Goods Co.', status: 'on-track', currentStage: 6, stages: STAGES, dueDate: 'May 22' },
  { id: 's4', po: 'PO-2026-0165', product: 'Linen Camp Shirt — Ecru', supplier: 'Bali Atelier', customer: 'Marlowe & Sons', status: 'at-risk', currentStage: 7, stages: STAGES, dueDate: 'Jun 02' },
  { id: 's5', po: 'PO-2026-0168', product: 'French Terry Hoodie — Charcoal', supplier: 'Tirupur Jersey Works', customer: 'Vellum Studio', status: 'on-track', currentStage: 1, stages: STAGES, dueDate: 'Jun 10' },
];

const INBOX: Message[] = [
  { id: 'm1', sender: 'Lahore Denim Co.', channel: 'whatsapp', timestamp: '10:42 AM', snippet: 'Strike-off for placement print needs +2 days, mill backed up. Please advise if we can proceed with delay.', unread: true, aiTags: ['risk: delay 2d', 'milestone: strike-off'], shipmentId: 's1', fullBody: "Hi team, quick update from the floor. Strike-off for placement print needs +2 days, the mill is backed up with a massive local order. Please advise if we can proceed with the delay. If we push this, we might need to compress the Bulk phase or expedite shipping." },
  { id: 'm2', sender: 'Yangtze Knit Mills', channel: 'gmail', timestamp: 'Yesterday', snippet: 'Lab dip approved — proceeding to bulk dye lot Tuesday. HTS code confirmed as 6110.20.20.', unread: false, aiTags: ['milestone: PP sample', 'action: approved'], shipmentId: 's2', fullBody: "Hello,\n\nConfirming receipt of the approval for the Stone lab dip. We are proceeding to bulk dye lot this coming Tuesday. HTS code confirmed as 6110.20.20 for your import records.\n\nBest,\nWei" },
  { id: 'm3', sender: 'Bali Atelier', channel: 'whatsapp', timestamp: 'Yesterday', snippet: 'Hi! We need to push Bali shipment by 4 days — port congestion in Surabaya. Attaching revised schedule.', unread: true, aiTags: ['risk: port congestion', 'delay: 4d'], shipmentId: 's4', fullBody: "Hi! We need to push the Bali shipment by 4 days. Port congestion in Surabaya is causing massive container shortages. Attaching the revised Ex-Factory schedule. Let me know if Vellum Studio is okay with this." },
  { id: 'm4', sender: 'Costing Sheet Updates', channel: 'sheets', timestamp: 'Tue', snippet: 'Cell D14 changed: GSM adjusted to 420. BOM cost increased by $0.45/unit.', unread: false, aiTags: ['update: BOM', 'cost: +$0.45'], shipmentId: 's5', fullBody: "Automated update from Google Sheets:\nCell D14 changed: GSM adjusted to 420. BOM cost increased by $0.45/unit." },
  { id: 'm5', sender: 'Porto Bordados', channel: 'pdf', timestamp: 'Mon', snippet: 'AQL 2.5 inspection passed — 1247 units, 12 minor defects, 0 major. Ex-factory cleared for May 22.', unread: false, aiTags: ['milestone: Final QC', 'status: passed'], shipmentId: 's3', fullBody: "Please find attached the final QC report. AQL 2.5 inspection passed — 1247 units, 12 minor defects, 0 major. Ex-factory cleared for May 22. Goods are being palletized now." },
];

const SUPPLIERS = [
  { name: 'Lahore Denim Co.', count: 7 },
  { name: 'Yangtze Knit Mills', count: 3 },
  { name: 'Bali Atelier', count: 2 },
  { name: 'Porto Bordados', count: 1 },
];

export function ConversationHub() {
  const [activeMessageId, setActiveMessageId] = useState<string>('m1');
  const [aiBriefingExpanded, setAiBriefingExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');

  const activeMessage = INBOX.find(m => m.id === activeMessageId) || INBOX[0];
  const activeShipment = SHIPMENTS.find(s => s.id === activeMessage.shipmentId);

  if (viewMode === 'command') {
    return (
      <div className="relative h-screen w-full">
        <ViewSwitcher mode={viewMode} setMode={setViewMode} />
        <Atelier />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFBFC] text-[#212833] font-[Inter,sans-serif] overflow-hidden">
      <ViewSwitcher mode={viewMode} setMode={setViewMode} />
      
      {/* LEFT NAV RAIL */}
      <div className="w-[64px] bg-white border-r border-[#E5EAF0] flex flex-col items-center py-4 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="w-8 h-8 bg-[#9000FF] rounded-md flex items-center justify-center text-white font-bold text-lg mb-8 shadow-sm">
          f
        </div>
        <div className="flex flex-col gap-6 text-[#5E687B]">
          <button className="p-2 rounded-md hover:bg-[#F0F4F8] hover:text-[#212833] transition-colors"><Home size={20} /></button>
          <button className="p-2 rounded-md bg-[#F0F4F8] text-[#9000FF] transition-colors relative">
            <Inbox size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#9000FF] rounded-full border border-white"></span>
          </button>
          <button className="p-2 rounded-md hover:bg-[#F0F4F8] hover:text-[#212833] transition-colors"><FileBox size={20} /></button>
          <button className="p-2 rounded-md hover:bg-[#F0F4F8] hover:text-[#212833] transition-colors"><Users size={20} /></button>
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <button className="p-2 rounded-md hover:bg-[#F0F4F8] hover:text-[#212833] transition-colors"><Settings size={20} /></button>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-[#E5EAF0] overflow-hidden">
            <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR */}
        <div className="h-14 bg-white border-b border-[#E5EAF0] flex items-center justify-between px-6 shrink-0">
          <div className="font-semibold text-lg flex items-center gap-2">
            <span className="text-[#9000FF] tracking-tight">flowforge</span>
            <span className="text-[#E5EAF0]">/</span>
            <span className="text-sm font-medium text-[#5E687B]">Inbox</span>
          </div>
          
          {/* AI Command Bar Pill */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Sparkles size={16} className="text-[#9000FF]" />
              </div>
              <input 
                type="text" 
                placeholder="Ask FlowForge anything... or use natural language commands" 
                className="w-full pl-9 pr-10 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-sm text-[#212833] placeholder-[#5E687B] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <span className="text-[10px] font-medium text-[#5E687B] bg-white px-1.5 py-0.5 rounded border border-[#E5EAF0] shadow-sm">⌘K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#5E687B]">
            <button className="hover:text-[#212833] transition-colors"><Search size={18} /></button>
            <button className="hover:text-[#212833] transition-colors relative">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </div>

        {/* TOP STRIP: Milestone Timeline */}
        <div className="h-[140px] bg-white border-b border-[#E5EAF0] shrink-0 p-4 overflow-x-auto flex gap-4 hidden-scrollbar relative shadow-[0_4px_12px_rgba(0,0,0,0.02)] z-10">
          {SHIPMENTS.map((shipment) => (
            <div key={shipment.id} className="w-[320px] shrink-0 border border-[#E5EAF0] rounded-lg p-3 flex flex-col gap-3 bg-white hover:border-[#9000FF]/30 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-semibold text-[#212833] mb-0.5 group-hover:text-[#9000FF] transition-colors">{shipment.po}</div>
                  <div className="text-[10px] text-[#5E687B] truncate w-[200px]">{shipment.product}</div>
                </div>
                <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  shipment.status === 'on-track' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  shipment.status === 'delayed' ? 'bg-red-50 text-red-700 border-red-100' :
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {shipment.status === 'delayed' && <AlertCircle size={10} />}
                  {shipment.status === 'at-risk' && <Clock size={10} />}
                  {shipment.status === 'on-track' && <Check size={10} />}
                  {shipment.dueDate}
                </div>
              </div>

              {/* Mini Timeline Track */}
              <div className="mt-1">
                <div className="flex items-center justify-between text-[9px] text-[#5E687B] mb-1.5 font-medium uppercase tracking-wider">
                  <span>{shipment.stages[shipment.currentStage]}</span>
                  <span>{Math.round((shipment.currentStage / (shipment.stages.length - 1)) * 100)}%</span>
                </div>
                <div className="flex gap-0.5 h-1.5">
                  {shipment.stages.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`flex-1 rounded-full ${
                        idx < shipment.currentStage ? (shipment.status === 'delayed' ? 'bg-red-400' : shipment.status === 'at-risk' ? 'bg-amber-400' : 'bg-emerald-400') :
                        idx === shipment.currentStage ? (shipment.status === 'delayed' ? 'bg-red-500 animate-pulse' : shipment.status === 'at-risk' ? 'bg-amber-500 animate-pulse' : 'bg-[#9000FF]') :
                        'bg-[#E5EAF0]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MIDDLE: 3-Column Inbox */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Col 1: Filters & Suppliers */}
          <div className="w-[240px] bg-[#FAFBFC] border-r border-[#E5EAF0] flex flex-col shrink-0">
            <div className="p-4 border-b border-[#E5EAF0]">
              <div className="text-xs font-semibold text-[#5E687B] uppercase tracking-wider mb-3">Channels</div>
              <div className="flex flex-col gap-1">
                <button className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white border border-[#E5EAF0] text-sm font-medium text-[#212833] shadow-sm">
                  <span className="flex items-center gap-2"><Inbox size={14} className="text-[#5E687B]" /> All Inbox</span>
                  <span className="text-xs bg-[#F0F4F8] px-1.5 rounded text-[#5E687B]">12</span>
                </button>
                <button className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F0F4F8] text-sm text-[#5E687B] transition-colors">
                  <span className="flex items-center gap-2"><Mail size={14} /> Gmail</span>
                  <span className="text-xs text-[#5E687B]">5</span>
                </button>
                <button className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F0F4F8] text-sm text-[#5E687B] transition-colors">
                  <span className="flex items-center gap-2"><MessageCircle size={14} /> WhatsApp</span>
                  <span className="text-xs bg-[#9000FF]/10 text-[#9000FF] px-1.5 rounded font-medium">4</span>
                </button>
                <button className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F0F4F8] text-sm text-[#5E687B] transition-colors">
                  <span className="flex items-center gap-2"><Sheet size={14} /> Sheets</span>
                  <span className="text-xs text-[#5E687B]">2</span>
                </button>
                <button className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F0F4F8] text-sm text-[#5E687B] transition-colors">
                  <span className="flex items-center gap-2"><FileText size={14} /> PDFs</span>
                  <span className="text-xs text-[#5E687B]">1</span>
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto hidden-scrollbar">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#5E687B] uppercase tracking-wider">Suppliers</div>
                <button className="text-[#5E687B] hover:text-[#212833]"><Filter size={12} /></button>
              </div>
              <div className="flex flex-col gap-1">
                {SUPPLIERS.map(s => (
                  <button key={s.name} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F0F4F8] text-sm text-[#212833] transition-colors group">
                    <span className="truncate pr-2">{s.name}</span>
                    <span className="text-[10px] bg-white border border-[#E5EAF0] px-1.5 rounded text-[#5E687B] group-hover:border-[#D6E3EB]">{s.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Col 2: Thread List */}
          <div className="flex-1 min-w-[320px] bg-white border-r border-[#E5EAF0] flex flex-col">
            <div className="h-12 border-b border-[#E5EAF0] px-4 flex items-center justify-between bg-white shrink-0">
              <div className="font-medium text-sm">Focused</div>
              <div className="flex items-center gap-2 text-[#5E687B]">
                <button className="p-1 hover:bg-[#F0F4F8] rounded"><Check size={16} /></button>
                <button className="p-1 hover:bg-[#F0F4F8] rounded"><MoreHorizontal size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto hidden-scrollbar">
              {INBOX.map(msg => (
                <div 
                  key={msg.id} 
                  onClick={() => setActiveMessageId(msg.id)}
                  className={`p-4 border-b border-[#E5EAF0] cursor-pointer hover:bg-[#FAFBFC] transition-colors relative ${activeMessageId === msg.id ? 'bg-[#FAFBFC] border-l-2 border-l-[#9000FF]' : 'border-l-2 border-l-transparent'}`}
                >
                  {msg.unread && <div className="absolute left-3 top-5 w-2 h-2 bg-[#9000FF] rounded-full"></div>}
                  <div className="flex items-start justify-between mb-1 pl-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#212833]">{msg.sender}</span>
                      {msg.channel === 'whatsapp' && <MessageCircle size={12} className="text-emerald-500" />}
                      {msg.channel === 'gmail' && <Mail size={12} className="text-blue-500" />}
                      {msg.channel === 'sheets' && <Sheet size={12} className="text-green-600" />}
                      {msg.channel === 'pdf' && <FileText size={12} className="text-red-500" />}
                    </div>
                    <span className={`text-xs ${msg.unread ? 'text-[#9000FF] font-medium' : 'text-[#5E687B]'}`}>{msg.timestamp}</span>
                  </div>
                  <div className={`text-sm pl-4 mb-2 line-clamp-2 ${msg.unread ? 'text-[#212833] font-medium' : 'text-[#5E687B]'}`}>
                    {msg.snippet}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-4">
                    {msg.aiTags.map(tag => (
                      <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] flex items-center gap-1">
                        {tag.startsWith('risk') || tag.startsWith('delay') ? <AlertCircle size={8} className="text-red-500" /> : <Sparkles size={8} className="text-[#9000FF]" />}
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 3: Expanded Thread & Context */}
          <div className="w-[480px] bg-white flex flex-col shrink-0">
            {/* Context Panel - Upper section */}
            {activeShipment && (
              <div className="border-b border-[#E5EAF0] p-5 bg-[#FAFBFC]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#212833]">{activeShipment.po}</span>
                      <span className="text-xs bg-[#E5EAF0] text-[#5E687B] px-1.5 rounded">{activeShipment.customer}</span>
                    </div>
                    <div className="text-sm text-[#5E687B]">{activeShipment.product}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-[#5E687B] uppercase tracking-wider mb-1">Target</div>
                    <div className="text-sm font-semibold text-[#212833]">{activeShipment.dueDate}</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-[#E5EAF0] shadow-sm">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-[#212833] flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#9000FF]" /> {activeShipment.stages[activeShipment.currentStage]}
                    </span>
                    <span className="text-[#5E687B]">{Math.round((activeShipment.currentStage / (activeShipment.stages.length - 1)) * 100)}% Complete</span>
                  </div>
                  <div className="w-full bg-[#F0F4F8] rounded-full h-1.5">
                    <div 
                      className="bg-[#9000FF] h-1.5 rounded-full transition-all" 
                      style={{ width: `${(activeShipment.currentStage / (activeShipment.stages.length - 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-[#5E687B]">
                  {activeMessage.sender.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-[#212833]">{activeMessage.sender}</div>
                  <div className="text-xs text-[#5E687B]">via {activeMessage.channel === 'whatsapp' ? 'WhatsApp' : activeMessage.channel === 'gmail' ? 'Gmail' : 'System'} • {activeMessage.timestamp}</div>
                </div>
              </div>

              <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-6">
                <div className="text-sm text-[#212833] whitespace-pre-wrap leading-relaxed">
                  {activeMessage.fullBody}
                </div>
              </div>

              {/* AI Assistant Inline */}
              <div className="bg-gradient-to-r from-[#9000FF]/5 to-transparent border border-[#9000FF]/20 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#9000FF]/10 rounded-full blur-xl"></div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="mt-0.5 text-[#9000FF]"><Wand2 size={16} /></div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#9000FF] uppercase tracking-wider mb-1">AI Suggested Action</div>
                    <div className="text-sm text-[#212833] mb-3">
                      {activeMessage.aiTags.some(t => t.includes('delay')) 
                        ? "Draft reply to approve delay and automatically update PO-2026-0142 timeline?" 
                        : "Acknowledge update and log milestone to timeline?"}
                    </div>
                    <div className="bg-white border border-[#E5EAF0] rounded-lg p-3 text-sm text-[#5E687B] mb-3 font-mono text-xs">
                      "Understood. Please proceed. Updating our timeline to reflect the new schedule."
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#7A00D9] transition-colors flex items-center gap-1.5 shadow-sm">
                        <Send size={14} /> Send & Update
                      </button>
                      <button className="bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#F0F4F8] transition-colors">
                        Edit Draft
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compose Area */}
            <div className="p-4 border-t border-[#E5EAF0] bg-white">
              <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/50 focus-within:ring-1 focus-within:ring-[#9000FF]/20 transition-all">
                <textarea 
                  placeholder="Reply to supplier..." 
                  className="w-full p-3 h-20 outline-none resize-none text-sm bg-transparent"
                ></textarea>
                <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
                  <div className="flex gap-1 text-[#5E687B]">
                    <button className="p-1.5 hover:bg-[#E5EAF0] rounded transition-colors"><Paperclip size={16} /></button>
                    <button className="p-1.5 hover:bg-[#E5EAF0] rounded transition-colors"><Sparkles size={16} /></button>
                  </div>
                  <button className="bg-[#212833] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-black transition-colors flex items-center gap-1.5 shadow-sm">
                    Reply <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Floating AI Briefing Card */}
      <div className={`fixed bottom-6 right-6 w-[340px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5EAF0] overflow-hidden transition-all duration-300 z-50 flex flex-col ${aiBriefingExpanded ? 'h-[400px]' : 'h-[64px]'}`}>
        <div 
          className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-[#9000FF]/5 to-transparent border-b border-transparent hover:bg-[#FAFBFC] transition-colors shrink-0"
          onClick={() => setAiBriefingExpanded(!aiBriefingExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF]">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#212833]">Daily Briefing</div>
              {!aiBriefingExpanded && <div className="text-xs text-[#5E687B]">4 suppliers need decisions</div>}
            </div>
          </div>
          <button className="text-[#5E687B] p-1 hover:bg-[#E5EAF0] rounded-full transition-colors">
            {aiBriefingExpanded ? <ChevronDown size={16} /> : <ChevronDown size={16} className="rotate-180" />}
          </button>
        </div>
        
        {aiBriefingExpanded && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#FAFBFC]">
            <div className="text-xs font-semibold text-[#5E687B] uppercase tracking-wider">Action Items</div>
            
            <div className="bg-white border border-[#E5EAF0] rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm font-medium text-[#212833]">Lahore Denim Co. delay</div>
              </div>
              <div className="text-xs text-[#5E687B] mb-3">Strike-off delayed by 2 days. Pushes PO-2026-0142 Ex-Factory to May 17.</div>
              <button className="w-full py-1.5 bg-[#F0F4F8] hover:bg-[#E5EAF0] text-[#212833] text-xs font-medium rounded transition-colors">Approve Schedule Change</button>
            </div>

            <div className="bg-white border border-[#E5EAF0] rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-sm font-medium text-[#212833]">Yangtze Knit lab dip</div>
              </div>
              <div className="text-xs text-[#5E687B] mb-3">Lab dip approved. Ready to move PO-2026-0157 to Bulk phase.</div>
              <button className="w-full py-1.5 bg-[#F0F4F8] hover:bg-[#E5EAF0] text-[#212833] text-xs font-medium rounded transition-colors">Log Milestone to Tracker</button>
            </div>

            <div className="mt-2 text-center">
              <button className="text-xs text-[#9000FF] font-medium hover:underline flex items-center justify-center gap-1 mx-auto">
                View all 4 items <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
