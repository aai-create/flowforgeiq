---
name: aiRoutingGuess nullable fields
description: buyerName and shipmentId in aiRoutingGuess must be nullable or GET /messages/needs-review returns 500
---

The `aiRoutingGuess` JSONB column stores `{buyerName: string|null, shipmentId: number|null, confidence: number, reasoning: string}`. When the AI cannot identify a buyer or shipment, it writes `null` for those fields.

**Why:** The original OpenAPI schema declared `buyerName: {type: string}` and `shipmentId: {type: integer}` (non-nullable). When `GET /messages/needs-review` ran `ListMessagesResponseItem.parse(row)` on a row with nulls, Zod threw and the endpoint returned 500 — even though the message was saved correctly.

**How to apply:** In `lib/api-spec/openapi.yaml`, the `aiRoutingGuess` properties must be:
```yaml
buyerName:  { type: ["string", "null"] }
shipmentId: { type: ["integer", "null"] }
```
After any change to this object, run codegen. The same pattern applies to any other JSONB field whose nested properties can be null.
