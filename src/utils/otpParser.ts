/**
 * OTP / Verification Code Parser for Real & Ingested Gmail Messages
 * Accurately extracts one-time passcodes, verification tokens, alphanumeric PINs,
 * and magic sign-in links from real email subject lines, body content, MIME parts, and HTML.
 *
 * Supports:
 * - 4-digit, 5-digit, 6-digit, 7-digit, and 8-digit codes
 * - Formats like "Your verification code is 123456", "Your code: 123456", "Verification code: 123456"
 *   "Use 123456 to verify", "OTP 123456", "Code 123456", "123456 is your verification code"
 * - Codes in HTML buttons, tables, styled containers, and delimited text
 * - Punctuation (>>> 123456 <<<, **123456**, [123456], 123-456, 123 456)
 * - Safe filtering of unrelated numbers (order IDs, phone numbers, prices, timestamps, years)
 */

import { decodeHtmlEntities, extractTextFromHtml } from '../services/mimeDecoder';

export interface ParsedOtpResult {
  code: string;
  rawCode?: string;
  confidence: 'high' | 'medium' | 'low';
  contextSnippet?: string;
  patternMatched: string;
  reason: string;
  magicLink?: string;
  isAlphanumeric?: boolean;
  digitLength?: number;
}

/**
 * Normalizes a raw matched OTP code (removes spaces, hyphens, prefixes like G-, and enclosing punctuation).
 */
export function normalizeOtpCode(raw: string): { clean: string; isAlphanumeric: boolean; length: number } {
  if (!raw) return { clean: '', isAlphanumeric: false, length: 0 };

  let trimmed = raw.trim();

  // Strip enclosing quotes, brackets, asterisks, HTML residue
  trimmed = trimmed.replace(/^["'\[\(\*\>\#]+|["'\]\)\*\<\#\.\,\;\:]+$/g, '').trim();

  // Strip service prefixes like "G-", "MS-", "FB-", "TW-" if followed by digits
  const prefixMatch = trimmed.match(/^(?:G|MS|FB|TW|IG|VK|UBER|DISCORD|GITHUB|AWS)[-_\s]?([0-9]{4,8})$/i);
  if (prefixMatch && prefixMatch[1]) {
    return { clean: prefixMatch[1], isAlphanumeric: false, length: prefixMatch[1].length };
  }

  // Remove interior spaces, dashes, or dots between digits (e.g. "849 201" -> "849201", "123-456" -> "123456")
  const digitsOnlyMatch = trimmed.replace(/[\s\-_.]/g, '');
  if (/^[0-9]{4,8}$/.test(digitsOnlyMatch)) {
    return { clean: digitsOnlyMatch, isAlphanumeric: false, length: digitsOnlyMatch.length };
  }

  // Alphanumeric security codes (e.g. "K9X2B4", "A8F9-2K")
  const alphanumericClean = trimmed.replace(/[\s\-_]/g, '');
  if (/^[A-Za-z0-9]{4,8}$/.test(alphanumericClean)) {
    const hasDigits = /[0-9]/.test(alphanumericClean);
    const hasLetters = /[A-Za-z]/.test(alphanumericClean);
    return {
      clean: alphanumericClean.toUpperCase(),
      isAlphanumeric: hasDigits && hasLetters,
      length: alphanumericClean.length,
    };
  }

  return { clean: trimmed, isAlphanumeric: /[A-Za-z]/.test(trimmed), length: trimmed.length };
}

/**
 * Extracts verification / confirmation magic links from text & HTML.
 */
export function extractVerificationLink(bodyText: string = '', bodyHtml: string = ''): string | null {
  const combined = `${bodyText} ${bodyHtml}`;
  const urlRegex = /(https?:\/\/[^\s"'>]+(?:verify|verification|confirm|confirmation|activate|activation|auth|magic-link|token=|login\?|signin\?|otp=)[^\s"'>]*)/i;
  const match = combined.match(urlRegex);
  if (match && match[1]) {
    return decodeHtmlEntities(match[1].replace(/[.,;:)]+$/, ''));
  }
  return null;
}

/**
 * Checks if a candidate code is likely an unrelated number (e.g., year, price, phone, order).
 */
function isUnrelatedNumber(candidate: string, fullContext: string, matchIndex: number): boolean {
  // If not pure digits, not a simple year/order
  if (!/^[0-9]+$/.test(candidate)) return false;

  const len = candidate.length;

  // 1. Check if candidate is a 4-digit year (1970-2035) without explicit verification prefix
  if (len === 4 && (candidate.startsWith('19') || candidate.startsWith('20'))) {
    const yearVal = parseInt(candidate, 10);
    if (yearVal >= 1970 && yearVal <= 2035) {
      // Look immediately before the year
      const beforeWindow = fullContext.slice(Math.max(0, matchIndex - 30), matchIndex).toLowerCase();
      if (!/(code|otp|pin|passcode|is:?|#)\s*$/i.test(beforeWindow)) {
        return true; // Unrelated year
      }
    }
  }

  // 2. Check surrounding context for order / invoice / tracking / price indicators
  const contextSnippet = fullContext.slice(Math.max(0, matchIndex - 40), Math.min(fullContext.length, matchIndex + candidate.length + 40)).toLowerCase();

  // Price or Currency
  if (/(\$|€|£|¥|usd|eur|gbp|aud|cad|inr)\s*[0-9]/.test(contextSnippet) || /[0-9]\s*(usd|eur|gbp|aud|cad|inr)/.test(contextSnippet)) {
    const priceRegex = new RegExp(`[\\$€£¥]\\s*${candidate}|${candidate}\\s*(?:usd|eur|gbp|aud|cad|inr)`, 'i');
    if (priceRegex.test(contextSnippet)) return true;
  }

  // Order / Invoice / Tracking number
  const orderRegex = new RegExp(`(?:order|invoice|tracking|shipment|po|account|receipt|ticket)\\s*(?:#|no\\.?|number|id)?\\s*[:#-]?\\s*${candidate}`, 'i');
  if (orderRegex.test(contextSnippet)) return true;

  // Phone number context (e.g., "+1 800", "tel:", "call")
  const phoneRegex = new RegExp(`(?:tel|phone|call|fax|mobile)\\s*[:#-]?\\s*[\\+]?[0-9\\-\\s()]*${candidate}`, 'i');
  if (phoneRegex.test(contextSnippet)) return true;

  // Postal / ZIP code context
  const zipRegex = new RegExp(`(?:zip|postal)\\s*(?:code)?\\s*[:#-]?\\s*${candidate}`, 'i');
  if (zipRegex.test(contextSnippet)) return true;

  return false;
}

/**
 * Extracts a representative context snippet around a match.
 */
function getContextSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

/**
 * Primary OTP & Verification Code Extractor.
 * Inspects Subject, Plain-Text, and HTML bodies across multiple passes.
 */
export function extractOtpFromMessage(
  subject: string = '',
  bodyText: string = '',
  bodyHtml: string = ''
): ParsedOtpResult | null {
  // Preprocess text & HTML
  const decodedSubject = decodeHtmlEntities(subject || '');
  const decodedBodyText = decodeHtmlEntities(bodyText || '');
  const extractedHtmlText = extractTextFromHtml(bodyHtml || '');

  // Combined searchable text
  const combined = `${decodedSubject}\n\n${decodedBodyText}\n\n${extractedHtmlText}`.trim();
  if (!combined) return null;

  const magicLink = extractVerificationLink(bodyText, bodyHtml) || undefined;

  // Check overall verification context
  const authKeywords = [
    'verify',
    'verification',
    'code',
    'passcode',
    'pin',
    'otp',
    'one-time',
    '2fa',
    'two-factor',
    'security code',
    'login code',
    'sign-in code',
    'confirm',
    'confirmation',
    'authenticate',
    'authentication',
    'access code',
  ];
  const lowerCombined = combined.toLowerCase();
  const hasAuthKeywords = authKeywords.some((k) => lowerCombined.includes(k));

  // ================= PASS 1: EXPLICIT HIGH-CONFIDENCE KEYWORD PATTERNS =================
  // Matches explicit formats like:
  // "Your verification code is 123456", "Your code: 123456", "Verification code: 123456"
  // "Use 123456 to verify", "OTP 123456", "Code 123456", "123456 is your verification code"
  const highConfidencePatterns: { regex: RegExp; label: string; group?: number }[] = [
    // 1. Prefix: "G-123456" or "MS-123456"
    {
      regex: /\b([A-Z]{1,4}-[0-9]{4,8})\b/i,
      label: 'service_prefixed_code',
    },
    // 2. "Your verification code is 123456" / "Your verification code: 123456" / "Your security code is 123456"
    {
      regex: /(?:your\s+)?(?:verification|security|confirmation|login|sign-in|one-time|access|identity)\s+(?:passcode|code|pin|password|token|otp)\s*(?:is|:)?\s*[:\s#*>\-\[\]]*([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\b/i,
      label: 'your_verification_code_is',
    },
    // 3. "Your code: 123456" / "Your code is 123456" / "Your code is: 123456"
    {
      regex: /(?:your\s+code)\s*(?:is|:)?\s*[:\s#*>\-\[\]]*([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\b/i,
      label: 'your_code_colon',
    },
    // 4. "Verification code: 123456" / "Verification code 123456"
    {
      regex: /(?:verification\s+code)\s*(?:is|:)?\s*[:\s#*>\-\[\]]*([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\b/i,
      label: 'verification_code_colon',
    },
    // 5. "Use 123456 to verify" / "Enter 123456 to log in" / "Use 123456 to confirm"
    {
      regex: /(?:use|enter|type|input)\s+([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\s+(?:to\s+verify|to\s+confirm|to\s+log\s*in|to\s+sign\s*in|to\s+authenticate|to\s+complete|as\s+your)/i,
      label: 'use_code_to_verify',
    },
    // 6. "OTP: 123456" / "OTP 123456" / "OTP is: 123456" / "2FA Code: 123456"
    {
      regex: /\b(?:OTP|2FA|Passcode)\s*(?:is|:)?\s*[:\s#*>\-\[\]]*([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\b/i,
      label: 'otp_prefix_code',
    },
    // 7. "Code 123456" / "Code: 123456" / "Code - 123456"
    {
      regex: /\b(?:code|pin)\s*[:#-]\s*([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\b/i,
      label: 'code_colon_number',
    },
    // 8. "123456 is your verification code" / "123456 is your code" / "123456 is your security pin"
    {
      regex: /\b([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})\s+(?:is\s+your|is\s+the)\s+(?:verification|security|confirmation|login|sign-in|one-time|passcode|code|pin|otp)\b/i,
      label: 'code_is_your_verification_code',
    },
    // 9. Delimited code blocks: ">>> 123456 <<<" or "**123456**" or "[ 123456 ]"
    {
      regex: /(?:>>>|\*{2,}|\[)\s*([0-9]{4,8}|[A-Za-z0-9]{5,8})\s*(?:<<<|\*{2,}|\])/i,
      label: 'delimited_code_block',
    },
  ];

  for (const item of highConfidencePatterns) {
    const match = combined.match(item.regex);
    if (match && match[1]) {
      const raw = match[1].trim();
      const matchPos = match.index ?? 0;

      // Skip unrelated numbers (e.g. order, phone, price)
      if (isUnrelatedNumber(raw.replace(/[\s\-_.]/g, ''), combined, matchPos)) {
        continue;
      }

      const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);
      if (length >= 4 && length <= 8) {
        return {
          code: clean,
          rawCode: raw,
          confidence: 'high',
          patternMatched: item.label,
          reason: `Matched high-confidence verification pattern: "${item.label}"`,
          contextSnippet: getContextSnippet(combined, matchPos, match[0].length),
          magicLink,
          isAlphanumeric,
          digitLength: length,
        };
      }
    }
  }

  // ================= PASS 2: SUBJECT LINE CODE EXTRACTION =================
  const subjectPatterns = [
    /\b([0-9]{4,8})\b(?:\s+is\s+your|\s+is\s+the\s+code)/i,
    /(?:code|otp|pin|passcode)\s*[:#-]?\s*([0-9]{4,8})\b/i,
    /^\s*\[?([0-9]{4,8})\]?\s*[-:]/i,
    /\b([0-9]{3}[-\s][0-9]{3})\b/,
  ];

  for (const regex of subjectPatterns) {
    const match = decodedSubject.match(regex);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (isUnrelatedNumber(raw.replace(/[\s\-_.]/g, ''), decodedSubject, match.index ?? 0)) {
        continue;
      }
      const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);
      if (length >= 4 && length <= 8) {
        return {
          code: clean,
          rawCode: raw,
          confidence: 'high',
          patternMatched: 'subject_header_pattern',
          reason: 'Extracted directly from subject line pattern',
          contextSnippet: decodedSubject,
          magicLink,
          isAlphanumeric,
          digitLength: length,
        };
      }
    }
  }

  // ================= PASS 3: HTML ISOLATED CODE BLOCKS & BUTTONS =================
  if (bodyHtml) {
    // 1. Button or anchor verification code: <button ...> 123456 </button>
    const buttonRegex = /<(?:button|a)[^>]*>\s*([0-9]{4,8}|[A-Za-z0-9]{5,8})\s*<\/(?:button|a)>/gi;
    let btnMatch;
    while ((btnMatch = buttonRegex.exec(bodyHtml)) !== null) {
      if (btnMatch[1] && hasAuthKeywords) {
        const raw = btnMatch[1].trim();
        const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);
        if (length >= 4 && length <= 8 && !isUnrelatedNumber(clean, bodyHtml, btnMatch.index)) {
          return {
            code: clean,
            rawCode: raw,
            confidence: 'high',
            patternMatched: 'html_button_code',
            reason: 'Extracted from HTML verification button/link element',
            contextSnippet: `Button element: "${raw}"`,
            magicLink,
            isAlphanumeric,
            digitLength: length,
          };
        }
      }
    }

    // 2. Styled container with class containing code, otp, token, pin, or highlight
    const styledContainerRegex = /<(?:div|span|strong|b|h1|h2|h3|td|code|pre)[^>]*(?:class|id)="[^"]*(?:code|otp|token|pin|highlight|verify|passcode)[^"]*"[^>]*>\s*([0-9]{4,8}|[A-Za-z0-9]{5,8})\s*<\//gi;
    let styledMatch;
    while ((styledMatch = styledContainerRegex.exec(bodyHtml)) !== null) {
      if (styledMatch[1]) {
        const raw = styledMatch[1].trim();
        const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);
        if (length >= 4 && length <= 8 && !isUnrelatedNumber(clean, bodyHtml, styledMatch.index)) {
          return {
            code: clean,
            rawCode: raw,
            confidence: 'high',
            patternMatched: 'html_styled_otp_container',
            reason: 'Extracted from HTML container specifically styled for verification codes',
            contextSnippet: `HTML container: "${raw}"`,
            magicLink,
            isAlphanumeric,
            digitLength: length,
          };
        }
      }
    }
    // 3. Any HTML element purely enclosing a 4-8 digit code when auth context is present
    const enclosedHtmlRegex = /<(?:td|span|p|div|b|strong|h[1-6]|font|code|pre)[^>]*>\s*([0-9]{4,8})\s*<\/(?:td|span|p|div|b|strong|h[1-6]|font|code|pre)>/gi;
    let encMatch;
    while ((encMatch = enclosedHtmlRegex.exec(bodyHtml)) !== null) {
      if (encMatch[1] && hasAuthKeywords) {
        const raw = encMatch[1].trim();
        const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);
        if (length >= 4 && length <= 8 && !isUnrelatedNumber(clean, bodyHtml, encMatch.index)) {
          return {
            code: clean,
            rawCode: raw,
            confidence: 'high',
            patternMatched: 'html_enclosed_otp_element',
            reason: 'Extracted from isolated HTML element (table cell, span, or block) within verification email',
            contextSnippet: `Enclosed HTML element: "${raw}"`,
            magicLink,
            isAlphanumeric,
            digitLength: length,
          };
        }
      }
    }
  }

  // ================= PASS 4: ISOLATED LINE CODE WITHIN AUTH CONTEXT =================
  // If the email has auth keywords (e.g. "verification", "log in", "confirm"),
  // look for isolated lines that contain only a 4-8 digit number
  if (hasAuthKeywords) {
    const lines = combined.split('\n');
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim();
      if (!line) continue;

      // Matches isolated line like "739281" or ">>> 739281 <<<" or "739-281" or "[ 739281 ]"
      const isolatedMatch = line.match(/^[\s*>#\[\(-]*([0-9]{3,4}[\s\-_.]?[0-9]{3,4}|[0-9]{4,8})[\s*<#\]\)-]*$/);
      if (isolatedMatch && isolatedMatch[1]) {
        const raw = isolatedMatch[1];
        const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);

        // Check if unrelated (e.g. year, order number)
        if (isUnrelatedNumber(clean, combined, combined.indexOf(line))) {
          continue;
        }

        if (length >= 4 && length <= 8) {
          return {
            code: clean,
            rawCode: raw,
            confidence: 'high',
            patternMatched: 'isolated_line_with_auth_context',
            reason: `Extracted from isolated line "${line}" surrounded by verification context`,
            contextSnippet: `Line: "${line}" in auth context`,
            magicLink,
            isAlphanumeric,
            digitLength: length,
          };
        }
      }
    }
  }

  // ================= PASS 5: GENERIC 4-8 DIGIT NUMBER NEAR AUTH KEYWORDS =================
  // If email clearly has auth keywords, find numbers in proximity to words like "code", "otp", "passcode"
  if (hasAuthKeywords) {
    const proximityRegex = /(?:code|otp|passcode|pin|verification)\b[^\n\r]{0,35}\b([0-9]{4,8})\b/gi;
    let proxMatch;
    while ((proxMatch = proximityRegex.exec(combined)) !== null) {
      if (proxMatch[1]) {
        const raw = proxMatch[1];
        if (!isUnrelatedNumber(raw, combined, proxMatch.index)) {
          const { clean, isAlphanumeric, length } = normalizeOtpCode(raw);
          if (length >= 4 && length <= 8) {
            return {
              code: clean,
              rawCode: raw,
              confidence: 'medium',
              patternMatched: 'proximity_keyword_number',
              reason: 'Found 4-8 digit number in close proximity to verification keyword',
              contextSnippet: getContextSnippet(combined, proxMatch.index, proxMatch[0].length),
              magicLink,
              isAlphanumeric,
              digitLength: length,
            };
          }
        }
      }
    }
  }

  // ================= PASS 6: MAGIC LINK FALLBACK =================
  if (magicLink) {
    return {
      code: 'MAGIC_LINK',
      confidence: 'medium',
      patternMatched: 'verification_magic_link',
      reason: 'No numeric passcode found, but detected authentic verification magic link',
      contextSnippet: `Verification link: ${magicLink}`,
      magicLink,
      isAlphanumeric: false,
    };
  }

  // No code found
  return null;
}
