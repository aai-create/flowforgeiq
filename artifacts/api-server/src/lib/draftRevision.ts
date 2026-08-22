import { createHash } from "node:crypto";

/**
 * A content-derived revision is stable across retries and does not require a
 * schema change. The proposal id is included so identical bodies on different
 * proposals never share an approval identity.
 */
export function draftRevision(proposalId: number, draftBody: string): string {
  return createHash("sha256")
    .update(`${proposalId}:${draftBody}`, "utf8")
    .digest("hex");
}