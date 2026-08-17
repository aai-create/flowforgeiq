/**
 * scripts/src/seed-fab4demo.ts
 *
 * Provisions the Fab4Demo org with full demo data:
 *  - Creates the org (name="Fab4Demo", slug="fab4demo")
 *  - Copies 5 team members from FlowForge Demo (looks up Clerk user IDs by email)
 *  - Seeds 7 buyers
 *  - Seeds 5 suppliers, 11 shipments (one per pipeline stage), payments
 *  - Seeds 4–8 realistic messages per shipment
 *
 * Run:
 *   pnpm --filter @workspace/scripts exec tsx ./src/seed-fab4demo.ts
 */

import crypto from "node:crypto";
import { db, pool } from "@workspace/db";
import {
  organizationsTable,
  teamUsersTable,
  buyersTable,
  suppliersTable,
  dealsTable,
  shipmentsTable,
  paymentsTable,
  messagesTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

// ── Clerk REST helper ────────────────────────────────────────────────────────

// Read at module load; guarded inside seedFab4Demo() before use.
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

async function clerkGetUserByEmail(email: string): Promise<{ id: string; firstName: string | null; lastName: string | null } | null> {
  const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) {
    console.warn(`Clerk API error for ${email}: ${res.status} ${await res.text()}`);
    return null;
  }
  const users = await res.json() as Array<{ id: string; first_name: string | null; last_name: string | null; email_addresses: Array<{ email_address: string }> }>;
  const match = users.find(u =>
    u.email_addresses.some(e => e.email_address.toLowerCase() === email.toLowerCase())
  );
  if (!match) return null;
  return { id: match.id, firstName: match.first_name, lastName: match.last_name };
}

function generateInboundToken(): string {
  return crypto.randomBytes(8).toString("hex");
}

// ── Reference data ───────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { email: "abid.a.imam@gmail.com",    role: "admin",  handle: "abid.a.imam",        displayName: "Abid Imam"         },
  { email: "abid@tirasoftware.com",    role: "member", handle: "abid",               displayName: "abid"              },
  { email: "alexchang16@gmail.com",    role: "admin",  handle: "alexchang16",        displayName: "alexchang16"       },
  { email: "jenniferevelynha@hotmail.com", role: "admin", handle: "jenniferevelynha", displayName: "jenniferevelynha" },
  { email: "deborah.h.le@gmail.com",   role: "admin",  handle: "deborah.h.le",       displayName: "deborah.h.le"     },
] as const;

const BUYERS = [
  { name: "Pioneer Goods Co.",     contactName: null, email: null, phone: null, region: "US" },
  { name: "Vellum Studio",         contactName: null, email: null, phone: null, region: "US" },
  { name: "Marlowe & Sons",        contactName: null, email: null, phone: null, region: "UK" },
  { name: "Atelier Nord",          contactName: null, email: null, phone: null, region: "EU" },
  { name: "Northbound Outfitters", contactName: null, email: null, phone: null, region: "CA" },
  { name: "Cedar Hollow Homes",    contactName: null, email: null, phone: null, region: "US" },
  { name: "Forever 21",            contactName: null, email: null, phone: null, region: "US" },
] as const;

interface SupplierDef {
  name: string;
  country: string;
  contactEmail?: string;
  contactName?: string;
  whatsAppNumber?: string;
  paymentTerms?: string;
}

const SUPPLIERS: SupplierDef[] = [
  { name: "Tianjin Wire Works",    country: "CN", paymentTerms: "30% deposit, 70% before shipment" },
  { name: "Guangzhou Metalworks",  country: "CN", paymentTerms: "30% deposit, 70% before shipment" },
  { name: "Foshan Precision Parts",country: "CN", paymentTerms: "30% deposit, 70% before shipment" },
  { name: "Dongguan BrightTech",   country: "CN", paymentTerms: "30% deposit, 70% before shipment" },
  { name: "Shenzhen LEDPro",       country: "CN", paymentTerms: "30% deposit, 70% before shipment" },
];

interface ShipmentDef {
  poNumber: string;
  product: string;
  category: string;
  supplierName: string;
  customerName: string;
  buyerTotalUsd: number;
  currentStageId: string;
  via: "OCEAN" | "AIR";
  exFactoryDate: string;
  dueDate: string;
  deposit: { amountUsd: number; paid: boolean };
  balance: { amountUsd: number; paid: boolean };
}

const SHIPMENTS: ShipmentDef[] = [
  {
    poNumber: "PO-1001-778143",
    product: "Chrome Retail Hanger — Heavy Duty Top",
    category: "Hangers",
    supplierName: "Tianjin Wire Works",
    customerName: "Marlowe & Sons",
    buyerTotalUsd: 46234,
    currentStageId: "spec",
    via: "OCEAN",
    exFactoryDate: "2026-10-15",
    dueDate: "2026-11-30",
    deposit: { amountUsd: 2280, paid: false },
    balance: { amountUsd: 5320, paid: false },
  },
  {
    poNumber: "PO-1002-783656",
    product: "Chrome Retail Hanger — Slim Profile Bottom",
    category: "Hangers",
    supplierName: "Guangzhou Metalworks",
    customerName: "Vellum Studio",
    buyerTotalUsd: 35048,
    currentStageId: "quotes",
    via: "OCEAN",
    exFactoryDate: "2026-10-20",
    dueDate: "2026-12-05",
    deposit: { amountUsd: 3090, paid: false },
    balance: { amountUsd: 7210, paid: false },
  },
  {
    poNumber: "PO-1003-F18SAF0259",
    product: "Chrome Retail Hanger — Velvet Grip",
    category: "Hangers",
    supplierName: "Tianjin Wire Works",
    customerName: "Marlowe & Sons",
    buyerTotalUsd: 46234,
    currentStageId: "sample_ord",
    via: "OCEAN",
    exFactoryDate: "2026-09-30",
    dueDate: "2026-11-15",
    deposit: { amountUsd: 3996, paid: false },
    balance: { amountUsd: 9324, paid: false },
  },
  {
    poNumber: "PO-1004-792884",
    product: "Chrome Retail Hanger — Notched Shoulder",
    category: "Hangers",
    supplierName: "Guangzhou Metalworks",
    customerName: "Vellum Studio",
    buyerTotalUsd: 35048,
    currentStageId: "sample_apr",
    via: "OCEAN",
    exFactoryDate: "2026-09-20",
    dueDate: "2026-11-05",
    deposit: { amountUsd: 4998, paid: false },
    balance: { amountUsd: 11662, paid: false },
  },
  {
    poNumber: "PO-1005-797758-001",
    product: "Chrome Retail Hanger — Heavy Duty Top",
    category: "Hangers",
    supplierName: "Tianjin Wire Works",
    customerName: "Marlowe & Sons",
    buyerTotalUsd: 46234,
    currentStageId: "po_issued",
    via: "OCEAN",
    exFactoryDate: "2026-09-10",
    dueDate: "2026-10-25",
    deposit: { amountUsd: 4560, paid: true },
    balance: { amountUsd: 10640, paid: false },
  },
  {
    poNumber: "PO-1006-P201466120",
    product: "Powder-Coat Hanger — Charcoal Bottom",
    category: "Hangers",
    supplierName: "Guangzhou Metalworks",
    customerName: "Northbound Outfitters",
    buyerTotalUsd: 27477,
    currentStageId: "production",
    via: "OCEAN",
    exFactoryDate: "2026-08-28",
    dueDate: "2026-10-10",
    deposit: { amountUsd: 2340, paid: true },
    balance: { amountUsd: 5460, paid: false },
  },
  {
    poNumber: "PO-1007-P201472890",
    product: "Powder-Coat Hanger — Bronze Petite",
    category: "Hangers",
    supplierName: "Foshan Precision Parts",
    customerName: "Marlowe & Sons",
    buyerTotalUsd: 30492,
    currentStageId: "qc",
    via: "OCEAN",
    exFactoryDate: "2026-08-20",
    dueDate: "2026-10-01",
    deposit: { amountUsd: 3150, paid: true },
    balance: { amountUsd: 7350, paid: false },
  },
  {
    poNumber: "PO-1008-P201475383",
    product: "Powder-Coat Hanger — Ivory Wishbone",
    category: "Hangers",
    supplierName: "Guangzhou Metalworks",
    customerName: "Northbound Outfitters",
    buyerTotalUsd: 27477,
    currentStageId: "ex_factory",
    via: "OCEAN",
    exFactoryDate: "2026-08-10",
    dueDate: "2026-09-25",
    deposit: { amountUsd: 4050, paid: true },
    balance: { amountUsd: 9450, paid: false },
  },
  {
    poNumber: "PO-1009-711872",
    product: "Powder-Coat Hanger — Matte Black Top",
    category: "Hangers",
    supplierName: "Foshan Precision Parts",
    customerName: "Marlowe & Sons",
    buyerTotalUsd: 30492,
    currentStageId: "in_transit",
    via: "OCEAN",
    exFactoryDate: "2026-07-28",
    dueDate: "2026-09-10",
    deposit: { amountUsd: 3780, paid: true },
    balance: { amountUsd: 8820, paid: true },
  },
  {
    poNumber: "PO-1010-4500096501",
    product: "LED Track Light — 3000K Spot — 12W",
    category: "Lighting",
    supplierName: "Dongguan BrightTech",
    customerName: "Atelier Nord",
    buyerTotalUsd: 24978,
    currentStageId: "payment",
    via: "AIR",
    exFactoryDate: "2026-07-15",
    dueDate: "2026-08-20",
    deposit: { amountUsd: 2085, paid: true },
    balance: { amountUsd: 4865, paid: true },
  },
  {
    poNumber: "PO-1011-4500110188",
    product: "LED Track Light — 4000K Wash — 18W",
    category: "Lighting",
    supplierName: "Shenzhen LEDPro",
    customerName: "Pioneer Goods Co.",
    buyerTotalUsd: 11567,
    currentStageId: "delivered",
    via: "AIR",
    exFactoryDate: "2026-07-01",
    dueDate: "2026-08-05",
    deposit: { amountUsd: 2754, paid: true },
    balance: { amountUsd: 6426, paid: true },
  },
];

// ── Message content per stage ─────────────────────────────────────────────────

interface MessageDef {
  sender: string;
  recipient?: string;
  channel: string;
  direction: "inbound" | "outbound";
  supplierName?: string;
  daysAgo: number; // relative to "now" (script run time)
  snippet: string;
  fullBody: string;
  unread: boolean;
  routingStatus: string;
}

function buildMessages(s: ShipmentDef, supplierIdRef: () => number, buyerIdRef: () => number | null): MessageDef[] {
  const stage = s.currentStageId;
  const buyer = s.customerName;
  const supplier = s.supplierName;
  const product = s.product;

  switch (stage) {
    case "spec":
      return [
        {
          sender: "Linda Chen <linda@tianjinwireworks.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 6,
          snippet: `RFQ received. Happy to quote ${product}. Can you share the full spec sheet?`,
          fullBody: `Hi,\n\nThank you for the RFQ. We'd be happy to provide a quote for the ${product}.\n\nCould you please share the full spec sheet including:\n• Required finish (chrome, matte, glossy?)\n• Weight capacity per hanger\n• Carton qty and dimensions\n• Target unit price\n\nOnce we have these, we can confirm pricing within 3 business days.\n\nBest regards,\nLinda Chen\nTianjin Wire Works`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 5,
          snippet: `How long for a pre-production sample? We need it before we commit.`,
          fullBody: `Hello,\n\nBefore we move forward, could you clarify how long it takes to receive a pre-production sample once the spec is approved?\n\nWe're evaluating two factories and timeline is a key factor. We'd need the sample in our hands within 3 weeks of order.\n\nPlease advise.\n\nThanks,\nSarah Mitchell\nMarlowe & Sons`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 4,
          snippet: `Spec sheet attached. Sample lead time is 12–14 business days from deposit.`,
          fullBody: `Hi Sarah,\n\nPlease find the spec sheet attached for the ${product}.\n\nOn sample timing: once we receive the 30% deposit and confirmed spec, the factory can turn around a pre-production sample in 12–14 business days.\n\nWe'll loop back with Linda at Tianjin to confirm their current capacity.\n\nBest,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Linda Chen <linda@tianjinwireworks.cn>",
          channel: "whatsapp",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 3,
          snippet: `Confirmed capacity for ${product}. Ready to proceed once spec locked.`,
          fullBody: `Hi Alex,\n\nConfirmed — we have capacity for this order. Once spec is locked and deposit received we can start within 2 days.\n\nSample lead time from deposit: 12 business days.\n\nLinda`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `Good to go on spec — can you send over the proforma so we can approve?`,
          fullBody: `Hi Alex,\n\nSpec looks good. Please ask the factory to send over the proforma invoice so we can approve the spec formally and get the deposit paid.\n\nWe're keen to move fast on this.\n\nSarah`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "quotes":
      return [
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `Cost sheet for ${product} — $5.20/unit at MOQ 5,000.`,
          fullBody: `Hi,\n\nPlease find our cost sheet below for the ${product}:\n\n• Unit price: USD 5.20 at MOQ 5,000\n• Lead time: 35 days from PO\n• Payment: 30% deposit, 70% before shipment\n• Carton: 50 pcs/ctn\n\nLet us know if you'd like to discuss.\n\nBest,\nJames Wu\nGuangzhou Metalworks`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 6,
          snippet: `Thanks James — we need to be at $4.80 to make the margin work. Can you move 8%?`,
          fullBody: `Hi James,\n\nThank you for the quote — production specs look good.\n\nHowever, at $5.20 we're above our target margin. We need to land at USD 4.80 to make this viable.\n\nCan you review with your costing team and see if an 8% reduction is achievable?\n\nThanks,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Emma Voss <emma@vellumstudio.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 5,
          snippet: `Can you share the margin breakdown before we approve the quote?`,
          fullBody: `Hi Alex,\n\nBefore we sign off on the quote, it'd help to understand the margin structure. Can you share a rough breakdown — factory cost vs. landed cost vs. our price?\n\nWe want to make sure we're competitive with our retail pricing.\n\nThanks,\nEmma\nVellum Studio`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 4,
          snippet: `Sharing margin summary with Emma. Pushing factory for 8% reduction.`,
          fullBody: `Hi Emma,\n\nHappy to share the breakdown.\n\nFactory quote: $5.20/unit → Freight + duties: ~$0.60 → Landed cost: ~$5.80\nYour target sell price: ~$8.50 → Margin: ~32%\n\nWe're negotiating the factory down to $4.95 which would push your margin toward 38%. Awaiting response.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 2,
          snippet: `Best we can do is $4.95/unit — confirmed with our MD.`,
          fullBody: `Hi Alex,\n\nI discussed with our MD. We can offer USD 4.95/unit as our best price — this is our floor.\n\nAt this price our margin is very thin but we value the long-term relationship.\n\nPlease confirm if you'd like to proceed.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Emma Voss <emma@vellumstudio.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `$4.95 works for us — please proceed to sample order.`,
          fullBody: `Hi Alex,\n\n$4.95 works. Please go ahead and place the sample order. We'd like 3 samples to review.\n\nThanks for the quick turnaround on this.\n\nEmma`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "sample_ord":
      return [
        {
          sender: "Linda Chen <linda@tianjinwireworks.cn>",
          channel: "whatsapp",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `3 samples dispatched via DHL. Tracking: 1ZW749120349867234.`,
          fullBody: `Hi Alex,\n\nGood news — we dispatched 3 pre-production samples today via DHL Express.\n\nTracking number: 1ZW749120349867234\nExpected delivery: 3–5 business days\n\nPlease review and let us know your feedback.\n\nLinda`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 6,
          snippet: `Samples on their way — tracking shared with Marlowe.`,
          fullBody: `Hi Sarah,\n\nThe factory has dispatched the pre-production samples via DHL. Tracking: 1ZW749120349867234.\n\nExpected with you in 3–5 business days. Please review once received and share your feedback.\n\nBest,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 5,
          snippet: `Can we get a photo of the packaging before the samples arrive?`,
          fullBody: `Hi Alex,\n\nCould you ask the factory for a photo of how the samples are packaged? We want to check the carton labeling and inner packaging.\n\nAlso — are there any spec deviations we should watch for?\n\nThanks,\nSarah`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "whatsapp",
          direction: "outbound",
          daysAgo: 5,
          snippet: `Linda — can you send photos of the sample packaging before they land?`,
          fullBody: `Hi Linda,\n\nThe buyer is asking for photos of the sample packaging — carton labels, inner wrap, and hangtag if any.\n\nCan you send a few photos over WhatsApp?\n\nThanks,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Linda Chen <linda@tianjinwireworks.cn>",
          channel: "whatsapp",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 4,
          snippet: `Photos attached — inner poly bag + master carton label visible.`,
          fullBody: `Hi Alex,\n\nI've sent 4 photos via WhatsApp:\n• Inner poly bag with product ID label\n• Master carton with barcode and SKU\n• Hangtag (blank — buyer to supply artwork)\n• Close-up of chrome finish on shoulder\n\nLet me know if anything needs adjusting.\n\nLinda`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `Samples received — reviewing now, will revert by end of week.`,
          fullBody: `Hi Alex,\n\nSamples arrived this morning — we're reviewing them now with our merchandising team.\n\nWe'll share our feedback by end of this week.\n\nThanks,\nSarah`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "sample_apr":
      return [
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 6,
          snippet: `Sample photos ready — 3 angles of the Notched Shoulder hanger.`,
          fullBody: `Hi Alex,\n\nPlease find the 3 sample photos attached:\n\n1. Front view — notch angle and chrome finish visible\n2. Side profile — hook gauge and weld point\n3. Shoulder detail — velvet locking bead\n\nAll dimensions match spec sheet. Ready for buyer approval.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 5,
          snippet: `Sample photos forwarded to Emma — please review and approve.`,
          fullBody: `Hi Emma,\n\nThe factory has sent over sample photos — I'm attaching them here.\n\nAll dimensions checked against spec. The notch angle is 38° as requested. The chrome finish looks consistent.\n\nPlease share your approval so we can confirm bulk go-ahead.\n\nBest,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Emma Voss <emma@vellumstudio.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 4,
          snippet: `Approved! One note — can the velvet grip be slightly tighter? Otherwise great.`,
          fullBody: `Hi Alex,\n\nSample approved — overall it looks excellent. The chrome finish is very clean.\n\nOne small comment: the velvet grip on the shoulder feels slightly loose. It would be great if the factory could tighten the bead seating by ~1mm — not a blocker, but worth flagging for bulk.\n\nPlease go ahead and confirm bulk go-ahead with the factory.\n\nEmma`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "wechat",
          direction: "outbound",
          daysAgo: 3,
          snippet: `Emma approved! Minor note on velvet grip — tighten bead by 1mm. Confirm bulk go-ahead.`,
          fullBody: `Hi James,\n\nGreat news — the buyer has approved the sample.\n\nOne small modification for bulk production: the velvet grip bead should be seated 1mm tighter. The buyer flagged it as non-blocking but wants it corrected in bulk.\n\nPlease confirm:\n1. You can accommodate this in bulk\n2. Lead time from PO (35 days still accurate?)\n\nWe'll issue the PO as soon as we receive the deposit.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 2,
          snippet: `Confirmed — velvet bead adjusted. Lead time 35 days from deposit.`,
          fullBody: `Hi Alex,\n\nConfirmed:\n• Velvet bead seating tightened by 1mm — no additional cost\n• Lead time: 35 days from receipt of deposit\n• Bulk MOQ: 5,000 pcs\n\nReady to proceed whenever you issue PO.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Emma Voss <emma@vellumstudio.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `All good — please issue the PO. We'll arrange deposit this week.`,
          fullBody: `Hi Alex,\n\nAll good — please issue the PO to the factory. We'll arrange the 30% deposit wire by Thursday.\n\nLooking forward to getting this into production.\n\nEmma`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "po_issued":
      return [
        {
          sender: "Linda Chen <linda@tianjinwireworks.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `PO acknowledged. Proforma invoice attached — please confirm deposit.`,
          fullBody: `Hi Alex,\n\nThank you for the PO. Please find our proforma invoice attached.\n\nDeposit amount: USD 4,560 (30%)\nBank details: provided separately via secure channel\nProduction start: within 2 business days of deposit receipt\n\nKindly confirm once the wire is sent.\n\nBest regards,\nLinda Chen\nTianjin Wire Works`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 6,
          snippet: `Deposit transferred — ref MARLOWE-DEP-1005. When does production start?`,
          fullBody: `Hi Alex,\n\nDeposit of USD 4,560 transferred today. Reference: MARLOWE-DEP-1005.\n\nPlease confirm with the factory and let us know the production start date.\n\nBest,\nSarah`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "whatsapp",
          direction: "outbound",
          daysAgo: 6,
          snippet: `Linda — deposit received. Please confirm production start date.`,
          fullBody: `Hi Linda,\n\nThe buyer has confirmed deposit of USD 4,560 sent today (ref: MARLOWE-DEP-1005).\n\nPlease acknowledge receipt and confirm your production start date.\n\nThanks,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Linda Chen <linda@tianjinwireworks.cn>",
          channel: "whatsapp",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 5,
          snippet: `Deposit received. Production starting Monday. On track for 35-day lead.`,
          fullBody: `Hi Alex,\n\nDeposit received — thank you.\n\nProduction confirmed to start Monday. We are on track for our 35-day lead time.\n\nEx-factory date target: as per PO.\n\nLinda`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 5,
          snippet: `Production starts Monday — on track. No changes to ex-factory date.`,
          fullBody: `Hi Sarah,\n\nFactory confirmed receipt of deposit and production starts Monday.\n\nWe remain on track for the agreed ex-factory date. I'll update you at the midpoint milestone.\n\nBest,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `Great — please keep us posted on the midpoint update.`,
          fullBody: `Hi Alex,\n\nThanks for the update — great to hear production is underway.\n\nPlease do send through the midpoint report when it's ready.\n\nSarah`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "production":
      return [
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `Midpoint update: 60% complete. On track for ex-factory date.`,
          fullBody: `Hi Alex,\n\nMidpoint production update for ${product}:\n\n• Progress: 60% of units complete\n• QC inline checks: passed so far\n• Ex-factory target: on track\n• No issues reported\n\nNext update at 90% completion.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 6,
          snippet: `Midpoint update shared — 60% done, on track.`,
          fullBody: `Hi,\n\nFactory midpoint update is in: 60% of the ${product} order is complete, inline QC is passing, and the ex-factory date is on track.\n\nNext update at 90%. I'll flag immediately if anything changes.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Rachel Nguyen <rachel@northboundoutfitters.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 5,
          snippet: `What's the latest ETA to LA? We're planning warehouse receiving slots.`,
          fullBody: `Hi Alex,\n\nCould you give us the latest ETA to our LA warehouse? We're booking receiving slots and need to plan 2–3 weeks ahead.\n\nAny changes to the ex-factory date would be good to know ASAP.\n\nThanks,\nRachel Nguyen\nNorthbound Outfitters`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 3,
          snippet: `⚠️ Minor issue — 2-day machine downtime. Ex-factory pushed by 2 days.`,
          fullBody: `Hi Alex,\n\nUnfortunately we had an unexpected machine downtime (coating line maintenance) which cost us 2 days.\n\nRevised ex-factory date: pushed back by 2 days.\n\nWe're running weekend shifts to minimize impact. Will update you at 90%.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 3,
          snippet: `⚠️ Risk flag — ex-factory slipped 2 days due to machine downtime. Adjusted ETA below.`,
          fullBody: `Hi Rachel,\n\nImportant update: the factory experienced a 2-day machine downtime (coating line). The ex-factory date has slipped by 2 days.\n\nRevised ETA to LA: I'll confirm the updated sailing once we have the new booking. Vessel schedules may absorb some of this delay.\n\nFactory is running weekend shifts to minimize further slippage. I'll update you as soon as we have the final ex-factory confirmation.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Rachel Nguyen <rachel@northboundoutfitters.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `Two days is manageable — please confirm revised ETA as soon as you know.`,
          fullBody: `Hi Alex,\n\nTwo days is manageable at this stage — thank you for the quick heads up.\n\nPlease confirm the revised ETA as soon as the factory gives you the final ex-factory date. We'll hold the receiving slot flexibility for another week.\n\nRachel`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "qc":
      return [
        {
          sender: "Michelle Lam <michelle@foshanprecision.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `SGS QC inspection passed — AQL 2.5. Report attached.`,
          fullBody: `Dear Alex,\n\nPlease find the SGS AQL 2.5 inspection report attached for the ${product} order.\n\nSummary:\n• Sample size: 315 pcs\n• Critical defects: 0\n• Major defects: 2 (within AQL limit)\n• Minor defects: 5 (within AQL limit)\n• Result: PASS\n\nWe are ready to ship. Kindly arrange balance payment of USD 7,350 so we can book the vessel.\n\nBest regards,\nMichelle Lam\nFoshan Precision Parts`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 6,
          snippet: `QC passed — requesting hi-res photos before we approve the balance payment.`,
          fullBody: `Hi Michelle,\n\nGreat news on the QC pass — thank you.\n\nBefore we approve the balance payment, could you send hi-res photos of:\n1. Finished goods in cartons\n2. Close-up of the product finish\n3. One photo of the carton labels\n\nThis is standard process for our buyer sign-off.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Michelle Lam <michelle@foshanprecision.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 5,
          snippet: `Photos sent — 6 images showing cartons and product finish.`,
          fullBody: `Hi Alex,\n\nPlease find 6 hi-res photos attached:\n• Packed cartons (row of 12)\n• Individual carton label\n• Product close-up (3 angles)\n• Finish quality shot\n\nPlease approve so we can proceed to booking.\n\nMichelle`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 4,
          snippet: `Photos forwarded to Marlowe for sign-off before payment release.`,
          fullBody: `Hi Sarah,\n\nQC has passed (SGS AQL 2.5 — all within limits) and the factory has provided hi-res photos.\n\nI'm attaching everything here for your sign-off. Once you confirm we'll release the balance payment of USD 7,350.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 3,
          snippet: `Signed off — release the balance. Well done on the QC result.`,
          fullBody: `Hi Alex,\n\nAll looks excellent — we're happy to sign off. Please release the balance payment of USD 7,350.\n\nWell done on steering the QC process.\n\nSarah`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 2,
          snippet: `Balance payment released to factory. Vessel booking to follow.`,
          fullBody: `Hi Michelle,\n\nBuyer has approved — balance payment of USD 7,350 released today.\n\nPlease proceed with vessel booking and share the booking confirmation.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Michelle Lam <michelle@foshanprecision.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 1,
          snippet: `Payment received. Vessel booking in progress — will confirm tomorrow.`,
          fullBody: `Hi Alex,\n\nPayment received — thank you. We are now booking the vessel and expect to confirm the sailing schedule tomorrow.\n\nMichelle`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "ex_factory":
      return [
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `⚠️ Yantian port congestion — 4-day delay. Revised ex-factory: Aug 14.`,
          fullBody: `Hi Alex,\n\nUnfortunately we are experiencing port congestion at Yantian. CY cut-off has been pushed back 4 days by our forwarder.\n\nRevised ex-factory date: August 14\nOriginal: August 10\n\nImpact to ETA: ~4–5 days depending on vessel schedule.\n\nApologies for the inconvenience.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 6,
          snippet: `⚠️ Yantian congestion — revised ex-factory Aug 14. ETA updated below.`,
          fullBody: `Hi Rachel,\n\nImportant update: Yantian port is experiencing congestion and the factory's ex-factory date has moved from Aug 10 to Aug 14.\n\nThis will push the vessel ETD by ~4–5 days. I'm working with the forwarder to confirm the revised sailing and will update the ETA as soon as I have it.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Rachel Nguyen <rachel@northboundoutfitters.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 5,
          snippet: `Our LA warehouse deadline is firm — this needs to land by Oct 1.`,
          fullBody: `Hi Alex,\n\nI need to be clear — our LA warehouse has a firm receiving deadline of October 1. We have a planogram reset scheduled and cannot flex.\n\nPlease do everything you can to recover the timeline. Is there any way to expedite or find a faster vessel?\n\nRachel`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "wechat",
          direction: "outbound",
          daysAgo: 4,
          snippet: `James — buyer deadline is firm Oct 1 LA. Can we get an earlier vessel or expedite?`,
          fullBody: `Hi James,\n\nThe buyer has a firm deadline of Oct 1 at their LA warehouse. The 4-day slip is causing real concern.\n\nCan you:\n1. Confirm the revised sailing and ETA\n2. Check if there's an earlier vessel option from Yantian\n3. Explore partial AIR if needed (urgent)\n\nPlease respond ASAP.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "James Wu <james@gzmetalworks.cn>",
          channel: "wechat",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 3,
          snippet: `Confirmed sailing: Cosco Neptune, ETD Aug 16, ETA LA Sep 26. On track.`,
          fullBody: `Hi Alex,\n\nGood news — forwarder confirmed a booking on Cosco Neptune:\n\n• ETD Yantian: August 16\n• ETA LA/LB: September 26 (transit ~41 days)\n• This is 5 days ahead of your Oct 1 deadline\n\nAll goods are at CY ready to load. Booking confirmed.\n\nJames`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 2,
          snippet: `Vessel confirmed — Cosco Neptune, ETD Aug 16, ETA Sep 26. 5 days before deadline.`,
          fullBody: `Hi Rachel,\n\nVessel confirmed: Cosco Neptune, ETD Yantian Aug 16, ETA LA/LB September 26.\n\nThis gives you a 5-day buffer before your Oct 1 deadline. The goods are at the CY and ready to load.\n\nI'll share the B/L and container number once the vessel departs.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Rachel Nguyen <rachel@northboundoutfitters.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `Sep 26 works — thank you for sorting this out. Please send B/L when ready.`,
          fullBody: `Hi Alex,\n\nSep 26 works perfectly. Well done for pulling this together despite the congestion.\n\nPlease send the B/L and container number as soon as they're available.\n\nRachel`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "in_transit":
      return [
        {
          sender: "Michelle Lam <michelle@foshanprecision.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 6,
          snippet: `Vessel CSCL Pacific Ocean departed Yantian Jul 28. ETD/ETA confirmed.`,
          fullBody: `Dear Alex,\n\nPlease be advised that the vessel CSCL Pacific Ocean has departed Yantian Port on July 28.\n\nShipping details:\n• Vessel: CSCL Pacific Ocean (Voyage 027W)\n• ETD Yantian: July 28\n• ETA LA/LB: September 8\n• Container: CSLU7654321\n• B/L: CSLUYAN123456789\n\nPlease find the B/L attached.\n\nMichelle`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 5,
          snippet: `Vessel departed! Tracking link and B/L details below. ETA Sep 8.`,
          fullBody: `Hi Sarah,\n\nThe vessel has departed!\n\n• Vessel: CSCL Pacific Ocean\n• ETD Yantian: July 28\n• ETA LA/LB: September 8\n• Container: CSLU7654321\n\nYou can track via: https://www.coscoshipping.com/en/tracking/?container=CSLU7654321\n\nB/L copy attached. Let me know if you need the full set of shipping docs.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Sarah Mitchell <sarah@marloweandsons.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 4,
          snippet: `Tracking confirmed. Sep 8 works perfectly. Thanks for the smooth process!`,
          fullBody: `Hi Alex,\n\nTracking confirmed — Sep 8 works perfectly for us.\n\nThank you for the smooth process on this order. The team has done a great job managing the timeline.\n\nWe'll be in touch once the goods arrive.\n\nSarah`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 3,
          snippet: `Vessel on schedule — no delays reported. Will update at arrival.`,
          fullBody: `Hi Sarah,\n\nQuick check-in — vessel is on schedule, no port delays or diversions reported.\n\nETA remains September 8. I'll update you when the vessel arrives and the goods clear customs.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Michelle Lam <michelle@foshanprecision.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 1,
          snippet: `Balance payment reminder — USD 8,820 due before arrival. Bank details below.`,
          fullBody: `Dear Alex,\n\nJust a friendly reminder that the balance payment of USD 8,820 is due before goods are released at destination.\n\nPlease arrange the wire at your earliest convenience.\n\nBank details:\n• Bank: Bank of China\n• Account name: Foshan Precision Parts Ltd\n• SWIFT: BKCHCNBJ\n• Account: 622848XXXXXXXXXX (provided separately)\n\nMichelle`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "payment":
      return [
        {
          sender: "Kevin Park <kevin@dongguanbrightech.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 6,
          snippet: `Final balance payment reminder — USD 4,865. Bank details attached.`,
          fullBody: `Dear Alex,\n\nWe hope the goods have been received in good condition.\n\nThis is a reminder that the final balance payment of USD 4,865 is outstanding.\n\nBank details:\n• Beneficiary: Dongguan BrightTech Electronics Ltd\n• Bank: Industrial and Commercial Bank of China\n• SWIFT: ICBKCNBJDGG\n• Account: 3200XXXXXXXXXX\n\nPlease advise ETA for the wire.\n\nBest regards,\nKevin Park\nDongguan BrightTech`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 5,
          snippet: `Forwarding balance reminder to Atelier Nord — please arrange USD 4,865.`,
          fullBody: `Hi,\n\nThe factory has sent the final balance payment reminder for USD 4,865.\n\nPlease arrange the wire transfer at your earliest convenience and share the payment reference so we can confirm with the factory.\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Pierre Dubois <pierre@ateliernord.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 4,
          snippet: `Wire sent today — ref ATELIER-BAL-1010. Can you confirm receipt?`,
          fullBody: `Hi Alex,\n\nWire transfer sent today for USD 4,865.\n\nReference: ATELIER-BAL-1010\nDate: today\nBeneficiary: Dongguan BrightTech Electronics Ltd\n\nPlease confirm receipt with the factory and close out this shipment.\n\nMerci,\nPierre Dubois\nAtelier Nord`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 4,
          snippet: `Kevin — buyer sent wire today (ATELIER-BAL-1010). Please confirm receipt.`,
          fullBody: `Hi Kevin,\n\nGood news — the buyer has sent the balance wire of USD 4,865 today (ref: ATELIER-BAL-1010).\n\nPlease confirm receipt once it clears. Typically 1–2 business days for international wires.\n\nThanks,\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Kevin Park <kevin@dongguanbrightech.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 2,
          snippet: `Balance received — USD 4,865. Thank you for the smooth transaction!`,
          fullBody: `Dear Alex,\n\nWe confirm receipt of the balance payment of USD 4,865.\n\nThank you for the smooth transaction. It's been a pleasure working with your team on this order.\n\nWe look forward to future collaborations.\n\nBest regards,\nKevin Park\nDongguan BrightTech`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Pierre Dubois <pierre@ateliernord.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `Great — glad it's all settled. Looking forward to the next order.`,
          fullBody: `Hi Alex,\n\nGlad that's all settled. The lights are performing beautifully in our Paris showroom.\n\nLooking forward to the next collection.\n\nPierre`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    case "delivered":
      return [
        {
          sender: "Annie Li <annie@shenzhenledpro.cn>",
          channel: "email",
          direction: "inbound",
          supplierName: supplier,
          daysAgo: 7,
          snippet: `Goods confirmed received by freight forwarder at LAX. POD attached.`,
          fullBody: `Dear Alex,\n\nPlease be advised that the goods for ${product} have been confirmed received by your freight forwarder at LAX.\n\nProof of delivery (POD) is attached.\n\nTotal cartons: 48\nTotal weight: 312kg\nReceived: intact, no visible damage reported at handover.\n\nBest regards,\nAnnie Li\nShenzhen LEDPro`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 6,
          snippet: `Goods at LAX forwarder — forwarding POD to Pioneer Goods Co.`,
          fullBody: `Hi,\n\nGreat news — the goods have been received by the freight forwarder at LAX.\n\nI'm attaching the POD. Could you confirm once your warehouse receives the final delivery?\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Tom Bradley <tom@pioneergoodsco.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 5,
          snippet: `Delivery received at our Commerce, CA warehouse. ✅`,
          fullBody: `Hi Alex,\n\nGoods received at our Commerce, CA warehouse this morning.\n\nDelivery receipt attached. All 48 cartons accounted for.\n\nWe'll have our receiving team do a full count and QC check over the next 2 days.\n\nThanks for managing this shipment.\n\nTom Bradley\nPioneer Goods Co.`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Tom Bradley <tom@pioneergoodsco.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 3,
          snippet: `Minor issue — 3 cartons have corner scuffs. Photos attached. No product damage.`,
          fullBody: `Hi Alex,\n\nReceiving inspection is mostly complete.\n\nOne note: 3 cartons (out of 48) have corner scuffs — looks like it happened during forwarder handling. Photos attached.\n\nProduct inside appears undamaged — the packaging absorbed the impact. We're not raising a formal claim at this stage but wanted to flag it.\n\nConsider noting this for future shipments — possibly add corner protectors.\n\nTom`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Alex Chang <alex@flowforge.io>",
          channel: "email",
          direction: "outbound",
          daysAgo: 2,
          snippet: `Thanks for flagging the carton scuffs — will note for future orders. All settled!`,
          fullBody: `Hi Tom,\n\nThank you for flagging the carton scuffs — we've noted this in our forwarder feedback for future shipments. Corner protectors are a good call and we'll add them to the packing spec.\n\nGlad the product itself is undamaged. This shipment is now closed.\n\nLooking forward to the next order!\n\nAlex`,
          unread: false,
          routingStatus: "routed",
        },
        {
          sender: "Tom Bradley <tom@pioneergoodsco.com>",
          channel: "email",
          direction: "inbound",
          daysAgo: 1,
          snippet: `All good — the team is happy with the product quality. Will reorder next season.`,
          fullBody: `Hi Alex,\n\nFinal word: the team is very happy with the product quality. The lights look great in our test bay.\n\nWe'll be reordering next season — expect a new inquiry in Q1.\n\nThanks again.\n\nTom`,
          unread: true,
          routingStatus: "routed",
        },
      ];

    default:
      return [];
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

// True when this file is the entry point (tsx direct execution), false when
// bundled and imported inside the API server.
const isCli =
  import.meta.url.endsWith("/seed-fab4demo.ts") ||
  import.meta.url.endsWith("/seed-fab4demo.js");

export async function seedFab4Demo(): Promise<void> {
  if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY env var must be set");
  console.log("=== Fab4Demo Seed Script ===\n");

  // ── Step 1: Create the org ────────────────────────────────────────────────
  console.log("Step 1: Creating Fab4Demo organization...");
  
  // Check if it already exists
  const [existingOrg] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, "fab4demo"));

  let newOrgId: number;
  if (existingOrg) {
    console.log(`  → Org already exists with id=${existingOrg.id}. Using existing org.`);
    newOrgId = existingOrg.id;
  } else {
    const [org] = await db
      .insert(organizationsTable)
      .values({ name: "Fab4Demo", slug: "fab4demo", visibilityMode: "shared" })
      .returning();
    newOrgId = org!.id;
    console.log(`  → Created org id=${newOrgId}`);
  }

  // ── Step 2: Resolve Clerk user IDs ────────────────────────────────────────
  console.log("\nStep 2: Resolving Clerk user IDs...");
  const resolvedMembers: Array<{
    clerkUserId: string;
    email: string;
    displayName: string;
    role: string;
    handle: string;
  }> = [];

  for (const member of TEAM_MEMBERS) {
    const clerkUser = await clerkGetUserByEmail(member.email);
    if (!clerkUser) {
      console.warn(`  ⚠ Could not find Clerk user for ${member.email} — skipping`);
      continue;
    }
    resolvedMembers.push({
      clerkUserId: clerkUser.id,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      handle: member.handle,
    });
    console.log(`  ✓ ${member.email} → ${clerkUser.id}`);
  }

  // ── Step 3: Insert team_users ─────────────────────────────────────────────
  // Note: the live DB has a single-column PK on clerk_user_id (not composite),
  // so a Clerk user can only belong to one org row. Users already in team_users
  // (org 1 — FlowForge Demo) cannot be re-inserted for org 3. We skip them and
  // log a warning rather than failing the whole script.
  console.log("\nStep 3: Inserting team members...");
  let memberCount = 0;
  for (const m of resolvedMembers) {
    // Check if already exists anywhere (PK is just clerk_user_id)
    const [existing] = await db
      .select()
      .from(teamUsersTable)
      .where(eq(teamUsersTable.clerkUserId, m.clerkUserId));

    if (existing) {
      if (existing.orgId === newOrgId) {
        console.log(`  → ${m.email} already in Fab4Demo — skipping`);
      } else {
        console.warn(`  ⚠ ${m.email} is in org ${existing.orgId} — DB PK prevents multi-org rows, skipping`);
      }
      continue;
    }

    // Handle uniqueness: inbound_token and inbound_handle are globally unique
    const token = generateInboundToken();
    const [handleConflict] = await db
      .select()
      .from(teamUsersTable)
      .where(eq(teamUsersTable.inboundHandle, m.handle));
    const handle = handleConflict ? `${m.handle}-fab4` : m.handle;

    await db.insert(teamUsersTable).values({
      clerkUserId: m.clerkUserId,
      email: m.email,
      name: m.displayName,
      role: m.role,
      inboundToken: token,
      inboundHandle: handle,
      orgId: newOrgId,
    });
    memberCount++;
    console.log(`  ✓ ${m.email} inserted (role: ${m.role}, handle: ${handle})`);
  }

  // ── Step 4: Copy buyers ───────────────────────────────────────────────────
  console.log("\nStep 4: Inserting buyers...");
  const buyerNameToId = new Map<string, number>();
  for (const b of BUYERS) {
    const [existing] = await db
      .select()
      .from(buyersTable)
      .where(and(eq(buyersTable.orgId, newOrgId), eq(buyersTable.name, b.name)));
    if (existing) {
      buyerNameToId.set(b.name, existing.id);
      console.log(`  → ${b.name} already exists — skipping`);
      continue;
    }
    const [inserted] = await db
      .insert(buyersTable)
      .values({ name: b.name, contactName: b.contactName, email: b.email, phone: b.phone, region: b.region, orgId: newOrgId })
      .returning();
    buyerNameToId.set(b.name, inserted!.id);
    console.log(`  ✓ ${b.name} (id=${inserted!.id})`);
  }

  // ── Step 5: Seed suppliers ────────────────────────────────────────────────
  console.log("\nStep 5: Inserting suppliers...");
  const supplierNameToId = new Map<string, number>();
  for (const s of SUPPLIERS) {
    const [existing] = await db
      .select()
      .from(suppliersTable)
      .where(and(eq(suppliersTable.orgId, newOrgId), eq(suppliersTable.name, s.name)));
    if (existing) {
      supplierNameToId.set(s.name, existing.id);
      console.log(`  → ${s.name} already exists — skipping`);
      continue;
    }
    const [inserted] = await db
      .insert(suppliersTable)
      .values({ name: s.name, country: s.country, contactEmail: s.contactEmail, contactName: s.contactName, whatsAppNumber: s.whatsAppNumber, paymentTerms: s.paymentTerms, orgId: newOrgId })
      .returning();
    supplierNameToId.set(s.name, inserted!.id);
    console.log(`  ✓ ${s.name} (id=${inserted!.id})`);
  }

  // ── Step 6: Seed shipments, deals, payments ───────────────────────────────
  console.log("\nStep 6: Inserting shipments, deals and payments...");
  const shipmentIdByPoNumber = new Map<string, number>();

  for (const s of SHIPMENTS) {
    // Skip if already exists
    const [existingShipment] = await db
      .select()
      .from(shipmentsTable)
      .where(and(eq(shipmentsTable.orgId, newOrgId), eq(shipmentsTable.poNumber, s.poNumber)));
    if (existingShipment) {
      shipmentIdByPoNumber.set(s.poNumber, existingShipment.id);
      console.log(`  → ${s.poNumber} already exists — skipping`);
      continue;
    }

    const supplierId = supplierNameToId.get(s.supplierName);
    if (!supplierId) {
      console.error(`  ✗ Supplier "${s.supplierName}" not found — skipping ${s.poNumber}`);
      continue;
    }

    const buyerId = buyerNameToId.get(s.customerName) ?? null;

    // Create deal
    const [existingDeal] = await db
      .select()
      .from(dealsTable)
      .where(and(eq(dealsTable.orgId, newOrgId), eq(dealsTable.buyerPoNumber, s.poNumber)));

    let dealId: number;
    if (existingDeal) {
      dealId = existingDeal.id;
    } else {
      const [newDeal] = await db
        .insert(dealsTable)
        .values({
          orgId: newOrgId,
          buyerPoNumber: s.poNumber,
          customerName: s.customerName,
          buyerTotalUsd: s.buyerTotalUsd,
          buyerUnitPrice: 0,
          buyerQuantity: 0,
        })
        .returning();
      dealId = newDeal!.id;
    }

    const [inserted] = await db
      .insert(shipmentsTable)
      .values({
        orgId: newOrgId,
        poNumber: s.poNumber,
        product: s.product,
        category: s.category,
        supplierId,
        customerName: s.customerName,
        buyerId,
        dealId,
        status: "on-track",
        currentStageId: s.currentStageId,
        dueDate: new Date(s.dueDate),
        exFactoryDate: new Date(s.exFactoryDate),
        destination: "USA",
        via: s.via,
      })
      .returning();

    shipmentIdByPoNumber.set(s.poNumber, inserted!.id);

    // Payments
    await db.insert(paymentsTable).values([
      {
        orgId: newOrgId,
        shipmentId: inserted!.id,
        label: "Deposit (30%)",
        percent: 30,
        amountUsd: s.deposit.amountUsd,
        paid: s.deposit.paid,
        dueDate: new Date(s.exFactoryDate),
        sortOrder: 0,
        paidAt: s.deposit.paid ? new Date(s.exFactoryDate) : null,
      },
      {
        orgId: newOrgId,
        shipmentId: inserted!.id,
        label: "Balance (70%)",
        percent: 70,
        amountUsd: s.balance.amountUsd,
        paid: s.balance.paid,
        dueDate: new Date(s.dueDate),
        sortOrder: 1,
        paidAt: s.balance.paid ? new Date(s.dueDate) : null,
      },
    ]);

    console.log(`  ✓ ${s.poNumber} [${s.currentStageId}] → shipment id=${inserted!.id}`);
  }

  // ── Step 7: Seed messages ─────────────────────────────────────────────────
  console.log("\nStep 7: Inserting messages...");
  const now = new Date();
  let totalMessages = 0;

  for (const s of SHIPMENTS) {
    const shipmentId = shipmentIdByPoNumber.get(s.poNumber);
    if (!shipmentId) continue;

    // Check if messages already exist
    const existingMsgs = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(and(eq(messagesTable.orgId, newOrgId), eq(messagesTable.shipmentId, shipmentId)));

    if (existingMsgs.length > 0) {
      console.log(`  → ${s.poNumber}: ${existingMsgs.length} messages already exist — skipping`);
      totalMessages += existingMsgs.length;
      continue;
    }

    const messages = buildMessages(s, () => supplierNameToId.get(s.supplierName)!, () => buyerNameToId.get(s.customerName) ?? null);

    for (const m of messages) {
      const receivedAt = new Date(now.getTime() - m.daysAgo * 24 * 60 * 60 * 1000);
      const supplierId = m.supplierName ? (supplierNameToId.get(m.supplierName) ?? null) : null;

      await db.insert(messagesTable).values({
        orgId: newOrgId,
        shipmentId,
        supplierId,
        sender: m.sender,
        recipient: m.recipient ?? null,
        channel: m.channel,
        direction: m.direction,
        snippet: m.snippet,
        fullBody: m.fullBody,
        unread: m.unread,
        receivedAt,
        routingStatus: m.routingStatus,
        aiDraft: "",
        aiAction: "",
        aiTags: [],
        signalStatus: "new",
      });
      totalMessages++;
    }

    console.log(`  ✓ ${s.poNumber} [${s.currentStageId}]: ${messages.length} messages`);
  }

  // ── Step 8: Verify ────────────────────────────────────────────────────────
  console.log("\nStep 8: Verification...");

  const orgRow = await db.select().from(organizationsTable).where(eq(organizationsTable.id, newOrgId));
  const memberRows = await db.select().from(teamUsersTable).where(eq(teamUsersTable.orgId, newOrgId));
  const buyerRows = await db.select().from(buyersTable).where(eq(buyersTable.orgId, newOrgId));
  const supplierRows = await db.select().from(suppliersTable).where(eq(suppliersTable.orgId, newOrgId));
  const shipmentRows = await db.select().from(shipmentsTable).where(eq(shipmentsTable.orgId, newOrgId));
  const paymentRows = await db.select().from(paymentsTable).where(eq(paymentsTable.orgId, newOrgId));
  const messageRows = await db.select().from(messagesTable).where(eq(messagesTable.orgId, newOrgId));

  // Message count per shipment
  const msgCountBySipment = new Map<number, number>();
  for (const msg of messageRows) {
    const sid = msg.shipmentId ?? 0;
    msgCountBySipment.set(sid, (msgCountBySipment.get(sid) ?? 0) + 1);
  }

  console.log("\n=== Verification Summary ===");
  console.log(`Org:       ${orgRow[0]?.name} (id=${newOrgId}, slug=${orgRow[0]?.slug})`);
  console.log(`Members:   ${memberRows.length} (${memberRows.map(m => m.email).join(", ")})`);
  console.log(`Buyers:    ${buyerRows.length} (${buyerRows.map(b => b.name).join(", ")})`);
  console.log(`Suppliers: ${supplierRows.length}`);
  console.log(`Shipments: ${shipmentRows.length}`);
  console.log(`Payments:  ${paymentRows.length}`);
  console.log(`Messages:  ${messageRows.length} total`);
  console.log("\nMessages per shipment:");
  for (const ship of shipmentRows) {
    const count = msgCountBySipment.get(ship.id) ?? 0;
    const flag = count < 4 ? " ⚠️ BELOW 4" : "";
    console.log(`  ${ship.poNumber} [${ship.currentStageId}]: ${count} messages${flag}`);
  }

  // Only close the pool when running as a standalone CLI script, not when
  // imported and called from within the running API server.
  if (isCli) await pool.end();
  console.log("\n✅ Fab4Demo seed complete!");
}

// ── CLI entry point ───────────────────────────────────────────────────────────
if (isCli) {
  seedFab4Demo().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
