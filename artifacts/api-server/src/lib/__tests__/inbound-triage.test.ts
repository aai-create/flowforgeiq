import { describe, expect, it } from "vitest";
import {
  canonicalProviderMessageId,
  captureInboundEventKey,
  deterministicShipmentMatch,
  emailInboundEventKey,
  triageInboundEmail,
} from "../inbound-triage";

describe("inbound triage", () => {
  it("retains only the actionable portion of replies while preserving an audit-safe raw source elsewhere", () => {
    const triage = triageInboundEmail(
      "Re: PO FF-104",
      "Confirmed: cartons ship Friday.\n\nOn Tue, Buyer wrote:\n> Can you confirm the date?\n-- \nSupplier signature",
    );

    expect(triage.normalizedBody).toBe("Confirmed: cartons ship Friday.");
    expect(triage.suppressionReason).toBeNull();
  });

  it("suppresses automatic replies and quoted-history-only deliveries", () => {
    expect(triageInboundEmail("Out of office", "I will reply next week.").suppressionReason).toBe("auto_reply");
    expect(triageInboundEmail("Re: Update", "On Tue, Buyer wrote:\n> Please confirm.").suppressionReason)
      .toBe("quoted_history_only");
  });

  it("normalizes provider identities and scopes replay keys outside this utility", () => {
    expect(canonicalProviderMessageId("  <<ABC@EXAMPLE.COM>>  ")).toBe("abc@example.com");
    expect(emailInboundEventKey({
      providerMessageId: " <ABC@EXAMPLE.COM> ",
      from: "a@example.com",
      recipient: "inbox@example.com",
      subject: "Update",
      normalizedBody: "Hello",
      receivedAt: new Date("2026-08-26T12:00:00Z"),
    })).toBe("email:provider:abc@example.com");
  });

  it("uses bounded fallback identities for no-ID email and capture retries", () => {
    const base = {
      providerMessageId: null,
      from: "supplier@example.com",
      recipient: "buyer@example.com",
      subject: "ETA",
      normalizedBody: "Order FF-104 ships Friday",
    };
    expect(emailInboundEventKey({ ...base, receivedAt: new Date("2026-08-26T01:00:00Z") }))
      .toBe(emailInboundEventKey({ ...base, receivedAt: new Date("2026-08-26T23:59:59Z") }));

    const capture = {
      userId: "user_a",
      channel: "whatsapp",
      sender: "Supplier",
      normalizedBody: "PO FF-104 confirmed",
    };
    expect(captureInboundEventKey({ ...capture, receivedAt: new Date(1_750_000_000_000) }))
      .toBe(captureInboundEventKey({ ...capture, receivedAt: new Date(1_750_000_001_000) }));
  });

  it("returns a shipment only when a PO or product reference is unambiguous", () => {
    const candidates = [
      { id: 1, poNumber: "FF-104", product: "Canvas Tote" },
      { id: 2, poNumber: "FF-105", product: "Canvas Tote" },
    ];
    expect(deterministicShipmentMatch("", "FF104 is confirmed", candidates)).toBe(1);
    expect(deterministicShipmentMatch("", "The canvas tote is confirmed", candidates)).toBeNull();
  });
});