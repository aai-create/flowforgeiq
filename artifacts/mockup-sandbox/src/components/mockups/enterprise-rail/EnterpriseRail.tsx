import React from 'react';
import { 
  Menu, Search, MessageCircle, Package, ShieldAlert, AlertTriangle, BarChart3, Grid2x2, MoreHorizontal,
  ChevronRight, Plus, Check, Clock, AlertCircle, FileText, Calendar, Users, Briefcase, 
  User, ChevronDown, CheckCircle2, ArrowRight, X, Filter
} from 'lucide-react';

const COLORS = {
  purple: '#9000FF',
  charcoal: '#212833',
  muted: '#5E687B',
  border: '#E5EAF0',
  bg: '#FAFBFC',
  card: '#FFFFFF',
};

// --- Shared Components ---

const PhoneFrame = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <div className="flex flex-col items-center">
    <div className="text-[#5E687B] text-sm font-medium tracking-wide mb-4 uppercase">{title}</div>
    <div 
      className="relative w-[375px] h-[812px] bg-[#FAFBFC] rounded-[44px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-[10px] border-[#1C1C1E] flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Top Status Bar Mock */}
      <div className="h-11 w-full bg-transparent flex justify-between items-center px-6 pt-2 z-50 absolute top-0 left-0">
        <span className="text-[14px] font-medium text-[#212833]">9:41</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-3 flex items-end space-x-[2px]">
            <div className="w-[3px] h-[4px] bg-[#212833] rounded-sm"></div>
            <div className="w-[3px] h-[6px] bg-[#212833] rounded-sm"></div>
            <div className="w-[3px] h-[8px] bg-[#212833] rounded-sm"></div>
            <div className="w-[3px] h-[10px] bg-[#212833] rounded-sm"></div>
          </div>
          <div className="w-4 h-3 flex items-center justify-center">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="text-[#212833]">
              <path d="M8 12c-2.485 0-4.5-2.015-4.5-4.5S5.515 3 8 3s4.5 2.015 4.5 4.5S10.485 12 8 12zM8 4.5C6.619 4.5 5.5 5.619 5.5 7s1.119 2.5 2.5 2.5 2.5-1.119 2.5-2.5S9.381 4.5 8 4.5z"/>
            </svg>
          </div>
          <div className="w-[22px] h-[11px] border border-[#212833] rounded-[4px] p-[1px] relative">
            <div className="bg-[#212833] h-full w-[80%] rounded-[2px]"></div>
            <div className="absolute right-[-4px] top-[3px] w-[2px] h-[3px] bg-[#212833] rounded-r-[1px]"></div>
          </div>
        </div>
      </div>
      
      {/* Safe Area Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1C1C1E] rounded-b-[20px] z-[51]"></div>

      {/* Screen Content */}
      <div className="flex-1 w-full h-full relative pt-11 flex flex-col pb-[83px] overflow-y-auto overflow-x-hidden no-scrollbar">
        {children}
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-0 left-0 w-full h-[34px] flex items-center justify-center z-[60]">
        <div className="w-[134px] h-[5px] bg-[#1C1C1E] rounded-full"></div>
      </div>
    </div>
  </div>
);

const BottomTabs = ({ active = 'Inbox' }: { active?: string }) => {
  const tabs = [
    { name: 'Inbox', icon: <MessageCircle size={24} /> },
    { name: 'Orders', icon: <Package size={24} /> },
    { name: 'Risk', icon: <ShieldAlert size={24} /> },
    { name: 'Reports', icon: <BarChart3 size={24} /> },
    { name: 'More', icon: <Grid2x2 size={24} /> },
  ];

  return (
    <div className="absolute bottom-0 left-0 w-full h-[83px] bg-[#FFFFFF] border-t border-[#E5EAF0] flex justify-around items-start pt-3 z-50 px-2 pb-[34px]">
      {tabs.map((tab) => (
        <div key={tab.name} className="flex flex-col items-center justify-center space-y-1 w-[60px]">
          <div className={`${active === tab.name ? 'text-[#9000FF]' : 'text-[#5E687B]'}`}>
            {tab.icon}
          </div>
          <span className={`text-[10px] font-medium ${active === tab.name ? 'text-[#9000FF]' : 'text-[#5E687B]'}`}>
            {tab.name}
          </span>
        </div>
      ))}
    </div>
  );
};

const FAB = () => (
  <button className="absolute bottom-[100px] right-4 w-14 h-14 bg-[#9000FF] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#7a00d9] z-40">
    <Plus size={24} />
  </button>
);

const Header = ({ title, leftIcon = <Menu size={20} />, rightIcon = <Search size={20} /> }: any) => (
  <div className="px-4 py-3 flex items-center justify-between bg-[#FAFBFC] sticky top-0 z-30">
    <button className="text-[#212833] w-10 h-10 flex items-center justify-start">{leftIcon}</button>
    <h1 className="text-[17px] font-semibold text-[#212833]">{title}</h1>
    <button className="text-[#212833] w-10 h-10 flex items-center justify-end">{rightIcon}</button>
  </div>
);


// --- Screens ---

// Screen 1: Inbox
const InboxScreen = () => {
  const threads = [
    { id: 1, supplier: 'Atelier Milano', shipment: 'PO-2481', snippet: 'Can we confirm the revised ETA for...', time: '10:42 AM', unread: 2, avatar: 'AM' },
    { id: 2, supplier: 'TexTech Shenzhen', shipment: 'PO-2485', snippet: 'The QC report has been attached to the file.', time: 'Yesterday', unread: 0, avatar: 'TS' },
    { id: 3, supplier: 'Velluto Roma', shipment: 'PO-2490', snippet: 'Payment received. Shipping out tomorrow.', time: 'Tuesday', unread: 1, avatar: 'VR' },
    { id: 4, supplier: 'Istanbul Weaves', shipment: 'PO-2510', snippet: 'Awaiting customs clearance documentation.', time: 'Monday', unread: 0, avatar: 'IW' },
    { id: 5, supplier: 'Mumbai Textiles', shipment: 'PO-2512', snippet: 'Samples are ready for review. Please check.', time: 'Apr 12', unread: 0, avatar: 'MT' },
    { id: 6, supplier: 'Lima Cottons', shipment: 'PO-2520', snippet: 'Delay due to port congestion, revising ETA.', time: 'Apr 10', unread: 5, avatar: 'LC' },
  ];

  return (
    <>
      <Header title="Inbox" />
      <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar mb-2">
        <button className="px-4 py-1.5 bg-[#212833] text-white rounded-full text-[13px] font-medium whitespace-nowrap">All Messages</button>
        <button className="px-4 py-1.5 bg-[#FFFFFF] border border-[#E5EAF0] text-[#5E687B] rounded-full text-[13px] font-medium whitespace-nowrap">Unread (8)</button>
        <button className="px-4 py-1.5 bg-[#FFFFFF] border border-[#E5EAF0] text-[#5E687B] rounded-full text-[13px] font-medium whitespace-nowrap">Critical</button>
      </div>
      <div className="flex-1 flex flex-col px-4 space-y-3 pb-24">
        {threads.map((t) => (
          <div key={t.id} className={`flex items-start p-3 bg-[#FFFFFF] rounded-xl border ${t.unread > 0 ? 'border-[#9000FF]/20 shadow-[0_2px_8px_rgba(144,0,255,0.05)]' : 'border-[#E5EAF0]'}`}>
            <div className="w-10 h-10 rounded-full bg-[#E5EAF0] text-[#5E687B] flex items-center justify-center font-medium text-[13px] shrink-0 mr-3">
              {t.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className={`text-[15px] font-semibold truncate pr-2 ${t.unread > 0 ? 'text-[#212833]' : 'text-[#212833]'}`}>{t.supplier}</h3>
                <span className={`text-[12px] shrink-0 ${t.unread > 0 ? 'text-[#9000FF] font-medium' : 'text-[#5E687B]'}`}>{t.time}</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[12px] font-medium text-[#212833] bg-[#FAFBFC] border border-[#E5EAF0] px-1.5 py-0.5 rounded">{t.shipment}</span>
              </div>
              <p className={`text-[13px] truncate ${t.unread > 0 ? 'text-[#212833] font-medium' : 'text-[#5E687B]'}`}>
                {t.snippet}
              </p>
            </div>
            {t.unread > 0 && (
              <div className="ml-2 mt-6 w-[18px] h-[18px] rounded-full bg-[#9000FF] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {t.unread}
              </div>
            )}
          </div>
        ))}
      </div>
      <FAB />
      <BottomTabs active="Inbox" />
    </>
  );
};


// Screen 2: Navigation Drawer
const DrawerScreen = () => {
  return (
    <div className="w-full h-full relative bg-[#FAFBFC]">
      {/* Background Dimmed Inbox */}
      <div className="absolute inset-0 opacity-40 pointer-events-none filter blur-[1px]">
        <Header title="Inbox" />
        <div className="px-4 py-2 flex space-x-2">
          <div className="px-4 py-1.5 bg-[#212833] text-white rounded-full text-[13px] font-medium">All Messages</div>
        </div>
        <div className="px-4 mt-2">
          <div className="h-20 bg-white border border-[#E5EAF0] rounded-xl mb-3"></div>
          <div className="h-20 bg-white border border-[#E5EAF0] rounded-xl mb-3"></div>
          <div className="h-20 bg-white border border-[#E5EAF0] rounded-xl mb-3"></div>
        </div>
      </div>

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-[#212833]/40 z-40"></div>

      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 w-[280px] bg-[#FFFFFF] z-50 shadow-2xl flex flex-col py-12 pb-[34px]">
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#9000FF] rounded flex items-center justify-center">
              <span className="text-white font-bold text-[12px]">F</span>
            </div>
            <span className="text-[18px] font-bold tracking-tight text-[#212833]">FlowForge<span className="text-[#9000FF]">IQ</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="mb-6">
            <h4 className="px-6 text-[11px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Workspace</h4>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9000FF] rounded-r"></div>
              <div className="flex items-center px-6 py-2.5 bg-[#9000FF]/5 text-[#9000FF] font-medium">
                 <MessageCircle size={18} className="mr-3" />
                <span className="text-[14px]">Inbox</span>
                <div className="ml-auto bg-[#9000FF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</div>
              </div>
            </div>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <Package size={18} className="mr-3" />
              <span className="text-[14px]">Orders</span>
            </div>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <ShieldAlert size={18} className="mr-3" />
              <span className="text-[14px]">Risk Radar</span>
            </div>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <FileText size={18} className="mr-3" />
              <span className="text-[14px]">RFQs</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="px-6 text-[11px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Analytics</h4>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <BarChart3 size={18} className="mr-3" />
              <span className="text-[14px]">Reports</span>
            </div>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <Briefcase size={18} className="mr-3" />
              <span className="text-[14px]">Pipeline</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="px-6 text-[11px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Directory</h4>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <Users size={18} className="mr-3" />
              <span className="text-[14px]">Suppliers</span>
            </div>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <User size={18} className="mr-3" />
              <span className="text-[14px]">Buyers</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="px-6 text-[11px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Tools</h4>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <Calendar size={18} className="mr-3" />
              <span className="text-[14px]">Calendar</span>
            </div>
            <div className="flex items-center px-6 py-2.5 text-[#5E687B] hover:text-[#212833] font-medium">
              <CheckCircle2 size={18} className="mr-3" />
              <span className="text-[14px]">Tasks</span>
            </div>
          </div>
        </div>

        <div className="px-6 mt-auto border-t border-[#E5EAF0] pt-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#212833] rounded-full text-white flex items-center justify-center text-[12px] font-bold mr-3">EM</div>
            <div>
              <div className="text-[13px] font-semibold text-[#212833]">Elena Montes</div>
              <div className="text-[11px] text-[#5E687B]">Global Sourcing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// Screen 3: Risk Radar
const RiskScreen = () => {
  const risks = [
    { id: 'PO-2481', supplier: 'TexTech Shenzhen', score: 85, reason: 'Port congestion & delayed vessel', date: 'Oct 12' },
    { id: 'PO-2490', supplier: 'Atelier Milano', score: 62, reason: 'Raw material shortage (Silk)', date: 'Oct 15' },
    { id: 'PO-2510', supplier: 'Lima Cottons', score: 45, reason: 'Weather warning at origin', date: 'Oct 18' },
    { id: 'PO-2512', supplier: 'Istanbul Weaves', score: 28, reason: 'Minor documentation delay', date: 'Oct 20' },
    { id: 'PO-2520', supplier: 'Mumbai Textiles', score: 15, reason: 'On track', date: 'Oct 22' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20';
    if (score >= 30) return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20';
    return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20';
  };

  return (
    <>
      <Header title="Risk Radar" rightIcon={<Filter size={20} />} />
      <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar mb-2">
        <button className="px-4 py-1.5 bg-[#212833] text-white rounded-full text-[13px] font-medium whitespace-nowrap">All Risks</button>
        <button className="px-4 py-1.5 bg-[#FFFFFF] border border-[#E5EAF0] text-[#5E687B] rounded-full text-[13px] font-medium whitespace-nowrap">High ({'>'}70)</button>
        <button className="px-4 py-1.5 bg-[#FFFFFF] border border-[#E5EAF0] text-[#5E687B] rounded-full text-[13px] font-medium whitespace-nowrap">Medium</button>
      </div>
      
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-[#5E687B] uppercase tracking-wider">Active Shipments</h2>
        <span className="text-[12px] text-[#5E687B]">Sorted by Score</span>
      </div>

      <div className="flex-1 flex flex-col px-4 space-y-3 pb-24">
        {risks.map((r) => (
          <div key={r.id} className="p-4 bg-[#FFFFFF] rounded-xl border border-[#E5EAF0] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[14px] font-bold text-[#212833]">{r.id}</span>
                  <span className="text-[13px] text-[#5E687B]">• {r.supplier}</span>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-full border text-[12px] font-bold flex items-center space-x-1 ${getScoreColor(r.score)}`}>
                <span>{r.score}</span>
              </div>
            </div>
            <div className="flex items-start space-x-2 mt-2">
              <AlertCircle size={16} className={r.score >= 70 ? 'text-[#ef4444]' : (r.score >= 30 ? 'text-[#f59e0b]' : 'text-[#10b981]')} />
              <p className="text-[13px] text-[#212833]">{r.reason}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#E5EAF0] flex justify-between items-center">
              <span className="text-[12px] text-[#5E687B]">ETA: {r.date}</span>
              <button className="text-[#9000FF] text-[13px] font-medium flex items-center">
                Review <ChevronRight size={14} className="ml-0.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <FAB />
      <BottomTabs active="Risk" />
    </>
  );
};


// Screen 4: Order Detail
const OrderDetailScreen = () => {
  return (
    <div className="flex-1 flex flex-col bg-[#FAFBFC] pb-[83px]">
      <div className="bg-[#FFFFFF] px-4 py-3 flex items-center sticky top-0 z-30 border-b border-[#E5EAF0]">
        <button className="text-[#212833] w-10 h-10 flex items-center justify-start"><ChevronRight className="rotate-180" size={24} /></button>
        <div className="flex-1 text-center">
          <h1 className="text-[17px] font-bold text-[#212833]">PO-2481</h1>
          <p className="text-[12px] text-[#5E687B]">Atelier Milano</p>
        </div>
        <button className="text-[#212833] w-10 h-10 flex items-center justify-end"><MoreHorizontal size={24} /></button>
      </div>

      <div className="p-4">
        {/* Timeline */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5EAF0] p-5 mb-4 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#212833] mb-4">Stage Tracking</h3>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#E5EAF0]"></div>
            <div className="absolute left-[11px] top-2 h-[45%] w-0.5 bg-[#9000FF]"></div>
            
            <div className="flex items-start mb-4 relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#9000FF] flex items-center justify-center shrink-0 border-[3px] border-white ring-1 ring-[#E5EAF0]">
                <Check size={12} className="text-white" />
              </div>
              <div className="ml-3 mt-0.5">
                <h4 className="text-[13px] font-bold text-[#212833]">Production Finished</h4>
                <p className="text-[12px] text-[#5E687B]">Oct 10, 14:00</p>
              </div>
            </div>

            <div className="flex items-start mb-4 relative z-10">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-[#9000FF]">
                <div className="w-2 h-2 bg-[#9000FF] rounded-full"></div>
              </div>
              <div className="ml-3 mt-0.5">
                <h4 className="text-[13px] font-bold text-[#9000FF]">Customs Clearance</h4>
                <p className="text-[12px] text-[#5E687B]">In progress • Genoa Port</p>
              </div>
            </div>

            <div className="flex items-start relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#FAFBFC] flex items-center justify-center shrink-0 border border-[#E5EAF0]">
              </div>
              <div className="ml-3 mt-0.5">
                <h4 className="text-[13px] font-medium text-[#5E687B]">Arrival at Destination</h4>
                <p className="text-[12px] text-[#5E687B]">Est. Oct 18</p>
              </div>
            </div>
          </div>
        </div>

        {/* Facts */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E5EAF0] p-3 shadow-sm">
            <p className="text-[12px] text-[#5E687B] mb-1">Total Value</p>
            <p className="text-[16px] font-bold text-[#212833]">$124,500</p>
          </div>
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E5EAF0] p-3 shadow-sm">
            <p className="text-[12px] text-[#5E687B] mb-1">Incoterms</p>
            <p className="text-[16px] font-bold text-[#212833]">FOB Genoa</p>
          </div>
        </div>

        {/* Horizontal Scroll Dense Data */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5EAF0] overflow-hidden shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-[#E5EAF0] bg-[#FAFBFC]">
            <h3 className="text-[14px] font-bold text-[#212833]">Line Items</h3>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-[500px] text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[11px] text-[#5E687B] uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">Material</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                <tr className="border-b border-[#E5EAF0]">
                  <td className="px-4 py-3 text-[#212833] font-medium">Silk Charmeuse (Navy)</td>
                  <td className="px-4 py-3 text-right text-[#5E687B]">1,200 m</td>
                  <td className="px-4 py-3 text-right text-[#5E687B]">$45.00</td>
                  <td className="px-4 py-3 text-right text-[#212833] font-medium">$54,000</td>
                </tr>
                <tr className="border-b border-[#E5EAF0]">
                  <td className="px-4 py-3 text-[#212833] font-medium">Wool Crepe (Black)</td>
                  <td className="px-4 py-3 text-right text-[#5E687B]">800 m</td>
                  <td className="px-4 py-3 text-right text-[#5E687B]">$35.00</td>
                  <td className="px-4 py-3 text-right text-[#212833] font-medium">$28,000</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#212833] font-medium">Cotton Poplin (White)</td>
                  <td className="px-4 py-3 text-right text-[#5E687B]">2,500 m</td>
                  <td className="px-4 py-3 text-right text-[#5E687B]">$17.00</td>
                  <td className="px-4 py-3 text-right text-[#212833] font-medium">$42,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button className="flex-1 py-3 bg-[#FFFFFF] border border-[#E5EAF0] text-[#212833] font-bold text-[14px] rounded-xl shadow-sm">
            View Docs
          </button>
          <button className="flex-1 py-3 bg-[#9000FF] text-white font-bold text-[14px] rounded-xl shadow-sm">
            Message
          </button>
        </div>
      </div>
      <BottomTabs active="Orders" />
    </div>
  );
};


// Screen 5: Reports
const ReportsScreen = () => {
  return (
    <>
      <Header title="Reports" />
      <div className="px-4 pt-1 pb-4 flex space-x-6 border-b border-[#E5EAF0] bg-[#FAFBFC] sticky top-[64px] z-20 overflow-x-auto no-scrollbar">
        <button className="text-[14px] font-bold text-[#9000FF] border-b-2 border-[#9000FF] pb-2 whitespace-nowrap">Overview</button>
        <button className="text-[14px] font-medium text-[#5E687B] pb-2 whitespace-nowrap">Supplier Performance</button>
        <button className="text-[14px] font-medium text-[#5E687B] pb-2 whitespace-nowrap">Spend Analysis</button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-24">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5EAF0] shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#9000FF]/10 text-[#9000FF] flex items-center justify-center mb-3">
              <span className="font-bold">$</span>
            </div>
            <p className="text-[12px] text-[#5E687B] mb-1">Committed Spend</p>
            <p className="text-[18px] font-bold text-[#212833]">$2.48M</p>
            <p className="text-[11px] text-[#10b981] mt-1 flex items-center font-medium">↑ 12% vs last qtr</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5EAF0] shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#212833]/10 text-[#212833] flex items-center justify-center mb-3">
               <Package size={16} />
            </div>
            <p className="text-[12px] text-[#5E687B] mb-1">Active POs</p>
            <p className="text-[18px] font-bold text-[#212833]">86</p>
            <p className="text-[11px] text-[#5E687B] mt-1 font-medium">Across 14 suppliers</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5EAF0] shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center mb-3">
              <AlertTriangle size={16} />
            </div>
            <p className="text-[12px] text-[#5E687B] mb-1">POs at Risk</p>
            <p className="text-[18px] font-bold text-[#212833]">12</p>
            <p className="text-[11px] text-[#ef4444] mt-1 flex items-center font-medium">↑ 3 this week</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5EAF0] shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 text-[#10b981] flex items-center justify-center mb-3">
              <Clock size={16} />
            </div>
            <p className="text-[12px] text-[#5E687B] mb-1">On-Time Rate</p>
            <p className="text-[18px] font-bold text-[#212833]">94.2%</p>
            <p className="text-[11px] text-[#5E687B] mt-1 font-medium">Target: 95.0%</p>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5EAF0] p-4 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[14px] font-bold text-[#212833]">Spend by Category</h3>
            <button className="text-[12px] text-[#5E687B] flex items-center bg-[#FAFBFC] px-2 py-1 rounded border border-[#E5EAF0]">
              YTD <ChevronDown size={14} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-[#212833] font-medium">Woven Fabrics</span>
                <span className="text-[#5E687B]">$1.2M</span>
              </div>
              <div className="w-full bg-[#FAFBFC] rounded-full h-2">
                <div className="bg-[#9000FF] h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-[#212833] font-medium">Knitwear</span>
                <span className="text-[#5E687B]">$840K</span>
              </div>
              <div className="w-full bg-[#FAFBFC] rounded-full h-2">
                <div className="bg-[#212833] h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-[#212833] font-medium">Trims & Hardware</span>
                <span className="text-[#5E687B]">$320K</span>
              </div>
              <div className="w-full bg-[#FAFBFC] rounded-full h-2">
                <div className="bg-[#5E687B] h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-[#212833] font-medium">Packaging</span>
                <span className="text-[#5E687B]">$120K</span>
              </div>
              <div className="w-full bg-[#FAFBFC] rounded-full h-2">
                <div className="bg-[#E5EAF0] h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomTabs active="Reports" />
    </>
  );
};


// Screen 6: RFQ Action Sheet
const RFQScreen = () => {
  return (
    <div className="w-full h-full relative bg-[#FAFBFC]">
      {/* Background Dimmed List */}
      <div className="absolute inset-0 pointer-events-none filter blur-[1px]">
        <Header title="RFQs" />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-[#E5EAF0]">
              <div className="h-4 bg-[#E5EAF0] rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-[#E5EAF0] rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-[#FAFBFC] rounded w-full"></div>
            </div>
          ))}
        </div>
        <BottomTabs active="More" />
      </div>

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-[#212833]/50 z-40"></div>

      <BottomTabs active="More" />

      {/* Bottom Sheet anchored above tabs */}
      <div className="absolute bottom-[83px] left-0 right-0 bg-[#FFFFFF] rounded-t-[24px] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col max-h-[90%]">
        <div className="w-full flex justify-center py-3">
          <div className="w-12 h-1.5 bg-[#E5EAF0] rounded-full"></div>
        </div>
        
        <div className="px-5 pb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[18px] font-bold text-[#212833] mb-1">RFQ Line Review</h2>
              <p className="text-[13px] text-[#5E687B]">RFQ-9924 • TexTech Shenzhen</p>
            </div>
            <button className="w-8 h-8 bg-[#FAFBFC] rounded-full flex items-center justify-center text-[#5E687B]">
              <X size={18} />
            </button>
          </div>

          <div className="bg-[#FAFBFC] rounded-xl border border-[#E5EAF0] p-4 mb-6">
            <h3 className="text-[14px] font-bold text-[#212833] mb-3">Recycled Polyester Blend</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#E5EAF0] pb-3">
                <span className="text-[13px] text-[#5E687B]">Quantity Requested</span>
                <span className="text-[14px] font-semibold text-[#212833]">5,000 m</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#E5EAF0] pb-3">
                <span className="text-[13px] text-[#5E687B]">Proposed Price</span>
                <span className="text-[14px] font-semibold text-[#212833]">$12.50 / m</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#E5EAF0] pb-3">
                <span className="text-[13px] text-[#5E687B]">Lead Time</span>
                <span className="text-[14px] font-semibold text-[#212833]">45 Days</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[13px] text-[#5E687B]">Total Extended</span>
                <span className="text-[16px] font-bold text-[#9000FF]">$62,500.00</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mb-2">
            <button className="flex-1 py-3.5 bg-[#FFFFFF] border border-[#E5EAF0] text-[#212833] font-bold text-[15px] rounded-xl shadow-sm">
              Reject
            </button>
            <button className="flex-1 py-3.5 bg-[#9000FF] text-white font-bold text-[15px] rounded-xl shadow-sm flex items-center justify-center">
              Approve Line <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main Component ---

export default function EnterpriseRail() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans pb-24">
      {/* Title Rail */}
      <div className="bg-[#212833] w-full px-8 py-6 mb-12 shadow-md flex justify-between items-end border-b-4 border-[#9000FF]">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="px-2 py-0.5 bg-[#9000FF]/20 text-[#9000FF] text-[10px] font-bold uppercase tracking-widest rounded border border-[#9000FF]/30">Mobile PWA</span>
            <span className="text-[#5E687B] text-[11px] font-semibold uppercase tracking-wider">Variant A</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Enterprise Rail</h1>
          <p className="text-[#5E687B] text-sm mt-1 max-w-xl">FlowForge desktop miniaturization. Meticulous enterprise polish.</p>
        </div>
        
        {/* Token Legend */}
        <div className="flex space-x-4 bg-[#1C1C1E] p-3 rounded-lg border border-[#3A4354]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-[#9000FF]"></div>
            <span className="text-xs text-[#E5EAF0] font-mono">#9000FF</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-[#212833] border border-[#5E687B]"></div>
            <span className="text-xs text-[#E5EAF0] font-mono">#212833</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-[#FAFBFC] border border-[#E5EAF0]"></div>
            <span className="text-xs text-[#E5EAF0] font-mono">#FAFBFC</span>
          </div>
        </div>
      </div>

      {/* Grid of Phones */}
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-16 justify-items-center">
          <PhoneFrame title="01 / Home Inbox">
            <InboxScreen />
          </PhoneFrame>

          <PhoneFrame title="02 / Navigation">
            <DrawerScreen />
          </PhoneFrame>

          <PhoneFrame title="03 / Risk Radar">
            <RiskScreen />
          </PhoneFrame>

          <PhoneFrame title="04 / Order Detail">
            <OrderDetailScreen />
          </PhoneFrame>

          <PhoneFrame title="05 / Reports">
            <ReportsScreen />
          </PhoneFrame>

          <PhoneFrame title="06 / Action Sheet">
            <RFQScreen />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
