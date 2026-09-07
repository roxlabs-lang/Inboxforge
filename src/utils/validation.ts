/**
 * Gmail validation and parsing utilities
 */

export interface GmailValidationResult {
  isValid: boolean;
  error?: string;
  baseEmail?: string;
  username?: string;
  domain?: string;
}

export function validateGmailAddress(rawInput: string): GmailValidationResult {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Email address cannot be empty.' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: 'Email must contain exactly one "@" symbol (e.g. yourname@gmail.com).',
    };
  }

  const [rawUsername, rawDomain] = parts;
  const username = rawUsername.trim();
  const domain = rawDomain.trim().toLowerCase();

  if (!username) {
    return { isValid: false, error: 'Username before "@" cannot be empty.' };
  }

  if (domain !== 'gmail.com' && domain !== 'googlemail.com') {
    return {
      isValid: false,
      error: 'Domain must be "gmail.com" or "googlemail.com".',
    };
  }

  // Remove existing dots to get base canonical username
  const cleanUsername = username.replace(/\./g, '').toLowerCase();

  // Basic character validity check
  if (!/^[a-z0-9]+$/i.test(cleanUsername)) {
    return {
      isValid: false,
      error: 'Gmail username should contain only English letters and numbers.',
    };
  }

  if (cleanUsername.length < 1) {
    return {
      isValid: false,
      error: 'Username must contain at least 1 alphanumeric character.',
    };
  }

  const normalizedDomain = domain === 'googlemail.com' ? 'googlemail.com' : 'gmail.com';
  const baseEmail = `${cleanUsername}@${normalizedDomain}`;

  return {
    isValid: true,
    baseEmail,
    username: cleanUsername,
    domain: normalizedDomain,
  };
}
