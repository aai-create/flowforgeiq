---
name: shipmentId canonical format
description: UiMessage.shipmentId must use "s{id}" prefix to match UiShipment.id
---

`UiShipment.id` (set in `adaptShipments`) uses the format `"s${dbRow.id}"` (e.g. `"s42"`). All inbox filtering, thread matching, and active-shipment lookups compare `UiMessage.shipmentId` against `UiShipment.id`.

**Why:** When building an optimistic `UiMessage` after a confirmed paste-chat ingest, the original code used `String(created.shipmentId)` (e.g. `"42"`), which never matched any `UiShipment.id`. The message appeared to save but was silently detached from its shipment thread until a full refetch re-adapted the data.

**How to apply:** Any code that constructs a `UiMessage` from a raw API response must format the shipmentId as:
```ts
shipmentId: created.shipmentId ? `s${created.shipmentId}` : ""
```
This applies in paste-chat confirm handlers, webhook-driven optimistic updates, and any future place that manually builds a `UiMessage`.
