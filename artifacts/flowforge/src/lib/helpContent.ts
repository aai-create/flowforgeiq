export interface HelpStep {
  text: string;
}

export interface HelpSection {
  id: string;
  title: string;
  summary: string;
  steps: HelpStep[];
  screenshot: string;
  keywords: string[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "create-po",
    title: "Creating a Purchase Order",
    summary:
      "A PO is the starting point for every shipment. You can create one manually with full detail, or upload an existing PO document and let FlowForge extract the key fields automatically.",
    steps: [
      { text: 'Open the My Orders page and click the \u201c+ New PO\u201d button in the top-right corner.' },
      { text: "Optionally drop a PO document (PDF, Excel, or Word) into the upload zone \u2014 FlowForge will read it in the background and attach it to the shipment." },
      { text: "Enter the PO number (must be unique), product description, and category." },
      { text: "Type a buyer name in the Buyer field. Existing buyers appear as suggestions; typing a new name creates a new buyer automatically when you save." },
      { text: 'In the Supplier field, start typing to search your supplier list. If the supplier doesn\u2019t exist yet, a \u201cCreate\u2026\u201d option appears \u2014 select it to add the supplier in-place without leaving the form.' },
      { text: "Set the Ex-Factory date (when goods leave the factory) and Delivery Due Date (when they must reach the buyer)." },
      { text: "Fill in the Destination and optionally choose a shipping method (Ocean, Air, Rail, or Road)." },
      { text: 'Click \u201cCreate PO\u201d \u2014 the shipment appears in the grid immediately and is placed at the Spec Sheet stage.' },
    ],
    screenshot: "create-po.png",
    keywords: ["new po", "purchase order", "create", "supplier", "buyer", "document upload", "ex-factory"],
  },
  {
    id: "track-shipment",
    title: "Tracking a Shipment",
    summary:
      "Every shipment moves through 11 stages from Spec Sheet to Delivered. FlowForge shows exactly where each order is, lets you advance it with a logged note, and keeps a full history of every stage change.",
    steps: [
      { text: "On the My Orders page, click any shipment card to expand its detail view." },
      { text: "The stage tracker shows all 11 milestones. The purple dot marks the current stage; completed stages are highlighted." },
      { text: 'When a stage is complete, click \u201cAdvance Stage\u201d. A confirmation dialog appears showing the from/to stages.' },
      { text: 'Optionally add a note (e.g. \u201cQC passed, container booked\u201d) \u2014 this is stored in the audit trail.' },
      { text: 'Click \u201cConfirm\u201d to advance. The change is saved and the note is logged with a timestamp.' },
      { text: 'Click \u201cHistory\u201d on any shipment to see the full audit trail of all stage changes with dates and notes.' },
      { text: "Risk Radar monitors every active shipment and flags it if signals suggest a delay is likely." },
    ],
    screenshot: "track-shipment.png",
    keywords: ["stage", "advance", "milestone", "tracker", "history", "audit", "progress"],
  },
  {
    id: "handle-delays",
    title: "Handling Delays & Risks",
    summary:
      "Risk Radar scores every in-flight shipment using financial exposure and delay probability. The Inbox surfaces supplier messages the moment they arrive so you can respond before a delay becomes a crisis.",
    steps: [
      { text: "Open Risk Radar from the left sidebar. Shipments are ranked by risk exposure (financial value \xd7 probability of delay)." },
      { text: "High-risk items (score \u2265 70) are shown in red. Click any row to see the top risk signal and the predicted delivery window." },
      { text: 'Click \u201cOpen Shipment\u201d from the risk detail to jump directly to that shipment\u2019s inbox thread.' },
      { text: 'In the Inbox, the AI flags delay-related messages automatically with tags like \u201crisk: delay 2d\u201d or \u201crisk: port congestion\u201d.' },
      { text: "An AI-drafted reply is pre-populated in the compose area. Edit it or send as-is." },
      { text: 'Use the \u201cFlag\u201d button on any message to mark it for follow-up \u2014 flagged messages appear in the Flagged filter.' },
      { text: "Once you've responded, the task clears from Today's Focus on the My Orders page." },
    ],
    screenshot: "risk-radar.png",
    keywords: ["risk", "delay", "flag", "radar", "exposure", "port", "congestion", "signal"],
  },
  {
    id: "record-payments",
    title: "Recording Payments",
    summary:
      "Each shipment has a Deposit (30%) and a Balance (70%) payment. You can record payments as paid, edit the amount, and attach a reference number so the finance trail is always complete.",
    steps: [
      { text: "On the My Orders page, expand a shipment card. The payment chips show Deposit and Balance with their due dates." },
      { text: 'Click \u201cMark Paid\u201d on an unpaid payment. A confirmation form slides open beneath it.' },
      { text: "Verify or edit the amount in USD, then set the payment date (defaults to today)." },
      { text: "Optionally add a reference number (e.g. wire transfer ID) and select a payment method (Wire, Credit, or Other)." },
      { text: 'Click \u201cConfirm\u201d \u2014 the chip updates to show the paid date and the badge turns green.' },
      { text: 'To reverse a payment, click \u201cUndo\u201d on a paid chip. This clears the paid status and removes the reference data.' },
      { text: "The Calendar view in the Inbox shows all upcoming payment due dates across every shipment on a monthly grid." },
    ],
    screenshot: "payments.png",
    keywords: ["payment", "deposit", "balance", "paid", "mark paid", "wire", "reference", "due date"],
  },
  {
    id: "manage-suppliers",
    title: "Managing Suppliers",
    summary:
      "The Suppliers page is your factory directory. It shows on-time performance, active POs, and lets you edit contact details that are used to pre-fill outbound messages in the Inbox.",
    steps: [
      { text: "Open Suppliers from the left sidebar. Suppliers are listed with their country, active PO count, and on-time percentage." },
      { text: "Click any row to open the supplier detail panel on the right. All contact fields are editable inline." },
      { text: "Click a field (contact name, email, WhatsApp number, payment terms, country) to edit it \u2014 changes save automatically when you click away." },
      { text: "The detail panel lists recent and active shipments for that supplier. Click a shipment PO number to jump to it in My Orders." },
      { text: 'To add a new supplier, click \u201cNew Supplier\u201d and fill in the required fields (name, country, contact name, email).' },
      { text: "Supplier email and WhatsApp number are used to pre-fill the recipient field when you compose an outbound message from the Inbox." },
      { text: "When creating a new PO, you can create a new supplier on the fly by typing their name in the Supplier field \u2014 no need to visit this page first." },
    ],
    screenshot: "suppliers.png",
    keywords: ["supplier", "contact", "email", "whatsapp", "factory", "on-time", "performance", "directory"],
  },
];
