import React, { useState, useRef, useEffect, useMemo } from "react";
import { AICopilotBar } from "@/components/AICopilotBar";
import { useCopilotHint } from "@/lib/CopilotContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useSearch, useLocation } from "wouter";
import {
  Mail, MessageCircle, FileText, Sparkles, Wand2, Search,
  Bell, ChevronDown, Check, AlertCircle, Clock, MoreHorizontal,
  Paperclip, Send, ArrowRight, Inbox, FileBox, Users, Filter,
  MapPin, LayoutGrid, MessagesSquare, X, CheckCircle2, Zap, ChevronRight,
  GripVertical, Plus, Trash2, DollarSign, CreditCard, CalendarClock,
  ChevronUp, ListTodo, SlidersHorizontal, Calendar, Upload, Image,
  FileSpreadsheet, Video, Download, Eye, Bot, MessageSquare, ChevronLeft,
  Table2, FilePlus, Link2, ArrowUpRight, ShieldAlert, BrainCircuit, BarChart3,
  Pencil, Package, Hash, Bookmark, Settings, ExternalLink, Wifi, WifiOff, Clipboard, Copy,
} from "lucide-react";
import { NavSidebar } from "@/components/NavSidebar";
import { Atelier } from "./Atelier";
import { DocumentIntake } from "./DocumentIntake";
import { ShipmentRiskDetail } from "./ShipmentRiskDetail";
import { CopilotQueue } from "./CopilotQueue";
import { RiskRadar } from "./RiskRadar";
import { Reports } from "./Reports";
import {
  useListStages, useListShipments, useListMessages, useListTasks,
  updateMessage, updateTask, updateShipment, updatePayment,
  selectFactoryQuote, reorderStages, createMessage,
  useListDocuments, getListDocumentsQueryKey,
  useListCopilotProposals,
  useListSuppliers, useUpdateSupplier,
  createShipmentStageEvent,
  useListNeedsReviewMessages, useAssignMessage, useSendReply, useGetGmailStatus, connectGmail,
  useDisconnectGmail, useGetInboundEmailAddress, useIngestChat,
  type Message as ApiMessageFull,
  type ChatIngestResult,
} from "@workspace/api-client-react";
import { StageHistory } from "@/components/StageHistory";
import type { DocumentWithExtraction, ReconciliationFinding } from "@workspace/api-client-react";
import {
  adaptStages, adaptShipments, adaptMessages, adaptTasks, shortDate, relativeAge,
  type UiStage, type UiShipment, type UiMessage, type UiTask,
} from "@/lib/adapters";

// ─────────────────────────────────────────────────────────────────────────────
// Radar icon (custom SVG — concentric arcs + sweep line + blip)
// ─────────────────────────────────────────────────────────────────────────────
function RadarIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.25" strokeWidth="0"/>
      <path d="M12 4a8 8 0 0 1 8 8" opacity="0.35"/>
      <path d="M12 7a5 5 0 0 1 5 5" opacity="0.6"/>
      <path d="M12 10a2 2 0 0 1 2 2" opacity="0.9"/>
      <line x1="12" y1="12" x2="19.5" y2="4.5"/>
      <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ActiveView = "inbox" | "calendar" | "buyers" | "import" | "copilot" | "needs-review" | "settings";
type RightTab   = "message" | "docs" | "risk" | "copilot";
type Channel    = "gmail" | "whatsapp" | "wechat" | "imessage" | "sms" | "sheets" | "pdf";
type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Stage { id: string; label: string; }
interface Payment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; intermediaryAdvanceUsd?: number | null; intermediaryRecoveredUsd?: number | null; }
interface FactoryQuote { factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean; }
interface Shipment {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; currentStageId: string; dueDate: string;
  payments: Payment[]; quotes?: FactoryQuote[];
}
interface Message {
  id: string; sender: string; channel: Channel; timestamp: string;
  snippet: string; fullBody: string; unread: boolean; aiTags: string[];
  shipmentId: string; supplierId: string; aiDraft?: string; aiAction?: string;
}
interface Task {
  id: string; title: string; source: string; sourceAge: string;
  urgency: "high" | "medium" | "low"; shipmentId: string; messageId?: string; action: string;
}
interface Doc {
  name: string; type: "pdf" | "image" | "sheet" | "video"; date: string; size: string; tag: string;
}
interface CalendarEvent {
  day: number; month: number; label: string; po: string;
  type: "payment" | "exfactory" | "qc" | "production"; status: ShipmentStatus;
}
interface BuyerChat {
  id: string; buyer: string; question: string; botAnswer: string;
  time: string; po: string; resolved: boolean;
}
interface EmailTemplate { label: string; body: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Configurable stages
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_STAGES: Stage[] = [
  { id: "spec",       label: "Spec Sheet"        },
  { id: "quotes",     label: "Factory Quotes"    },
  { id: "sample_ord", label: "Sample Order"      },
  { id: "sample_apr", label: "Sample Approval"   },
  { id: "po_issued",  label: "PO Issued"         },
  { id: "production", label: "Production"        },
  { id: "qc",         label: "QC Inspection"     },
  { id: "ex_factory", label: "Ex-Factory"        },
  { id: "in_transit", label: "In Transit"        },
  { id: "payment",    label: "Payment Clearance" },
  { id: "delivered",  label: "Delivered"         },
];

// ─────────────────────────────────────────────────────────────────────────────
// Email templates by stage  (P1)
// ─────────────────────────────────────────────────────────────────────────────
const EMAIL_TEMPLATES: Record<string, EmailTemplate[]> = {
  spec:       [{ label: "Request spec sheet",      body: "Hi, could you please provide a detailed spec sheet including materials, dimensions, finish options, and target cost?" },
               { label: "Spec revision request",   body: "Thank you for the spec sheet. We'd like to request the following revisions before proceeding to quotes:\n\n1. [Revision 1]\n2. [Revision 2]" }],
  quotes:     [{ label: "RFQ to factory",          body: "Please provide your best unit price for the attached spec. We're targeting [qty] units with ex-factory by [date]. Please include lead time, MOQ, and payment terms." },
               { label: "Quote follow-up",          body: "Following up on our RFQ sent on [date]. Please confirm your pricing at your earliest convenience — we have a time-sensitive buyer deadline." },
               { label: "Quote accepted",           body: "Thank you for your quotation. We'd like to proceed at $[price]/unit. Please confirm and advise next steps for sample order." }],
  sample_ord: [{ label: "Sample order request",    body: "Please proceed with 1× pre-production sample as per the attached spec. Required by [date]. Courier to: [address]. Please send tracking once dispatched." }],
  sample_apr: [{ label: "Approve sample",          body: "We have reviewed the sample and are happy to proceed. Sample is approved as-is. Please issue the PI and we'll arrange deposit." },
               { label: "Reject with feedback",    body: "Thank you for the sample. We cannot approve at this stage. Please revise the following:\n\n1. [Issue 1]\n2. [Issue 2]\n\nPlease resubmit within [X] days." },
               { label: "Sample follow-up",        body: "We have not yet received the sample. Could you please confirm dispatch date and tracking number?" }],
  po_issued:  [{ label: "PO confirmation",         body: "Please find attached PO [number] for [qty] units. Kindly confirm receipt, production start date, and any risks to the ex-factory date." }],
  production: [{ label: "Production update request", body: "Could you please share a production update for PO [number]? We need: current completion %, ex-factory ETA, and any risks to the schedule." },
               { label: "QC inspection notice",    body: "We are arranging a QC inspection for PO [number]. Please confirm when production will be 100% complete so we can schedule our inspector." }],
  qc:         [{ label: "QC passed — request docs", body: "QC has passed — congratulations on a clean result. Please send: Commercial Invoice, Packing List, Certificate of Origin, and Bill of Lading draft." },
               { label: "QC fail notice",          body: "Unfortunately the QC inspection found [X] major defects. Production must be rectified before we can proceed to ex-factory. Details attached." }],
  ex_factory: [{ label: "Confirm ex-factory",      body: "Please confirm today's ex-factory dispatch and provide: container number, seal number, vessel name, and ETD/ETA." },
               { label: "Balance payment notice",  body: "We are processing the balance payment of $[amount] for PO [number]. Please confirm bank details are unchanged and expect receipt within [X] days." }],
  in_transit: [{ label: "Shipment tracking request", body: "Could you share the latest tracking update for PO [number]? Vessel name, container number, and current ETA to [destination port]." }],
  payment:    [{ label: "Payment clearance",       body: "Balance payment of $[amount] has been wired today for PO [number]. Please confirm receipt and advise when container will be released." }],
  delivered:  [{ label: "Delivery confirmation",   body: "PO [number] has been received in full. Thank you for a smooth delivery. We look forward to working together on the next order." },
               { label: "Post-delivery follow-up", body: "Now that PO [number] is delivered, wanted to check in — any feedback on the process? We're keen to improve lead times on future orders." }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Documents per shipment  (P1)
// ─────────────────────────────────────────────────────────────────────────────
const SHIPMENT_DOCS: Record<string, Doc[]> = {
  s1: [
    { name: "Serving Fork Tech Pack v2.pdf",    type: "pdf",   date: "Apr 12", size: "2.1 MB", tag: "Spec"   },
    { name: "Brushed nickel sample photo.jpg",  type: "image", date: "May 01", size: "840 KB", tag: "Sample" },
    { name: "Strike-off reference.jpg",         type: "image", date: "May 08", size: "1.2 MB", tag: "Sample" },
    { name: "Factory audit report.pdf",         type: "pdf",   date: "Mar 20", size: "3.4 MB", tag: "Audit"  },
  ],
  s2: [
    { name: "LED Cabinet Light Spec Sheet.pdf", type: "pdf",   date: "Mar 15", size: "1.8 MB", tag: "Spec"       },
    { name: "PCB layout diagram.pdf",           type: "pdf",   date: "Apr 02", size: "920 KB", tag: "Tech"       },
    { name: "Production floor update.jpg",      type: "image", date: "May 14", size: "2.3 MB", tag: "Production" },
    { name: "LED costing tracker.xlsx",         type: "sheet", date: "Mar 10", size: "210 KB", tag: "Costing"    },
  ],
  s3: [
    { name: "Oak Flooring Tech Pack.pdf",        type: "pdf",   date: "Mar 28", size: "3.1 MB", tag: "Spec"   },
    { name: "SGS QC Report — AQL 2.5.pdf",       type: "pdf",   date: "May 12", size: "4.2 MB", tag: "QC"     },
    { name: "Herringbone sample install.mp4",    type: "video", date: "Apr 20", size: "18 MB",  tag: "Sample" },
    { name: "Container packing photos.jpg",      type: "image", date: "May 13", size: "3.8 MB", tag: "QC"     },
    { name: "Commercial Invoice draft.pdf",      type: "pdf",   date: "May 14", size: "280 KB", tag: "Shipping"},
  ],
  s4: [
    { name: "Chrome Hanger Spec Sheet.pdf",      type: "pdf",   date: "Apr 05", size: "1.1 MB", tag: "Spec"     },
    { name: "Sample approval email.pdf",         type: "pdf",   date: "Apr 22", size: "280 KB", tag: "Approval" },
    { name: "Hanger weight test photo.jpg",      type: "image", date: "Apr 25", size: "960 KB", tag: "QC"       },
  ],
  s5: [
    { name: "Grid Panel RFQ brief.pdf",          type: "pdf",   date: "May 10", size: "870 KB", tag: "Spec"   },
    { name: "Factory quotes comparison.xlsx",    type: "sheet", date: "May 12", size: "380 KB", tag: "Quotes" },
    { name: "Foshan Grid Factory profile.pdf",   type: "pdf",   date: "May 12", size: "1.4 MB", tag: "Quotes" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Calendar events  (P2)
// ─────────────────────────────────────────────────────────────────────────────
const CALENDAR_EVENTS: CalendarEvent[] = [
  { day: 15, month: 4, label: "Balance due $8,960",  po: "PO-0142", type: "payment",   status: "at-risk"  },
  { day: 17, month: 4, label: "Ex-Factory",           po: "PO-0142", type: "exfactory", status: "at-risk"  },
  { day: 18, month: 4, label: "Balance due $11,900", po: "PO-0157", type: "payment",   status: "delayed"  },
  { day: 18, month: 4, label: "Ex-Factory",           po: "PO-0157", type: "exfactory", status: "delayed"  },
  { day: 22, month: 4, label: "Ex-Factory",           po: "PO-0160", type: "exfactory", status: "on-track" },
  { day: 22, month: 4, label: "Balance due $21,700", po: "PO-0160", type: "payment",   status: "on-track" },
  { day:  1, month: 5, label: "Deposit due $2,250",  po: "PO-0168", type: "payment",   status: "on-track" },
  { day:  2, month: 5, label: "Ex-Factory",           po: "PO-0165", type: "exfactory", status: "at-risk"  },
  { day:  2, month: 5, label: "Balance due $3,780",  po: "PO-0165", type: "payment",   status: "at-risk"  },
  { day: 10, month: 5, label: "Ex-Factory",           po: "PO-0168", type: "exfactory", status: "on-track" },
  { day: 25, month: 5, label: "Balance due $5,250",  po: "PO-0168", type: "payment",   status: "on-track" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Buyer chatbot data  (P3)
// ─────────────────────────────────────────────────────────────────────────────
const BUYER_CHATS: BuyerChat[] = [
  { id: "bc1", buyer: "Vellum Studio",          question: "Where is my serving fork order?",      botAnswer: "Your order PO-2026-0142 (Stainless Serving Fork) is at Sample Approval stage. Ex-factory target is May 17. We'll email you once goods ship.",          time: "10:15 AM", po: "PO-0142", resolved: true  },
  { id: "bc2", buyer: "Northbound Outfitters",  question: "Is my LED light order running late?",  botAnswer: "PO-2026-0157 is currently showing a 2-day delay due to production backlog. Revised ex-factory: May 20. You'll receive a shipping notification automatically.", time: "9:48 AM",  po: "PO-0157", resolved: true  },
  { id: "bc3", buyer: "Marlowe & Sons",         question: "What's happening with my hanger order?", botAnswer: "PO-2026-0165 is at Ex-Factory stage but there's a 4-day port congestion delay at Tianjin. New estimated delivery has been pushed to June 10.", time: "Yesterday", po: "PO-0165", resolved: false },
  { id: "bc4", buyer: "Pioneer Goods Co.",      question: "Has my flooring passed QC?",            botAnswer: "Yes! PO-2026-0160 passed AQL 2.5 QC inspection on May 12 with only 2 minor defects. Ex-factory confirmed May 22. Balance payment needed to release the container.", time: "Mon", po: "PO-0160", resolved: true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shipments + Messages + Tasks + Suppliers  (unchanged from P0)
// ─────────────────────────────────────────────────────────────────────────────
const INIT_SHIPMENTS: Shipment[] = [
  { id:"s1", po:"PO-2026-0142", product:"Stainless Serving Fork — Brushed Nickel",    supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"at-risk",  currentStageId:"sample_apr", dueDate:"May 17", payments:[{ label:"Deposit (30%)", percent:30, amountUsd:3840,  paid:true,  dueDate:"Apr 02" },{ label:"Balance (70%)", percent:70, amountUsd:8960,  paid:false, dueDate:"May 15" }], quotes:[{ factory:"Guangzhou Metalworks",  country:"CN", unitPrice:0.88, leadDays:28, moq:500,  selected:true  },{ factory:"Foshan Precision Parts", country:"CN", unitPrice:0.93, leadDays:32, moq:1000, selected:false },{ factory:"Ningbo Alloy Co.",        country:"CN", unitPrice:0.91, leadDays:25, moq:2000, selected:false }] },
  { id:"s2", po:"PO-2026-0157", product:"LED Display Cabinet Light — Warm White",     supplier:"Shenzhen LEDPro",      customer:"Northbound Outfitters", status:"delayed",  currentStageId:"production",  dueDate:"May 18", payments:[{ label:"Deposit (30%)", percent:30, amountUsd:5100,  paid:true,  dueDate:"Mar 28" },{ label:"Balance (70%)", percent:70, amountUsd:11900, paid:false, dueDate:"May 18" }], quotes:[{ factory:"Shenzhen LEDPro",      country:"CN", unitPrice:4.20, leadDays:35, moq:200,  selected:true  },{ factory:"Dongguan BrightTech",    country:"CN", unitPrice:4.45, leadDays:30, moq:500,  selected:false },{ factory:"Foshan LightMaster",     country:"CN", unitPrice:4.15, leadDays:42, moq:1000, selected:false }] },
  { id:"s3", po:"PO-2026-0160", product:"Engineered Oak Flooring — Herringbone",      supplier:"Hangzhou Timber Co.",  customer:"Pioneer Goods Co.",     status:"on-track", currentStageId:"qc",          dueDate:"May 22", payments:[{ label:"Deposit (30%)", percent:30, amountUsd:9300,  paid:true,  dueDate:"Apr 10" },{ label:"Balance (70%)", percent:70, amountUsd:21700, paid:false, dueDate:"May 22" }] },
  { id:"s4", po:"PO-2026-0165", product:"Chrome Retail Hanger — Heavy Duty",          supplier:"Tianjin Wire Works",   customer:"Marlowe & Sons",        status:"at-risk",  currentStageId:"ex_factory",  dueDate:"Jun 02", payments:[{ label:"Deposit (30%)", percent:30, amountUsd:1620,  paid:true,  dueDate:"Apr 18" },{ label:"Balance (70%)", percent:70, amountUsd:3780,  paid:false, dueDate:"Jun 02" }] },
  { id:"s5", po:"PO-2026-0168", product:"Powder-Coat Grid Panel Display",              supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"on-track", currentStageId:"quotes",      dueDate:"Jun 10", payments:[{ label:"Deposit (30%)", percent:30, amountUsd:2250,  paid:false, dueDate:"Jun 01" },{ label:"Balance (70%)", percent:70, amountUsd:5250,  paid:false, dueDate:"Jun 25" }], quotes:[{ factory:"Guangzhou Metalworks",  country:"CN", unitPrice:6.40, leadDays:30, moq:200, selected:false },{ factory:"Foshan Grid Factory",    country:"CN", unitPrice:6.10, leadDays:35, moq:500, selected:true  },{ factory:"Ningbo Display Parts",   country:"CN", unitPrice:6.75, leadDays:28, moq:100, selected:false }] },
];

const INIT_MESSAGES: Message[] = [
  { id:"m1", sender:"Guangzhou Metalworks", channel:"whatsapp", timestamp:"10:42 AM", snippet:"Strike-off finish coat needs +2 days, polishing line backed up. Please advise.", fullBody:"Hi team, quick update. The sample approval finish coat needs +2 days — our polishing line is backed up. Please advise if we can proceed. If we push this, Ex-Factory moves to May 17.", unread:true,  aiTags:["risk: delay 2d","milestone: sample approval"], shipmentId:"s1", supplierId:"Guangzhou Metalworks", aiDraft:"Understood — please proceed with the delay. We'll update PO-2026-0142 ex-factory to May 17. Please confirm revised schedule in writing.", aiAction:"Approve delay and update PO-2026-0142 timeline" },
  { id:"m2", sender:"Shenzhen LEDPro",      channel:"gmail",    timestamp:"Yesterday", snippet:"Production update: PCB soldering complete, entering housing assembly. On track for May 18.", fullBody:"Hello,\n\nProduction update on PO-2026-0157. PCB soldering is complete and units are now entering housing assembly. We are currently on track for May 18 ex-factory.\n\nBalance payment of $11,900 will be due before release.\n\nBest,\nDavid Chen", unread:false, aiTags:["milestone: production","payment: balance due"], shipmentId:"s2", supplierId:"Shenzhen LEDPro", aiDraft:"Thanks David — noted on progress. Please send final QC photos before ex-factory release. We'll arrange balance wire transfer once inspection passes.", aiAction:"Acknowledge update and schedule QC inspection" },
  { id:"m3", sender:"Tianjin Wire Works",   channel:"whatsapp", timestamp:"Yesterday", snippet:"Port congestion at Tianjin — export delay 4 days. Revised ex-factory June 6.", fullBody:"Hi! Heads up — major port congestion at Tianjin terminal. Our freight forwarder has revised our export slot by 4 days. New ex-factory date: June 6. Please advise Marlowe & Sons and update their expected delivery.", unread:true,  aiTags:["risk: port congestion","delay: 4d"], shipmentId:"s4", supplierId:"Tianjin Wire Works", aiDraft:"Hi — understood on the Tianjin congestion. Please send revised packing schedule. We'll notify Marlowe & Sons and update the tracker accordingly.", aiAction:"Approve 4-day delay and notify Marlowe & Sons" },
  { id:"m4", sender:"Cost Sheet — PO-0168",channel:"sheets",   timestamp:"Tue",       snippet:"Cell D18 updated: Grid panel unit price $6.10 (Foshan quote selected). Margin: 34.2%", fullBody:"Automated update from Google Sheets — Costing Tracker:\nCell D18 updated: Grid panel unit price $6.10 (Foshan Grid Factory selected).\nSelling price: $9.25. Margin: 34.2%.\nTotal PO value: $7,500 (1,250 units).", unread:false, aiTags:["update: quote selected","margin: 34.2%"], shipmentId:"s5", supplierId:"Guangzhou Metalworks", aiDraft:"", aiAction:"Acknowledge quote selection and issue deposit invoice" },
  { id:"m5", sender:"Hangzhou Timber Co.", channel:"pdf",     timestamp:"Mon",       snippet:"QC inspection passed — 840 sqm, AQL 2.5. SGS report attached. Ex-factory cleared May 22.", fullBody:"Please find attached the SGS inspection report.\n\nQC result: PASSED\nAQL 2.5 standard · 840 sqm inspected · 2 minor defects · 0 major\nEx-factory date confirmed: May 22, 2026.\n\nBalance payment of $21,700 required before container release.", unread:false, aiTags:["milestone: QC passed","payment: balance due"], shipmentId:"s3", supplierId:"Hangzhou Timber Co.", aiDraft:"Thank you — SGS report received and QC pass confirmed. We will arrange balance wire of $21,700 by May 20. Please send commercial invoice and packing list.", aiAction:"Confirm QC pass and schedule balance payment" },
];

const INIT_TASKS: Task[] = [
  { id:"t1", title:"Approve 2-day delay — Guangzhou Metalworks (PO-0142)",          source:"WhatsApp · Guangzhou Metalworks", sourceAge:"2h ago",    urgency:"high",   shipmentId:"s1", messageId:"m1", action:"Reply & Update" },
  { id:"t2", title:"Balance payment overdue — PO-2026-0142 ($8,960) was due May 15",source:"Payment tracker",                 sourceAge:"Today",     urgency:"high",   shipmentId:"s1",              action:"Send Payment"  },
  { id:"t3", title:"Port congestion reply needed — Tianjin Wire Works (PO-0165)",   source:"WhatsApp · Tianjin Wire Works",   sourceAge:"Yesterday", urgency:"high",   shipmentId:"s4", messageId:"m3", action:"Reply"         },
  { id:"t4", title:"Select factory quote — PO-2026-0168 (Grid Panel Display)",      source:"Costing Sheet update",            sourceAge:"2d ago",    urgency:"medium", shipmentId:"s5", messageId:"m4", action:"Review Quotes"  },
  { id:"t5", title:"Schedule QC inspection — Shenzhen LEDPro entering final assembly",source:"Gmail · Shenzhen LEDPro",       sourceAge:"Yesterday", urgency:"medium", shipmentId:"s2", messageId:"m2", action:"Book Inspection"},
  { id:"t6", title:"Arrange balance wire $21,700 — Hangzhou Timber (PO-0160)",      source:"PDF · SGS Report",                sourceAge:"Mon",       urgency:"medium", shipmentId:"s3", messageId:"m5", action:"Initiate Wire"  },
];


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const chIcon = (ch: Channel, sz = 12) => {
  if (ch === "whatsapp") return <MessageCircle size={sz} className="text-emerald-500" />;
  if (ch === "gmail")    return <Mail size={sz} className="text-blue-500" />;
  if (ch === "wechat")   return <MessageSquare size={sz} className="text-green-600" />;
  if (ch === "imessage") return <MessageCircle size={sz} className="text-blue-400" />;
  if (ch === "sms")      return <MessageCircle size={sz} className="text-purple-500" />;
  if (ch === "sheets")   return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>;
  return <FileText size={sz} className="text-red-500" />;
};
const statusCls = (s: ShipmentStatus) => s === "on-track" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : s === "delayed" ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100";
const urgencyCls = (u: Task["urgency"]) => u === "high" ? "bg-red-50 text-red-600 border-red-100" : u === "medium" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";
const docIcon = (type: Doc["type"], sz = 14) => {
  if (type === "pdf")   return <FileText size={sz} className="text-red-500" />;
  if (type === "image") return <Image size={sz} className="text-blue-400" />;
  if (type === "sheet") return <FileSpreadsheet size={sz} className="text-green-600" />;
  return <Video size={sz} className="text-purple-500" />;
};
const eventColor = (e: CalendarEvent) => {
  if (e.type === "payment")   return e.status === "delayed" || e.status === "at-risk" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200";
  if (e.type === "exfactory") return e.status === "delayed" ? "bg-red-100 text-red-700 border-red-200" : e.status === "at-risk" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-[#9000FF]/10 text-[#9000FF] border-[#9000FF]/20";
  return "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";
};


// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [message, onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#212833] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom-5">
      <CheckCircle2 size={16} className="text-emerald-400" />
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage Config Modal
// ─────────────────────────────────────────────────────────────────────────────
function StageConfigModal({ stages, onSave, onClose }: { stages: Stage[]; onSave: (s: Stage[]) => void; onClose: () => void }) {
  const [local, setLocal] = useState([...stages]);
  const remove = (id: string) => setLocal(l => l.filter(x => x.id !== id));
  const add = () => { const id = "s" + Date.now(); setLocal([...local, { id, label: "New Stage" }]); };
  const update = (id: string, label: string) => setLocal(l => l.map(x => x.id === id ? { ...x, label } : x));
  
  return (
    <div className="fixed inset-0 z-50 bg-[#212833]/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-[#FAFBFC]">
          <div><h2 className="text-sm font-bold text-[#212833]">Workflow Stages</h2><p className="text-[11px] text-[#5E687B] mt-0.5">Customize your supply chain milestones.</p></div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#E5EAF0] rounded-md text-[#5E687B]"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {local.map((st, i) => (
              <div key={st.id} className="flex items-center gap-3 bg-white border border-[#E5EAF0] p-2.5 rounded-lg shadow-sm hover:border-[#D6E3EB] transition-colors group">
                <div className="w-5 h-5 rounded-full bg-[#F0F4F8] text-[#5E687B] flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                <input type="text" value={st.label} onChange={e => update(st.id, e.target.value)} className="flex-1 text-sm font-medium text-[#212833] outline-none border border-transparent focus:border-[#9000FF]/30 px-2 py-1 rounded" />
                <button onClick={() => remove(st.id)} className="text-[#9E9FAE] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                <div className="text-[#C0C8D4] cursor-grab active:cursor-grabbing p-1"><GripVertical size={14}/></div>
              </div>
            ))}
          </div>
          <button onClick={add} className="mt-4 w-full py-2.5 border-2 border-dashed border-[#E5EAF0] rounded-lg text-xs font-semibold text-[#5E687B] hover:text-[#212833] hover:border-[#D6E3EB] hover:bg-[#FAFBFC] transition-all flex items-center justify-center gap-1.5"><Plus size={14}/>Add Stage</button>
        </div>
        <div className="p-4 border-t border-[#E5EAF0] bg-[#FAFBFC] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#5E687B] hover:text-[#212833] transition-colors">Cancel</button>
          <button onClick={() => { onSave(local); onClose(); }} className="px-5 py-2 bg-[#9000FF] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#7A00D9] transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment chip
// ─────────────────────────────────────────────────────────────────────────────
function PaymentStatus({ payments }: { payments: Payment[] }) {
  const dep = payments[0];
  const bal = payments[1];
  const overdue = bal != null && !bal.paid && new Date(`${bal.dueDate} 2026`) < new Date();
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${dep.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}><DollarSign size={8}/>{dep.percent}% {dep.paid?"paid":"due "+dep.dueDate}</div>
      {bal != null && <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${bal.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":overdue?"bg-red-50 text-red-600 border-red-100 animate-pulse":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}><CreditCard size={8}/>{bal.percent}% {bal.paid?"paid":overdue?"OVERDUE":"due "+bal.dueDate}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quote panel
// ─────────────────────────────────────────────────────────────────────────────
function QuotePanel({ quotes, shipmentId, onSelect }: { quotes: FactoryQuote[]; shipmentId: string; onSelect: (sid: string, idx: number) => void }) {
  return (
    <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3.5 mb-4">
      <div className="flex items-center gap-2 mb-3"><Sparkles size={12} className="text-[#9000FF]"/><span className="text-[10px] font-bold text-[#9000FF] uppercase tracking-wider">Factory Quotes</span><span className="text-[9px] text-[#5E687B] ml-auto">Click to select</span></div>
      <div className="flex flex-col gap-2">
        {quotes.map((q,idx) => (
          <button key={q.factory} onClick={() => onSelect(shipmentId,idx)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${q.selected?"border-[#9000FF]/40 bg-white shadow-sm":"border-[#E5EAF0] bg-white hover:border-[#9000FF]/20"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${q.selected?"border-[#9000FF] bg-[#9000FF]":"border-[#D6E3EB]"}`}>{q.selected&&<Check size={9} className="text-white"/>}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#212833] flex items-center gap-1.5">{q.factory}<span className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-1 rounded border border-[#E5EAF0] font-normal">{q.country}</span>{q.selected&&<span className="text-[9px] bg-[#9000FF]/10 text-[#9000FF] px-1.5 rounded font-semibold">Selected</span>}</div>
              <div className="flex gap-3 mt-0.5 text-[9px] text-[#5E687B]"><span>MOQ {q.moq.toLocaleString()}</span><span>{q.leadDays}d lead</span></div>
            </div>
            <div className={`text-sm font-bold shrink-0 ${q.selected?"text-[#9000FF]":"text-[#212833]"}`}>${q.unitPrice.toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task list
// ─────────────────────────────────────────────────────────────────────────────
function TaskList({ tasks, onOpenMessage, onDismiss, onClose }: { tasks: Task[]; onOpenMessage: (id: string) => void; onDismiss: (id: string) => void; onClose: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="px-3 pt-3 pb-1"><div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2 flex items-center gap-1"><Zap size={9} className="text-[#9000FF]"/>AI-generated from email analysis</div></div>
      {tasks.length===0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-[#5E687B]"><CheckCircle2 size={22} className="text-emerald-400"/><p className="text-xs font-medium">All clear — inbox is clean</p></div>
      ) : tasks.map((task,i) => (
        <div key={task.id} className="mx-3 mb-2 bg-white border border-[#E5EAF0] rounded-lg p-2.5 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 mt-0.5 shrink-0"><span className="text-[9px] text-[#9E9FAE] font-medium w-3">{i+1}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${urgencyCls(task.urgency)}`}>{task.urgency}</span></div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#212833] leading-tight mb-1">{task.title}</div>
              <div className="text-[9px] text-[#5E687B] flex items-center gap-1 mb-2"><CalendarClock size={8}/>{task.source} · {task.sourceAge}</div>
              <div className="flex gap-1.5 flex-wrap">
                {task.messageId&&<button onClick={()=>{onOpenMessage(task.messageId!);onClose();}} className="text-[9px] bg-[#9000FF] text-white px-2 py-1 rounded font-semibold hover:bg-[#7A00D9] flex items-center gap-1"><ArrowRight size={8}/>{task.action}</button>}
                <button onClick={()=>onDismiss(task.id)} className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-2 py-1 rounded font-medium hover:bg-[#E5EAF0]">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="px-3 pt-1 pb-3"><button className="text-[10px] text-[#9000FF] font-semibold hover:underline flex items-center gap-1">View all 12 tasks<ArrowRight size={9}/></button></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar View  (P2)
// ─────────────────────────────────────────────────────────────────────────────
function CalendarView({ shipments }: { shipments: Shipment[] }) {
  const [viewMonth, setViewMonth] = useState(4); // 4=May, 5=Jun
  const [selectedDay, setSelectedDay] = useState<number|null>(null);
  const monthName = viewMonth === 4 ? "May 2026" : "June 2026";
  // May 2026: starts Friday (day 5, 0=Sun); 31 days. Jun: starts Mon (day 1), 30 days.
  const firstDow = viewMonth === 4 ? 5 : 1;
  const daysInMonth = viewMonth === 4 ? 31 : 30;
  const eventsThisMonth = CALENDAR_EVENTS.filter(e => e.month === viewMonth);
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  eventsThisMonth.forEach(e => { if (!eventsByDay[e.day]) eventsByDay[e.day] = []; eventsByDay[e.day].push(e); });
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];
  const totalCells = firstDow + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today = 15; // May 15 is "today"

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Calendar grid */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={()=>setViewMonth(m=>Math.max(4,m-1))} className="p-1.5 hover:bg-[#F0F4F8] rounded-md text-[#5E687B] transition-colors"><ChevronLeft size={16}/></button>
            <h2 className="font-bold text-base text-[#212833]">{monthName}</h2>
            <button onClick={()=>setViewMonth(m=>Math.min(5,m+1))} className="p-1.5 hover:bg-[#F0F4F8] rounded-md text-[#5E687B] transition-colors"><ChevronRight size={16}/></button>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#9000FF] inline-block"/>Ex-Factory</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>Payment</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/>Overdue / Delayed</span>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d=><div key={d} className="text-[10px] font-bold text-[#5E687B] text-center uppercase tracking-wider pb-2">{d}</div>)}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-0.5 flex-1">
          {Array.from({length:rows*7}).map((_,i)=>{
            const day = i - firstDow + 1;
            const valid = day >= 1 && day <= daysInMonth;
            const isToday = valid && day === today && viewMonth === 4;
            const isSelected = valid && day === selectedDay;
            const evts = valid ? (eventsByDay[day] ?? []) : [];
            return (
              <div key={i} onClick={()=>valid&&setSelectedDay(isSelected?null:day)}
                className={`min-h-[80px] p-1.5 rounded-lg border transition-all ${!valid?"opacity-0 pointer-events-none":isSelected?"border-[#9000FF]/40 bg-[#FAFBFF] cursor-pointer":isToday?"border-[#9000FF]/20 bg-[#9000FF]/5 cursor-pointer":"border-[#E5EAF0] hover:border-[#D6E3EB] cursor-pointer hover:bg-[#FAFBFC]"}`}>
                {valid&&(
                  <>
                    <div className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday?"bg-[#9000FF] text-white":isSelected?"text-[#9000FF]":"text-[#212833]"}`}>{day}</div>
                    <div className="flex flex-col gap-0.5">
                      {evts.slice(0,2).map((e,ei)=>(
                        <div key={ei} className={`text-[8px] font-semibold px-1 py-0.5 rounded border truncate flex items-center gap-1 ${eventColor(e)}`}>{e.po} {e.type==="payment"?<CreditCard size={8}/>:<MapPin size={8}/>}</div>
                      ))}
                      {evts.length>2&&<div className="text-[8px] text-[#5E687B] font-medium pl-0.5">+{evts.length-2} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel: selected day detail or summary */}
      <div className="w-[280px] border-l border-[#E5EAF0] bg-[#FAFBFC] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#E5EAF0]">
          <div className="text-xs font-bold text-[#212833]">{selectedDay ? `${monthName.split(" ")[0]} ${selectedDay}` : "Key Dates"}</div>
          <div className="text-[10px] text-[#5E687B] mt-0.5">{selectedDay ? `${selectedEvents.length} event${selectedEvents.length!==1?"s":""}` : "Click a date to see details"}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {(selectedDay ? selectedEvents : eventsThisMonth).map((e,i)=>(
            <div key={i} className="bg-white border border-[#E5EAF0] rounded-lg p-3 shadow-sm">
              <div className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border inline-flex items-center gap-1 mb-2 ${eventColor(e)}`}>
                {e.type==="payment"?<CreditCard size={8}/>:<MapPin size={8}/>}
                {e.type.replace("exfactory","Ex-Factory").replace("payment","Payment")}
              </div>
              <div className="text-xs font-semibold text-[#212833] mb-0.5">{e.label}</div>
              <div className="text-[10px] text-[#5E687B] flex items-center gap-1"><span className="font-mono bg-[#F0F4F8] px-1 rounded text-[8px]">{e.po}</span>{!selectedDay&&<span>· {monthName.split(" ")[0]} {e.day}</span>}</div>
            </div>
          ))}
          {selectedDay && selectedEvents.length===0&&(
            <div className="flex flex-col items-center justify-center py-8 text-[#5E687B] gap-2"><Calendar size={20} className="opacity-30"/><p className="text-xs">No events this day</p></div>
          )}
        </div>
        {/* Summary stats */}
        <div className="p-3 border-t border-[#E5EAF0]">
          <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">This Month</div>
          <div className="grid grid-cols-2 gap-2">
            {[{label:"Payments due", value: eventsThisMonth.filter(e=>e.type==="payment").length, cls:"text-amber-600"},{label:"Ex-factory", value:eventsThisMonth.filter(e=>e.type==="exfactory").length, cls:"text-[#9000FF]"}].map(s=>(
              <div key={s.label} className="bg-white rounded-lg border border-[#E5EAF0] p-2 text-center shadow-sm">
                <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
                <div className="text-[9px] text-[#5E687B]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Buyers Chatbot View  (P3)
// ─────────────────────────────────────────────────────────────────────────────
function BuyersView() {
  const [activeChat, setActiveChat] = useState<BuyerChat>(BUYER_CHATS[0]);
  const [input, setInput] = useState("");
  const [extraMessages, setExtraMessages] = useState<{q:string;a:string}[]>([]);
  const send = () => {
    if (!input.trim()) return;
    setExtraMessages(prev => [...prev, { q: input, a: `I'm checking the latest status on that for you. Based on our tracker, your order is progressing as expected. Would you like me to send you an email notification when the shipment is dispatched?` }]);
    setInput("");
  };
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: buyer list */}
      <div className="w-[240px] border-r border-[#E5EAF0] bg-[#FAFBFC] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#E5EAF0]">
          <div className="text-xs font-bold text-[#212833] mb-0.5 flex items-center gap-2"><Bot size={14} className="text-[#9000FF]"/>Buyer Chatbot</div>
          <div className="text-[10px] text-[#5E687B]">Auto-answers buyer shipment queries</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {BUYER_CHATS.map(c=>(
            <button key={c.id} onClick={()=>{setActiveChat(c);setExtraMessages([]);}}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all ${activeChat.id===c.id?"border-[#9000FF]/30 bg-white shadow-sm":"border-[#E5EAF0] bg-white hover:border-[#D6E3EB]"}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-semibold text-[#212833] truncate">{c.buyer}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${c.resolved?"bg-emerald-400":"bg-amber-400"}`}/>
              </div>
              <div className="text-[10px] text-[#5E687B] truncate">{c.question}</div>
              <div className="text-[9px] text-[#9E9FAE] mt-0.5">{c.time} · {c.po}</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-[#E5EAF0]">
          <div className="text-[9px] text-[#5E687B] text-center">Widget embeds on buyer's website</div>
          <button className="mt-1.5 w-full text-[10px] text-[#9000FF] font-semibold flex items-center justify-center gap-1 hover:underline"><Link2 size={10}/>Get embed code</button>
        </div>
      </div>

      {/* Center: chat simulation */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="border-b border-[#E5EAF0] px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-bold text-[#212833] flex items-center gap-2">{activeChat.buyer}<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${activeChat.resolved?"bg-emerald-50 text-emerald-600 border border-emerald-100":"bg-amber-50 text-amber-600 border border-amber-100"}`}>{activeChat.resolved?"Resolved":"Pending"}</span></div>
            <div className="text-[10px] text-[#5E687B]">{activeChat.po} · {activeChat.time}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[10px] text-[#5E687B] border border-[#E5EAF0] px-2.5 py-1 rounded-md hover:bg-[#F0F4F8] font-medium transition-colors flex items-center gap-1"><ArrowUpRight size={11}/>Open PO</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Buyer question */}
          <div className="flex justify-end">
            <div className="max-w-[70%] bg-[#F0F4F8] text-[#212833] px-4 py-2.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed">{activeChat.question}</div>
          </div>
          {/* Bot response */}
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0"><Bot size={14} className="text-[#9000FF]"/></div>
            <div className="max-w-[80%]">
              <div className="bg-white border border-[#E5EAF0] shadow-sm text-[#212833] px-4 py-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed">{activeChat.botAnswer}</div>
              <div className="text-[9px] text-[#9E9FAE] mt-1 ml-1">FlowForge Bot · {activeChat.time}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["Track shipment","Payment status","Contact supplier"].map(a=>(
                  <button key={a} className="text-[9px] bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/15 font-semibold transition-colors">{a}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Extra messages */}
          {extraMessages.map((m,i)=>(
            <React.Fragment key={i}>
              <div className="flex justify-end"><div className="max-w-[70%] bg-[#F0F4F8] text-[#212833] px-4 py-2.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed">{m.q}</div></div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0"><Bot size={14} className="text-[#9000FF]"/></div>
                <div className="max-w-[80%] bg-white border border-[#E5EAF0] shadow-sm text-[#212833] px-4 py-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed">{m.a}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="p-4 border-t border-[#E5EAF0] bg-white shrink-0">
          <div className="text-[9px] text-[#5E687B] mb-2 flex items-center gap-1"><Eye size={9}/>Preview as buyer</div>
          <div className="flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a buyer question to test..." className="flex-1 px-3 py-2 text-xs border border-[#E5EAF0] rounded-lg outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10"/>
            <button onClick={send} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${input.trim()?"bg-[#9000FF] text-white hover:bg-[#7A00D9]":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}><Send size={11}/>Send</button>
          </div>
        </div>
      </div>

      {/* Right: analytics */}
      <div className="w-[240px] border-l border-[#E5EAF0] bg-[#FAFBFC] flex flex-col shrink-0 p-4">
        <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-3">Bot Performance</div>
        {[{ label:"Queries this week", value:"14", sub:"↑ 3 vs last week", pos:true },{ label:"Auto-resolved", value:"11", sub:"78.5% resolution rate", pos:true },{ label:"Escalated to you", value:"3", sub:"Port delay + payment q.", pos:false },{ label:"Avg response time", value:"<1s", sub:"vs 4h manual", pos:true }].map(s=>(
          <div key={s.label} className="bg-white border border-[#E5EAF0] rounded-lg p-3 mb-2 shadow-sm">
            <div className="text-[9px] text-[#5E687B] mb-1">{s.label}</div>
            <div className="text-lg font-bold text-[#212833]">{s.value}</div>
            <div className={`text-[9px] font-semibold ${s.pos?"text-emerald-600":"text-amber-500"}`}>{s.sub}</div>
          </div>
        ))}
        <div className="mt-auto">
          <button className="w-full text-[10px] bg-[#9000FF] text-white py-2 rounded-lg font-semibold hover:bg-[#7A00D9] transition-colors flex items-center justify-center gap-1.5"><ArrowUpRight size={11}/>Chatbot Settings</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel Import View  (P3)
// ─────────────────────────────────────────────────────────────────────────────
const IMPORT_COLUMNS = [
  { sheet: "PO Number",       mapped: "po",          confidence: 99 },
  { sheet: "Product Name",    mapped: "product",     confidence: 97 },
  { sheet: "Supplier",        mapped: "supplier",    confidence: 95 },
  { sheet: "Customer/Buyer",  mapped: "customer",    confidence: 88 },
  { sheet: "Factory Cost",    mapped: "unit_cost",   confidence: 96 },
  { sheet: "Selling Price",   mapped: "sell_price",  confidence: 91 },
  { sheet: "Ex-Factory Date", mapped: "due_date",    confidence: 94 },
  { sheet: "Status",          mapped: "status",      confidence: 82 },
  { sheet: "30% Deposit Due", mapped: "deposit_due", confidence: 76 },
  { sheet: "70% Balance Due", mapped: "balance_due", confidence: 74 },
];

function ImportView({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<0|1|2|3>(0);
  const [dragging, setDragging] = useState(false);

  const STEPS = ["Connect source","Map columns","Preview data","Import"];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto bg-white">
      <div className="w-full max-w-[720px]">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s,i)=>(
            <React.Fragment key={s}>
              <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setStep(i as 0|1|2|3)}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i<step?"bg-[#9000FF] text-white":i===step?"bg-[#9000FF] text-white ring-4 ring-[#9000FF]/20":"bg-[#F0F4F8] text-[#5E687B]"}`}>{i<step?<Check size={12}/>:i+1}</div>
                <span className={`text-xs font-medium ${i===step?"text-[#9000FF]":i<step?"text-[#212833]":"text-[#9E9FAE]"}`}>{s}</span>
              </div>
              {i<STEPS.length-1&&<div className={`flex-1 h-px mx-3 ${i<step?"bg-[#9000FF]":"bg-[#E5EAF0]"}`}/>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0 — connect */}
        {step===0&&(
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#212833] mb-1">Connect your tracker</h2>
              <p className="text-sm text-[#5E687B]">Import from your existing Excel spreadsheet or Google Sheet.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={()=>setStep(1)} className="border-2 border-dashed border-[#E5EAF0] hover:border-[#9000FF]/40 hover:bg-[#FAFBFF] rounded-xl p-6 flex flex-col items-center gap-3 transition-all group">
                <FileSpreadsheet size={32} className="text-green-600"/>
                <div className="text-center"><div className="text-sm font-semibold text-[#212833]">Excel / CSV</div><div className="text-[11px] text-[#5E687B]">Upload .xlsx or .csv file</div></div>
                <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={()=>{setDragging(false);setStep(1)}}
                  className={`w-full border border-dashed rounded-lg py-3 text-[10px] text-center transition-all ${dragging?"border-[#9000FF] bg-[#9000FF]/5 text-[#9000FF]":"border-[#E5EAF0] text-[#9E9FAE] group-hover:border-[#9000FF]/30"}`}>
                  {dragging?"Drop to import":"Drag & drop here"}
                </div>
              </button>
              <button onClick={()=>setStep(1)} className="border-2 border-dashed border-[#E5EAF0] hover:border-[#9000FF]/40 hover:bg-[#FAFBFF] rounded-xl p-6 flex flex-col items-center gap-3 transition-all">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                <div className="text-center"><div className="text-sm font-semibold text-[#212833]">Google Sheets</div><div className="text-[11px] text-[#5E687B]">Connect via Google</div></div>
                <button className="w-full border border-[#E5EAF0] rounded-lg py-2 text-[10px] text-[#5E687B] hover:bg-[#F0F4F8] transition-colors">Sign in with Google</button>
              </button>
            </div>
            <p className="text-[10px] text-[#9E9FAE] text-center">Your data is encrypted and never shared. Supported: .xlsx, .csv, Google Sheets</p>
          </div>
        )}

        {/* Step 1 — column mapping */}
        {step===1&&(
          <div>
            <div className="text-center mb-6"><h2 className="text-xl font-bold text-[#212833] mb-1">Map your columns</h2><p className="text-sm text-[#5E687B]">We detected your spreadsheet. Confirm the column mapping below.</p></div>
            <div className="border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm mb-6">
              <div className="grid grid-cols-3 bg-[#F0F4F8] px-4 py-2.5 text-[9px] font-bold text-[#5E687B] uppercase tracking-wider border-b border-[#E5EAF0]">
                <span>Your Column</span><span>Maps to</span><span>Confidence</span>
              </div>
              {IMPORT_COLUMNS.map(col=>(
                <div key={col.sheet} className="grid grid-cols-3 px-4 py-2.5 border-b border-[#E5EAF0] last:border-b-0 items-center hover:bg-[#FAFBFC] transition-colors">
                  <span className="text-xs font-medium text-[#212833]">{col.sheet}</span>
                  <span className="flex items-center gap-2 text-xs text-[#5E687B]"><ArrowRight size={12} className="text-[#9000FF]"/><span className="font-mono text-[10px] bg-[#F0F4F8] px-1.5 py-0.5 rounded">{col.mapped}</span></span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#F0F4F8] rounded-full overflow-hidden"><div className={`h-full rounded-full ${col.confidence>=90?"bg-emerald-400":col.confidence>=75?"bg-amber-400":"bg-red-400"}`} style={{width:`${col.confidence}%`}}/></div>
                    <span className={`text-[9px] font-bold w-7 ${col.confidence>=90?"text-emerald-600":col.confidence>=75?"text-amber-500":"text-red-500"}`}>{col.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={()=>setStep(0)} className="text-xs text-[#5E687B] hover:text-[#212833] flex items-center gap-1"><ChevronLeft size={13}/>Back</button>
              <button onClick={()=>setStep(2)} className="px-5 py-2 bg-[#9000FF] text-white text-xs font-semibold rounded-lg hover:bg-[#7A00D9] transition-colors shadow-sm">Confirm mapping</button>
            </div>
          </div>
        )}

        {/* Step 2 — preview */}
        {step===2&&(
          <div>
            <div className="text-center mb-6"><h2 className="text-xl font-bold text-[#212833] mb-1">Preview import</h2><p className="text-sm text-[#5E687B]">5 POs detected from your spreadsheet. Review before importing.</p></div>
            <div className="border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm mb-6 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F0F4F8]"><tr>{["PO","Product","Supplier","Cost","Margin","Ex-Factory","Status"].map(h=><th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold text-[#5E687B] uppercase tracking-wider border-b border-[#E5EAF0] whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {[["PO-0142","Stainless Fork","Guangzhou Metalworks","$0.88","28%","May 17","At Risk"],["PO-0157","LED Cabinet Light","Shenzhen LEDPro","$4.20","31%","May 18","Delayed"],["PO-0160","Oak Flooring","Hangzhou Timber","$18.50","34%","May 22","On Track"],["PO-0165","Chrome Hanger","Tianjin Wire Works","$2.70","25%","Jun 02","At Risk"],["PO-0168","Grid Panel","Guangzhou Metalworks","$6.10","34%","Jun 10","On Track"]].map((row,i)=>(
                    <tr key={i} className="border-b border-[#E5EAF0] last:border-b-0 hover:bg-[#FAFBFC]">
                      {row.map((cell,j)=>(
                        <td key={j} className="px-3 py-2.5 text-[#212833]">
                          {j===6?<span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cell==="On Track"?"bg-emerald-50 text-emerald-600 border-emerald-100":cell==="Delayed"?"bg-red-50 text-red-600 border-red-100":"bg-amber-50 text-amber-600 border-amber-100"}`}>{cell}</span>:<span className={j===0?"font-mono text-[10px] text-[#5E687B]":""}>{cell}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button onClick={()=>setStep(1)} className="text-xs text-[#5E687B] hover:text-[#212833] flex items-center gap-1"><ChevronLeft size={13}/>Back</button>
              <button onClick={()=>setStep(3)} className="px-5 py-2 bg-[#9000FF] text-white text-xs font-semibold rounded-lg hover:bg-[#7A00D9] transition-colors shadow-sm flex items-center gap-1.5"><Upload size={13}/>Import 5 POs</button>
            </div>
          </div>
        )}

        {/* Step 3 — success */}
        {step===3&&(
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center"><CheckCircle2 size={32} className="text-emerald-500"/></div>
            <div className="text-center"><h2 className="text-xl font-bold text-[#212833] mb-2">Import complete!</h2><p className="text-sm text-[#5E687B]">5 POs successfully imported from your Excel tracker.</p></div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-[400px]">
              {[{v:"5",l:"POs imported"},{v:"10",l:"Milestones mapped"},{v:"2",l:"Alerts triggered"}].map(s=>(
                <div key={s.l} className="bg-white border border-[#E5EAF0] rounded-xl p-3 text-center shadow-sm"><div className="text-2xl font-bold text-[#9000FF]">{s.v}</div><div className="text-[10px] text-[#5E687B]">{s.l}</div></div>
              ))}
            </div>
            <button onClick={onDone} className="px-6 py-2.5 bg-[#9000FF] text-white text-sm font-semibold rounded-lg hover:bg-[#7A00D9] transition-colors shadow-sm">Open Conversation Hub</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Docs panel  (P1) — wired to real API
// ─────────────────────────────────────────────────────────────────────────────
function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    extracted:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    unmatched:  "bg-blue-50 text-blue-600 border-blue-200",
    failed:     "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${map[status] ?? "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
      {status}
    </span>
  );
}

function DocMimeIcon({ mimeType, size = 14 }: { mimeType: string; size?: number }) {
  if (mimeType.startsWith("image/"))    return <Image size={size} className="text-blue-500" />;
  if (mimeType === "application/pdf")   return <FileText size={size} className="text-red-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.endsWith("csv"))
    return <FileSpreadsheet size={size} className="text-green-500" />;
  if (mimeType.startsWith("audio/"))    return <Upload size={size} className="text-purple-500" />;
  return <FileText size={size} className="text-[#5E687B]" />;
}

function DocMimeBg(mimeType: string) {
  if (mimeType.startsWith("image/"))   return "bg-blue-50 border-blue-100";
  if (mimeType === "application/pdf")  return "bg-red-50 border-red-100";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.endsWith("csv")) return "bg-green-50 border-green-100";
  if (mimeType.startsWith("audio/"))   return "bg-purple-50 border-purple-100";
  return "bg-[#F0F4F8] border-[#E5EAF0]";
}

function DocDetailPanel({ doc, onBack }: { doc: DocumentWithExtraction; onBack: () => void }) {
  const ext = doc.extraction;
  const fields = ext?.extractedFields as Record<string, unknown> | undefined;
  const provenance = ext?.fieldProvenance as Record<string, { confidence: number; snippet: string }> | undefined;
  const findings = ext?.reconciliationFindings ?? [];

  const FIELD_LABELS: [string, string][] = [
    ["documentType", "Doc Type"], ["poNumber", "PO Number"], ["invoiceNumber", "Invoice #"],
    ["supplier", "Supplier"], ["buyer", "Buyer"], ["totalAmount", "Total Amount"],
    ["currency", "Currency"], ["incoterms", "Incoterms"], ["paymentTerms", "Payment Terms"],
    ["etd", "ETD"], ["eta", "ETA"], ["qcResult", "QC Result"],
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-[10px] text-[#5E687B] hover:text-[#212833] mb-3">
        <ChevronLeft size={12}/>All documents
      </button>
      <div className="border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm bg-white">
        <div className={`h-16 flex items-center justify-center border-b border-[#E5EAF0] ${DocMimeBg(doc.mimeType)}`}>
          <DocMimeIcon mimeType={doc.mimeType} size={28} />
        </div>
        <div className="p-3 border-b border-[#F0F4F8]">
          <p className="text-xs font-semibold text-[#212833] truncate">{doc.fileName}</p>
          <div className="flex items-center gap-2 mt-1">
            <DocStatusBadge status={doc.status} />
            {ext && <span className="text-[9px] text-[#5E687B]">{Math.round(ext.confidence * 100)}% confidence</span>}
          </div>
        </div>
        {ext && fields && Object.keys(fields).length > 0 && (
          <div className="divide-y divide-[#F0F4F8]">
            {FIELD_LABELS.map(([key, label]) => {
              const val = fields[key];
              if (val == null || val === "") return null;
              const prov = provenance?.[key];
              return (
                <div key={key} className="px-3 py-1.5 group">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-[#5E687B] font-medium w-[100px] shrink-0 pt-0.5">{label}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-[#212833]">{String(val)}</span>
                      {prov?.snippet && (
                        <p className="text-[9px] text-[#5E687B] italic mt-0.5 truncate" title={prov.snippet}>
                          "{prov.snippet}"
                        </p>
                      )}
                    </div>
                    {prov && (
                      <span className="text-[8px] font-bold text-[#9E9FAE] shrink-0 pt-0.5">
                        {Math.round(prov.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {findings.length > 0 && (
          <div className="p-3 border-t border-[#F0F4F8]">
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">
              {findings.length} reconciliation issue{findings.length > 1 ? "s" : ""}
            </p>
            {findings.map((f, i) => {
              const finding = f as Record<string, unknown>;
              return (
                <div key={i} className="text-[10px] text-[#5E687B] flex gap-1.5 mb-0.5">
                  <AlertCircle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>{String(finding.type ?? "")}: expected {String(finding.expected ?? "?")} got {String(finding.actual ?? "?")}</span>
                </div>
              );
            })}
          </div>
        )}
        {ext?.transcriptText && (
          <div className="p-3 border-t border-[#F0F4F8]">
            <p className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-1">Transcript</p>
            <p className="text-[10px] text-[#212833] leading-relaxed line-clamp-6">{ext.transcriptText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocsPanel({ shipmentId }: { shipmentId: string }) {
  const numericId = Number(shipmentId);
  const qParams = { shipmentId: Number.isNaN(numericId) ? undefined : numericId };
  const { data: apiDocs, isLoading, refetch } = useListDocuments(
    qParams,
    { query: { queryKey: getListDocumentsQueryKey(qParams), refetchInterval: 5000 } }
  );
  const docs = apiDocs ?? [];
  const [preview, setPreview] = useState<DocumentWithExtraction | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (!Number.isNaN(numericId)) form.append("shipmentId", String(numericId));
      form.append("sourceChannel", "upload");
      await fetch(`${import.meta.env.BASE_URL}api/documents`, { method: "POST", body: form });
      void refetch();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <input ref={fileInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileChange} />
      {preview ? (
        <DocDetailPanel doc={preview} onBack={() => setPreview(null)} />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">
              {isLoading ? "Loading…" : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[10px] text-[#9000FF] font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <FilePlus size={10}/>{uploading ? "Uploading…" : "Add file"}
            </button>
          </div>
          {!isLoading && docs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-[#5E687B] gap-2">
              <FileBox size={22} className="opacity-30"/>
              <p className="text-xs">No documents attached</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-[#9000FF] font-semibold hover:underline mt-1"
              >
                Upload a file for this PO
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {docs.map(doc => {
              const fields = doc.extraction?.extractedFields as Record<string, unknown> | undefined;
              const docType = fields?.documentType as string | undefined;
              const keyLabel = fields?.totalAmount != null
                ? `${fields.currency ?? ""}${fields.totalAmount}`.trim()
                : fields?.eta
                  ? `ETA ${fields.eta}`
                  : fields?.etd
                    ? `ETD ${fields.etd}`
                    : fields?.qcResult
                      ? String(fields.qcResult)
                      : null;
              const confidence = doc.extraction?.confidence;
              const confidenceCls = confidence == null ? "" : confidence >= 0.8 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : confidence >= 0.5 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
              return (
                <button key={doc.id} onClick={() => setPreview(doc)}
                  className="flex items-center gap-3 px-3 py-2.5 bg-white border border-[#E5EAF0] rounded-lg hover:border-[#9000FF]/25 hover:shadow-sm transition-all text-left">
                  <div className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${DocMimeBg(doc.mimeType)}`}>
                    <DocMimeIcon mimeType={doc.mimeType} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium text-[#212833] truncate">{doc.fileName}</span>
                      {docType && (
                        <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#F0F0FF] text-[#9000FF] border border-[#9000FF]/15">{docType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-[#5E687B]">
                      <DocStatusBadge status={doc.status} />
                      {keyLabel && (
                        <span className="font-medium text-[#212833] truncate max-w-[80px]">{keyLabel}</span>
                      )}
                      {confidence != null && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${confidenceCls}`}>
                          {Math.round(confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <Eye size={12} className="text-[#C0C8D4] shrink-0"/>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation chips — surfaces document flags inline in the message thread
// ─────────────────────────────────────────────────────────────────────────────
function ReconciliationChips({ shipmentId }: { shipmentId: string }) {
  const numericId = Number(shipmentId);
  const qParams = { shipmentId: Number.isNaN(numericId) ? undefined : numericId };
  const { data: apiDocs } = useListDocuments(
    qParams,
    { query: { queryKey: getListDocumentsQueryKey(qParams), staleTime: 30000 } }
  );
  const docs = apiDocs ?? [];

  type FindingWithMeta = { finding: ReconciliationFinding; docName: string; docId: number };
  const findings: FindingWithMeta[] = docs.flatMap(doc =>
    (doc.extraction?.reconciliationFindings ?? []).map(f => ({
      finding: f,
      docName: doc.fileName,
      docId: doc.id,
    }))
  );

  if (findings.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {findings.map(({ finding: f, docName }, i) => {
        const severity = f.severity ?? "warning";
        const chipCls = severity === "error"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-amber-50 border-amber-200 text-amber-700";
        const icon = severity === "error"
          ? <AlertCircle size={9} className="shrink-0 mt-px"/>
          : <AlertCircle size={9} className="shrink-0 mt-px text-amber-500"/>;
        const label = f.type ?? "mismatch";
        const detail = f.expected != null && f.actual != null
          ? `expected ${f.expected}, got ${f.actual}`
          : f.field ?? "";
        return (
          <span key={i} className={`inline-flex items-start gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border ${chipCls}`}
            title={`${docName}: ${label}${detail ? " — " + detail : ""}`}>
            {icon}
            <span>{label}{detail ? `: ${detail}` : ""}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template picker  (P1)
// ─────────────────────────────────────────────────────────────────────────────
function TemplatePicker({ stageId, onPick }: { stageId: string; onPick: (body: string) => void }) {
  const templates = EMAIL_TEMPLATES[stageId] ?? [];
  if (templates.length === 0) return null;
  return (
    <div className="mb-2 border border-[#9000FF]/20 rounded-lg overflow-hidden bg-[#FAFBFF]">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#9000FF]/10 bg-[#9000FF]/5">
        <Wand2 size={10} className="text-[#9000FF]"/>
        <span className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider">Templates for this stage</span>
      </div>
      <div className="flex flex-col divide-y divide-[#E5EAF0]">
        {templates.map(t=>(
          <button key={t.label} onClick={()=>onPick(t.body)}
            className="flex items-center gap-2 px-3 py-2 text-left hover:bg-white transition-colors group">
            <span className="text-[10px] font-medium text-[#212833] flex-1">{t.label}</span>
            <ArrowRight size={10} className="text-[#C0C8D4] group-hover:text-[#9000FF] transition-colors shrink-0"/>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose Panel  — new outbound message to supplier
// ─────────────────────────────────────────────────────────────────────────────
type ComposeChannel = "gmail" | "whatsapp";

interface ComposePanelProps {
  shipment: UiShipment;
  supplierEmail: string | null | undefined;
  onSend: (channel: ComposeChannel, recipient: string, subject: string, body: string) => void;
  onCancel: () => void;
}

function ComposePanel({ shipment, supplierEmail, onSend, onCancel }: ComposePanelProps) {
  const stageId = shipment.currentStageId;
  const templates = EMAIL_TEMPLATES[stageId] ?? [];
  const defaultBody = templates[0]?.body ?? "";

  const [channel, setChannel]   = useState<ComposeChannel>("gmail");
  const [subject, setSubject]   = useState(shipment.po);
  const [body, setBody]         = useState(defaultBody);
  const [sending, setSending]   = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const recipient = supplierEmail ?? shipment.supplier;

  const handleSend = () => {
    if (!body.trim() || sending) return;
    setSending(true);
    onSend(channel, recipient, subject, body);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5EAF0] shrink-0 bg-[#FAFBFC]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#9000FF]/10 flex items-center justify-center">
            <Pencil size={12} className="text-[#9000FF]"/>
          </div>
          <span className="text-xs font-bold text-[#212833]">New Message</span>
        </div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[#F0F4F8] text-[#5E687B] transition-colors"><X size={13}/></button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {/* To */}
        <div className="flex items-start gap-2">
          <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider w-14 pt-2 shrink-0">To</span>
          <div className="flex-1 flex items-center gap-2 bg-[#F0F4F8] border border-[#E5EAF0] rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-[#212833] font-medium truncate">{recipient}</span>
            <span className="ml-auto text-[9px] text-[#9E9FAE] shrink-0">{shipment.supplier}</span>
          </div>
        </div>

        {/* Channel */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider w-14 shrink-0">Via</span>
          <div className="flex gap-1.5">
            {(["gmail", "whatsapp"] as ComposeChannel[]).map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                  channel === ch
                    ? "bg-[#9000FF] text-white border-[#9000FF] shadow-sm"
                    : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#9000FF]/30 hover:text-[#212833]"
                }`}
              >
                {ch === "gmail" ? <Mail size={11}/> : <MessageCircle size={11}/>}
                {ch === "gmail" ? "Email" : "WhatsApp"}
              </button>
            ))}
          </div>
        </div>

        {/* Subject (only for email) */}
        {channel === "gmail" && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider w-14 shrink-0">Subject</span>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] border border-[#E5EAF0] rounded-lg outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 transition-all text-[#212833] bg-white"
              placeholder="Subject…"
            />
          </div>
        )}

        {/* Stage-aware template hint */}
        {templates.length > 0 && (
          <div className="border border-[#9000FF]/20 rounded-lg overflow-hidden bg-[#FAFBFF]">
            <button
              onClick={() => setTemplateOpen(v => !v)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-[#9000FF]/5 transition-colors"
            >
              <Wand2 size={10} className="text-[#9000FF]"/>
              <span className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider flex-1">Stage templates — {shipment.currentStage}</span>
              {templateOpen ? <ChevronUp size={10} className="text-[#9000FF]"/> : <ChevronDown size={10} className="text-[#9000FF]"/>}
            </button>
            {templateOpen && (
              <div className="border-t border-[#9000FF]/10 flex flex-col divide-y divide-[#E5EAF0]">
                {templates.map(t => (
                  <button
                    key={t.label}
                    onClick={() => { setBody(t.body); setTemplateOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-left hover:bg-white transition-colors group"
                  >
                    <span className="text-[10px] font-medium text-[#212833] flex-1">{t.label}</span>
                    <ArrowRight size={10} className="text-[#C0C8D4] group-hover:text-[#9000FF] transition-colors shrink-0"/>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-[140px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Message</span>
            {body !== defaultBody && defaultBody && (
              <button onClick={() => setBody(defaultBody)} className="text-[9px] text-[#9000FF] hover:underline flex items-center gap-0.5">
                <Sparkles size={8}/>Reset draft
              </button>
            )}
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="flex-1 w-full px-3 py-2.5 border border-[#E5EAF0] rounded-xl text-[11px] text-[#212833] leading-relaxed resize-none outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 transition-all bg-white"
            style={{ minHeight: 140 }}
            placeholder="Write your message…"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-[#E5EAF0] bg-[#FAFBFC] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-[#9E9FAE]">
          {channel === "gmail" ? <Mail size={10}/> : <MessageCircle size={10}/>}
          <span>Sending via {channel === "gmail" ? "Email" : "WhatsApp"} to {shipment.supplier}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onCancel} className="px-3 py-1.5 text-[10px] font-semibold text-[#5E687B] border border-[#E5EAF0] rounded-md hover:bg-[#F0F4F8] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              body.trim() && !sending
                ? "bg-[#9000FF] text-white hover:bg-[#7A00D9]"
                : "bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"
            }`}
          >
            <Send size={10}/>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search results  (P2)
// ─────────────────────────────────────────────────────────────────────────────
function SearchResults({ query, messages, onOpen }: { query: string; messages: Message[]; onOpen: (id: string) => void }) {
  if (!query.trim()) return null;
  const q = query.toLowerCase();
  const matched = messages.filter(m => m.sender.toLowerCase().includes(q) || m.snippet.toLowerCase().includes(q) || m.fullBody.toLowerCase().includes(q));
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5EAF0] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] z-50 mx-6 overflow-hidden max-h-[280px] overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#E5EAF0] bg-[#FAFBFC] flex items-center justify-between">
        <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">{matched.length} result{matched.length!==1?"s":""} for "{query}"</span>
        <span className="text-[9px] text-[#9E9FAE]">messages</span>
      </div>
      {matched.length===0 ? (
        <div className="py-6 text-center text-xs text-[#9E9FAE]">No messages match "{query}"</div>
      ) : matched.map(m=>(
        <button key={m.id} onClick={()=>onOpen(m.id)} className="w-full text-left px-3 py-2.5 hover:bg-[#FAFBFC] border-b border-[#E5EAF0] last:border-b-0 transition-colors">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-[#212833]">{m.sender}</span>
            {chIcon(m.channel)}
            <span className="text-[9px] text-[#9E9FAE] ml-auto">{m.timestamp}</span>
          </div>
          <div className="text-[10px] text-[#5E687B] line-clamp-1">{m.snippet}</div>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Needs Review Panel
// ─────────────────────────────────────────────────────────────────────────────
function NeedsReviewPanel({ messages, shipments, onAssigned }: {
  messages: ApiMessageFull[];
  shipments: UiShipment[];
  onAssigned: (msgId: number) => void;
}) {
  const assignMutation = useAssignMessage();
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [assigning, setAssigning] = useState<Record<number, boolean>>({});

  const doAssign = (msgId: number, shipmentId: number, buyerName: string) => {
    setAssigning(p => ({ ...p, [msgId]: true }));
    assignMutation.mutate(
      { id: msgId, data: { shipmentId, buyerName } },
      {
        onSuccess: () => { onAssigned(msgId); setAssigning(p => ({ ...p, [msgId]: false })); },
        onError: () => setAssigning(p => ({ ...p, [msgId]: false })),
      }
    );
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-[#9E9FAE]">
        <CheckCircle2 size={32} className="text-emerald-400 mb-3 opacity-60"/>
        <p className="text-sm font-semibold text-[#212833]">All clear — no messages need review</p>
        <p className="text-[11px] mt-1 max-w-xs">Inbound emails with high confidence are automatically routed. Low-confidence matches land here for manual assignment.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 shrink-0">
        <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0"/>
        <div>
          <p className="text-[11px] font-semibold text-amber-800">
            {messages.length} email{messages.length !== 1 ? "s" : ""} couldn't be automatically routed
          </p>
          <p className="text-[10px] text-amber-700 mt-0.5">Assign each message to the correct shipment. Future emails from the same sender will be auto-routed.</p>
        </div>
      </div>
      {messages.map(msg => {
        const conf = msg.routingConfidence;
        const guess = msg.aiRoutingGuess;
        const guessShip = guess?.shipmentId != null ? shipments.find(s => s.shipmentId === guess.shipmentId) : undefined;
        const selectedShipId = assignments[msg.id];
        const selectedShip = selectedShipId != null ? shipments.find(s => s.shipmentId === selectedShipId) : undefined;
        return (
          <div key={msg.id} className="bg-white border border-[#E5EAF0] rounded-xl p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#F0F4F8] flex items-center justify-center text-xs font-bold text-[#5E687B] shrink-0">{msg.sender.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#212833] truncate">{msg.sender}</div>
                  <div className="text-[9px] text-[#5E687B] truncate">{msg.rawSenderEmail ?? ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {conf != null && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${conf >= 0.65 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                    {Math.round(conf * 100)}% match
                  </span>
                )}
                <span className="text-[9px] text-[#9E9FAE]">{relativeAge(msg.receivedAt)}</span>
              </div>
            </div>
            <div className="text-[10px] text-[#5E687B] bg-[#FAFBFC] rounded-lg p-2 mb-2.5 line-clamp-2 leading-relaxed border border-[#E5EAF0]">
              {msg.snippet}
            </div>
            {guessShip && (
              <div className="flex items-center gap-1.5 mb-2.5 text-[9px] text-[#5E687B] bg-[#9000FF]/4 rounded-md px-2 py-1.5 border border-[#9000FF]/15">
                <Sparkles size={9} className="text-[#9000FF] shrink-0"/>
                <span>AI suggests: <span className="font-semibold text-[#9000FF]">{guessShip.po}</span> · {guessShip.supplier}</span>
                {!selectedShipId && (
                  <button onClick={() => setAssignments(p => ({ ...p, [msg.id]: guessShip.shipmentId }))} className="ml-auto text-[8px] font-bold text-[#9000FF] hover:underline shrink-0">Use suggestion</button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <select
                value={selectedShipId ?? ""}
                onChange={e => { const v = Number(e.target.value); if (v > 0) setAssignments(p => ({ ...p, [msg.id]: v })); else setAssignments(p => { const next = { ...p }; delete next[msg.id]; return next; }); }}
                className="flex-1 text-[10px] border border-[#E5EAF0] rounded-lg px-2 py-1.5 bg-white text-[#212833] outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/15"
              >
                <option value="">— Assign to shipment —</option>
                {shipments.map(s => (
                  <option key={s.shipmentId} value={s.shipmentId}>{s.po} · {s.supplier}</option>
                ))}
              </select>
              <button
                disabled={!selectedShipId || assigning[msg.id]}
                onClick={() => selectedShipId && doAssign(msg.id, selectedShipId, selectedShip?.customer ?? msg.sender)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#9000FF] text-white hover:bg-[#7A00D9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
              >
                {assigning[msg.id] ? "Saving…" : <><Check size={10}/>Assign</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gmail Settings Panel
// ─────────────────────────────────────────────────────────────────────────────
function GmailSettingsPanel({ status, onGmailStatusChange }: {
  status: { connected: boolean; gmailAddress?: string | null; clientConfigured: boolean } | undefined;
  onGmailStatusChange?: () => void;
}) {
  const disconnectMutation = useDisconnectGmail();
  const { data: inboundEmailData } = useGetInboundEmailAddress();
  const inboundEmail = inboundEmailData?.inboundEmailAddress || "ai@flowforge.com";
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "gmail-connected") {
        onGmailStatusChange?.();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onGmailStatusChange]);

  const handleConnect = async () => {
    try {
      const res = await connectGmail() as Record<string, unknown> | null | undefined;
      const authUrl = res?.authUrl;
      if (typeof authUrl === "string") {
        window.open(authUrl, "_blank", "width=600,height=700,noopener");
      }
    } catch { /* noop */ }
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => onGmailStatusChange?.(),
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}api/integrations/gmail/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const data = await resp.json() as { to?: string };
        setTestResult({ ok: true, msg: `Test email sent to ${data.to ?? "test@example.com"}` });
      } else {
        const data = await resp.json() as { error?: string };
        setTestResult({ ok: false, msg: data.error ?? "Send failed" });
      }
    } catch {
      setTestResult({ ok: false, msg: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-[#212833] mb-1">Email Integrations</h2>
        <p className="text-[11px] text-[#5E687B]">Connect Gmail to send replies directly from FlowForge. Inbound emails and forwarded chats are received at{" "}
          <button onClick={()=>{void navigator.clipboard.writeText(inboundEmail).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1800);});}} className="inline-flex items-center gap-1 text-[#212833] hover:text-[#9000FF] transition-colors group" title="Copy to clipboard">
            <span className="font-mono font-semibold">{inboundEmail}</span>
            {copied ? <Check size={9} className="text-emerald-500"/> : <Copy size={9} className="opacity-0 group-hover:opacity-60"/>}
          </button>{" "}(Postmark webhook).
        </p>
      </div>

      {/* Gmail card */}
      <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-red-500"/>
            </div>
            <div>
              <div className="text-xs font-bold text-[#212833]">Gmail (Send-as)</div>
              <div className="text-[10px] text-[#5E687B]">Reply to inbound emails via your Gmail account</div>
            </div>
          </div>
          {status?.connected ? (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
              <Wifi size={9}/>Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#9E9FAE] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-1 rounded-full">
              <WifiOff size={9}/>Not connected
            </span>
          )}
        </div>
        {status?.connected && status.gmailAddress && (
          <div className="text-[10px] text-[#5E687B] bg-[#FAFBFC] rounded-md px-2.5 py-1.5 border border-[#E5EAF0] mb-3 font-mono">
            {status.gmailAddress}
          </div>
        )}
        {!status?.clientConfigured && (
          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
            <AlertCircle size={10} className="text-amber-500 mt-0.5 shrink-0"/>
            <span><span className="font-semibold">GOOGLE_CLIENT_ID</span> and <span className="font-semibold">GOOGLE_CLIENT_SECRET</span> env vars are not configured. Set them to enable Gmail OAuth.</span>
          </div>
        )}
        {testResult && (
          <div className={`text-[10px] rounded-md px-2.5 py-1.5 mb-3 border flex items-center gap-1.5 ${testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {testResult.ok ? <CheckCircle2 size={10} className="shrink-0"/> : <AlertCircle size={10} className="shrink-0"/>}
            {testResult.msg}
          </div>
        )}
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-md border border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors disabled:opacity-40"
              >
                {testing ? "Sending…" : "Send test email"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
                className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-md border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={!status?.clientConfigured}
              className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-md bg-[#9000FF] text-white hover:bg-[#7A00D9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ExternalLink size={10}/>Connect Gmail via OAuth
            </button>
          )}
        </div>
      </div>

      {/* Inbound email info */}
      <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Inbox size={16} className="text-blue-500"/>
          </div>
          <div>
            <div className="text-xs font-bold text-[#212833]">Inbound Email Routing</div>
            <div className="text-[10px] text-[#5E687B]">Emails sent to your ingest address are parsed, matched to shipments, and appear in your inbox.</div>
          </div>
        </div>
        <div className="space-y-1.5 text-[10px] text-[#5E687B]">
          {[
            { label: "Ingest endpoint", value: "POST /api/webhooks/email" },
            { label: "Confidence threshold", value: "65% — below this goes to Needs Review" },
            { label: "AI model", value: "gpt-4o-mini (shipment matching + draft generation)" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-2 py-1 border-b border-[#F0F4F8] last:border-0">
              <span className="text-[#9E9FAE]">{row.label}</span>
              <span className="font-mono font-semibold text-[#212833]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ConversationHub
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const search = useSearch();
  const [, navigate] = useLocation();
  useCopilotHint("Draft a reply or ask about shipment status", [
    "Draft a reply to this supplier",
    "Any overdue payments on this PO?",
    "Summarize this shipment's current status",
  ]);
  const [activeView, setActiveView]       = useState<ActiveView>("inbox");
  const { data: apiStages }    = useListStages();
  const { data: apiShipments } = useListShipments();
  const { data: apiMessages }  = useListMessages();
  const { data: apiTasks }     = useListTasks();
  const { data: apiProposals } = useListCopilotProposals({});
  const { data: apiNeedsReview, refetch: refetchNeedsReview } = useListNeedsReviewMessages();
  const { data: gmailStatus, refetch: refetchGmailStatus } = useGetGmailStatus();
  const sendReplyMutation = useSendReply();
  const ingestChatMutation = useIngestChat();
  const [showPasteChat, setShowPasteChat] = useState(false);
  const [pasteChatChannel, setPasteChatChannel] = useState<"whatsapp" | "wechat" | "imessage" | "sms">("whatsapp");
  const [pasteChatText, setPasteChatText] = useState("");
  const [pasteChatSenderHint, setPasteChatSenderHint] = useState("");
  const [pasteChatResult, setPasteChatResult] = useState<ChatIngestResult | null>(null);
  const [pasteChatError, setPasteChatError] = useState<string | null>(null);
  const closePasteChat = () => { setShowPasteChat(false); setPasteChatResult(null); setPasteChatText(""); setPasteChatSenderHint(""); setPasteChatError(null); };
  const [needsReviewMessages, setNeedsReviewMessages] = useState<ApiMessageFull[]>([]);
  useEffect(() => { if (apiNeedsReview) setNeedsReviewMessages(apiNeedsReview); }, [apiNeedsReview]);

  const [stages, setStages]               = useState<UiStage[]>([]);
  const [showStageConfig, setShowStageConfig] = useState(false);
  const [shipments, setShipments]         = useState<UiShipment[]>([]);
  const [messages, setMessages]           = useState<UiMessage[]>([]);
  const [tasks, setTasks]                 = useState<UiTask[]>([]);

  // Hydrate from API
  useEffect(() => { if (apiStages) setStages(adaptStages(apiStages)); }, [apiStages]);
  useEffect(() => {
    if (apiShipments && stages.length) setShipments(adaptShipments(apiShipments, stages));
  }, [apiShipments, stages]);
  useEffect(() => {
    if (apiMessages && shipments.length) setMessages(adaptMessages(apiMessages, shipments));
  }, [apiMessages, shipments]);
  useEffect(() => {
    if (apiTasks && shipments.length) setTasks(adaptTasks(apiTasks, shipments));
  }, [apiTasks, shipments]);

  const [activeMessageId, setActiveMessageId] = useState<string>("");
  useEffect(() => {
    if (!activeMessageId && messages.length > 0) setActiveMessageId(messages[0].id);
  }, [messages, activeMessageId]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string|null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel|"all">("all");
  const [supplierFilter, setSupplierFilter] = useState<string|null>(null);
  const [flaggedFilter, setFlaggedFilter] = useState(false);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [shipmentContextExpanded, setShipmentContextExpanded] = useState(true);
  useEffect(() => {
    if (!showTaskPanel) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowTaskPanel(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showTaskPanel]);
  const [composeText, setComposeText]     = useState("");
  const [composeFocused, setComposeFocused] = useState(false);
  const [showComposePanel, setShowComposePanel] = useState(false);
  const [rightTab, setRightTab]           = useState<RightTab>(() => {
    const VALID_TABS = ["message", "docs", "risk", "copilot"] as string[];
    const p = new URLSearchParams(window.location.search).get("tab");
    if (VALID_TABS.includes(p ?? "")) return p as RightTab;
    const saved = sessionStorage.getItem("flowforge:rightTab");
    return VALID_TABS.includes(saved ?? "") ? (saved as RightTab) : "message";
  });
  const [toast, setToast]                 = useState<string|null>(null);
  const [repliedIds, setRepliedIds]       = useState<Set<string>>(new Set());
  const [advanceDialogShipment, setAdvanceDialogShipment] = useState<UiShipment | null>(null);
  const [advanceNote, setAdvanceNote]     = useState("");
  const [showHistory, setShowHistory]     = useState(false);
  const [searchMode, setSearchMode]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");

  // Supplier email editing
  const { data: suppliersData, refetch: refetchSuppliers } = useListSuppliers();
  const apiSuppliers = suppliersData ?? [];
  const updateSupplierMutation = useUpdateSupplier();
  const [editingEmail, setEditingEmail]   = useState(false);
  const [emailDraft, setEmailDraft]       = useState("");
  const [supplierEmailOverrides, setSupplierEmailOverrides] = useState<Map<number, string | null>>(new Map());

  // Mark-paid inline form
  interface MarkPaidForm { shipmentId: string; paymentIdx: 0|1; amount: string; date: string; reference: string; method: string; }
  const [markPaidForm, setMarkPaidForm] = useState<MarkPaidForm | null>(null);
  const openMarkPaid = (shipmentId: string, paymentIdx: 0|1) => {
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    setMarkPaidForm({ shipmentId, paymentIdx, amount: String(ship.payments[paymentIdx].amountUsd), date: new Date().toISOString().split("T")[0], reference: "", method: "Wire" });
  };
  const confirmMarkPaid = () => {
    if (!markPaidForm) return;
    const { shipmentId, paymentIdx, amount, date, reference, method } = markPaidForm;
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    const payment = ship.payments[paymentIdx];
    const paidAtIso = new Date(date).toISOString();
    const amountUsd = Math.round(Number(amount)) || payment.amountUsd;
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      const [dep, bal] = s.payments;
      const update = { ...payment, paid: true, amountUsd, paidAt: paidAtIso, paidMethod: method };
      return { ...s, payments: paymentIdx === 0 ? [update, bal] : [dep, update] };
    }));
    updatePayment(payment.paymentId, { paid: true, amountUsd, paidAt: paidAtIso, referenceNumber: reference || undefined, method }).catch(() => {});
    setToast("Payment marked as paid");
    setTimeout(() => setToast(null), 3000);
    setMarkPaidForm(null);
  };

  // Apply deep-link URL params (?supplier=, ?shipment=, ?tab=) once messages are loaded.
  // Reports navigates here with these params so users land on the right filtered view.
  // ?tab= alone (without supplier/shipment) is also honoured so deep-links that only
  // specify a tab land on the right panel.
  const urlParamsApplied = useRef(false);
  useEffect(() => {
    if (urlParamsApplied.current || !messages.length) return;
    const params = new URLSearchParams(search);
    const supplierParam = params.get("supplier");
    const shipmentParam = params.get("shipment");
    const tabParam = params.get("tab");
    if (!supplierParam && !shipmentParam && !tabParam) return;
    urlParamsApplied.current = true;
    setActiveView("inbox");
    if (tabParam && (["message", "docs", "risk", "copilot"] as string[]).includes(tabParam)) {
      setRightTab(tabParam as RightTab);
    }
    if (shipmentParam) {
      const uiId = `s${shipmentParam}`;
      setSelectedShipmentId(uiId);
      setChannelFilter("all");
      setSupplierFilter(null);
      const first = messages.find(m => m.shipmentId === uiId);
      if (first) setActiveMessageId(first.id);
    } else if (supplierParam) {
      setSupplierFilter(supplierParam);
      setSelectedShipmentId(null);
      setChannelFilter("all");
      const first = messages.find(m => m.supplierId === supplierParam);
      if (first) setActiveMessageId(first.id);
    }
  }, [messages, search]);

  // Keep ?tab= in sync with rightTab so the URL is bookmarkable and the back
  // button can restore the active tab. Use replace (not push) so tab switches
  // don't pollute the browser history stack. Also persist to sessionStorage so
  // that navigating away via the sidebar and returning restores the active tab.
  useEffect(() => {
    sessionStorage.setItem("flowforge:rightTab", rightTab);
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === rightTab) return;
    params.set("tab", rightTab);
    navigate(`?${params.toString()}`, { replace: true });
  }, [rightTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ?shipment= in sync with selectedShipmentId. Guard against running
  // before the deep-link effect has had a chance to consume any pending URL
  // params (urlParamsApplied stays false until messages load and params are read).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!urlParamsApplied.current && (params.has("shipment") || params.has("supplier"))) return;
    // selectedShipmentId is "s{numericId}" — strip prefix for the URL.
    const numericId = selectedShipmentId ? selectedShipmentId.replace(/^s/, "") : null;
    if (params.get("shipment") === numericId) return;
    if (numericId) {
      params.set("shipment", numericId);
    } else {
      params.delete("shipment");
    }
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedShipmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ?supplier= in sync with supplierFilter.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!urlParamsApplied.current && (params.has("shipment") || params.has("supplier"))) return;
    if (params.get("supplier") === supplierFilter) return;
    if (supplierFilter) {
      params.set("supplier", supplierFilter);
    } else {
      params.delete("supplier");
    }
    navigate(`?${params.toString()}`, { replace: true });
  }, [supplierFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const SUPPLIERS = useMemo(() => {
    const totalCounts = new Map<string, number>();
    const unreadCounts = new Map<string, number>();
    for (const m of messages) {
      totalCounts.set(m.supplierId, (totalCounts.get(m.supplierId) ?? 0) + 1);
      if (m.unread) unreadCounts.set(m.supplierId, (unreadCounts.get(m.supplierId) ?? 0) + 1);
    }
    return Array.from(totalCounts.entries()).map(([name, total]) => ({
      id: name, label: name, count: total, unread: unreadCounts.get(name) ?? 0,
    }));
  }, [messages]);

  const activeMessage  = messages.find(m => m.id === activeMessageId) || messages[0];
  const activeShipment = activeMessage ? shipments.find(s => s.id === activeMessage.shipmentId) : undefined;
  const activeStage    = activeShipment ? stages.find(s => s.id === activeShipment.currentStageId) : null;
  const activeStageIdx = activeShipment ? stages.findIndex(s => s.id === activeShipment.currentStageId) : -1;

  const activeSupplier = useMemo(
    () => apiSuppliers.find(s => s.name === (activeMessage?.supplierId ?? "")),
    [apiSuppliers, activeMessage?.supplierId],
  );

  useEffect(() => {
    setEditingEmail(false);
    setEmailDraft("");
  }, [activeMessageId]);

  const saveEmail = () => {
    if (!activeSupplier) return;
    const trimmed = emailDraft.trim() || null;
    const supplierId = activeSupplier.id;
    setSupplierEmailOverrides(prev => new Map(prev).set(supplierId, trimmed));
    setEditingEmail(false);
    updateSupplierMutation.mutate(
      { id: supplierId, data: { contactEmail: trimmed } },
      {
        onSuccess: () => {
          setSupplierEmailOverrides(prev => {
            const next = new Map(prev);
            next.delete(supplierId);
            return next;
          });
          refetchSuppliers();
        },
        onError: () => {
          setSupplierEmailOverrides(prev => {
            const next = new Map(prev);
            next.delete(supplierId);
            return next;
          });
          refetchSuppliers();
          setToast("Failed to save email — please try again");
          setTimeout(() => setToast(null), 3000);
        },
      },
    );
  };

  const activeSupplierEmail = activeSupplier
    ? (supplierEmailOverrides.has(activeSupplier.id)
        ? supplierEmailOverrides.get(activeSupplier.id)
        : activeSupplier.contactEmail)
    : undefined;

  // Docs badge — lifted query so the tab label can show count + amber indicator
  const activeDocShipmentId = activeShipment?.id ? Number(activeShipment.id) : undefined;
  const docsQParams = { shipmentId: Number.isNaN(activeDocShipmentId) ? undefined : activeDocShipmentId };
  const { data: docsTabData } = useListDocuments(
    docsQParams,
    { query: { queryKey: getListDocumentsQueryKey(docsQParams), refetchInterval: 5000 } }
  );
  const docsCount = docsTabData?.length ?? 0;
  const docsHasFindings = (docsTabData ?? []).some(
    doc => (doc.extraction?.reconciliationFindings?.length ?? 0) > 0
  );

  const visibleMessages = messages.filter(m => {
    if (flaggedFilter && !m.isFlagged) return false;
    if (selectedShipmentId && m.shipmentId !== selectedShipmentId) return false;
    if (channelFilter !== "all" && m.channel !== channelFilter) return false;
    if (supplierFilter && m.supplierId !== supplierFilter) return false;
    return true;
  });

  const openMessage = (id: string) => {
    setActiveMessageId(id); setActiveView("inbox");
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
    const msg = messages.find(m => m.id === id);
    if (msg && msg.unread) {
      readTimerRef.current = setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
        updateMessage(msg.messageId, { unread: false }).catch(() => {});
      }, 1500);
    }
    setComposeText(""); setRightTab("message");
  };
  const toggleFlag = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const next = !msg.isFlagged;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isFlagged: next } : m));
    updateMessage(msg.messageId, { isFlagged: next }).catch(() => {});
  };
  const selectShipment = (id: string) => {
    const next = selectedShipmentId===id ? null : id;
    setSelectedShipmentId(next); setChannelFilter("all"); setSupplierFilter(null);
    if (next) { const f = messages.find(m => m.shipmentId===next); if(f) openMessage(f.id); }
  };
  const advanceStage = (shipmentId: string, note?: string) => {
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return;
    const idx = stages.findIndex(st => st.id === target.currentStageId);
    const next = stages[Math.min(idx + 1, stages.length - 1)];
    if (!next || next.id === target.currentStageId) return;
    const fromStageId = target.currentStageId;
    setShipments(prev => prev.map(s =>
      s.id === shipmentId ? { ...s, currentStageId: next.id, currentStage: next.label, status: "on-track" } : s,
    ));
    createShipmentStageEvent(target.shipmentId, {
      fromStageId,
      toStageId: next.id,
      note: note?.trim() || undefined,
    }).catch(() => {
      setShipments(prev => prev.map(s =>
        s.id === shipmentId ? { ...s, currentStageId: fromStageId, currentStage: target.currentStage, status: target.status } : s,
      ));
      setToast("Failed to advance stage — please try again");
    });
  };

  const openAdvanceDialog = (ship: UiShipment) => {
    const idx = stages.findIndex(st => st.id === ship.currentStageId);
    const next = stages[Math.min(idx + 1, stages.length - 1)];
    if (!next || next.id === ship.currentStageId) return;
    setAdvanceDialogShipment(ship);
    setAdvanceNote("");
  };

  const confirmAdvanceStage = () => {
    if (!advanceDialogShipment) return;
    advanceStage(advanceDialogShipment.id, advanceNote);
    setAdvanceDialogShipment(null);
    setAdvanceNote("");
    setToast("Stage advanced");
  };
  const sendReply = (msgId: string) => {
    setRepliedIds(prev => new Set(prev).add(msgId));
    setMessages(prev => prev.map(m => m.id===msgId ? {...m, unread:false} : m));
    const msg = messages.find(m => m.id===msgId);
    if (msg) {
      updateMessage(msg.messageId, { unread: false }).catch(() => {});
      advanceStage(msg.shipmentId);
      const tasksToComplete = tasks.filter(tk => tk.messageId === msgId);
      setTasks(t => t.filter(tk => tk.messageId !== msgId));
      Promise.all(tasksToComplete.map(tk => updateTask(tk.taskId, { done: true }))).catch(() => {});
      const ship = shipments.find(s => s.id === msg.shipmentId);
      const body = composeText.trim() || msg.aiDraft || "(reply sent)";
      if (ship) {
        createMessage({
          shipmentId: ship.shipmentId,
          sender: "You",
          channel: msg.channel,
          snippet: body.slice(0, 140),
          fullBody: body,
        })
          .then(created => {
            const newUi: UiMessage = {
              id: `m-srv-${created.id}`,
              messageId: created.id,
              sender: created.sender,
              channel: created.channel as UiMessage["channel"],
              timestamp: "Just now",
              snippet: created.snippet,
              fullBody: created.fullBody,
              unread: false,
              isFlagged: false,
              aiTags: created.aiTags ?? [],
              shipmentId: msg.shipmentId,
              supplierId: msg.supplierId,
              aiDraft: created.aiDraft ?? "",
              aiAction: created.aiAction ?? "",
            };
            setMessages(prev => [newUi, ...prev]);
          })
          .catch(() => {});
      }
    }
    setComposeText(""); setComposeFocused(false);
    setToast("Reply sent — stage advanced");
  };
  const undoPaymentPaid = (shipmentId: string, paymentIdx: 0 | 1) => {
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    const payment = ship.payments[paymentIdx];
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      const [dep, bal] = s.payments;
      const newDep = paymentIdx === 0 ? { ...dep, paid: false } : dep;
      const newBal = paymentIdx === 1 ? { ...bal, paid: false } : bal;
      return { ...s, payments: [newDep, newBal] };
    }));
    updatePayment(payment.paymentId, { paid: false, paidAt: null, referenceNumber: null, method: null }).catch(() => {});
    setToast("Payment marked unpaid");
    setTimeout(() => setToast(null), 3000);
  };
  const saveStages = (next: UiStage[]) => {
    setStages(next);
    setToast("Stages saved");
    reorderStages({ stageIds: next.map(s => s.id) }).catch(() => {});
  };
  const selectQuote = (shipmentId: string, idx: number) => {
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship?.quotes?.[idx]) return;
    const targetQuote = ship.quotes[idx];
    setShipments(prev => prev.map(s => s.id !== shipmentId || !s.quotes ? s : { ...s, quotes: s.quotes.map((q,i) => ({...q, selected: i === idx})) }));
    selectFactoryQuote(ship.shipmentId, { quoteId: targetQuote.quoteId }).catch(() => {});
    setToast("Factory quote selected");
  };
  const toggleChannel = (ch: Channel|"all") => {
    setChannelFilter(ch); setSelectedShipmentId(null); setSupplierFilter(null); setFlaggedFilter(false);
    const f = ch==="all" ? messages[0] : messages.find(m=>m.channel===ch);
    if(f) openMessage(f.id);
  };
  const toggleSupplier = (id: string) => {
    const next = supplierFilter===id ? null : id;
    setSupplierFilter(next); setSelectedShipmentId(null); setChannelFilter("all"); setFlaggedFilter(false);
    if(next) { const f=messages.find(m=>m.supplierId===next); if(f) openMessage(f.id); }
  };

  const sendComposedMessage = (channel: ComposeChannel, recipient: string, subject: string, body: string) => {
    if (!activeShipment) return;
    const snippet = (channel === "gmail" && subject ? `${subject}: ` : "") + body.slice(0, 120);

    // Optimistic: add temp message immediately before API call
    const tempId = `m-tmp-${Date.now()}`;
    const tempMsg: UiMessage = {
      id: tempId,
      messageId: -1,
      sender: "You",
      channel: channel as UiMessage["channel"],
      timestamp: "Just now",
      snippet,
      fullBody: body,
      unread: false,
      isFlagged: false,
      aiTags: [],
      shipmentId: activeShipment.id,
      supplierId: activeShipment.supplier,
      aiDraft: "",
      aiAction: "",
    };
    setMessages(prev => [tempMsg, ...prev]);
    setActiveMessageId(tempId);
    setShowComposePanel(false);
    setToast("Message sent to " + activeShipment.supplier);
    setTimeout(() => setToast(null), 3000);

    // Persist to API; replace temp on success, rollback on failure
    createMessage({
      shipmentId: activeShipment.shipmentId,
      sender: "You",
      recipient,
      channel,
      subject: channel === "gmail" ? subject : undefined,
      direction: "outbound",
      snippet,
      fullBody: body,
    })
      .then(created => {
        const realMsg: UiMessage = {
          id: `m-srv-${created.id}`,
          messageId: created.id,
          sender: "You",
          channel: channel as UiMessage["channel"],
          timestamp: "Just now",
          snippet: created.snippet,
          fullBody: created.fullBody,
          unread: false,
          isFlagged: false,
          aiTags: [],
          shipmentId: activeShipment.id,
          supplierId: activeShipment.supplier,
          aiDraft: "",
          aiAction: "",
        };
        setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
        setActiveMessageId(realMsg.id);
      })
      .catch(() => {
        // Rollback the optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setActiveMessageId(messages[0]?.id ?? "");
        setToast("Failed to send — message removed. Please try again.");
        setTimeout(() => setToast(null), 4000);
      });
  };

  const unreadCount    = messages.filter(m=>m.unread).length;
  const highCount      = tasks.filter(t=>t.urgency==="high").length;
  const isQuotesStage  = activeShipment?.currentStageId === "quotes";
  const needsReviewCount = needsReviewMessages.length;

  const sendViaGmail = (msgId: number, body: string, subject?: string) => {
    sendReplyMutation.mutate(
      { id: msgId, data: { body, subject } },
      {
        onSuccess: () => { setRepliedIds(prev => new Set(prev).add(`m${msgId}`)); setComposeText(""); setToast("Sent via Gmail"); },
        onError: () => setToast("Gmail send failed — check your Gmail connection in Settings"),
      }
    );
  };


  const isLoading = !apiStages || !apiShipments || !apiMessages || !apiTasks;
  if (!activeMessage || !activeShipment) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFBFC] text-[#5E687B]" style={{fontFamily:"Inter,sans-serif"}}>
        {showStageConfig&&<StageConfigModal stages={stages} onSave={saveStages} onClose={()=>setShowStageConfig(false)}/>}
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md" style={{background:"linear-gradient(135deg,#7C3AED,#5B21B6)"}}>
            <img src="/flowforge-logo.png" alt="FlowForge" className="w-full h-full object-contain p-1.5" />
          </div>
          <p className="text-sm font-medium" style={{color:"#7C3AED"}}>
            {isLoading ? "Loading FlowForge…" : "No shipments yet. Seed the database with `pnpm --filter @workspace/db run seed`."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden" style={{fontFamily:"Inter,sans-serif",fontSize:13}}>
      {toast&&<Toast message={toast} onDone={()=>setToast(null)}/>}
      {showStageConfig&&<StageConfigModal stages={stages} onSave={saveStages} onClose={()=>setShowStageConfig(false)}/>}

      {/* ── MAIN AREA: persistent filter panel + content ── */}
      <div className="flex-1 flex min-w-0 overflow-hidden">

        {/* ── PERSISTENT LEFT FILTER PANEL ── */}
        <NavSidebar
          onCalendarClick={() => setActiveView("calendar")}
          onInboxClick={() => setActiveView("inbox")}
          isCalendarActive={activeView === "calendar"}
          counts={{ inbox: unreadCount > 0 ? unreadCount : null }}
        >
          {/* Search */}
          <div className="px-3 pt-2 pb-1.5 shrink-0">
            <div className="flex items-center gap-2 bg-white border border-[#E5EAF0] rounded-lg px-2.5 py-1.5">
              <Search size={13} className="text-[#9E9FAE] shrink-0"/>
              <input placeholder="Search…" className="flex-1 text-xs bg-transparent outline-none text-[#212833] placeholder:text-[#C0C8D4] min-w-0"/>
            </div>
          </div>

          {/* Scrollable filter sections */}
          <div className="flex-1 overflow-y-auto">

            {/* Messages */}
            <div className="px-3 pt-1.5 pb-2">
              <div className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase px-2 mb-1.5">Messages</div>
              <div className="space-y-0.5">
                {([
                  {id:"all"      as Channel|"all", label:"All Inbox", icon:<Inbox className="w-3 h-3"/>,         count:messages.length},
                  {id:"gmail"    as Channel,        label:"Gmail",    icon:<Mail className="w-3 h-3"/>,           count:messages.filter(m=>m.channel==="gmail").length},
                  {id:"whatsapp" as Channel,        label:"WhatsApp", icon:<MessageCircle className="w-3 h-3"/>,  count:messages.filter(m=>m.channel==="whatsapp").length},
                  {id:"wechat"   as Channel,        label:"WeChat",   icon:<MessageSquare className="w-3 h-3 text-green-600"/>, count:messages.filter(m=>m.channel==="wechat").length},
                  {id:"imessage" as Channel,        label:"iMessage", icon:<MessageCircle className="w-3 h-3 text-blue-400"/>, count:messages.filter(m=>m.channel==="imessage").length},
                  {id:"sms"      as Channel,        label:"SMS",      icon:<MessageCircle className="w-3 h-3 text-purple-500"/>, count:messages.filter(m=>m.channel==="sms").length},
                  {id:"sheets"   as Channel,        label:"Sheets",   icon:<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>, count:messages.filter(m=>m.channel==="sheets").length},
                  {id:"pdf"      as Channel,        label:"PDFs",     icon:<FileText className="w-3 h-3"/>,       count:messages.filter(m=>m.channel==="pdf").length},
                ]).map(f=>{
                  const active=channelFilter===f.id&&!selectedShipmentId&&!supplierFilter&&!flaggedFilter&&activeView==="inbox";
                  const unread=f.id==="all"?messages.filter(m=>m.unread).length:messages.filter(m=>m.channel===f.id&&m.unread).length;
                  return (
                    <button key={String(f.id)} onClick={()=>{setActiveView("inbox");toggleChannel(f.id);}}
                      className={`w-full flex items-center justify-between px-2 h-7 rounded-md text-sm transition-colors ${active?"bg-[#E5EAF0] text-[#212833] font-semibold":"text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                      <span className="flex items-center gap-1.5">{f.icon}<span className="text-xs">{f.label}</span></span>
                      {unread>0
                        ? <span className={`text-[10px] px-1.5 rounded-full font-bold ${active?"bg-[#9000FF] text-white":"bg-[#E5EAF0] text-[#5E687B]"}`}>{unread}</span>
                        : <span className="text-[10px] text-[#9E9FAE]">{f.count}</span>}
                    </button>
                  );
                })}
                {/* Flagged filter */}
                {(() => {
                  const flaggedCount = messages.filter(m => m.isFlagged).length;
                  return (
                    <button onClick={()=>{setActiveView("inbox");setFlaggedFilter(f=>!f);setChannelFilter("all");setSelectedShipmentId(null);setSupplierFilter(null);const fm=messages.find(m=>m.isFlagged);if(fm&&!flaggedFilter)openMessage(fm.id);}}
                      className={`w-full flex items-center justify-between px-2 h-7 rounded-md text-sm transition-colors ${flaggedFilter&&activeView==="inbox"?"bg-[#E5EAF0] text-[#212833] font-semibold":"text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                      <span className="flex items-center gap-1.5"><Bookmark className="w-3 h-3"/><span className="text-xs">Flagged</span></span>
                      {flaggedCount>0
                        ? <span className={`text-[10px] px-1.5 rounded-full font-bold ${flaggedFilter&&activeView==="inbox"?"bg-[#9000FF] text-white":"bg-[#E5EAF0] text-[#5E687B]"}`}>{flaggedCount}</span>
                        : <span className="text-[10px] text-[#9E9FAE]">0</span>}
                    </button>
                  );
                })()}
                {/* Needs Review */}
                <button onClick={()=>setActiveView("needs-review")}
                  className={`w-full flex items-center justify-between px-2 h-7 rounded-md text-sm transition-colors ${activeView==="needs-review"?"bg-amber-50 text-amber-800 font-semibold":"text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                  <span className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-500"/><span className="text-xs">Needs Review</span></span>
                  {needsReviewCount>0
                    ? <span className={`text-[10px] px-1.5 rounded-full font-bold ${activeView==="needs-review"?"bg-amber-500 text-white":"bg-amber-100 text-amber-700"}`}>{needsReviewCount}</span>
                    : <span className="text-[10px] text-[#9E9FAE]">0</span>}
                </button>
              </div>
            </div>

            <div className="mx-3 h-px bg-[#E5EAF0]"/>

            {/* Purchase Orders */}
            <div className="px-3 py-2 flex flex-col" style={{maxHeight:"33vh", overflowY:"auto"}}>
              <div className="flex items-center justify-between px-2 mb-1.5 shrink-0">
                <div className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase">Purchase Orders</div>
                {selectedShipmentId&&<button onClick={()=>setSelectedShipmentId(null)} className="text-[#9000FF] text-[10px] flex items-center gap-0.5"><X size={9}/>Clear</button>}
              </div>
              <div className="space-y-0.5">
                {shipments.map(s=>{
                  const isSelected=selectedShipmentId===s.id;
                  const stageIdx=stages.findIndex(st=>st.id===s.currentStageId);
                  const pct=stages.length>1?Math.round((stageIdx/(stages.length-1))*100):0;
                  const cur=stages.find(st=>st.id===s.currentStageId);
                  const dotCls=s.status==="delayed"?"bg-red-500":s.status==="at-risk"?"bg-amber-400":"bg-emerald-400";
                  return (
                    <button key={s.id} onClick={()=>{setActiveView("inbox");selectShipment(s.id);}}
                      className={`w-full text-left px-2 py-2 rounded-md border-l-2 transition-all ${isSelected?"bg-white border-l-[#9000FF] shadow-sm":"border-l-transparent hover:bg-[#E5EAF0]"}`}>
                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}${s.status==="delayed"?" animate-pulse":""}`}/>
                        <span className={`text-xs font-bold leading-none truncate ${isSelected?"text-[#9000FF]":"text-[#212833]"}`}>{s.po}</span>
                        {s.buyerPoNumbers && s.buyerPoNumbers.length > 0 ? (
                          <>
                            <span className="text-[8px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none shrink-0">{s.buyerPoNumbers[0]}</span>
                            {s.buyerPoNumbers.length > 1 && (
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none shrink-0" title={s.buyerPoNumbers.join(", ")}>+{s.buyerPoNumbers.length - 1}</span>
                            )}
                          </>
                        ) : s.buyerPoNumber ? (
                          <span className="text-[8px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none shrink-0">{s.buyerPoNumber}</span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-[#5E687B] truncate pl-3 mb-1 leading-tight">{s.product}</div>
                      <div className="pl-3">
                        <div className="h-[3px] bg-[#F0F4F8] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.status==="delayed"?"bg-red-400":s.status==="at-risk"?"bg-amber-400":"bg-[#9000FF]"}`} style={{width:`${pct}%`}}/>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-[#9E9FAE] truncate">{cur?.label??"—"}</span>
                          <span className="text-[10px] text-[#9E9FAE] shrink-0">{pct}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-3 h-px bg-[#E5EAF0]"/>

            {/* Suppliers */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <div className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase">Suppliers</div>
                {supplierFilter&&<button onClick={()=>setSupplierFilter(null)} className="text-[#9000FF] text-[10px] flex items-center gap-0.5"><X size={9}/>Clear</button>}
              </div>
              <div className="space-y-0.5">
                {SUPPLIERS.map(s=>(
                  <button key={s.id} onClick={()=>{setActiveView("inbox");toggleSupplier(s.id);}}
                    className={`w-full flex items-center justify-between px-2 h-7 rounded-md text-sm transition-colors ${supplierFilter===s.id?"bg-[#E5EAF0] text-[#9000FF] font-semibold":"text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                    <span className="flex items-center gap-1.5 truncate min-w-0">
                      <Hash className="w-3 h-3 opacity-50 shrink-0"/>
                      <span className="truncate text-xs">{s.label}</span>
                    </span>
                    {s.unread>0
                      ? <span className={`text-[10px] px-1.5 rounded-full font-bold shrink-0 ml-1 ${supplierFilter===s.id?"bg-[#9000FF] text-white":"bg-[#E5EAF0] text-[#5E687B]"}`}>{s.unread}</span>
                      : <span className="text-[10px] text-[#9E9FAE] shrink-0 ml-1">{s.count}</span>}
                  </button>
                ))}
              </div>
              {(selectedShipmentId||supplierFilter||channelFilter!=="all"||flaggedFilter)&&activeView==="inbox"&&(
                <button onClick={()=>{setSelectedShipmentId(null);setSupplierFilter(null);setChannelFilter("all");setFlaggedFilter(false);}}
                  className="mt-3 w-full text-[10px] text-[#5E687B] hover:text-[#212833] flex items-center justify-center gap-1 py-1.5 border border-dashed border-[#E5EAF0] rounded-md">
                  <X size={9}/>Clear all filters
                </button>
              )}
            </div>

          </div>

          {/* Import Documents + Settings */}
          <div className="shrink-0 p-2 border-t border-[#E5EAF0] space-y-0.5">
            <button onClick={()=>setActiveView("import")} className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-sm font-semibold text-[#9000FF] hover:bg-[#9000FF]/5 transition-colors">
              <Upload className="w-4 h-4"/>Import Documents
            </button>
            <button onClick={()=>setActiveView("settings")} className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-sm font-semibold transition-colors ${activeView==="settings"?"text-[#9000FF] bg-[#9000FF]/5":"text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
              <Settings className="w-4 h-4"/><span>Settings</span>
              {gmailStatus?.connected && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shrink-0"/>}
              {!gmailStatus?.connected && gmailStatus?.clientConfigured && <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 shrink-0"/>}
            </button>
          </div>
        </NavSidebar>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOP BAR */}
        <div className="h-12 bg-white border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0 relative">
          <div className="font-bold text-sm flex items-center gap-2 w-[200px]">
            <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
              <img src="/flowforge-logo.png" alt="FlowForge" className="w-full h-full object-contain" />
            </div>
            <span className="text-[#9000FF] tracking-tight">flowforge</span>
            <span className="text-[#E5EAF0]">/</span>
            <span className="text-[#5E687B] font-medium text-xs">
              {activeView==="inbox"
                  ? (selectedShipmentId ? shipments.find(s=>s.id===selectedShipmentId)?.po
                    : supplierFilter ?? (channelFilter!=="all" ? channelFilter[0].toUpperCase()+channelFilter.slice(1) : "Inbox"))
                  : activeView==="calendar"  ? "Calendar"
                  : activeView==="copilot"   ? "Copilot Queue"
                  : activeView==="buyers"    ? "Buyer Chatbot"
                  : "Doc Intelligence"}
            </span>
          </div>

          <div className="flex-1 max-w-md mx-5 relative">
            {searchMode ? (
              <>
                <div className="flex items-center gap-1 absolute left-2 top-1/2 -translate-y-1/2 z-10">
                  <button onClick={()=>{setSearchMode(false);setSearchQuery("");}} title="AI mode"
                    className="p-0.5 rounded transition-colors text-[#C0C8D4] hover:text-[#5E687B]">
                    <Sparkles size={12}/>
                  </button>
                  <button title="Search mode"
                    className="p-0.5 rounded transition-colors text-[#9000FF]">
                    <Search size={12}/>
                  </button>
                </div>
                <input autoFocus type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search messages, POs, suppliers..."
                  className="w-full pl-14 pr-3 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-xs text-[#212833] placeholder-[#9E9FAE] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none"/>
                {searchQuery&&<SearchResults query={searchQuery} messages={messages} onOpen={id=>{openMessage(id);setSearchMode(false);setSearchQuery("");}}/>}
              </>
            ) : (
              <AICopilotBar
                className="w-full"
                alwaysOpen
                leftNode={
                  <div className="flex items-center gap-1">
                    <button title="AI mode" className="p-0.5 rounded transition-colors text-[#9000FF]">
                      <Sparkles size={12}/>
                    </button>
                    <button onClick={()=>{setSearchMode(true);}} title="Search mode"
                      className="p-0.5 rounded transition-colors text-[#C0C8D4] hover:text-[#5E687B]">
                      <Search size={12}/>
                    </button>
                  </div>
                }
              />
            )}
          </div>

          <div className="flex items-center gap-3 text-[#5E687B]">
            {activeView==="inbox"&&<div className="relative">
              <button onClick={()=>setShowTaskPanel(v=>!v)} className="hover:text-[#212833] p-1 relative" title="Today's Tasks">
                <ListTodo size={15}/>
                {highCount>0&&<span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"/>}
              </button>
              {showTaskPanel&&<>
                <div className="fixed inset-0 z-40" onClick={()=>setShowTaskPanel(false)}/>
                <div className="absolute top-full right-0 mt-1 w-[340px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5EAF0] overflow-hidden z-50 flex flex-col max-h-[420px]">
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#9000FF]/5 to-transparent px-3.5 py-3 shrink-0 border-b border-[#E5EAF0]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF] shrink-0"><ListTodo size={14}/></div>
                      <div>
                        <div className="text-[11px] font-bold text-[#212833]">Today's Tasks</div>
                        <div className="text-[9px] text-[#5E687B]">{highCount>0?<span className="text-red-500 font-semibold">{highCount} urgent</span>:null}{highCount>0&&tasks.length>highCount?" · ":null}{tasks.length>highCount?`${tasks.length-highCount} more`:null}{tasks.length===0?"All clear!":null}</div>
                      </div>
                    </div>
                    <button onClick={()=>setShowTaskPanel(false)} className="text-[#5E687B] hover:text-[#212833] p-1"><X size={13}/></button>
                  </div>
                  <TaskList tasks={tasks} onOpenMessage={id=>{openMessage(id);setShowTaskPanel(false);}} onDismiss={id=>setTasks(t=>t.filter(tk=>tk.id!==id))} onClose={()=>setShowTaskPanel(false)}/>
                </div>
              </>}
            </div>}
            {activeView==="inbox"&&<button onClick={()=>setShowPasteChat(true)} className="hover:text-[#212833] p-1" title="Paste chat message (WhatsApp / WeChat / iMessage)"><Clipboard size={15}/></button>}
            <button className="hover:text-[#212833] p-1 relative"><Bell size={15}/>{unreadCount>0&&<span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"/>}</button>
            <span className="w-px h-4 bg-[#E5EAF0] shrink-0" />
            <div className="w-7 h-7 rounded-md border border-[#E5EAF0] bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">AX</div>
          </div>
        </div>

          {/* ── PASTE CHAT MODAL ── */}
          {showPasteChat&&(
            <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={()=>{if(!ingestChatMutation.isPending)closePasteChat();}}>
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"/>
              <div className="relative bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-[#E5EAF0] w-full max-w-[520px] mx-4 overflow-hidden" onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF0]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF]"><Clipboard size={15}/></div>
                    <div>
                      <div className="text-sm font-bold text-[#212833]">Paste Chat Message</div>
                      <div className="text-[10px] text-[#5E687B]">Paste a WhatsApp, WeChat, or iMessage export — AI will extract supply-chain data</div>
                    </div>
                  </div>
                  <button onClick={closePasteChat} className="text-[#5E687B] hover:text-[#212833] p-1"><X size={16}/></button>
                </div>

                {!pasteChatResult ? (
                  <div className="p-5 space-y-4">
                    {/* Channel selector */}
                    <div>
                      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Source platform</div>
                      <div className="flex gap-2">
                        {(["whatsapp","wechat","imessage","sms"] as const).map(ch=>(
                          <button key={ch} onClick={()=>setPasteChatChannel(ch)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${pasteChatChannel===ch?"bg-[#9000FF]/5 border-[#9000FF]/30 text-[#9000FF]":"border-[#E5EAF0] text-[#5E687B] hover:border-[#C0C8D4]"}`}>
                            {chIcon(ch as Channel,11)}
                            {ch==="whatsapp"?"WhatsApp":ch==="wechat"?"WeChat":ch==="imessage"?"iMessage":"SMS"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sender hint */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-1.5 block">Supplier / sender name <span className="font-normal normal-case opacity-70">(optional, helps matching)</span></label>
                      <input value={pasteChatSenderHint} onChange={e=>setPasteChatSenderHint(e.target.value)} placeholder="e.g. Guangzhou Metalworks" className="w-full text-xs border border-[#E5EAF0] rounded-lg px-3 py-2 outline-none focus:border-[#9000FF]/40 focus:ring-2 focus:ring-[#9000FF]/10 placeholder:text-[#C0C8D4]"/>
                    </div>

                    {/* Chat text */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-1.5 block">Paste chat text</label>
                      <textarea value={pasteChatText} onChange={e=>setPasteChatText(e.target.value)} placeholder={"[23/05/2026, 14:32] Supplier: Hi, quick update on PO-2026-0142...\n[23/05/2026, 14:33] Me: Thanks, noted!"} rows={7} className="w-full text-[11px] font-mono border border-[#E5EAF0] rounded-lg px-3 py-2.5 outline-none focus:border-[#9000FF]/40 focus:ring-2 focus:ring-[#9000FF]/10 placeholder:text-[#C0C8D4] resize-none"/>
                    </div>

                    {pasteChatError&&<div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertCircle size={11} className="shrink-0"/>{pasteChatError}</div>}

                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={closePasteChat} className="text-xs px-3 py-1.5 border border-[#E5EAF0] rounded-lg text-[#5E687B] hover:bg-[#F0F4F8] font-medium">Cancel</button>
                      <button
                        disabled={!pasteChatText.trim()||ingestChatMutation.isPending}
                        onClick={async()=>{
                          setPasteChatError(null);
                          try {
                            const result = await ingestChatMutation.mutateAsync({ data: { rawText: pasteChatText, channel: pasteChatChannel, ...(pasteChatSenderHint.trim()?{senderHint:pasteChatSenderHint.trim()}:{}) } });
                            setPasteChatResult(result);
                          } catch {
                            setPasteChatError("Processing failed — check your text and try again");
                          }
                        }}
                        className="text-xs px-4 py-1.5 bg-[#9000FF] text-white rounded-lg font-semibold hover:bg-[#7A00D9] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                        {ingestChatMutation.isPending?<><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Processing…</>:<><Sparkles size={11}/>Process</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Result preview */
                  <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    {/* Routing badge */}
                    <div className="flex items-center gap-2">
                      {pasteChatResult.routingStatus==="routed"
                        ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={10}/>Matched to shipment</span>
                        : <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full"><AlertCircle size={10}/>Needs review — no shipment matched</span>}
                      <span className="text-[9px] text-[#9E9FAE]">confidence {Math.round(pasteChatResult.confidence*100)}%</span>
                    </div>

                    {/* Sender + shipment */}
                    <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3 space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2"><span className="text-[#5E687B] w-20 shrink-0">Sender:</span><span className="font-semibold text-[#212833]">{pasteChatResult.sender}</span></div>
                      {pasteChatResult.shipmentId&&<div className="flex items-center gap-2"><span className="text-[#5E687B] w-20 shrink-0">Shipment:</span><span className="font-semibold text-[#9000FF]">{shipments.find(s=>s.shipmentId===pasteChatResult!.shipmentId)?.po??`#${pasteChatResult.shipmentId}`}</span></div>}
                      {pasteChatResult.matchMethod&&<div className="flex items-center gap-2"><span className="text-[#5E687B] w-20 shrink-0">Match via:</span><span className="text-[#212833]">{pasteChatResult.matchMethod}</span></div>}
                    </div>

                    {/* Extracted fields */}
                    {pasteChatResult.extractedFields&&Object.values(pasteChatResult.extractedFields).some(v=>v!=null)&&(
                      <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3">
                        <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Extracted fields</div>
                        <div className="space-y-1 text-[11px]">
                          {pasteChatResult.extractedFields.eta&&<div className="flex gap-2"><span className="text-[#5E687B] w-20 shrink-0">ETA:</span><span className="text-[#212833]">{pasteChatResult.extractedFields.eta}</span></div>}
                          {pasteChatResult.extractedFields.quotePrice!=null&&<div className="flex gap-2"><span className="text-[#5E687B] w-20 shrink-0">Quote:</span><span className="text-[#212833]">${pasteChatResult.extractedFields.quotePrice}</span></div>}
                          {pasteChatResult.extractedFields.productionPct!=null&&<div className="flex gap-2"><span className="text-[#5E687B] w-20 shrink-0">Production:</span><span className="text-[#212833]">{pasteChatResult.extractedFields.productionPct}% complete</span></div>}
                          {pasteChatResult.extractedFields.qcNote&&<div className="flex gap-2"><span className="text-[#5E687B] w-20 shrink-0">QC:</span><span className="text-[#212833]">{pasteChatResult.extractedFields.qcNote}</span></div>}
                          {pasteChatResult.extractedFields.statusUpdate&&<div className="flex gap-2"><span className="text-[#5E687B] w-20 shrink-0">Status:</span><span className="text-[#212833]">{pasteChatResult.extractedFields.statusUpdate}</span></div>}
                        </div>
                      </div>
                    )}

                    {/* AI draft */}
                    {pasteChatResult.aiDraft&&(
                      <div className="bg-[#9000FF]/[0.03] border border-[#9000FF]/10 rounded-xl p-3">
                        <div className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Sparkles size={9}/>AI draft reply</div>
                        <p className="text-[11px] text-[#212833] leading-relaxed">{pasteChatResult.aiDraft}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button onClick={()=>setPasteChatResult(null)} className="text-xs px-3 py-1.5 border border-[#E5EAF0] rounded-lg text-[#5E687B] hover:bg-[#F0F4F8] font-medium flex items-center gap-1"><ChevronLeft size={11}/>Back</button>
                      <div className="flex gap-2">
                        <button onClick={closePasteChat} className="text-xs px-3 py-1.5 border border-[#E5EAF0] rounded-lg text-[#5E687B] hover:bg-[#F0F4F8] font-medium">Discard</button>
                        <button
                          onClick={async()=>{
                            try {
                              const created = await createMessage({
                                shipmentId: pasteChatResult.shipmentId??null,
                                supplierId: pasteChatResult.supplierId??null,
                                sender: pasteChatResult.sender,
                                channel: pasteChatChannel,
                                direction: "inbound",
                                snippet: pasteChatResult.snippet,
                                fullBody: pasteChatResult.fullBody,
                                aiDraft: pasteChatResult.aiDraft,
                                aiAction: pasteChatResult.aiAction,
                                aiTags: pasteChatResult.aiTags,
                              });
                              const newUiMsg: UiMessage = {
                                id: String(created.id), messageId: created.id, sender: created.sender,
                                channel: pasteChatChannel as UiMessage["channel"], timestamp: "Just now",
                                snippet: created.snippet, fullBody: created.fullBody, unread: true,
                                aiTags: created.aiTags??[], shipmentId: created.shipmentId?String(created.shipmentId):"",
                                supplierId: "", aiDraft: created.aiDraft??"", aiAction: created.aiAction??"",
                                isFlagged: false, routingStatus: (created.routingStatus as "routed"|"needs-review"),
                              };
                              setMessages(prev=>[newUiMsg,...prev]);
                              setToast("Chat message added to inbox");
                              closePasteChat();
                            } catch {
                              setPasteChatError("Failed to save — please try again");
                            }
                          }}
                          className="text-xs px-4 py-1.5 bg-[#9000FF] text-white rounded-lg font-semibold hover:bg-[#7A00D9] flex items-center gap-1.5">
                          <Check size={11}/>Add to Inbox
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FULL-PAGE VIEWS ── */}
          {activeView==="copilot"&&<CopilotQueue/>}
          {activeView==="calendar"&&<CalendarView shipments={shipments}/>}
          {activeView==="buyers"&&<BuyersView/>}
          {activeView==="import"&&<DocumentIntake onDone={()=>setActiveView("inbox")}/>}
          {activeView==="needs-review"&&(
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-10 bg-white border-b border-[#E5EAF0] flex items-center px-4 shrink-0 gap-2">
                <AlertCircle size={13} className="text-amber-500"/>
                <span className="text-xs font-bold text-[#212833]">Needs Review</span>
                {needsReviewCount>0&&<span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 rounded-full">{needsReviewCount}</span>}
                <span className="text-[10px] text-[#9E9FAE] ml-1">— Assign unmatched inbound emails to the correct shipment</span>
              </div>
              <NeedsReviewPanel
                messages={needsReviewMessages}
                shipments={shipments}
                onAssigned={msgId => {
                  setNeedsReviewMessages(prev => prev.filter(m => m.id !== msgId));
                  void refetchNeedsReview();
                  setToast("Message assigned — sender will be auto-routed next time");
                }}
              />
            </div>
          )}
          {activeView==="settings"&&(
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-10 bg-white border-b border-[#E5EAF0] flex items-center px-4 shrink-0 gap-2">
                <Settings size={13} className="text-[#5E687B]"/>
                <span className="text-xs font-bold text-[#212833]">Settings</span>
              </div>
              <GmailSettingsPanel status={gmailStatus} onGmailStatusChange={() => { void refetchGmailStatus(); }}/>
            </div>
          )}
          {/* ── INBOX VIEW: thread list + detail ── */}
          {activeView==="inbox"&&<ResizablePanelGroup direction="horizontal" autoSaveId="inbox-v2-panels" className="flex-1 overflow-hidden">

            {/* Col A — Thread list */}
            <ResizablePanel defaultSize={38} minSize={22} className="bg-white flex flex-col min-w-0">
            <div className="flex flex-col h-full overflow-hidden">
              <div className="border-b border-[#E5EAF0] px-3 flex items-center justify-between shrink-0" style={{height:38}}>
                <div className="font-semibold text-[11px] text-[#212833]">{visibleMessages.length} thread{visibleMessages.length!==1?"s":""}{(selectedShipmentId||supplierFilter||channelFilter!=="all"||flaggedFilter)&&<span className="ml-1 text-[#9000FF] font-normal">— {flaggedFilter?"flagged":"filtered"}</span>}</div>
                <div className="flex items-center gap-1">
                  {activeShipment && (
                    <button
                      onClick={() => { setShowComposePanel(true); setRightTab("message"); }}
                      title={`Compose new message for ${activeShipment.po}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold text-[#9000FF] hover:bg-[#9000FF]/8 border border-[#9000FF]/20 transition-colors"
                    >
                      <Plus size={11}/>Compose
                    </button>
                  )}
                  <button className="p-1 hover:bg-[#F0F4F8] rounded text-[#5E687B]"><MoreHorizontal size={13}/></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {visibleMessages.map(msg=>{
                  const replied=repliedIds.has(msg.id);
                  return (
                    <div key={msg.id} onClick={()=>openMessage(msg.id)}
                      className={`px-3 py-2.5 border-b border-[#E5EAF0] cursor-pointer hover:bg-[#FAFBFC] transition-colors relative group/row ${activeMessageId===msg.id?"bg-[#FAFBFF] border-l-2 border-l-[#9000FF]":"border-l-2 border-l-transparent"}`}>
                      {msg.unread&&!replied&&<div className="absolute left-2 top-4 w-1.5 h-1.5 bg-[#9000FF] rounded-full"/>}
                      <div className="flex items-start justify-between mb-0.5 pl-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-semibold text-[11px] truncate ${msg.unread&&!replied?"text-[#212833]":"text-[#5E687B]"}`}>{msg.sender}</span>
                          {chIcon(msg.channel)}
                          {replied&&<span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 rounded-full font-semibold flex items-center gap-0.5"><Check size={7}/>Replied</span>}
                          {msg.routingConfidence != null && msg.routingConfidence < 0.85 && (
                            <span title={`Routing confidence: ${Math.round(msg.routingConfidence*100)}% (${msg.matchMethod ?? ""})`} className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 ${msg.routingConfidence>=0.65?"bg-amber-50 text-amber-600 border-amber-100":"bg-red-50 text-red-600 border-red-100"}`}>
                              {Math.round(msg.routingConfidence*100)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={e=>toggleFlag(msg.id,e)}
                            title={msg.isFlagged?"Remove flag":"Flag for follow-up"}
                            className={`p-0.5 rounded transition-all ${msg.isFlagged?"text-amber-500 opacity-100":"text-[#9E9FAE] opacity-0 group-hover/row:opacity-100"} hover:scale-110`}>
                            <Bookmark size={11} className={msg.isFlagged?"fill-amber-400":""}/>
                          </button>
                          <span className={`text-[9px] ${msg.unread&&!replied?"text-[#9000FF] font-semibold":"text-[#5E687B]"}`}>{msg.timestamp}</span>
                        </div>
                      </div>
                      <div className={`text-[11px] pl-3 mb-1.5 line-clamp-2 leading-relaxed ${msg.unread&&!replied?"text-[#212833]":"text-[#9E9FAE]"}`}>{msg.snippet}</div>
                      <div className="flex flex-wrap gap-1 pl-3">
                        {msg.aiTags.map(tag=>(
                          <span key={tag} className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] flex items-center gap-0.5">
                            {tag.startsWith("risk")||tag.startsWith("delay")||tag.startsWith("payment")?<AlertCircle size={7} className="text-red-500"/>:<Sparkles size={7} className="text-[#9000FF]"/>}{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </ResizablePanel>

            <ResizableHandle className="w-1 bg-[#E5EAF0] hover:bg-[#9000FF]/20 transition-colors cursor-col-resize data-[resize-handle-active]:bg-[#9000FF]/30" />

            {/* Col B — Thread detail */}
            <ResizablePanel defaultSize={62} minSize={30} className="bg-white flex flex-col min-w-0 border-l border-[#E5EAF0]">
            <div className="flex flex-col h-full overflow-hidden">
              {/* Compose panel (replaces normal detail when open) */}
              {showComposePanel && activeShipment && (
                <ComposePanel
                  shipment={activeShipment}
                  supplierEmail={activeSupplierEmail}
                  onSend={sendComposedMessage}
                  onCancel={() => setShowComposePanel(false)}
                />
              )}
              {/* Shipment context */}
              {!showComposePanel && activeShipment&&(
                <div className="border-b border-[#E5EAF0] p-4 bg-[#FAFBFC] shrink-0">
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[8px] font-bold text-[#9E9FAE] uppercase tracking-wider">Supplier</span>
                        <span className="font-bold text-xs text-[#212833]">{activeShipment.po}</span>
                        {activeShipment.buyerPoNumbers && activeShipment.buyerPoNumbers.length > 0 ? (
                          <>
                            <span className="text-[8px] font-bold text-[#9E9FAE] uppercase tracking-wider">Buyer</span>
                            <span className="font-bold text-xs text-emerald-700 font-mono">{activeShipment.buyerPoNumbers[0]}</span>
                            {activeShipment.buyerPoNumbers.length > 1 && (
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded" title={activeShipment.buyerPoNumbers.join(", ")}>+{activeShipment.buyerPoNumbers.length - 1}</span>
                            )}
                          </>
                        ) : activeShipment.buyerPoNumber ? (
                          <>
                            <span className="text-[8px] font-bold text-[#9E9FAE] uppercase tracking-wider">Buyer</span>
                            <span className="font-bold text-xs text-emerald-700 font-mono">{activeShipment.buyerPoNumber}</span>
                          </>
                        ) : null}
                        <span className="text-[9px] bg-[#E5EAF0] text-[#5E687B] px-1.5 rounded font-medium">{activeShipment.customer}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusCls(activeShipment.status)}`}>{activeShipment.status==="on-track"?<Check size={8}/>:<AlertCircle size={8}/>}{activeShipment.status}</span>
                      </div>
                      <div className="text-[11px] text-[#5E687B]">{activeShipment.product}</div>
                    </div>
                    <div className="flex items-start gap-1.5 shrink-0">
                      <div className="text-right"><div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">Ex-Factory</div><div className="text-xs font-bold text-[#212833]">{activeShipment.dueDate}</div></div>
                      <button onClick={()=>setShipmentContextExpanded(v=>!v)} className="p-1 rounded hover:bg-[#E5EAF0] text-[#5E687B] transition-colors mt-0.5" title={shipmentContextExpanded?"Collapse details":"Expand details"}>
                        {shipmentContextExpanded?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
                      </button>
                    </div>
                  </div>
                  {shipmentContextExpanded&&<>
                  {/* Stage bar */}
                  <div className="bg-white rounded-lg border border-[#E5EAF0] p-2.5 mb-2.5">
                    <div className="flex items-center justify-between text-[9px] mb-1.5">
                      <span className="font-bold text-[#212833] flex items-center gap-1"><MapPin size={9} className="text-[#9000FF]"/>{activeStage?.label??"—"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#5E687B]">Stage {activeStageIdx+1} of {stages.length}</span>
                        <button
                          onClick={() => activeShipment && openAdvanceDialog(activeShipment)}
                          className="text-[8px] font-semibold text-[#9000FF] bg-[#9000FF]/8 border border-[#9000FF]/20 px-2 py-0.5 rounded-full hover:bg-[#9000FF]/15 transition-colors flex items-center gap-1">
                          <ChevronRight size={8}/>Advance
                        </button>
                        <button
                          onClick={() => setShowHistory(h => !h)}
                          className={`text-[8px] font-semibold px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${showHistory?"bg-[#9000FF]/10 border-[#9000FF]/20 text-[#9000FF]":"text-[#5E687B] border-[#E5EAF0] hover:bg-[#F0F4F8]"}`}>
                          <Clock size={8}/>History
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-px h-1.5 mb-2">{stages.map((_,idx)=><div key={idx} className={`flex-1 rounded-full transition-all duration-500 ${idx<activeStageIdx?"bg-[#9000FF]":idx===activeStageIdx?"bg-[#9000FF] opacity-50":"bg-[#E5EAF0]"}`}/>)}</div>
                    <div className="flex items-center gap-1 overflow-x-auto">{stages.slice(activeStageIdx,activeStageIdx+5).map((st,i)=><div key={st.id} className={`flex items-center gap-1 shrink-0 text-[9px] ${i===0?"text-[#9000FF] font-bold":"text-[#9E9FAE]"}`}>{i>0&&<ChevronRight size={8} className="text-[#D6E3EB]"/>}{st.label}</div>)}</div>
                    {showHistory&&activeShipment&&(
                      <div className="mt-2.5 pt-2.5 border-t border-[#F0F4F8]">
                        <StageHistory
                          shipmentId={activeShipment.shipmentId}
                          stageLabels={Object.fromEntries(stages.map(s => [s.id, s.label]))}
                        />
                      </div>
                    )}
                  </div>
                  {/* Payment inline */}
                  <div className="space-y-1.5">
                    {activeShipment.payments.map((p, i) => {
                      const ov = !p.paid && new Date(`${p.dueDate} 2026`) < new Date();
                      const isFormOpen = markPaidForm?.shipmentId === activeShipment.id && markPaidForm?.paymentIdx === i;
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-2">
                            <div className={`flex flex-col gap-0.5 text-[9px] font-semibold px-2 py-1 rounded border flex-1 ${p.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : ov ? "bg-red-50 text-red-600 border-red-100" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                              <div className="flex items-center gap-1">
                                {p.paid ? <CheckCircle2 size={9}/> : ov ? <AlertCircle size={9}/> : <CreditCard size={9}/>}
                                {p.label}: ${p.amountUsd.toLocaleString()} {p.paid ? `paid ${p.paidAt ? shortDate(p.paidAt) : ""}`.trim() : ov ? "OVERDUE" : `due ${p.dueDate}`}
                              </div>
                              {(p.intermediaryAdvanceUsd ?? 0) > 0 && (
                                <div className="flex items-center gap-1 text-amber-600 font-medium">
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                  Intermediary: ${p.intermediaryAdvanceUsd!.toLocaleString()} fronted
                                  {(p.intermediaryRecoveredUsd ?? 0) > 0 && ` / $${p.intermediaryRecoveredUsd!.toLocaleString()} recovered`}
                                </div>
                              )}
                            </div>
                            {!p.paid && !isFormOpen && (
                              <button type="button" onClick={() => openMarkPaid(activeShipment.id, i as 0|1)}
                                className="text-[9px] font-semibold px-2 py-1 rounded border bg-[#9000FF] text-white border-[#9000FF] hover:bg-[#7A00D9] transition-colors shrink-0">
                                Mark Paid
                              </button>
                            )}
                            {p.paid && (
                              <button type="button" onClick={() => undoPaymentPaid(activeShipment.id, i as 0|1)}
                                className="text-[9px] font-medium px-2 py-1 rounded border bg-white text-[#5E687B] border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors shrink-0">
                                Undo
                              </button>
                            )}
                            {isFormOpen && (
                              <button type="button" onClick={() => setMarkPaidForm(null)}
                                className="text-[9px] font-medium px-2 py-1 rounded border bg-white text-[#5E687B] border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors shrink-0">
                                Cancel
                              </button>
                            )}
                          </div>
                          {isFormOpen && markPaidForm && (
                            <div className="mt-1.5 p-2.5 bg-white border border-[#9000FF]/20 rounded-lg shadow-sm space-y-2">
                              <p className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider">Record Payment</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">Amount (USD)</label>
                                  <input type="number" min="0" value={markPaidForm.amount}
                                    onChange={e => setMarkPaidForm(f => f ? { ...f, amount: e.target.value } : f)}
                                    className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">Payment Date</label>
                                  <input type="date" value={markPaidForm.date}
                                    onChange={e => setMarkPaidForm(f => f ? { ...f, date: e.target.value } : f)}
                                    className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833]"/>
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">Reference # (optional)</label>
                                  <input type="text" value={markPaidForm.reference} placeholder="e.g. TXN-2026-001"
                                    onChange={e => setMarkPaidForm(f => f ? { ...f, reference: e.target.value } : f)}
                                    className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] placeholder:text-[#9E9FAE]"/>
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#5E687B] font-medium block mb-0.5">Method</label>
                                  <select value={markPaidForm.method}
                                    onChange={e => setMarkPaidForm(f => f ? { ...f, method: e.target.value } : f)}
                                    className="w-full px-2 py-1 text-[10px] border border-[#E5EAF0] rounded-md outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 text-[#212833] bg-white">
                                    <option>Wire</option>
                                    <option>Credit</option>
                                    <option>Other</option>
                                  </select>
                                </div>
                              </div>
                              <button type="button" onClick={confirmMarkPaid}
                                className="w-full py-1.5 text-[10px] font-semibold bg-[#9000FF] text-white rounded-md hover:bg-[#7A00D9] transition-colors flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={10}/> Confirm Payment
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Supplier contact email */}
                  {activeSupplier ? (
                    <div className="mt-2.5 pt-2.5 border-t border-[#E5EAF0]">
                      <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Mail size={8}/>Supplier Contact
                      </div>
                      {editingEmail ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="email"
                            value={emailDraft}
                            onChange={e => setEmailDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEmail(); if (e.key === "Escape") setEditingEmail(false); }}
                            placeholder="supplier@example.com"
                            className="flex-1 px-2 py-1 text-[10px] border border-[#9000FF]/40 rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/20 text-[#212833]"
                          />
                          <button onClick={saveEmail} disabled={updateSupplierMutation.isPending} className="text-[9px] bg-[#9000FF] text-white px-2 py-1 rounded-md font-semibold hover:bg-[#7A00D9] disabled:opacity-50 shrink-0">Save</button>
                          <button onClick={() => setEditingEmail(false)} className="text-[9px] text-[#5E687B] px-1.5 py-1 rounded-md hover:bg-[#F0F4F8] shrink-0">✕</button>
                        </div>
                      ) : activeSupplierEmail ? (
                        <div className="flex items-center gap-1.5 group">
                          <span className="text-[10px] text-[#212833] truncate">{activeSupplierEmail}</span>
                          <button
                            onClick={() => { setEmailDraft(activeSupplierEmail ?? ""); setEditingEmail(true); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[#F0F4F8] text-[#5E687B] shrink-0"
                            title="Edit contact email"
                          >
                            <Pencil size={9}/>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEmailDraft(""); setEditingEmail(true); }}
                          className="text-[9px] text-[#9000FF] hover:underline flex items-center gap-1"
                        >
                          <Plus size={8}/>Add contact email to improve routing
                        </button>
                      )}
                    </div>
                  ) : null}
                  </>}
                </div>
              )}

              {/* Tabs + tab content — hidden while compose panel is open */}
              {!showComposePanel && <><div className="flex border-b border-[#E5EAF0] shrink-0 bg-white">
                {([
                  {id:"message" as RightTab, label:"Message"},
                  {id:"docs"    as RightTab, label:"Docs"},
                  {id:"risk"    as RightTab, label:"Risk",    icon:ShieldAlert},
                  {id:"copilot" as RightTab, label:"Copilot", icon:Sparkles},
                ] as {id:RightTab;label:string;icon?:React.ElementType}[]).map(t=>(
                  <button key={t.id} onClick={()=>setRightTab(t.id)}
                    className={`flex-1 py-2 text-[11px] font-semibold transition-colors border-b-2 flex items-center justify-center gap-1 ${rightTab===t.id
                      ? t.id==="copilot" ? "border-amber-400 text-amber-700" : "border-[#9000FF] text-[#9000FF]"
                      : "border-transparent text-[#5E687B] hover:text-[#212833]"}`}>
                    {t.icon&&<t.icon size={10}/>}
                    <span className="inline-flex items-center justify-center gap-1.5">
                      {t.label}
                      {t.id==="docs"&&docsCount>0&&(
                        <span className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold leading-none ${docsHasFindings?"bg-amber-100 text-amber-700 border border-amber-300":"bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0]"} ${rightTab==="docs"?"opacity-100":"opacity-80"}`}>
                          {docsCount}
                        </span>
                      )}
                      {t.id==="copilot"&&(apiProposals??[]).filter(p=>p.status==="pending").length>0&&(
                        <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold leading-none bg-amber-100 text-amber-700 border border-amber-200">
                          {(apiProposals??[]).filter(p=>p.status==="pending").length}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Docs tab */}
              {rightTab==="docs"&&<DocsPanel shipmentId={activeShipment?.id??""}/>}

              {/* Copilot tab */}
              {rightTab==="copilot"&&(
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  <div className="bg-[#9000FF]/5 border border-[#9000FF]/15 rounded-xl p-3 flex items-start gap-2 shrink-0">
                    <Sparkles size={13} className="text-[#9000FF] mt-0.5 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#9000FF] mb-0.5">Copilot — {activeShipment?.po}</p>
                      <p className="text-[10px] text-[#5E687B]">AI-generated actions for the active thread.</p>
                    </div>
                    <button onClick={()=>setActiveView("copilot")} className="text-[9px] text-[#5E687B] hover:text-[#212833] shrink-0 flex items-center gap-0.5 whitespace-nowrap">Full queue<ArrowUpRight size={9}/></button>
                  </div>
                  {(apiProposals??[]).filter(p=>activeShipment&&p.shipmentId===activeShipment.shipmentId).slice(0,4).map(p=>{
                    const payload=(p.payload??{}) as Record<string,unknown>;
                    const draftBody=String(payload.draftBody??payload.messageSnippet??"");
                    const displayTitle=(p.actionType||"action").replace(/_/g," ");
                    const conf=p.confidence??0;
                    const priorityLabel=conf>=0.7?"high":conf>=0.4?"medium":"low";
                    return (
                      <div key={p.id} className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-start gap-2.5 p-3">
                          <div className="w-6 h-6 rounded-lg bg-[#F8F9FB] border border-[#E5EAF0] flex items-center justify-center shrink-0"><Sparkles size={11} className="text-[#9000FF]"/></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-bold text-[#212833] capitalize">{displayTitle}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${priorityLabel==="high"?"bg-red-50 text-red-600 border-red-100":priorityLabel==="medium"?"bg-amber-50 text-amber-600 border-amber-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>{priorityLabel}</span>
                            </div>
                            <p className="text-[10px] text-[#5E687B]">{p.reasoning}</p>
                          </div>
                        </div>
                        {draftBody&&<div className="mx-3 mb-3 bg-[#9000FF]/4 border border-[#9000FF]/15 rounded-lg p-2.5"><p className="text-[9px] font-bold text-[#9000FF] mb-1">Draft</p><p className="text-[10px] text-[#212833] leading-relaxed line-clamp-3">{draftBody}</p></div>}
                      </div>
                    );
                  })}
                  {(apiProposals??[]).filter(p=>activeShipment&&p.shipmentId===activeShipment.shipmentId).length===0&&(
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-[#9E9FAE]">
                      <Sparkles size={28} className="opacity-30 mb-2"/>
                      <p className="text-sm font-semibold text-[#212833]">No pending actions</p>
                      <p className="text-[11px] mt-1">Copilot will surface suggestions as new messages arrive.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Risk tab */}
              {rightTab==="risk"&&activeShipment&&(
                <div className="flex-1 overflow-y-auto p-4">
                  <ShipmentRiskDetail shipmentId={activeShipment.shipmentId}/>
                </div>
              )}

              {/* Message tab */}
              {rightTab==="message"&&<>
                {/* Quote panel */}
                {isQuotesStage&&activeShipment?.quotes&&(
                  <div className="px-4 pt-4 shrink-0"><QuotePanel quotes={activeShipment.quotes} shipmentId={activeShipment.id} onSelect={selectQuote}/></div>
                )}

                {/* Message body */}
                {!isQuotesStage&&(
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#F0F4F8] flex items-center justify-center text-sm font-bold text-[#5E687B] shrink-0">{activeMessage.sender.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#212833]">{activeMessage.sender}</div>
                        <div className="text-[9px] text-[#5E687B] flex items-center gap-1">{chIcon(activeMessage.channel,9)}via {activeMessage.channel==="whatsapp"?"WhatsApp":activeMessage.channel==="gmail"?"Gmail":activeMessage.channel==="wechat"?"WeChat":activeMessage.channel==="imessage"?"iMessage":activeMessage.channel==="sms"?"SMS":activeMessage.channel==="sheets"?"Google Sheets":"PDF"}<span className="text-[#C0C8D4]">·</span>{activeMessage.timestamp}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={e=>toggleFlag(activeMessage.id,e)}
                          title={activeMessage.isFlagged?"Remove flag":"Flag for follow-up"}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold border transition-all ${activeMessage.isFlagged?"bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0] hover:bg-amber-50 hover:text-amber-500 hover:border-amber-200"}`}>
                          <Bookmark size={10} className={activeMessage.isFlagged?"fill-amber-400":""}/>
                          {activeMessage.isFlagged?"Flagged":"Flag"}
                        </button>
                        {repliedIds.has(activeMessage.id)&&<span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 size={9}/>Replied</span>}
                      </div>
                    </div>
                    <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4 text-[11px] text-[#212833] whitespace-pre-wrap leading-relaxed">{activeMessage.fullBody}</div>
                    {activeShipment && <ReconciliationChips shipmentId={activeShipment.id}/>}
                    {activeMessage.aiAction&&(
                      <div className="bg-gradient-to-br from-[#9000FF]/5 to-transparent border border-[#9000FF]/20 rounded-xl p-3.5 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#9000FF]/8 rounded-full blur-2xl pointer-events-none"/>
                        <div className="flex items-start gap-2.5 relative">
                          <Wand2 size={13} className="text-[#9000FF] mt-0.5 shrink-0"/>
                          <div className="flex-1 min-w-0">
                            <div className="text-[8px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Zap size={8}/>AI Suggested Action</div>
                            <div className="text-[11px] text-[#212833] mb-2 font-semibold">{activeMessage.aiAction}</div>
                            {activeMessage.aiDraft&&<div className="bg-white border border-[#E5EAF0] rounded-lg p-2.5 text-[10px] text-[#5E687B] mb-3 leading-relaxed font-mono">"{activeMessage.aiDraft}"</div>}
                            {!repliedIds.has(activeMessage.id)?(
                              <div className="flex gap-2">
                                <button onClick={()=>sendReply(activeMessage.id)} className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-[#7A00D9] flex items-center gap-1.5 shadow-sm"><Send size={10}/>Send & Update</button>
                                <button onClick={()=>{setComposeText(activeMessage.aiDraft??"");setComposeFocused(true);}} className="bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md text-[10px] font-medium hover:bg-[#F0F4F8]">Edit Draft</button>
                              </div>
                            ):(
                              <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-semibold"><CheckCircle2 size={12}/>Sent — stage advanced</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Quote AI hint */}
                    {isQuotesStage&&(
                      <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3 text-[11px] text-[#5E687B] leading-relaxed">
                        <div className="flex items-center gap-2 mb-1.5"><Sparkles size={12} className="text-[#9000FF]"/><span className="font-semibold text-[#212833] text-xs">FlowForge AI — Quote Analysis</span></div>
                        Foshan Grid Factory offers the best unit price at $6.10 with 35-day lead time. Guangzhou Metalworks is your existing supplier with a shorter lead. Recommend Foshan if margin is priority.
                      </div>
                    )}
                  </div>
                )}

                {/* Quote scroll area */}
                {isQuotesStage&&<div className="flex-1 overflow-y-auto px-4 pb-4"><div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3 text-[11px] text-[#5E687B] leading-relaxed"><div className="flex items-center gap-2 mb-1.5"><Sparkles size={12} className="text-[#9000FF]"/><span className="font-semibold text-[#212833] text-xs">FlowForge AI — Quote Analysis</span></div>Foshan Grid Factory offers the best unit price at $6.10 with 35-day lead time. Guangzhou Metalworks is your existing supplier with a shorter lead time. Recommend Foshan if margin is priority; Guangzhou if relationship and speed matter more.</div></div>}

                {/* Compose + Template Picker  (P1) */}
                <div className="p-3 border-t border-[#E5EAF0] bg-white shrink-0">
                  {composeFocused&&activeShipment&&(
                    <TemplatePicker stageId={activeShipment.currentStageId} onPick={body=>{setComposeText(body);}}/>
                  )}
                  <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/40 focus-within:ring-1 focus-within:ring-[#9000FF]/15 transition-all">
                    <textarea value={composeText} onChange={e=>setComposeText(e.target.value)}
                      onFocus={()=>setComposeFocused(true)} onBlur={()=>setTimeout(()=>setComposeFocused(false),200)}
                      placeholder={repliedIds.has(activeMessage.id)?"Follow up...":"Type a reply or use Edit Draft above..."}
                      className="w-full p-3 h-14 outline-none resize-none text-[11px] bg-transparent leading-relaxed"/>
                    <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between gap-2">
                      <div className="flex gap-1 text-[#5E687B]">
                        <button className="p-1 hover:bg-[#E5EAF0] rounded"><Paperclip size={13}/></button>
                        <button onClick={()=>{setComposeText(activeMessage.aiDraft??"");setComposeFocused(true);}} className="p-1 hover:bg-[#E5EAF0] rounded" title="AI draft"><Sparkles size={13} className="text-[#9000FF]"/></button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activeMessage.channel==="gmail" && gmailStatus?.connected && (
                          <button
                            onClick={()=>{ if(composeText.trim()) sendViaGmail(activeMessage.messageId, composeText.trim()); }}
                            disabled={!composeText.trim() || sendReplyMutation.isPending}
                            title="Send reply through your connected Gmail account"
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${composeText.trim()&&!sendReplyMutation.isPending?"bg-blue-600 text-white hover:bg-blue-700":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>
                            <Mail size={10}/>Gmail
                          </button>
                        )}
                        <button onClick={()=>{if(composeText.trim())sendReply(activeMessage.id);}}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all ${composeText.trim()?"bg-[#212833] text-white hover:bg-black":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>
                          Reply<Send size={10}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>}
              </>}
            </div>
            </ResizablePanel>
          </ResizablePanelGroup>}

        </div>{/* end CONTENT AREA */}
      </div>{/* end MAIN AREA */}

      {/* ── ADVANCE STAGE CONFIRMATION DIALOG ── */}
      {advanceDialogShipment && (() => {
        const idx = stages.findIndex(st => st.id === advanceDialogShipment.currentStageId);
        const next = stages[Math.min(idx + 1, stages.length - 1)];
        return (
          <div className="fixed inset-0 z-[200] bg-[#212833]/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5EAF0] bg-[#FAFBFC]">
                <h2 className="text-sm font-bold text-[#212833]">Advance Shipment Stage</h2>
                <p className="text-[11px] text-[#5E687B] mt-0.5">
                  {advanceDialogShipment.po} — {advanceDialogShipment.product}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3">
                  <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Current</span>
                    <span className="text-[12px] font-semibold text-[#212833] text-center">{stages[idx]?.label ?? advanceDialogShipment.currentStageId}</span>
                  </div>
                  <ChevronRight size={20} className="text-[#9000FF] shrink-0" />
                  <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider">Next</span>
                    <span className="text-[12px] font-bold text-[#9000FF] text-center">{next?.label ?? "—"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E687B] mb-1.5">
                    Note <span className="text-[#9E9FAE] font-normal">(optional — e.g. "QC passed, cert attached")</span>
                  </label>
                  <textarea
                    value={advanceNote}
                    onChange={e => setAdvanceNote(e.target.value)}
                    placeholder="Add context about this stage change..."
                    rows={3}
                    className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[#E5EAF0] bg-[#FAFBFC] flex justify-end gap-2">
                <button
                  onClick={() => { setAdvanceDialogShipment(null); setAdvanceNote(""); }}
                  className="px-4 py-2 text-xs font-semibold text-[#5E687B] hover:text-[#212833] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={confirmAdvanceStage}
                  className="px-5 py-2 bg-[#9000FF] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#7A00D9] transition-colors">
                  Confirm Advance
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
