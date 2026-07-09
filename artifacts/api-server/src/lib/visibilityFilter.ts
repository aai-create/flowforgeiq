import { db, organizationsTable } from "@workspace/db";
import { eq, type SQL } from "drizzle-orm";
import type { Column } from "drizzle-orm";

export async function resolveVisibilityMode(orgId: number): Promise<string> {
  const [org] = await db
    .select({ visibilityMode: organizationsTable.visibilityMode })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));
  return org?.visibilityMode ?? "shared";
}

export function visibilityCondition(
  assigneeIdColumn: Column,
  userId: string | undefined,
  role: string | undefined,
  visibilityMode: string,
): SQL | undefined {
  if (visibilityMode === "private" && role !== "manager" && role !== "admin" && userId) {
    return eq(assigneeIdColumn, userId);
  }
  return undefined;
}
