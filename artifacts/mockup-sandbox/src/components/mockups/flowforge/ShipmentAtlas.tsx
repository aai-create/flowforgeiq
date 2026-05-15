import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Mail, 
  MessageCircle, 
  Sheet, 
  FileText, 
  Sparkles, 
  Search, 
  Filter,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  Box,
  Layers,
  Zap,
  ArrowRight,
  Wand2
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import "./_group.css";

// --- Mock Data ---
const STAGES = [
  "Tech Pack", 
  "Sample Request", 
  "Proto Sample", 
  "Fit Sample", 
  "PP Sample", 
  "Bulk Production", 
  "Inline QC", 
  "Final QC", 
  "Ex-Factory", 
  "In Transit", 
  "Delivered"
];

const SHIPMENTS = [
  {
    id: "PO-2026-0142",
    buyer: "Northbound Outfitters",
    supplier: "Yangtze Knit Mills (Hangzhou)",
    product: "Heavyweight 14oz Selvedge Jean — Indigo",
    units: 1200,
    value: "$42,000",
    currentStageIndex: 5,
    status: "on-track",
    targetDate: new Date(2026, 5, 15), // June 15
    risks: []
  },
  {
    id: "PO-2026-0157",
    buyer: "Vellum Studio",
    supplier: "Lahore Denim Co.",
    product: "Organic Cotton Crewneck — Stone",
    units: 850,
    value: "$18,700",
    currentStageIndex: 3,
    status: "at-risk",
    targetDate: new Date(2026, 4, 28), // May 28
    risks: ["Lab dip pending approval +6d", "Supplier unresponsive"]
  },
  {
    id: "PO-2026-0163",
    buyer: "Pioneer Goods Co.",
    supplier: "Porto Bordados (Portugal)",
    product: "Merino Half-Zip — Forest",
    units: 400,
    value: "$34,000",
    currentStageIndex: 7,
    status: "delayed",
    targetDate: new Date(2026, 4, 20), // May 20
    risks: ["Minor defects in AQL 2.5"]
  },
  {
    id: "PO-2026-0171",
    buyer: "Marlowe & Sons",
    supplier: "Tirupur Jersey Works",
    product: "Linen Camp Shirt — Ecru",
    units: 2100,
    value: "$29,400",
    currentStageIndex: 2,
    status: "on-track",
    targetDate: new Date(2026, 6, 10), // July 10
    risks: []
  },
  {
    id: "PO-2026-0175",
    buyer: "Vellum Studio",
    supplier: "Bali Atelier",
    product: "French Terry Hoodie — Charcoal",
    units: 600,
    value: "$14,500",
    currentStageIndex: 8,
    status: "at-risk",
    targetDate: new Date(2026, 4, 24), // May 24
    risks: ["Port congestion Surabaya +4d"]
  }
];

const MESSAGES = [
  {
    id: 1,
    supplier: "Lahore Denim Co.",
    channel: "gmail",
    time: "2 hours ago",
    content: "Hi team, we are still waiting on the lab dip approval for the Stone colorway before we can proceed to bulk dye lot. Please advise.",
    aiSummary: "Blocked: Awaiting lab dip approval to start bulk dye.",
    isAiExtracted: true
  },
  {
    id: 2,
    supplier: "Porto Bordados (Portugal)",
    channel: "whatsapp",
    time: "4 hours ago",
    content: "AQL 2.5 inspection completed. 400 units, 8 minor defects, 0 major. Ex-factory cleared for May 22 pickup.",
    aiSummary: "AQL passed. Ex-factory date confirmed: May 22.",
    isAiExtracted: true
  },
  {
    id: 3,
    supplier: "Yangtze Knit Mills",
    channel: "sheets",
    time: "Yesterday",
    content: "Updated BOM for Selvedge Jean. Added custom rivets to trims list.",
    aiSummary: null,
    isAiExtracted: false
  },
  {
    id: 4,
    supplier: "Bali Atelier",
    channel: "whatsapp",
    time: "Yesterday",
    content: "Hi! We need to push the hoodie shipment by 4 days — port congestion in Surabaya is worse than expected.",
    aiSummary: "Risk: Shipment delayed +4 days due to port congestion.",
    isAiExtracted: true
  }
];

const CUSTOMER = {
  name: "Vellum Studio",
  contact: "Sarah Jenkins (Prod. Manager)",
  openOrders: 4,
  valueInProduction: "$84,500",
  history: [
    { po: "PO-2025-098", item: "Heavyweight Tee", status: "Delivered", date: "Mar 12, 2026" },
    { po: "PO-2025-112", item: "Twill Trouser", status: "Delivered", date: "Apr 04, 2026" }
  ]
};

// --- Components ---

const ChannelIcon = ({ channel, className = "" }: { channel: string, className?: string }) => {
  switch (channel) {
    case 'gmail': return <Mail className={`w-4 h-4 text-red-500 ${className}`} />;
    case 'whatsapp': return <MessageCircle className={`w-4 h-4 text-green-500 ${className}`} />;
    case 'sheets': return <Sheet className={`w-4 h-4 text-emerald-600 ${className}`} />;
    case 'pdf': return <FileText className={`w-4 h-4 text-blue-500 ${className}`} />;
    default: return <MessageCircle className={`w-4 h-4 text-gray-500 ${className}`} />;
  }
};

const StatusDot = ({ status }: { status: string }) => {
  if (status === 'on-track') return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
  if (status === 'at-risk') return <div className="w-2 h-2 rounded-full bg-amber-500" />;
  if (status === 'delayed') return <div className="w-2 h-2 rounded-full bg-red-500" />;
  return <div className="w-2 h-2 rounded-full bg-gray-300" />;
};

export function ShipmentAtlas() {
  const [activeShipmentId, setActiveShipmentId] = useState("PO-2026-0157");

  return (
    <div className="flex h-screen w-full flowforge-bg flowforge-text font-[Inter,sans-serif] overflow-hidden selection:bg-[#9000FF]/20">
      
      {/* Left Nav */}
      <nav className="w-[60px] border-r flowforge-border bg-white flex flex-col items-center py-4 z-10 shrink-0">
        <div className="w-8 h-8 rounded-lg flowforge-primary flex items-center justify-center text-white font-bold text-lg mb-8 shadow-sm">
          f
        </div>
        
        <div className="flex flex-col gap-6 items-center flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg bg-[#9000FF]/10 text-[#9000FF] hover:bg-[#9000FF]/20 hover:text-[#9000FF]">
                  <Layers className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Shipment Atlas</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                  <Box className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Purchase Orders</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                  <Mail className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Communications</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Avatar className="w-8 h-8 border flowforge-border cursor-pointer">
          <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=f8f9fa" />
          <AvatarFallback>SJ</AvatarFallback>
        </Avatar>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Bar */}
        <header className="h-14 bg-white border-b flowforge-border flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-sm tracking-tight flex items-center gap-2">
              Shipment Atlas <span className="text-slate-400 font-normal">/ Q2 2026</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#9000FF] transition-colors" />
              <Input 
                placeholder="Search POs, buyers, suppliers..." 
                className="w-[280px] h-8 pl-9 bg-slate-50/50 border-slate-200 text-xs focus-visible:ring-[#9000FF]/30 focus-visible:border-[#9000FF]"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Filter
            </Button>
            <Button size="sm" className="h-8 text-xs gap-2 flowforge-primary hover:bg-[#7a00d9] text-white shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              New PO
            </Button>
          </div>
        </header>

        {/* Timeline Horizon (Top Half) */}
        <div className="flex-none h-[45%] border-b flowforge-border bg-white flex flex-col">
          <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Active Shipments</h2>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5"><StatusDot status="on-track" /> On Track (3)</div>
              <div className="flex items-center gap-1.5"><StatusDot status="at-risk" /> At Risk (2)</div>
              <div className="flex items-center gap-1.5"><StatusDot status="delayed" /> Delayed (1)</div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="min-w-[1200px] p-6 pb-12 relative">
              {/* Today line */}
              <div className="absolute top-0 bottom-0 left-[45%] w-px bg-[#9000FF]/30 border-r border-dashed border-[#9000FF] z-0 pointer-events-none">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#9000FF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  TODAY
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {SHIPMENTS.map((shipment) => {
                  const isActive = shipment.id === activeShipmentId;
                  return (
                    <div 
                      key={shipment.id} 
                      className={`flex items-center gap-4 group cursor-pointer transition-colors p-2 -mx-2 rounded-lg ${isActive ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-slate-50/50'}`}
                      onClick={() => setActiveShipmentId(shipment.id)}
                    >
                      {/* Left Info */}
                      <div className="w-[280px] shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <StatusDot status={shipment.status} />
                            <span className="text-xs font-bold">{shipment.id}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">{shipment.units} units</span>
                        </div>
                        <div className="text-sm font-medium truncate pr-2 text-slate-800">{shipment.buyer}</div>
                        <div className="text-xs text-slate-500 truncate pr-2">{shipment.supplier}</div>
                      </div>

                      {/* Timeline Track */}
                      <div className="flex-1 relative h-6 flex items-center">
                        <div className="absolute left-0 right-0 h-1.5 bg-slate-100 rounded-full" />
                        
                        <div className="relative w-full flex justify-between items-center">
                          {STAGES.map((stage, idx) => {
                            const isCompleted = idx < shipment.currentStageIndex;
                            const isCurrent = idx === shipment.currentStageIndex;
                            const isFuture = idx > shipment.currentStageIndex;
                            
                            return (
                              <TooltipProvider key={stage}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative group/node flex flex-col items-center justify-center w-4 h-4 z-10">
                                      {/* Node */}
                                      <div className={`w-3 h-3 rounded-full border-2 transition-all duration-300
                                        ${isCompleted ? 'bg-[#9000FF] border-[#9000FF]' : ''}
                                        ${isCurrent ? 'bg-white border-[#9000FF] animate-pulse-border w-3.5 h-3.5 shadow-[0_0_8px_rgba(144,0,255,0.4)]' : ''}
                                        ${isFuture ? 'bg-white border-slate-200 group-hover/node:border-slate-400' : ''}
                                      `} />
                                      
                                      {/* Line connection logic (visual hack via absolute divs) */}
                                      {idx < STAGES.length - 1 && (
                                        <div className={`absolute left-4 w-[calc(100cqw-1rem)] h-1.5 top-1/2 -translate-y-1/2 -z-10
                                          ${isCompleted || (isCurrent && idx < shipment.currentStageIndex) ? 'bg-[#9000FF]' : ''}
                                        `} style={{ width: '60px' }} /> 
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs font-medium">
                                    {stage}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>

                        {/* Risk Tags floating above */}
                        {shipment.risks.map((risk, i) => (
                          <div 
                            key={i} 
                            className="absolute -top-6 left-[40%] bg-white border border-amber-200 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 z-20 whitespace-nowrap"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {risk}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Bottom Half Grid */}
        <div className="flex-1 flex min-h-0 bg-[#FAFBFC]">
          
          {/* Bottom Left: Communications */}
          <div className="w-1/2 border-r flowforge-border flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                Recent Communications
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#9000FF] font-medium hover:bg-[#9000FF]/10">
                View All
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {MESSAGES.map((msg) => (
                  <div key={msg.id} className="bg-white border flowforge-border rounded-lg p-3.5 shadow-sm hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 border flowforge-border">
                          <AvatarFallback className="text-[10px] bg-slate-100">{msg.supplier.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold text-slate-800">{msg.supplier}</span>
                        <ChannelIcon channel={msg.channel} />
                      </div>
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      "{msg.content}"
                    </p>

                    {msg.isAiExtracted && (
                      <div className="bg-[#9000FF]/[0.03] border border-[#9000FF]/20 rounded-md p-2 flex gap-2 items-start">
                        <Sparkles className="w-3.5 h-3.5 text-[#9000FF] mt-0.5 shrink-0" />
                        <div className="text-xs text-[#9000FF] font-medium leading-tight">
                          {msg.aiSummary}
                          <Button variant="link" className="h-auto p-0 text-[#9000FF] ml-2 font-bold underline decoration-[#9000FF]/40 underline-offset-2">Update Timeline</Button>
                        </div>
                      </div>
                    )}
                    
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6">
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Bottom Right: AI & Context */}
          <div className="w-1/2 flex flex-col min-h-0">
            
            {/* Top Right: AI Synthesis */}
            <div className="flex-1 border-b flowforge-border bg-white p-6 flex flex-col justify-center min-h-[50%] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#9000FF]/5 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-[#9000FF]/10 text-[#9000FF]">
                  <Wand2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">FlowForge Intelligence</h3>
              </div>
              
              <div className="mb-5">
                <p className="text-sm text-slate-600 mb-3">
                  <span className="font-semibold text-slate-800">3 shipments need attention today.</span> Lahore Denim Co. hasn't replied in 6 days regarding the lab dip approval for <span className="font-medium">PO-2026-0157</span>.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#9000FF] hover:bg-[#7a00d9] text-white text-xs h-7 shadow-sm shadow-[#9000FF]/20">
                    Draft Follow-up Email
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 border-slate-200">
                    Push target date +6d
                  </Button>
                </div>
              </div>

              <div className="relative mt-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#9000FF]/5 to-transparent blur-sm pointer-events-none" />
                <Input 
                  placeholder="Ask AI: e.g., 'Move all of Vellum Studio's POs back by 5 days'" 
                  className="w-full h-10 pr-10 text-xs border-slate-200 shadow-sm focus-visible:ring-[#9000FF]/30 flowforge-ai-glow"
                />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8 text-[#9000FF] hover:bg-[#9000FF]/10">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Right: Customer Context */}
            <div className="flex-1 bg-[#FAFBFC] p-6 flex flex-col min-h-[50%]">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Buyer Context</h3>
              
              <Card className="border-slate-200 shadow-sm bg-white flex-1 flex flex-col overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 shrink-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base text-slate-800 mb-1">{CUSTOMER.name}</CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1.5">
                        <Avatar className="w-4 h-4">
                          <AvatarFallback className="text-[8px] bg-[#9000FF]/10 text-[#9000FF]">SJ</AvatarFallback>
                        </Avatar>
                        {CUSTOMER.contact}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-slate-50 font-medium">Primary</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-slate-50 rounded-md p-3 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium mb-1 uppercase tracking-wide">Open Orders</div>
                      <div className="text-xl font-bold text-slate-800">{CUSTOMER.openOrders}</div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-md p-3 border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium mb-1 uppercase tracking-wide">Value in Prod</div>
                      <div className="text-xl font-bold text-[#9000FF]">{CUSTOMER.valueInProduction}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-0">
                    <h4 className="text-xs font-medium text-slate-500 mb-2">Recent History</h4>
                    <div className="space-y-2">
                      {CUSTOMER.history.map((hist, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <div className="font-medium text-slate-700">{hist.po}</div>
                          <div className="text-slate-500 truncate max-w-[120px]">{hist.item}</div>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">{hist.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
