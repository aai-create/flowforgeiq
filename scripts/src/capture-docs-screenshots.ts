/**
 * capture-docs-screenshots.ts
 *
 * Automated Playwright script that captures PNG screenshots of key FlowForge
 * screens and saves them to artifacts/flowforge/public/docs/.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run capture-docs
 *
 * Prerequisites:
 *   - FlowForge dev server must be running: pnpm --filter @workspace/flowforge run dev
 *   - API server must be running:           pnpm --filter @workspace/api-server run dev
 *   - Playwright Chromium installed:        npx playwright install chromium
 *
 * Output files (all 1280×800):
 *   artifacts/flowforge/public/docs/create-po.png
 *   artifacts/flowforge/public/docs/track-shipment.png
 *   artifacts/flowforge/public/docs/risk-radar.png
 *   artifacts/flowforge/public/docs/payments.png
 *   artifacts/flowforge/public/docs/suppliers.png
 */

import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:80";
const VIEWPORT = { width: 1280, height: 800 };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../artifacts/flowforge/public/docs");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  async function shot(filename: string) {
    await page.waitForTimeout(800);
    const dest = path.join(OUT_DIR, filename);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`  ✓ saved ${filename}`);
  }

  try {
    console.log("📸 FlowForge docs screenshot capture\n");

    // 1. create-po — open the New PO modal on the My Orders page
    console.log("1/5 Creating PO screenshot…");
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector("button", { timeout: 10_000 });
    const newPOBtn = page.getByRole("button", { name: /new po/i });
    if (await newPOBtn.isVisible()) await newPOBtn.click();
    await page.waitForTimeout(400);
    await shot("create-po.png");

    // 2. track-shipment — My Orders page with first shipment expanded
    console.log("2/5 Tracking shipment screenshot…");
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector("[id^=shipment-]", { timeout: 10_000 });
    const firstCard = page.locator("[id^=shipment-]").first();
    if (await firstCard.isVisible()) await firstCard.click();
    await page.waitForTimeout(400);
    await shot("track-shipment.png");

    // 3. risk-radar — Risk Radar page
    console.log("3/5 Risk Radar screenshot…");
    await page.goto(`${BASE_URL}/risk-radar`);
    await page.waitForTimeout(1200);
    await shot("risk-radar.png");

    // 4. payments — My Orders with a payment chip visible
    console.log("4/5 Payments screenshot…");
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector("[id^=shipment-]", { timeout: 10_000 });
    const firstCard2 = page.locator("[id^=shipment-]").first();
    if (await firstCard2.isVisible()) await firstCard2.click();
    await page.waitForTimeout(600);
    await shot("payments.png");

    // 5. suppliers — Suppliers page
    console.log("5/5 Suppliers screenshot…");
    await page.goto(`${BASE_URL}/suppliers`);
    await page.waitForTimeout(1000);
    await shot("suppliers.png");

    console.log("\n✅ All screenshots saved to artifacts/flowforge/public/docs/");
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
