export interface GmailProfile {
  emailAddress?: string;
}

/**
 * Return the mailbox identity provided by Gmail's authenticated profile API.
 * A missing value is an integration error, never a mailbox we should save.
 */
export function getGmailProfileAddress(profile: GmailProfile): string | null {
  const address = profile.emailAddress?.trim();
  return address || null;
}