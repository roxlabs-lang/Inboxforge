/**
 * Robust MIME & HTML Decoding Pipeline for Gmail Real Mailbox Ingestion
 * Handles base64, base64url, quoted-printable encoding, nested multipart hierarchies,
 * HTML entity decoding (numeric & named), and structural HTML-to-text extraction.
 */

import { MockEmailAttachment, MimePartSummary } from '../types';

/**
 * Decodes Gmail API base64url encoded data into UTF-8 text.
 */
export function decodeBase64Url(str: string): string {
  if (!str) return '';
  try {
    // Standardize base64url to standard base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
    } catch {
      return '';
    }
  }
}

/**
 * Decodes standard Quoted-Printable MIME encoding.
 * Handles soft line breaks (=\r\n), hex encoded bytes (=XX), and multi-byte UTF-8 sequences.
 */
export function decodeQuotedPrintable(input: string): string {
  if (!input) return '';

  // 1. Remove soft line breaks (e.g. "= \r\n" or "=\r\n" or "=\n")
  let clean = input.replace(/=\r?\n/g, '');

  // 2. Decode hex byte sequences (=XX) using byte stream to preserve multi-byte UTF-8 characters
  const bytes: number[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === '=' && i + 2 < clean.length) {
      const hex = clean.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    // Regular character
    const code = clean.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else {
      // Encode standard UTF-8 string character
      const encoded = new TextEncoder().encode(clean[i]);
      for (const b of encoded) bytes.push(b);
    }
    i++;
  }

  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    // Fallback regex replacement
    return clean.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
}

/**
 * Decodes all HTML entities including:
 * - Numeric decimal entities (&#39;, &#160;)
 * - Numeric hex entities (&#x27;, &#x2F;)
 * - Standard and extended named entities (&quot;, &amp;, &lt;, &gt;, &nbsp;)
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  return text
    // Numeric decimal entities: &#39;
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
      } catch {
        return '';
      }
    })
    // Numeric hex entities: &#x27; or &#x3D;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
      } catch {
        return '';
      }
    })
    // Named entities
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&bull;/gi, '•')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…');
}

/**
 * Converts rich HTML email bodies into clean, structural plain text.
 * Preserves button text, table cells, headers, and paragraph breaks as distinct lines
 * so that isolated OTP verification codes are not lost or concatenated with adjacent text.
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return '';

  let processed = html
    // 1. Remove style and script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // 2. Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // 3. Convert breaks and block endings to newlines to preserve token boundaries
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    // 4. Convert buttons and links to isolated lines
    .replace(/<(button|a)[^>]*>/gi, '\n')
    .replace(/<\/(button|a)>/gi, '\n')
    // 5. Convert table cells to spaced tokens
    .replace(/<\/td>/gi, ' \n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    // 6. Strip all remaining HTML tags
    .replace(/<[^>]+>/g, ' ');

  // 7. Decode HTML entities
  processed = decodeHtmlEntities(processed);

  // 8. Normalize spacing: collapse horizontal spaces without destroying linebreaks
  return processed
    .split('\n')
    .map((line) => line.replace(/[ \t\r\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Result of comprehensive MIME structure parsing.
 */
export interface ParsedMimeResult {
  bodyText: string;
  bodyHtml: string;
  attachments: MockEmailAttachment[];
  detectedBodyType: string;
  mimeStructure: MimePartSummary[];
}

/**
 * Traverses Gmail message payload recursively and extracts bodyText, bodyHtml, attachments,
 * and builds a comprehensive MIME structure tree for debug inspection.
 */
export function parseGmailMessagePayload(payload: any): ParsedMimeResult {
  let bodyText = '';
  let bodyHtml = '';
  const attachments: MockEmailAttachment[] = [];
  const mimeStructure: MimePartSummary[] = [];

  const detectedBodyType = payload?.mimeType || 'text/plain';

  function traversePart(part: any, targetStructureList: MimePartSummary[]) {
    if (!part) return;

    const mimeType = (part.mimeType || '').toLowerCase();
    const headersList: { name: string; value: string }[] = part.headers || [];
    const headersMap: Record<string, string> = {};
    for (const h of headersList) {
      headersMap[h.name.toLowerCase()] = h.value;
    }

    const encoding = (headersMap['content-transfer-encoding'] || '').toLowerCase();
    const hasData = Boolean(part.body && part.body.data);
    const subStructure: MimePartSummary[] = [];

    const partSummary: MimePartSummary = {
      partId: part.partId || '0',
      mimeType: part.mimeType || 'unknown',
      filename: part.filename || undefined,
      size: part.body?.size || 0,
      encoding: encoding || undefined,
      hasData,
      subParts: subStructure,
    };
    targetStructureList.push(partSummary);

    // Extract attachment if filename is present
    if (part.filename && part.body) {
      attachments.push({
        id: part.body.attachmentId || part.partId || `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: part.filename,
        size: part.body.size || 0,
        type: part.mimeType || 'application/octet-stream',
      });
    }

    // Decode body data if present
    if (hasData && part.body.data) {
      let decoded = decodeBase64Url(part.body.data);
      if (encoding.includes('quoted-printable') || decoded.includes('=\r') || decoded.includes('=\n')) {
        decoded = decodeQuotedPrintable(decoded);
      }

      if (mimeType.startsWith('text/plain')) {
        bodyText += (bodyText ? '\n\n' : '') + decoded;
      } else if (mimeType.startsWith('text/html')) {
        bodyHtml += (bodyHtml ? '\n\n' : '') + decoded;
      }
    }

    // Recursively handle nested parts (e.g. multipart/alternative, multipart/mixed, multipart/related)
    if (part.parts && Array.isArray(part.parts)) {
      for (const childPart of part.parts) {
        traversePart(childPart, subStructure);
      }
    }
  }

  traversePart(payload, mimeStructure);

  // If plain text is empty but HTML is available, extract structural plain text from HTML
  if (!bodyText.trim() && bodyHtml.trim()) {
    bodyText = extractTextFromHtml(bodyHtml);
  }

  return {
    bodyText: bodyText.trim(),
    bodyHtml: bodyHtml.trim(),
    attachments,
    detectedBodyType,
    mimeStructure,
  };
}
