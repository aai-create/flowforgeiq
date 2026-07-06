/**
 * Route-level tests for GET /shortcuts/capture.shortcut
 *
 * Strategy:
 *   - Spin up a minimal Express app with the shortcuts router (no Clerk/pino-http stack).
 *   - bplist-creator is a real CJS module available in node_modules; we use it as-is.
 *   - Assert that the response carries the correct Content-Disposition and binary body.
 *   - Assert that the webhook URL embedded in the binary plist uses the correct base URL.
 */

import { describe, it, expect } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ─── App factory ──────────────────────────────────────────────────────────────

async function buildTestApp() {
  const { default: shortcutsRouter } = await import("../shortcuts.js");
  const app = express();
  app.use(express.json());
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    Object.assign(_req, {
      log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    });
    next();
  });
  app.use(shortcutsRouter);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /shortcuts/capture.shortcut", () => {
  it("returns 200 with Content-Disposition: attachment", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .get("/shortcuts/capture.shortcut")
      .set("Host", "example.com");

    expect(res.status).toBe(200);

    const disposition = res.headers["content-disposition"] as string;
    expect(disposition).toBeDefined();
    expect(disposition.toLowerCase()).toContain("attachment");
  });

  it("includes the filename FlowForge Capture.shortcut in Content-Disposition", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .get("/shortcuts/capture.shortcut")
      .set("Host", "example.com");

    const disposition = res.headers["content-disposition"] as string;
    expect(disposition).toContain("FlowForge Capture.shortcut");
  });

  it("returns Content-Type: application/octet-stream", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .get("/shortcuts/capture.shortcut")
      .set("Host", "example.com");

    expect(res.headers["content-type"]).toContain("application/octet-stream");
  });

  it("returns a non-empty binary body (valid bplist starts with bplist00)", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .get("/shortcuts/capture.shortcut")
      .set("Host", "example.com")
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.body).toBeInstanceOf(Buffer);
    expect((res.body as Buffer).length).toBeGreaterThan(0);

    // Apple binary plist format always starts with the magic bytes "bplist00"
    const magic = (res.body as Buffer).slice(0, 8).toString("ascii");
    expect(magic).toBe("bplist00");
  });

  it("embeds a webhook URL pointing to /api/capture/mobile at the request host", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .get("/shortcuts/capture.shortcut")
      .set("Host", "myapp.example.com")
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    // The binary plist contains the webhook URL as a UTF-8 string; scan raw bytes.
    const bodyStr = (res.body as Buffer).toString("utf8");
    expect(bodyStr).toContain("/api/capture/mobile");
    expect(bodyStr).toContain("myapp.example.com");
  });

  it("honours x-forwarded-host and x-forwarded-proto when building the webhook URL", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .get("/shortcuts/capture.shortcut")
      .set("Host", "internal-host")
      .set("x-forwarded-proto", "https")
      .set("x-forwarded-host", "public.flowforgeiq.com")
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    const bodyStr = (res.body as Buffer).toString("utf8");
    expect(bodyStr).toContain("public.flowforgeiq.com");
    expect(bodyStr).not.toContain("internal-host");
    expect(bodyStr).toContain("/api/capture/mobile");
  });
});
