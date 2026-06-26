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
    id: "inbox",
    title: "Using the Inbox",
    summary:
      "The Inbox is FlowForgeIQ's command centre — every inbound message from suppliers is routed here, linked to its shipment, and given an AI-drafted reply. It is the default screen when you open the app.",
    steps: [
      { text: "Messages are listed on the left, grouped by recency. Click any message to open it in the reading pane." },
      { text: "The right panel shows the matched shipment's stage tracker, payments, spread, and supplier contact details." },
      { text: "Use the filter bar above the message list to narrow by Supplier, PO, or Channel — each is a dropdown pill. Active filters show their selection in the pill label; click the × to clear one. The Flagged toggle works independently alongside any active filter." },
      { text: "The search bar in the header matches on sender name, message content, supplier PO number, and buyer PO number." },
      { text: "The AI draft is pre-populated in the compose area. Edit it or send as-is — sending advances the stage and clears related tasks." },
      { text: 'Forwarded chat messages show a teal "Fwd chat" badge and include an expandable transcript view so you can see the original conversation.' },
      { text: "Needs Review messages (low confidence routing) are shown in the amber Needs Review panel — assign them to the correct shipment or delete them." },
    ],
    screenshot: "inbox.png",
    keywords: ["inbox", "messages", "filter", "search", "reply", "draft", "channel", "needs review", "forwarded"],
  },
  {
    id: "track-shipment",
    title: "Tracking a Shipment",
    summary:
      "Every shipment moves through 11 stages from Spec Sheet to Delivered. FlowForgeIQ shows exactly where each order is, lets you advance it with a logged note, and keeps a full audit trail of every stage change.",
    steps: [
      { text: "On My Orders, click any shipment card to expand its detail view. In the Inbox, the shipment context panel is visible on the right whenever a message is selected." },
      { text: "The stage tracker shows all 11 milestones. The purple dot marks the current stage; completed stages are highlighted." },
      { text: 'When a stage is complete, click "Advance Stage". A confirmation dialog shows the from/to stages.' },
      { text: 'Optionally add a note (e.g. "QC passed, container booked") — this is stored in the audit trail with a timestamp and the name of the team member who made the change.' },
      { text: 'Click "Confirm" to advance. Both Inbox messages and Needs Review replies that advance a stage clear their related tasks automatically.' },
      { text: 'Click "History" on any shipment to see the full audit trail of stage changes, with dates, notes, and actor names.' },
      { text: "Risk Radar monitors every active shipment and flags it if delay signals are detected." },
    ],
    screenshot: "track-shipment.png",
    keywords: ["stage", "advance", "milestone", "tracker", "history", "audit", "progress", "11 stages"],
  },
  {
    id: "create-po",
    title: "Creating a Purchase Order",
    summary:
      "A PO is the starting point for every shipment. Create one manually or convert a winning factory quote directly from an RFQ — FlowForgeIQ pre-fills the fields automatically.",
    steps: [
      { text: 'Open My Orders and click "+ New PO" in the top-right corner.' },
      { text: "Optionally drop a PO document (PDF, Excel, or Word) into the upload zone — FlowForgeIQ reads it in the background and attaches it to the shipment." },
      { text: "Enter a unique PO number, product description, and category. Add the Buyer Unit Price and Quantity if you want spread/margin tracking from day one." },
      { text: "Type a buyer name — existing buyers appear as suggestions; a new name creates a new buyer automatically on save." },
      { text: 'Start typing in the Supplier field to search your directory. If the supplier doesn\'t exist yet, a "Create…" option appears to add them in-place.' },
      { text: "Set the Ex-Factory date (goods leave factory) and Delivery Due Date (must reach buyer)." },
      { text: "Fill in Destination and optionally choose a shipping method (Ocean, Air, Rail, or Road)." },
      { text: 'Click "Create PO" — the shipment appears in the grid immediately, placed at the Spec Sheet stage. Spread is computed automatically once payments are recorded.' },
    ],
    screenshot: "create-po.png",
    keywords: ["new po", "purchase order", "create", "supplier", "buyer", "document upload", "ex-factory", "spread", "margin"],
  },
  {
    id: "record-payments",
    title: "Recording Payments",
    summary:
      "Each shipment has a Deposit and a Balance payment. Record them as paid, edit the amount, and attach a reference number so the finance trail is always complete. Paid amounts feed the spread calculation automatically.",
    steps: [
      { text: "On My Orders, expand a shipment card. The payment chips show Deposit and Balance with their due dates." },
      { text: 'Click "Mark Paid" on an unpaid payment. A confirmation form slides open.' },
      { text: "Verify or edit the amount in USD, then set the payment date (defaults to today)." },
      { text: "Optionally add a reference number (e.g. wire transfer ID) and select a payment method (Wire, Credit, or Other)." },
      { text: 'Click "Confirm" — the chip turns green and the spread calculation updates to reflect the new outlay.' },
      { text: 'To reverse a payment, click "Undo" on a paid chip. This clears the paid status and removes the reference data.' },
      { text: "The Calendar view shows upcoming payment due dates and ex-factory dates for all your live shipments on a monthly grid. Click any event card or pill to jump directly to that PO in My Orders." },
    ],
    screenshot: "payments.png",
    keywords: ["payment", "deposit", "balance", "paid", "mark paid", "wire", "reference", "due date", "spread"],
  },
  {
    id: "spread-margin",
    title: "Tracking Spread & Margin",
    summary:
      "FlowForgeIQ computes your gross spread (buyer total minus supplier payments) on every shipment and surfaces it as a colour-coded badge in My Orders and a detailed panel in the Inbox.",
    steps: [
      { text: "Spread is calculated automatically: Buyer Unit Price × Quantity minus the sum of all recorded supplier payments." },
      { text: "In My Orders, every shipment card shows a colour-coded spread badge: green ≥ 25%, amber 10–25%, red < 10%." },
      { text: "In the Inbox, open a shipment's detail panel and scroll to Your Spread. A progress bar shows the dollar amount, percentage, and a Healthy / Thin / Loss label." },
      { text: "To set a buyer price on an existing shipment, create a new PO or edit the deal linked to the shipment. Spread updates the next time the page loads." },
      { text: "The Reports page shows margin trends over time. Use the Finance filter to compare spread across buyers or date ranges." },
    ],
    screenshot: "spread-margin.png",
    keywords: ["spread", "margin", "buyer price", "profit", "markup", "gross margin", "healthy", "thin", "loss"],
  },
  {
    id: "chat-ingest",
    title: "Ingesting Chat Messages (WhatsApp / WeChat / iMessage)",
    summary:
      "Suppliers often share updates over WhatsApp or WeChat. FlowForgeIQ can read those chats, extract the shipment fields, and log them against the right PO — either by pasting the text or by forwarding the email to your FlowForgeIQ inbox address.",
    steps: [
      { text: 'In the Inbox, click the clipboard icon in the toolbar (or press the "Paste Chat" button) to open the chat ingest panel.' },
      { text: "Select the channel (WhatsApp, WeChat, iMessage, or SMS) and optionally add a sender hint so the AI can match the right supplier." },
      { text: "Paste the exported chat text into the box and click Process. FlowForgeIQ's AI extracts the ETA, production percentage, QC notes, and any quoted prices." },
      { text: "Review the extracted fields and the AI-drafted reply in the preview. If the shipment match looks wrong, you can correct it before confirming." },
      { text: 'Click Confirm to save the message to FlowForgeIQ. It appears in the matched shipment\'s thread tagged with a "Forwarded chat" badge.' },
      { text: "Alternatively, email a chat export directly to your inbound address (visible in Settings → Chat Channels). Postmark forwards it to FlowForgeIQ automatically — no manual paste needed." },
      { text: "Messages with a low routing confidence score land in the Needs Review queue for manual assignment instead of being auto-attached to a shipment." },
    ],
    screenshot: "chat-ingest.png",
    keywords: ["whatsapp", "wechat", "imessage", "sms", "chat", "paste", "ingest", "forward", "postmark", "needs review", "routing"],
  },
  {
    id: "handle-delays",
    title: "Handling Delays & Risks",
    summary:
      "Risk Radar scores every in-flight shipment using financial exposure and delay probability. The Inbox surfaces supplier messages the moment they arrive so you can respond before a delay becomes a crisis.",
    steps: [
      { text: "Open Risk Radar from the left sidebar. Shipments are ranked by risk exposure (financial value × probability of delay)." },
      { text: "High-risk items (score ≥ 70) are shown in red. Click any row to see the top risk signal and predicted delivery window." },
      { text: 'Click "Open Shipment" from the risk detail to jump directly to that shipment\'s inbox thread.' },
      { text: 'In the Inbox, the AI flags delay-related messages automatically with tags like "risk: delay 2d" or "risk: port congestion".' },
      { text: "An AI-drafted reply is pre-populated in the compose area. Edit it or send as-is." },
      { text: 'Use the "Flag" button on any message to mark it for follow-up — flagged messages appear in the Flagged filter.' },
      { text: "Once you've responded, the task clears from Today's Focus in the Inbox sidebar." },
    ],
    screenshot: "risk-radar.png",
    keywords: ["risk", "delay", "flag", "radar", "exposure", "port", "congestion", "signal"],
  },
  {
    id: "manage-suppliers",
    title: "Managing Suppliers",
    summary:
      "The Suppliers page is your factory directory. It shows on-time performance, active POs, and lets you edit contact details used to pre-fill outbound messages in the Inbox.",
    steps: [
      { text: "Open Suppliers from the left sidebar. Suppliers are listed with their country, active PO count, and on-time percentage." },
      { text: "Click any row to open the supplier detail panel. All contact fields are editable inline — click to edit, click away to save." },
      { text: "Keep email and WhatsApp number up to date — these are used to pre-fill the recipient field when composing outbound messages from the Inbox." },
      { text: "The detail panel lists recent and active shipments. Click a PO number to jump to it in My Orders." },
      { text: 'To add a supplier, click "New Supplier" and fill in name, country, contact name, and email.' },
      { text: "When creating a new PO, you can create a supplier on the fly by typing their name in the Supplier field — no need to visit this page first." },
    ],
    screenshot: "suppliers.png",
    keywords: ["supplier", "contact", "email", "whatsapp", "factory", "on-time", "performance", "directory"],
  },
  {
    id: "rfq-quotes",
    title: "RFQs & Factory Quote Comparison",
    summary:
      "The RFQ flow lets you solicit quotes from multiple factories, compare their prices against your target, and convert the winner to a PO — all without leaving FlowForgeIQ.",
    steps: [
      { text: 'Open RFQs from the left sidebar and click "+ New RFQ".' },
      { text: "Set the product, buyer, target price per unit, quantity, and deadline for quote submissions." },
      { text: 'Click "Add Quote" to enter each factory\'s quote: unit price, lead time, MOQ, and which supplier in your directory they correspond to.' },
      { text: "The quote comparison table shows spread (target price − quoted price) per unit and for the full order. The lowest-price quote is badged LOWEST." },
      { text: 'Click "Use this quote" on the winner. A Convert-to-PO dialog appears — confirm the PO number, supplier, factory dates, and deposit percentage.' },
      { text: "FlowForgeIQ creates the shipment and pre-creates the Deposit and Balance payments based on your deposit percentage." },
      { text: 'After conversion, download the Proforma Invoice as a PDF or click "View PO" to jump straight to the new shipment.' },
    ],
    screenshot: "rfq-quotes.png",
    keywords: ["rfq", "quote", "factory", "comparison", "spread", "margin", "target price", "proforma", "convert po"],
  },
  {
    id: "team-access",
    title: "Inviting Your Team",
    summary:
      "FlowForgeIQ supports multi-user access via Clerk. Admins can invite colleagues — including supplier-side staff and freight forwarders — and control who has admin privileges.",
    steps: [
      { text: "Open Settings → Team tab. You must be an Admin to invite or remove members." },
      { text: 'Click "Invite colleague" and enter their email address. They will receive a link to join your FlowForgeIQ workspace.' },
      { text: "Alternatively, click Copy Invite Link to share the invite URL directly (e.g. via WhatsApp or email)." },
      { text: "Once accepted, the new member appears in the Members list. You can remove any member except yourself." },
      { text: "Each team member signs in with their own Clerk account. Stage advancements and notes are attributed to the person who made them." },
      { text: "Admins see an Admin badge next to their name. Only admins can invite or remove members." },
      { text: "All members share the same shipments, messages, and RFQs — there are no per-user data silos." },
    ],
    screenshot: "team-access.png",
    keywords: ["team", "invite", "colleague", "admin", "member", "access", "clerk", "sign in", "login"],
  },
  {
    id: "intermediary-financing",
    title: "Intermediary Advance Financing",
    summary:
      "FlowForgeIQ supports a three-party financing model where an Intermediary fronts a portion of a payment to the Supplier so production can start immediately, then recovers that advance from the Buyer once delivery milestones are met.",
    steps: [
      { text: "The Buyer commits to a share of the payment (typically 40%). The Intermediary covers the remaining 60% directly to the Supplier so production is not held up." },
      { text: 'The Finance report\'s "Unpaid by Supplier" table shows an "Intermediary Advance" column whenever advance financing is in play.' },
      { text: 'The "Intermediary Recovery" panel tracks three numbers: Total Advanced, Recovered, and Outstanding balance owed to the Intermediary.' },
      { text: "Once the Buyer remits the outstanding amount to the Intermediary, mark the payment as paid in the usual way — the Recovery panel updates automatically." },
      { text: "Payments without intermediary financing are unaffected; the advance column only appears when advance data is present for the selected date range." },
    ],
    screenshot: "intermediary-financing.png",
    keywords: ["intermediary", "advance", "financing", "trade finance", "recovery", "buyer share", "fronted", "three-party"],
  },
];
