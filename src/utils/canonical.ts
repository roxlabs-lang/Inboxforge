/**
 * Gmail Canonical Address Normalizer and Identity Semantics Utilities
 *
 * Implements Google's exact email routing semantics:
 * 1. Dots in username are ignored for Gmail and Googlemail addresses.
 * 2. Plus signs '+' denote sub-addressing / tags and are stripped for canonical base mailbox mapping.
 * 3. Domain is lowercased and 'googlemail.com' is normalized to 'gmail.com'.
 */

export interface NormalizedEmailInfo {
  originalInput: string;
  displayAddress: string;
  canonicalAddress: string;
  cleanUsername: string;
  domain: string;
  dotCount: number;
  gapCount: number;
  totalCombinations: bigint;
  isGmail: boolean;
}

/**
 * Normalizes any email address into its canonical root mailbox.
 * E.g. 'the.go.at.e.d.c.re.a.t.o.r.6.9+subtag@googlemail.com' -> 'thegoatedcreator69@gmail.com'
 */
export function normalizeCanonicalGmailAddress(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) return trimmed;

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  // Normalize googlemail.com to gmail.com
  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  // If gmail.com, apply Gmail-specific dot and plus normalization
  if (domain === 'gmail.com') {
    // Remove plus tag
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
    // Remove all dots
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}

/**
 * Parses and returns comprehensive metadata about a synthetic identity and its canonical mailbox.
 */
export function analyzeEmailIdentity(email: string): NormalizedEmailInfo {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  const local = atIndex !== -1 ? trimmed.slice(0, atIndex) : trimmed;
  let domain = atIndex !== -1 ? trimmed.slice(atIndex + 1) : 'gmail.com';

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  const isGmail = domain === 'gmail.com';
  const cleanUsername = isGmail ? local.replace(/\./g, '').split('+')[0] : local;
  const canonicalAddress = isGmail ? `${cleanUsername}@gmail.com` : trimmed;
  const dotCount = (local.match(/\./g) || []).length;
  const gapCount = Math.max(0, cleanUsername.length - 1);
  const totalCombinations = gapCount > 0 ? 1n << BigInt(gapCount) : 1n;

  return {
    originalInput: email,
    displayAddress: trimmed,
    canonicalAddress,
    cleanUsername,
    domain,
    dotCount,
    gapCount,
    totalCombinations,
    isGmail,
  };
}
