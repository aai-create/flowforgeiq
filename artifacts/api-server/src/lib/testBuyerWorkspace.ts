import crypto from "node:crypto";
import {
  db,
  organizationsTable,
  stagesTable,
  suppliersTable,
  buyersTable,
  rfqsTable,
  rfqQuotesTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const TEST_BUYER_SESSION_COOKIE = "ff-test-buyer";
const SEEDED_BUYER_ORG_SLUG = "fab4demo";
const TEST_SESSION_MAX_AGE_SECONDS = 60 * 60 * 2;

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1" ||
    process.env.REPLIT_DEPLOYMENT === "true";
}

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

function signature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * The cookie is bound to the Clerk user id as well as the cloned org id.
 * It is not an access mechanism in production and cannot be used to select an
 * arbitrary org in development without a session issued by this route.
 */
export function createTestBuyerSessionValue(userId: string, orgId: number): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = `${userId}:${orgId}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function parseTestBuyerSessionValue(value: string | undefined, userId: string): number | null {
  if (isProductionEnvironment() || !value) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = value.slice(0, separator);
  const providedSignature = value.slice(separator + 1);
  const expectedSignature = signature(payload, secret);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

  const [cookieUserId, rawOrgId] = payload.split(":");
  const orgId = Number(rawOrgId);
  return cookieUserId === userId && Number.isInteger(orgId) && orgId > 0 ? orgId : null;
}

export function testBuyerSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    maxAge: TEST_SESSION_MAX_AGE_SECONDS * 1000,
    path: "/",
  };
}

export function testBuyerSessionEnabled(): boolean {
  return !isProductionEnvironment() && sessionSecret() !== null;
}

function cloneSlugForUser(userId: string): string {
  return `fab4demo-e2e-${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 20)}`;
}

/**
 * Creates a private RFQ fixture for one test identity. The source Fab4Demo org
 * is never updated; every foreign key that matters to the RFQ UI is remapped
 * into the new organization.
 */
export async function createTestBuyerWorkspace(userId: string): Promise<{
  id: number;
  name: string;
  slug: string;
}> {
  if (!testBuyerSessionEnabled()) {
    throw new Error("Test buyer access is disabled outside a non-production environment");
  }

  const slug = cloneSlugForUser(userId);
  const existing = await db
    .select({ id: organizationsTable.id, name: organizationsTable.name, slug: organizationsTable.slug })
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, slug))
    .limit(1);
  if (existing[0]) return existing[0];

  const source = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, SEEDED_BUYER_ORG_SLUG))
    .limit(1);
  if (!source[0]) throw new Error("Seeded buyer workspace is not available yet");

  return db.transaction(async (tx) => {
    const alreadyCreated = await tx
      .select({ id: organizationsTable.id, name: organizationsTable.name, slug: organizationsTable.slug })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .limit(1);
    if (alreadyCreated[0]) return alreadyCreated[0];

    const [organization] = await tx
      .insert(organizationsTable)
      .values({ name: "Fab4Demo — Test Buyer", slug, visibilityMode: "shared" })
      .returning({
        id: organizationsTable.id,
        name: organizationsTable.name,
        slug: organizationsTable.slug,
      });
    if (!organization) throw new Error("Could not create test buyer workspace");

    const sourceOrgId = source[0].id;
    const sourceStages = await tx.select().from(stagesTable).where(eq(stagesTable.orgId, sourceOrgId));
    if (sourceStages.length > 0) {
      await tx.insert(stagesTable).values(sourceStages.map(({ id, label, sortOrder }) => ({
        orgId: organization.id,
        id,
        label,
        sortOrder,
      })));
    }

    const supplierIdMap = new Map<number, number>();
    const sourceSuppliers = await tx.select().from(suppliersTable).where(eq(suppliersTable.orgId, sourceOrgId));
    for (const supplier of sourceSuppliers) {
      const [copy] = await tx.insert(suppliersTable).values({
        name: supplier.name,
        country: supplier.country,
        contactEmail: supplier.contactEmail,
        contactName: supplier.contactName,
        whatsAppNumber: supplier.whatsAppNumber,
        paymentTerms: supplier.paymentTerms,
        orgId: organization.id,
      }).returning({ id: suppliersTable.id });
      if (copy) supplierIdMap.set(supplier.id, copy.id);
    }

    const sourceBuyers = await tx.select().from(buyersTable).where(eq(buyersTable.orgId, sourceOrgId));
    if (sourceBuyers.length > 0) {
      await tx.insert(buyersTable).values(sourceBuyers.map(({ name, contactName, email, phone, region }) => ({
        name,
        contactName,
        email,
        phone,
        region,
        orgId: organization.id,
      })));
    }

    const rfqIdMap = new Map<number, number>();
    const sourceRfqs = await tx.select().from(rfqsTable).where(eq(rfqsTable.orgId, sourceOrgId));
    for (const rfq of sourceRfqs) {
      const [copy] = await tx.insert(rfqsTable).values({
        product: rfq.product,
        category: rfq.category,
        buyerName: rfq.buyerName,
        targetPriceUsd: rfq.targetPriceUsd,
        quantity: rfq.quantity,
        deadline: rfq.deadline,
        status: rfq.status,
        notes: rfq.notes,
        // A test workspace must not point at a shipment belonging to the
        // seeded source organization.
        convertedShipmentId: null,
        assigneeId: null,
        orgId: organization.id,
      }).returning({ id: rfqsTable.id });
      if (copy) rfqIdMap.set(rfq.id, copy.id);
    }

    const sourceQuotes = await tx.select().from(rfqQuotesTable).where(eq(rfqQuotesTable.orgId, sourceOrgId));
    for (const quote of sourceQuotes) {
      const rfqId = rfqIdMap.get(quote.rfqId);
      if (!rfqId) continue;
      await tx.insert(rfqQuotesTable).values({
        rfqId,
        supplierId: quote.supplierId === null ? null : supplierIdMap.get(quote.supplierId) ?? null,
        factoryName: quote.factoryName,
        country: quote.country,
        unitPriceUsd: quote.unitPriceUsd,
        leadTimeDays: quote.leadTimeDays,
        moq: quote.moq,
        notes: quote.notes,
        status: quote.status,
        sortOrder: quote.sortOrder,
        orgId: organization.id,
      });
    }

    return organization;
  });
}

export const TEST_BUYER_SESSION_MAX_AGE_SECONDS = TEST_SESSION_MAX_AGE_SECONDS;