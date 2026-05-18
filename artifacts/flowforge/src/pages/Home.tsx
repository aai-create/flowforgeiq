import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Mail, MessageCircle, FileText, Sparkles, Wand2, Search,
  Bell, ChevronDown, Check, AlertCircle, Clock, MoreHorizontal,
  Paperclip, Send, ArrowRight, Inbox, FileBox, Users, Filter,
  MapPin, LayoutGrid, MessagesSquare, X, CheckCircle2, Zap, ChevronRight,
  GripVertical, Plus, Trash2, DollarSign, CreditCard, CalendarClock,
  ChevronUp, ListTodo, SlidersHorizontal, Calendar, Upload, Image,
  FileSpreadsheet, Video, Download, Eye, Bot, MessageSquare, ChevronLeft,
  Table2, FilePlus, Link2, ArrowUpRight,
} from "lucide-react";
import { Atelier } from "./Atelier";
import {
  useListStages, useListShipments, useListMessages, useListTasks,
  updateMessage, updateTask, updateShipment, updatePayment,
  selectFactoryQuote, reorderStages, createMessage,
} from "@workspace/api-client-react";
import {
  adaptStages, adaptShipments, adaptMessages, adaptTasks,
  type UiStage, type UiShipment, type UiMessage, type UiTask,
} from "@/lib/adapters";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ViewMode   = "inbox" | "command";
type NavTab     = "inbox" | "calendar" | "buyers" | "import";
type RightTab   = "message" | "docs";
type Channel    = "gmail" | "whatsapp" | "sheets" | "pdf";
type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Stage { id: string; label: string; }
interface Payment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; }
interface FactoryQuote { factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean; }
interface Shipment {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; currentStageId: string; dueDate: string;
  payments: [Payment, Payment]; quotes?: FactoryQuote[];
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

const SUPPLIERS = [
  { id:"Guangzhou Metalworks", label:"Guangzhou Metalworks", count:4 },
  { id:"Shenzhen LEDPro",      label:"Shenzhen LEDPro",       count:2 },
  { id:"Tianjin Wire Works",   label:"Tianjin Wire Works",    count:2 },
  { id:"Hangzhou Timber Co.",  label:"Hangzhou Timber Co.",   count:1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const chIcon = (ch: Channel, sz = 12) => {
  if (ch === "whatsapp") return <MessageCircle size={sz} className="text-emerald-500" />;
  if (ch === "gmail")    return <Mail size={sz} className="text-blue-500" />;
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
// ViewSwitcher (draggable)
// ─────────────────────────────────────────────────────────────────────────────
function ViewSwitcher({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const posRef = useRef(pos);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, isDragging: false });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: posRef.current.x, initialY: posRef.current.y, isDragging: true };
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nextX = Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.initialX + dx));
    const nextY = Math.max(0, Math.min(window.innerHeight - 50, dragRef.current.initialY + dy));
    setPos({ x: nextX, y: nextY });
    posRef.current = { x: nextX, y: nextY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    dragRef.current.isDragging = false;
    setIsDragging(false);
  };

  return (
    <div
      className={`fixed z-[9999] flex items-center bg-white border border-[#E5EAF0] shadow-xl rounded-full p-1 transition-shadow ${isDragging ? "shadow-2xl cursor-grabbing" : "cursor-grab"}`}
      style={{ left: pos.x, top: pos.y, touchAction: "none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    >
      <div className="px-2 text-[#C0C8D4] hover:text-[#5E687B]"><GripVertical size={14} /></div>
      <div className="flex bg-[#F0F4F8] rounded-full p-0.5" onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => setMode("inbox")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === "inbox" ? "bg-white text-[#212833] shadow-sm" : "text-[#5E687B] hover:text-[#212833]"}`}><MessagesSquare size={13} />Inbox</button>
        <button onClick={() => setMode("command")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === "command" ? "bg-white text-[#212833] shadow-sm" : "text-[#5E687B] hover:text-[#212833]"}`}><LayoutGrid size={13} />Command</button>
      </div>
    </div>
  );
}

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
function PaymentStatus({ payments }: { payments: [Payment,Payment] }) {
  const [dep, bal] = payments;
  const overdue = !bal.paid && new Date(`${bal.dueDate} 2026`) < new Date();
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${dep.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}><DollarSign size={8}/>{dep.percent}% {dep.paid?"paid":"due "+dep.dueDate}</div>
      <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${bal.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":overdue?"bg-red-50 text-red-600 border-red-100 animate-pulse":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}><CreditCard size={8}/>{bal.percent}% {bal.paid?"paid":overdue?"OVERDUE":"due "+bal.dueDate}</div>
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
// Docs panel  (P1)
// ─────────────────────────────────────────────────────────────────────────────
function DocsPanel({ shipmentId }: { shipmentId: string }) {
  const docs = SHIPMENT_DOCS[shipmentId] ?? [];
  const [preview, setPreview] = useState<Doc|null>(null);
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {preview ? (
        <div>
          <button onClick={()=>setPreview(null)} className="flex items-center gap-1 text-[10px] text-[#5E687B] hover:text-[#212833] mb-4"><ChevronLeft size={12}/>All documents</button>
          <div className="border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm">
            <div className={`h-40 flex items-center justify-center ${preview.type==="image"?"bg-gradient-to-br from-blue-50 to-blue-100":preview.type==="pdf"?"bg-gradient-to-br from-red-50 to-red-100":preview.type==="video"?"bg-gradient-to-br from-purple-50 to-purple-100":"bg-gradient-to-br from-green-50 to-green-100"}`}>
              <div className="flex flex-col items-center gap-2 text-[#5E687B]">{docIcon(preview.type,36)}<span className="text-xs">{preview.type.toUpperCase()}</span></div>
            </div>
            <div className="p-4 bg-white">
              <div className="font-semibold text-xs text-[#212833] mb-1">{preview.name}</div>
              <div className="flex items-center gap-2 text-[9px] text-[#5E687B] mb-3">
                <span className="bg-[#F0F4F8] px-1.5 py-0.5 rounded border border-[#E5EAF0] font-semibold">{preview.tag}</span>
                <span>{preview.date}</span><span>·</span><span>{preview.size}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 bg-[#9000FF] text-white text-[10px] font-semibold rounded-md hover:bg-[#7A00D9] flex items-center justify-center gap-1"><Eye size={10}/>Open</button>
                <button className="px-3 py-1.5 border border-[#E5EAF0] text-[#5E687B] text-[10px] rounded-md hover:bg-[#F0F4F8] flex items-center gap-1"><Download size={10}/>Download</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">{docs.length} documents</span>
            <button className="text-[10px] text-[#9000FF] font-semibold flex items-center gap-1 hover:underline"><FilePlus size={10}/>Add file</button>
          </div>
          {docs.length===0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#5E687B] gap-2"><FileBox size={22} className="opacity-30"/><p className="text-xs">No documents attached</p></div>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map(doc=>(
                <button key={doc.name} onClick={()=>setPreview(doc)}
                  className="flex items-center gap-3 px-3 py-2.5 bg-white border border-[#E5EAF0] rounded-lg hover:border-[#9000FF]/25 hover:shadow-sm transition-all text-left">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${doc.type==="image"?"bg-blue-50":doc.type==="pdf"?"bg-red-50":doc.type==="video"?"bg-purple-50":"bg-green-50"}`}>
                    {docIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#212833] truncate">{doc.name}</div>
                    <div className="flex items-center gap-2 text-[9px] text-[#5E687B] mt-0.5">
                      <span className="bg-[#F0F4F8] px-1.5 py-0.5 rounded border border-[#E5EAF0] font-semibold">{doc.tag}</span>
                      <span>{doc.date}</span><span>·</span><span>{doc.size}</span>
                    </div>
                  </div>
                  <Eye size={12} className="text-[#C0C8D4] shrink-0"/>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
// Main ConversationHub
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [viewMode, setViewMode]           = useState<ViewMode>("inbox");
  const [navTab, setNavTab]               = useState<NavTab>("inbox");
  const { data: apiStages }    = useListStages();
  const { data: apiShipments } = useListShipments();
  const { data: apiMessages }  = useListMessages();
  const { data: apiTasks }     = useListTasks();

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
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  useEffect(() => {
    if (!showTaskPanel) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowTaskPanel(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showTaskPanel]);
  const [composeText, setComposeText]     = useState("");
  const [composeFocused, setComposeFocused] = useState(false);
  const [rightTab, setRightTab]           = useState<RightTab>("message");
  const [toast, setToast]                 = useState<string|null>(null);
  const [repliedIds, setRepliedIds]       = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [aiQuery, setAiQuery]             = useState("");
  const [showAiResult, setShowAiResult]   = useState(false);

  const SUPPLIERS = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shipments) counts.set(s.supplier, (counts.get(s.supplier) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, count]) => ({ id: name, label: name, count }));
  }, [shipments]);

  const activeMessage  = messages.find(m => m.id === activeMessageId) || messages[0];
  const activeShipment = activeMessage ? shipments.find(s => s.id === activeMessage.shipmentId) : undefined;
  const activeStage    = activeShipment ? stages.find(s => s.id === activeShipment.currentStageId) : null;
  const activeStageIdx = activeShipment ? stages.findIndex(s => s.id === activeShipment.currentStageId) : -1;

  const visibleMessages = messages.filter(m => {
    if (selectedShipmentId && m.shipmentId !== selectedShipmentId) return false;
    if (channelFilter !== "all" && m.channel !== channelFilter) return false;
    if (supplierFilter && m.supplierId !== supplierFilter) return false;
    return true;
  });

  const openMessage = (id: string) => {
    setActiveMessageId(id); setNavTab("inbox");
    const msg = messages.find(m => m.id === id);
    if (msg && msg.unread) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, unread:false } : m));
      updateMessage(msg.messageId, { unread: false }).catch(() => {});
    }
    setComposeText(""); setRightTab("message");
  };
  const selectShipment = (id: string) => {
    const next = selectedShipmentId===id ? null : id;
    setSelectedShipmentId(next); setChannelFilter("all"); setSupplierFilter(null);
    if (next) { const f = messages.find(m => m.shipmentId===next); if(f) openMessage(f.id); }
  };
  const advanceStage = (shipmentId: string) => {
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return;
    const idx = stages.findIndex(st => st.id === target.currentStageId);
    const next = stages[Math.min(idx + 1, stages.length - 1)];
    if (!next || next.id === target.currentStageId) return;
    setShipments(prev => prev.map(s =>
      s.id === shipmentId ? { ...s, currentStageId: next.id, currentStage: next.label, status: "on-track" } : s,
    ));
    updateShipment(target.shipmentId, { currentStageId: next.id, status: "on-track" }).catch(() => {});
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
  const togglePaymentPaid = (shipmentId: string, paymentIdx: 0 | 1) => {
    const ship = shipments.find(s => s.id === shipmentId);
    if (!ship) return;
    const payment = ship.payments[paymentIdx];
    const nextPaid = !payment.paid;
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      const [dep, bal] = s.payments;
      const newDep = paymentIdx === 0 ? { ...dep, paid: nextPaid } : dep;
      const newBal = paymentIdx === 1 ? { ...bal, paid: nextPaid } : bal;
      return { ...s, payments: [newDep, newBal] };
    }));
    updatePayment(payment.paymentId, { paid: nextPaid }).catch(() => {});
    setToast(nextPaid ? "Payment marked paid" : "Payment marked unpaid");
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
    setChannelFilter(ch); setSelectedShipmentId(null); setSupplierFilter(null);
    const f = ch==="all" ? messages[0] : messages.find(m=>m.channel===ch);
    if(f) openMessage(f.id);
  };
  const toggleSupplier = (id: string) => {
    const next = supplierFilter===id ? null : id;
    setSupplierFilter(next); setSelectedShipmentId(null); setChannelFilter("all");
    if(next) { const f=messages.find(m=>m.supplierId===next); if(f) openMessage(f.id); }
  };

  const unreadCount    = messages.filter(m=>m.unread).length;
  const highCount      = tasks.filter(t=>t.urgency==="high").length;
  const isQuotesStage  = activeShipment?.currentStageId === "quotes";

  // Nav rail items
  const NAV_ITEMS: { tab: NavTab; icon: React.ElementType; label: string }[] = [
    { tab:"inbox",    icon:Inbox,    label:"Inbox"    },
    { tab:"calendar", icon:Calendar, label:"Calendar" },
    { tab:"buyers",   icon:Users,    label:"Buyers"   },
    { tab:"import",   icon:Upload,   label:"Import"   },
  ];

  if (viewMode==="command") {
    return (
      <div className="relative h-screen w-full">
        <ViewSwitcher mode={viewMode} setMode={setViewMode}/>
        {showStageConfig&&<StageConfigModal stages={stages} onSave={saveStages} onClose={()=>setShowStageConfig(false)}/>}
        <Atelier/>
      </div>
    );
  }

  const isLoading = !apiStages || !apiShipments || !apiMessages || !apiTasks;
  if (!activeMessage || !activeShipment) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFBFC] text-[#5E687B]" style={{fontFamily:"Inter,sans-serif"}}>
        <ViewSwitcher mode={viewMode} setMode={setViewMode}/>
        <div className="text-sm">
          {isLoading ? "Loading FlowForge…" : "No shipments yet. Seed the database with `pnpm --filter @workspace/db run seed`."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden" style={{fontFamily:"Inter,sans-serif",fontSize:13}}>
      <ViewSwitcher mode={viewMode} setMode={setViewMode}/>
      {toast&&<Toast message={toast} onDone={()=>setToast(null)}/>}
      {showStageConfig&&<StageConfigModal stages={stages} onSave={saveStages} onClose={()=>setShowStageConfig(false)}/>}

      {/* LEFT NAV RAIL */}
      <div className="w-[58px] bg-white border-r border-[#E5EAF0] flex flex-col items-center py-4 z-20 shrink-0">
        <div className="w-7 h-7 bg-[#9000FF] rounded-lg flex items-center justify-center text-white font-bold text-base mb-7">f</div>
        <div className="flex flex-col gap-4 text-[#5E687B]">
          {NAV_ITEMS.map(({tab,icon:Icon,label})=>(
            <button key={tab} onClick={()=>setNavTab(tab)} title={label}
              className={`p-2 rounded-md transition-colors relative ${navTab===tab?"bg-[#F0F4F8] text-[#9000FF]":"hover:bg-[#F0F4F8] hover:text-[#212833]"}`}>
              <Icon size={17}/>
              {tab==="inbox"&&unreadCount>0&&<span className="absolute top-1 right-1 w-2 h-2 bg-[#9000FF] rounded-full border border-white"/>}
              {tab==="buyers"&&<span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white"/>}
            </button>
          ))}
          <div className="w-6 h-px bg-[#E5EAF0] mx-auto my-1"/>
          <button onClick={()=>setShowStageConfig(true)} title="Workflow Stages"
            className="p-2 rounded-md hover:bg-[#F0F4F8] text-[#5E687B] hover:text-[#9000FF] transition-colors"><SlidersHorizontal size={17}/></button>
        </div>
        <div className="mt-auto"><img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-7 h-7 rounded-full border border-[#E5EAF0] object-cover"/></div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <div className="bg-white border-b border-[#E5EAF0] flex items-center justify-between px-5 shrink-0 relative" style={{height:50}}>
          <div className="font-bold text-sm flex items-center gap-2">
            <span className="text-[#9000FF] tracking-tight">flowforge</span>
            <span className="text-[#E5EAF0]">/</span>
            <span className="text-[#5E687B] font-medium text-xs">
              {navTab==="inbox" ? (selectedShipmentId ? shipments.find(s=>s.id===selectedShipmentId)?.po : supplierFilter ?? (channelFilter!=="all" ? channelFilter[0].toUpperCase()+channelFilter.slice(1) : "Inbox"))
                : navTab==="calendar" ? "Calendar" : navTab==="buyers" ? "Buyer Chatbot" : "Import Tracker"}
            </span>
          </div>

          <div className="flex-1 max-w-md mx-5 relative">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 absolute left-2 top-1/2 -translate-y-1/2 z-10">
              <button onClick={()=>{setSearchMode(false);setSearchQuery("");}} title="AI mode"
                className={`p-0.5 rounded transition-colors ${!searchMode?"text-[#9000FF]":"text-[#C0C8D4] hover:text-[#5E687B]"}`}>
                <Sparkles size={12}/>
              </button>
              <button onClick={()=>{setSearchMode(true);setShowAiResult(false);}} title="Search mode"
                className={`p-0.5 rounded transition-colors ${searchMode?"text-[#9000FF]":"text-[#C0C8D4] hover:text-[#5E687B]"}`}>
                <Search size={12}/>
              </button>
            </div>

            {searchMode ? (
              <>
                <input autoFocus type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search messages, POs, suppliers..."
                  className="w-full pl-14 pr-3 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-xs text-[#212833] placeholder-[#9E9FAE] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none"/>
                {searchQuery&&<SearchResults query={searchQuery} messages={messages} onOpen={id=>{openMessage(id);setSearchMode(false);setSearchQuery("");}}/>}
              </>
            ) : (
              <>
                <input type="text" value={aiQuery} onChange={e=>{setAiQuery(e.target.value);setShowAiResult(false);}} onKeyDown={e=>{if(e.key==="Enter"&&aiQuery.trim())setShowAiResult(true);}}
                  placeholder="Ask FlowForge anything...  ⌘K"
                  className="w-full pl-14 pr-3 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-xs text-[#212833] placeholder-[#9E9FAE] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none"/>
                {showAiResult&&(
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#9000FF]/20 rounded-xl shadow-xl z-50 p-4">
                    <div className="flex items-start gap-2 mb-3"><Sparkles size={13} className="text-[#9000FF] shrink-0 mt-0.5"/><p className="text-xs text-[#212833] leading-relaxed">2 urgent items today: Guangzhou Metalworks is requesting a 2-day delay on PO-0142, and the balance payment of $8,960 is overdue. Want me to draft replies for both?</p></div>
                    <div className="flex flex-wrap gap-2">
                      {["Draft reply","Flag payment","Show all tasks"].map(c=><button key={c} onClick={()=>{setShowAiResult(false);setAiQuery("");}} className="text-[10px] bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/15 font-semibold">{c}</button>)}
                    </div>
                    <button onClick={()=>{setShowAiResult(false);setAiQuery("");}} className="absolute top-3 right-3 text-[#5E687B] hover:text-[#212833]"><X size={13}/></button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-[#5E687B]">
            {/* Today's Tasks popover trigger */}
            <div className="relative">
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
            </div>
            <button className="hover:text-[#212833] p-1 relative"><Bell size={15}/>{unreadCount>0&&<span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"/>}</button>
          </div>
        </div>

        {/* ── NON-INBOX VIEWS ── */}
        {navTab==="calendar"&&<CalendarView shipments={shipments}/>}
        {navTab==="buyers"&&<BuyersView/>}
        {navTab==="import"&&<ImportView onDone={()=>setNavTab("inbox")}/>}

        {/* ── INBOX VIEW ── */}
        {navTab==="inbox"&&<>

          {/* 3-COLUMN INBOX */}
          <div className="flex-1 flex overflow-hidden">

            {/* Col 1 — Filters */}
            <div className="w-[228px] bg-[#FAFBFC] border-r border-[#E5EAF0] flex flex-col shrink-0">

              {/* Channels */}
              <div className="p-3 border-b border-[#E5EAF0] shrink-0">
                <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Channels</div>
                <div className="flex flex-col gap-0.5">
                  {([
                    {id:"all",label:"All Inbox",icon:<Inbox size={12}/>,count:messages.length},
                    {id:"gmail",label:"Gmail",icon:<Mail size={12}/>,count:messages.filter(m=>m.channel==="gmail").length},
                    {id:"whatsapp",label:"WhatsApp",icon:<MessageCircle size={12}/>,count:messages.filter(m=>m.channel==="whatsapp").length},
                    {id:"sheets",label:"Sheets",icon:<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,count:messages.filter(m=>m.channel==="sheets").length},
                    {id:"pdf",label:"PDFs",icon:<FileText size={12}/>,count:messages.filter(m=>m.channel==="pdf").length},
                  ] as {id:Channel|"all";label:string;icon:React.ReactNode;count:number}[]).map(f=>{
                    const active=channelFilter===f.id&&!selectedShipmentId&&!supplierFilter;
                    const unread=f.id==="all"?messages.filter(m=>m.unread).length:messages.filter(m=>m.channel===f.id&&m.unread).length;
                    return (
                      <button key={f.id} onClick={()=>toggleChannel(f.id)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${active?"bg-white border border-[#E5EAF0] text-[#212833] font-semibold shadow-sm":"text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                        <span className="flex items-center gap-2">{f.icon}{f.label}</span>
                        {unread>0?<span className="text-[9px] bg-[#9000FF] text-white px-1.5 rounded-full font-bold">{unread}</span>:<span className="text-[9px] text-[#5E687B]">{f.count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Purchase Orders — scrollable list, same style as Suppliers */}
              <div className="p-3 border-b border-[#E5EAF0] shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Purchase Orders</div>
                  {selectedShipmentId&&<button onClick={()=>setSelectedShipmentId(null)} className="text-[#9000FF] text-[9px] flex items-center gap-0.5"><X size={8}/>Clear</button>}
                </div>
                <div className="flex flex-col gap-0.5">
                  {shipments.map(s=>{
                    const isSelected=selectedShipmentId===s.id;
                    const stageIdx=stages.findIndex(st=>st.id===s.currentStageId);
                    const pct=stages.length>1?Math.round((stageIdx/(stages.length-1))*100):0;
                    const cur=stages.find(st=>st.id===s.currentStageId);
                    const dotCls=s.status==="delayed"?"bg-red-500":s.status==="at-risk"?"bg-amber-400":"bg-emerald-400";
                    return (
                      <button key={s.id} onClick={()=>selectShipment(s.id)}
                        className={`w-full text-left px-2 py-2 rounded-md border-l-2 transition-all ${isSelected?"bg-white border-l-[#9000FF] shadow-sm":"border-l-transparent hover:bg-[#F0F4F8]"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}${s.status==="delayed"?" animate-pulse":""}`}/>
                          <span className={`text-[10px] font-bold leading-none ${isSelected?"text-[#9000FF]":"text-[#212833]"}`}>{s.po}</span>
                          <span className="text-[8px] text-[#9E9FAE] ml-auto shrink-0">{s.dueDate}</span>
                        </div>
                        <div className="text-[9px] text-[#5E687B] truncate pl-3 mb-1.5 leading-tight">{s.product}</div>
                        <div className="pl-3">
                          <div className="h-[3px] bg-[#F0F4F8] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${s.status==="delayed"?"bg-red-400":s.status==="at-risk"?"bg-amber-400":"bg-[#9000FF]"}`} style={{width:`${pct}%`}}/>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[8px] text-[#9E9FAE] truncate">{cur?.label??"—"}</span>
                            <span className="text-[8px] text-[#9E9FAE] shrink-0">{pct}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Suppliers */}
              <div className="p-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Suppliers</div>
                  {supplierFilter&&<button onClick={()=>setSupplierFilter(null)} className="text-[#9000FF] text-[9px] flex items-center gap-0.5"><X size={8}/>Clear</button>}
                </div>
                <div className="flex flex-col gap-0.5">
                  {SUPPLIERS.map(s=>(
                    <button key={s.id} onClick={()=>toggleSupplier(s.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${supplierFilter===s.id?"bg-white border border-[#9000FF]/30 text-[#9000FF] font-semibold shadow-sm":"text-[#212833] hover:bg-[#F0F4F8]"}`}>
                      <span className="truncate pr-2">{s.label}</span>
                      <span className="text-[9px] bg-white border border-[#E5EAF0] px-1.5 rounded shrink-0">{s.count}</span>
                    </button>
                  ))}
                </div>
                {(selectedShipmentId||supplierFilter||channelFilter!=="all")&&(
                  <button onClick={()=>{setSelectedShipmentId(null);setSupplierFilter(null);setChannelFilter("all");}}
                    className="mt-3 w-full text-[9px] text-[#5E687B] hover:text-[#212833] flex items-center justify-center gap-1 py-1.5 border border-dashed border-[#E5EAF0] rounded-md hover:border-[#D6E3EB]">
                    <X size={9}/>Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Col 2 — Thread list */}
            <div className="flex-1 min-w-[270px] bg-white border-r border-[#E5EAF0] flex flex-col">
              <div className="border-b border-[#E5EAF0] px-3 flex items-center justify-between shrink-0" style={{height:38}}>
                <div className="font-semibold text-[11px] text-[#212833]">{visibleMessages.length} thread{visibleMessages.length!==1?"s":""}{(selectedShipmentId||supplierFilter||channelFilter!=="all")&&<span className="ml-1 text-[#9000FF] font-normal">— filtered</span>}</div>
                <button className="p-1 hover:bg-[#F0F4F8] rounded text-[#5E687B]"><MoreHorizontal size={13}/></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {visibleMessages.map(msg=>{
                  const replied=repliedIds.has(msg.id);
                  return (
                    <div key={msg.id} onClick={()=>openMessage(msg.id)}
                      className={`px-3 py-2.5 border-b border-[#E5EAF0] cursor-pointer hover:bg-[#FAFBFC] transition-colors relative ${activeMessageId===msg.id?"bg-[#FAFBFF] border-l-2 border-l-[#9000FF]":"border-l-2 border-l-transparent"}`}>
                      {msg.unread&&!replied&&<div className="absolute left-2 top-4 w-1.5 h-1.5 bg-[#9000FF] rounded-full"/>}
                      <div className="flex items-start justify-between mb-0.5 pl-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-semibold text-[11px] truncate ${msg.unread&&!replied?"text-[#212833]":"text-[#5E687B]"}`}>{msg.sender}</span>
                          {chIcon(msg.channel)}
                          {replied&&<span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 rounded-full font-semibold flex items-center gap-0.5"><Check size={7}/>Replied</span>}
                        </div>
                        <span className={`text-[9px] shrink-0 ml-2 ${msg.unread&&!replied?"text-[#9000FF] font-semibold":"text-[#5E687B]"}`}>{msg.timestamp}</span>
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

            {/* Col 3 — Thread detail */}
            <div className="w-[455px] bg-white flex flex-col shrink-0 border-l border-[#E5EAF0]">
              {/* Shipment context */}
              {activeShipment&&(
                <div className="border-b border-[#E5EAF0] p-4 bg-[#FAFBFC] shrink-0">
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-xs text-[#212833]">{activeShipment.po}</span>
                        <span className="text-[9px] bg-[#E5EAF0] text-[#5E687B] px-1.5 rounded font-medium">{activeShipment.customer}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusCls(activeShipment.status)}`}>{activeShipment.status==="on-track"?<Check size={8}/>:<AlertCircle size={8}/>}{activeShipment.status}</span>
                      </div>
                      <div className="text-[11px] text-[#5E687B]">{activeShipment.product}</div>
                    </div>
                    <div className="text-right shrink-0"><div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">Ex-Factory</div><div className="text-xs font-bold text-[#212833]">{activeShipment.dueDate}</div></div>
                  </div>
                  {/* Stage bar */}
                  <div className="bg-white rounded-lg border border-[#E5EAF0] p-2.5 mb-2.5">
                    <div className="flex items-center justify-between text-[9px] mb-1.5">
                      <span className="font-bold text-[#212833] flex items-center gap-1"><MapPin size={9} className="text-[#9000FF]"/>{activeStage?.label??"—"}</span>
                      <span className="text-[#5E687B]">Stage {activeStageIdx+1} of {stages.length}</span>
                    </div>
                    <div className="flex gap-px h-1.5 mb-2">{stages.map((_,idx)=><div key={idx} className={`flex-1 rounded-full transition-all duration-500 ${idx<activeStageIdx?"bg-[#9000FF]":idx===activeStageIdx?"bg-[#9000FF] opacity-50":"bg-[#E5EAF0]"}`}/>)}</div>
                    <div className="flex items-center gap-1 overflow-x-auto">{stages.slice(activeStageIdx,activeStageIdx+5).map((st,i)=><div key={st.id} className={`flex items-center gap-1 shrink-0 text-[9px] ${i===0?"text-[#9000FF] font-bold":"text-[#9E9FAE]"}`}>{i>0&&<ChevronRight size={8} className="text-[#D6E3EB]"/>}{st.label}</div>)}</div>
                  </div>
                  {/* Payment inline */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeShipment.payments.map((p,i)=>{const ov=!p.paid&&new Date(`${p.dueDate} 2026`)<new Date();return<button key={i} type="button" onClick={()=>togglePaymentPaid(activeShipment.id, i as 0|1)} className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded border transition-opacity hover:opacity-80 ${p.paid?"bg-emerald-50 text-emerald-600 border-emerald-100":ov?"bg-red-50 text-red-600 border-red-100 animate-pulse":"bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`} title={p.paid?"Click to mark unpaid":"Click to mark paid"}>{p.paid?<CheckCircle2 size={9}/>:ov?<AlertCircle size={9}/>:<CreditCard size={9}/>}{p.label}: ${p.amountUsd.toLocaleString()} {p.paid?"paid":ov?"OVERDUE":`due ${p.dueDate}`}</button>;})}
                  </div>
                </div>
              )}

              {/* Tabs: Message / Docs */}
              <div className="flex border-b border-[#E5EAF0] shrink-0 bg-white">
                {([{id:"message",label:"Message"},{id:"docs",label:`Docs (${SHIPMENT_DOCS[activeShipment?.id??""]?.length??0})`}] as {id:RightTab;label:string}[]).map(t=>(
                  <button key={t.id} onClick={()=>setRightTab(t.id)}
                    className={`flex-1 py-2 text-[11px] font-semibold transition-colors border-b-2 ${rightTab===t.id?"border-[#9000FF] text-[#9000FF]":"border-transparent text-[#5E687B] hover:text-[#212833]"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Docs tab */}
              {rightTab==="docs"&&<DocsPanel shipmentId={activeShipment?.id??""}/>}

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
                        <div className="text-[9px] text-[#5E687B] flex items-center gap-1">{chIcon(activeMessage.channel,9)}via {activeMessage.channel==="whatsapp"?"WhatsApp":activeMessage.channel==="gmail"?"Gmail":activeMessage.channel==="sheets"?"Google Sheets":"PDF"}<span className="text-[#C0C8D4]">·</span>{activeMessage.timestamp}</div>
                      </div>
                      {repliedIds.has(activeMessage.id)&&<span className="ml-auto text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 size={9}/>Replied</span>}
                    </div>
                    <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4 text-[11px] text-[#212833] whitespace-pre-wrap leading-relaxed">{activeMessage.fullBody}</div>
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
                    <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
                      <div className="flex gap-1 text-[#5E687B]">
                        <button className="p-1 hover:bg-[#E5EAF0] rounded"><Paperclip size={13}/></button>
                        <button onClick={()=>{setComposeText(activeMessage.aiDraft??"");setComposeFocused(true);}} className="p-1 hover:bg-[#E5EAF0] rounded" title="AI draft"><Sparkles size={13} className="text-[#9000FF]"/></button>
                      </div>
                      <button onClick={()=>{if(composeText.trim())sendReply(activeMessage.id);}}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all ${composeText.trim()?"bg-[#212833] text-white hover:bg-black":"bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>
                        Reply<Send size={10}/>
                      </button>
                    </div>
                  </div>
                </div>
              </>}
            </div>
          </div>

        </>}
      </div>
    </div>
  );
}
