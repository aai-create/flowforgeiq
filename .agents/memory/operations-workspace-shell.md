---
name: Operations workspace shell
description: Product design rule for keeping Inbox, My Orders, and RFQs visually and behaviorally related.
---

Inbox and My Orders are the canonical FlowForge workspace patterns. RFQs should reuse their single global header, one app sidebar, neutral workspace surface, compact toolbar, and focused list/detail behavior rather than introducing a bespoke navigation rail or persistent extra panels.

**Why:** RFQs, messages, and shipments are all operational records that users scan, filter, select, and act on. A separate RFQ shell increases cognitive load and makes the product feel like multiple applications.

**How to apply:** Put RFQ-specific views and sourcing metrics in the main content toolbar or list header. Use the standard selection/detail treatment (drawer on desktop, drill-in on narrow screens), and keep destructive/secondary actions inside explicit menus or confirmations.