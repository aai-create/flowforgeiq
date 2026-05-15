import React, { useState } from "react";
import { 
  Search, Bell, Plus, Inbox, Calendar, LayoutGrid, Layers, 
  MessageCircle, Mail, FileText, CheckCircle2, Circle, 
  Sparkles, AlertCircle, Clock, ChevronRight, Hash, X,
  Wand2, Send, Paperclip, MoreHorizontal, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Data ---
const BUYERS = [
  { id: "b1", name: "Vellum Studio", color: "bg-orange-100 text-orange-800" },
  { id: "b2", name: "Northbound Outfitters", color: "bg-blue-100 text-blue-800" },
  { id: "b3", name: "Pioneer Goods Co.", color: "bg-emerald-100 text-emerald-800" },
];

const TASKS = [
  { id: "t1", title: "Approve lab dip for Organic Crewneck", supplier: "Yangtze Knit Mills", channel: "mail", time: "2h ago", overdue: true },
  { id: "t2", title: "Push ship date +4d due to port congestion", supplier: "Bali Atelier", channel: "whatsapp", time: "4h ago", overdue: true },
  { id: "t3", title: "Review AQL 2.5 inspection report", supplier: "Lahore Denim Co.", channel: "file", time: "1d ago", overdue: false },
  { id: "t4", title: "Send strike-off approval", supplier: "Porto Bordados", channel: "whatsapp", time: "1d ago", overdue: false },
];

const MILESTONES = ["Tech Pack", "Sample", "PP", "Bulk", "QC", "Ex-Factory", "Delivered"];

const SHIPMENTS = [
  {
    id: "PO-2026-0157",
    buyer: "Vellum Studio",
    product: "Heavyweight 14oz Selvedge Jean — Indigo",
    supplier: "Lahore Denim Co.",
    qty: 1250,
    currentStage: "PP",
    progress: 40,
    status: "at-risk",
    eta: "May 22",
  },
  {
    id: "PO-2026-0142",
    buyer: "Northbound Outfitters",
    product: "Organic Cotton Crewneck — Stone",
    supplier: "Yangtze Knit Mills",
    qty: 3000,
    currentStage: "Bulk",
    progress: 60,
    status: "on-track",
    eta: "Jun 04",
  },
  {
    id: "PO-2026-0188",
    buyer: "Pioneer Goods Co.",
    product: "Merino Half-Zip — Forest",
    supplier: "Porto Bordados",
    qty: 800,
    currentStage: "Sample",
    progress: 20,
    status: "delayed",
    eta: "Jun 15",
  },
  {
    id: "PO-2026-0191",
    buyer: "Vellum Studio",
    product: "French Terry Hoodie — Charcoal",
    supplier: "Tirupur Jersey Works",
    qty: 2100,
    currentStage: "QC",
    progress: 80,
    status: "on-track",
    eta: "May 18",
  }
];

export function Atelier() {
  return (
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] font-[Inter,sans-serif] overflow-hidden flex flex-col">
      {/* Top Bar */}
      <header className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6 w-[280px]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-[4px] bg-[#9000FF] flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-[#212833]">flowforge</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center max-w-xl">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5E687B] group-focus-within:text-[#9000FF] transition-colors" />
            <input 
              type="text" 
              placeholder="Search POs, buyers, suppliers, or commands..." 
              className="w-full h-8 bg-[#F0F2F5] hover:bg-[#E5EAF0] focus:bg-white border border-transparent focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF] rounded-md pl-9 pr-12 text-sm outline-none transition-all placeholder:text-[#5E687B]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#D6E3EB] bg-white px-1.5 font-mono text-[10px] font-medium text-[#5E687B]">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-[360px] justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#5E687B] hover:text-[#212833]">
            <Bell className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Avatar className="h-7 w-7 rounded-md border border-[#E5EAF0] cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback className="bg-gradient-to-br from-[#9000FF] to-[#6000FF] text-white text-[10px] rounded-md">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Nav & Tasks */}
        <div className="w-[280px] bg-[#F7F9FA] border-r border-[#E5EAF0] flex flex-col shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-3">
              <div className="space-y-0.5">
                <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]">
                  <Inbox className="w-4 h-4 mr-2" />
                  Inbox
                  <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] bg-[#E5EAF0] text-[#5E687B]">12</Badge>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm text-[#212833] bg-[#E5EAF0] font-medium">
                  <Calendar className="w-4 h-4 mr-2 text-[#9000FF]" />
                  Today
                  <Badge className="ml-auto h-5 px-1.5 text-[10px] bg-[#9000FF] hover:bg-[#9000FF]">4</Badge>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]">
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  All Shipments
                </Button>
              </div>

              <div className="mt-6 mb-2 px-2 flex items-center justify-between group">
                <span className="text-[11px] font-semibold tracking-wider text-[#5E687B] uppercase">Active POs by Buyer</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 text-[#5E687B]" />
                </Button>
              </div>
              
              <div className="space-y-0.5">
                {BUYERS.map(buyer => (
                  <div key={buyer.id} className="group flex items-center justify-between px-2 h-7 hover:bg-[#E5EAF0] rounded-md cursor-pointer text-sm text-[#5E687B] hover:text-[#212833]">
                    <div className="flex items-center gap-2 truncate">
                      <Hash className="w-3 h-3 opacity-50" />
                      <span className="truncate">{buyer.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-5" />

              <div className="px-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wider text-[#5E687B] uppercase">Today's Focus</span>
              </div>

              <div className="space-y-1">
                {TASKS.map(task => (
                  <div key={task.id} className="group flex items-start gap-2 p-2 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-[#E5EAF0] cursor-pointer transition-all">
                    <button className="mt-0.5 shrink-0 text-[#D6E3EB] hover:text-[#9000FF] transition-colors">
                      <Circle className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#212833] leading-snug line-clamp-2">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#5E687B]">
                        {task.channel === 'mail' && <Mail className="w-3 h-3" />}
                        {task.channel === 'whatsapp' && <MessageCircle className="w-3 h-3 text-green-600" />}
                        {task.channel === 'file' && <FileText className="w-3 h-3" />}
                        <span className="truncate">{task.supplier}</span>
                        <span className="opacity-50">•</span>
                        <span className={task.overdue ? "text-red-500 font-medium" : ""}>{task.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Center Pane - Command Horizon (Timeline) */}
        <div className="flex-1 bg-white flex flex-col min-w-0">
          <div className="h-14 border-b border-[#E5EAF0] flex items-center justify-between px-6 shrink-0">
            <h1 className="text-lg font-semibold text-[#212833]">Command Horizon</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border-[#E5EAF0] text-[#5E687B]">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Sort by ETA
              </Button>
              <Button size="sm" className="h-8 text-xs bg-[#9000FF] hover:bg-[#7000CC] text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Shipment
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {SHIPMENTS.map(shipment => (
                <div key={shipment.id} className="border border-[#E5EAF0] rounded-lg p-4 hover:border-[#D6E3EB] hover:shadow-sm transition-all group bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-[11px] h-6 border-[#E5EAF0] text-[#5E687B] bg-[#FAFBFC]">
                        {shipment.id}
                      </Badge>
                      <span className="text-sm font-medium text-[#212833]">{shipment.product}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-[#5E687B]">
                        <Avatar className="w-5 h-5 rounded-[4px]">
                          <AvatarFallback className="bg-[#F0F2F5] text-[9px] text-[#5E687B] rounded-[4px]">
                            {shipment.supplier.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px]">{shipment.supplier}</span>
                      </div>
                      <span className="text-[#D6E3EB]">|</span>
                      <span className="text-[13px] text-[#5E687B]">{shipment.qty} units</span>
                      <Badge className={`ml-2 h-6 px-2 text-[11px] font-medium border-0 ${
                        shipment.status === 'at-risk' ? 'bg-orange-100 text-orange-800' :
                        shipment.status === 'delayed' ? 'bg-red-100 text-red-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {shipment.status === 'at-risk' ? 'At Risk' : shipment.status === 'delayed' ? 'Delayed' : 'On Track'}
                      </Badge>
                    </div>
                  </div>

                  {/* Visual Timeline */}
                  <div className="relative pt-4 pb-2">
                    <div className="absolute top-5 left-0 w-full h-1 bg-[#F0F2F5] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#9000FF] to-[#B040FF] transition-all duration-500 rounded-full" 
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                    
                    <div className="relative flex justify-between">
                      {MILESTONES.map((stage, idx) => {
                        const isPast = (idx * (100 / (MILESTONES.length - 1))) < shipment.progress;
                        const isCurrent = stage === shipment.currentStage;
                        
                        return (
                          <div key={stage} className="flex flex-col items-center gap-2 group/node">
                            <div className={`w-3 h-3 rounded-full border-[2px] z-10 bg-white transition-colors ${
                              isCurrent ? 'border-[#9000FF] ring-4 ring-[#9000FF]/10' :
                              isPast ? 'border-[#9000FF]' : 'border-[#D6E3EB]'
                            }`} />
                            <span className={`text-[10px] font-medium absolute top-8 whitespace-nowrap ${
                              isCurrent ? 'text-[#9000FF]' :
                              isPast ? 'text-[#212833]' : 'text-[#5E687B]'
                            }`}>
                              {stage}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Pane - AI Assistant */}
        <div className="w-[360px] bg-white border-l border-[#E5EAF0] flex flex-col shrink-0 relative">
          <div className="h-14 border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0 bg-[#FAFBFC]/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[#9000FF]">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium text-sm">FlowForge AI</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#5E687B]">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-[#FAFBFC] to-white">
            {/* Briefing Card */}
            <div className="bg-white border border-[#E5EAF0] shadow-sm rounded-lg p-3 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#9000FF]" />
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-3.5 h-3.5 text-[#9000FF]" />
                <span className="text-xs font-semibold text-[#212833] uppercase tracking-wider">Daily Briefing</span>
              </div>
              <p className="text-[13px] text-[#5E687B] leading-relaxed">
                3 shipments need decisions today. <span className="font-medium text-[#212833]">Lahore Denim Co.</span> hasn't replied in 6 days regarding the lab dip approval for PO-0157.
              </p>
            </div>

            <div className="space-y-4">
              {/* User Message */}
              <div className="flex flex-col items-end gap-1">
                <div className="bg-[#F0F2F5] text-[#212833] px-3 py-2 rounded-2xl rounded-tr-sm text-[13px] max-w-[90%]">
                  What's blocking Vellum's denim PO?
                </div>
                <span className="text-[10px] text-[#A0ABB8]">10:42 AM</span>
              </div>

              {/* AI Response */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3 h-3 text-[#9000FF]" />
                  </div>
                  <div className="bg-white border border-[#E5EAF0] shadow-sm text-[#212833] px-3 py-2.5 rounded-2xl rounded-tl-sm text-[13px] max-w-[95%] leading-relaxed">
                    PO-2026-0157 is stuck at the <span className="font-medium">Pre-Production (PP)</span> stage.
                    <div className="mt-2 p-2 bg-[#FAFBFC] border border-[#E5EAF0] rounded-md">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageCircle className="w-3 h-3 text-green-600" />
                        <span className="text-[11px] font-medium text-[#5E687B]">Lahore Denim Co. (WhatsApp)</span>
                      </div>
                      <p className="text-[12px] italic text-[#5E687B]">"Waiting on your approval for the indigo lab dip sent last week before we can proceed to bulk dye lot."</p>
                    </div>
                    <p className="mt-2">They need an answer by tomorrow to maintain the May 22 Ex-Factory date.</p>
                  </div>
                </div>
                
                {/* Action Chips */}
                <div className="flex flex-wrap gap-2 ml-8 mt-1">
                  <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-full border-[#9000FF]/20 text-[#9000FF] bg-[#9000FF]/5 hover:bg-[#9000FF]/10 hover:text-[#9000FF]">
                    Draft reply to Lahore
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-full border-[#E5EAF0] text-[#5E687B]">
                    Push ship date +3d
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* AI Input Area */}
          <div className="p-3 bg-white border-t border-[#E5EAF0]">
            <div className="relative flex items-center bg-[#F0F2F5] rounded-xl border border-transparent focus-within:border-[#9000FF]/30 focus-within:bg-white transition-colors">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-[#5E687B]">
                <Paperclip className="w-4 h-4" />
              </Button>
              <input 
                type="text" 
                placeholder="Ask about a shipment, supplier..." 
                className="flex-1 bg-transparent border-none text-[13px] h-10 focus:outline-none placeholder:text-[#A0ABB8]"
              />
              <Button size="icon" className="h-7 w-7 rounded-lg bg-[#9000FF] hover:bg-[#7000CC] mr-1 shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-[#A0ABB8]">Press <kbd className="font-mono bg-[#F0F2F5] px-1 rounded border border-[#E5EAF0]">⌘</kbd> + <kbd className="font-mono bg-[#F0F2F5] px-1 rounded border border-[#E5EAF0]">J</kbd> to open command bar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
