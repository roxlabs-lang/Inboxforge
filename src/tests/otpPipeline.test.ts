/**
 * Automated Test Suite for Real Gmail OTP Receiving Pipeline
 * Validates all 11 required scenarios:
 * 1. Plain text OTP
 * 2. HTML OTP
 * 3. Multipart OTP
 * 4. OTP inside a button
 * 5. OTP surrounded by HTML
 * 6. Encoded HTML
 * 7. OTP with punctuation
 * 8. OTP with line breaks
 * 9. OTP with different digit lengths (4, 5, 6, 7, 8 digits)
 * 10. Email without OTP
 * 11. Email containing unrelated numbers (orders, phones, years, currency, postal codes)
 */

import { extractOtpFromMessage, ParsedOtpResult } from '../utils/otpParser';

export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expected: string | null;
  actual: string | null;
  details: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
}

export const TEST_FIXTURES = [
  {
    id: 'case_1_plain_text',
    name: 'Plain Text OTP',
    description: 'Direct verification sentence in standard plain text email',
    subject: 'Your verification code',
    bodyText: 'Hello! Your verification code is 123456. It expires in 10 minutes.',
    bodyHtml: '',
    expectedCode: '123456',
  },
  {
    id: 'case_2_html_otp',
    name: 'HTML OTP',
    description: 'Formatted verification code in rich HTML tags with styling',
    subject: 'Verify your email address',
    bodyText: '',
    bodyHtml: '<p>Please use the following verification code:</p><p style="font-size: 24px; font-weight: bold; color: #333;">654321</p><p>Valid for 5 minutes.</p>',
    expectedCode: '654321',
  },
  {
    id: 'case_3_multipart_otp',
    name: 'Multipart OTP',
    description: 'Both text/plain and text/html alternative payloads present',
    subject: 'Your Security Code',
    bodyText: 'Your security code is 789012. Do not share this with anyone.',
    bodyHtml: '<div style="font-family: sans-serif;"><p>Your security code is <strong>789012</strong></p></div>',
    expectedCode: '789012',
  },
  {
    id: 'case_4_button_otp',
    name: 'OTP Inside a Button',
    description: 'Verification code rendered inside an HTML button element',
    subject: 'Your one-time login code',
    bodyText: '',
    bodyHtml: '<div class="container"><p>Click or copy your verification code below:</p><button class="btn btn-primary" style="font-size:20px;">987654</button><p>If you did not request this, ignore this email.</p></div>',
    expectedCode: '987654',
  },
  {
    id: 'case_5_surrounded_html',
    name: 'OTP Surrounded by HTML',
    description: 'Code nested inside nested table cells and spans with whitespace',
    subject: 'Account Verification',
    bodyText: '',
    bodyHtml: '<table cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#f4f4f4; padding: 20px;"><span style="letter-spacing:4px; font-size:28px;"> 849201 </span></td></tr></table>',
    expectedCode: '849201',
  },
  {
    id: 'case_6_encoded_html',
    name: 'Encoded HTML & Entities',
    description: 'HTML containing numeric &amp; hex entities (&#39;, &quot;, &lt;)',
    subject: 'Confirmation Code',
    bodyText: '',
    bodyHtml: '&lt;div class=&quot;code-box&quot;&gt;Your code: &lt;strong&gt;739281&lt;/strong&gt;&lt;/div&gt; &amp; it&#39;s valid for 5 minutes.',
    expectedCode: '739281',
  },
  {
    id: 'case_7_punctuation',
    name: 'OTP With Punctuation',
    description: 'Code enclosed in brackets, delimiters, or stars (>>> 482910 <<<)',
    subject: 'Security Alert: Sign-in request',
    bodyText: 'Use the following one-time code to complete sign-in: >>> 482910 <<<',
    bodyHtml: '',
    expectedCode: '482910',
  },
  {
    id: 'case_8_line_breaks',
    name: 'OTP With Line Breaks',
    description: 'Verification code placed on a new isolated line after header',
    subject: 'Sign in to your account',
    bodyText: 'Your verification code is:\n\n   582910\n\nDo not share this code with anyone.',
    bodyHtml: '',
    expectedCode: '582910',
  },
  {
    id: 'case_9a_length_4',
    name: 'Digit Length: 4 Digits',
    description: 'Verification code with 4 digits',
    subject: 'Authentication PIN',
    bodyText: 'Your code: 4920',
    bodyHtml: '',
    expectedCode: '4920',
  },
  {
    id: 'case_9b_length_5',
    name: 'Digit Length: 5 Digits',
    description: 'Verification code with 5 digits',
    subject: 'Passcode',
    bodyText: 'Verification code: 58291',
    bodyHtml: '',
    expectedCode: '58291',
  },
  {
    id: 'case_9c_length_7',
    name: 'Digit Length: 7 Digits',
    description: 'Verification code with 7 digits',
    subject: 'Two-Factor Passcode',
    bodyText: 'Your security code is 7492810 to verify your identity.',
    bodyHtml: '',
    expectedCode: '7492810',
  },
  {
    id: 'case_9d_length_8',
    name: 'Digit Length: 8 Digits',
    description: 'Verification code with 8 digits',
    subject: 'Access Token',
    bodyText: 'Use 84920183 to verify your account login.',
    bodyHtml: '',
    expectedCode: '84920183',
  },
  {
    id: 'case_10_no_otp',
    name: 'Email Without OTP',
    description: 'Regular marketing newsletter or announcement with no OTP',
    subject: 'Weekly Newsletter from Tech Digest',
    bodyText: 'Welcome to our weekly newsletter! Here are the top stories of the week in artificial intelligence and cloud computing. Have a great weekend!',
    bodyHtml: '<h1>Weekly Digest</h1><p>Enjoy reading our top articles.</p>',
    expectedCode: null, // Should return null, never invent a code
  },
  {
    id: 'case_11_unrelated_numbers',
    name: 'Email With Unrelated Numbers',
    description: 'Order numbers, tracking IDs, phone numbers, prices, and years (no false positives)',
    subject: 'Your Order #98765432 has shipped!',
    bodyText: 'Hi John,\n\nYour order #98765432 placed on 2026-09-05 for $129.00 has shipped. Call customer support at +1-800-555-0199 or visit our office at 90210 Beverly Hills.\n\nCopyright 2026 Acme Corp.',
    bodyHtml: '<p>Order <b>#98765432</b> has shipped.</p><p>Total: $129.00</p><p>Phone: 1-800-555-0199</p>',
    expectedCode: null, // Strict anti-false-positive: unrelated numbers must NOT be treated as OTP
  },
];

/**
 * Runs the automated test suite and returns structured results.
 */
export function runOtpTestSuite(): TestSuiteSummary {
  const results: TestCaseResult[] = [];

  for (const fixture of TEST_FIXTURES) {
    const parsed: ParsedOtpResult | null = extractOtpFromMessage(
      fixture.subject,
      fixture.bodyText,
      fixture.bodyHtml
    );

    const actualCode = parsed?.code && parsed.code !== 'MAGIC_LINK' ? parsed.code : null;
    const passed = actualCode === fixture.expectedCode;

    results.push({
      id: fixture.id,
      name: fixture.name,
      description: fixture.description,
      passed,
      expected: fixture.expectedCode,
      actual: actualCode,
      details: parsed
        ? `Matched: ${parsed.patternMatched} (${parsed.confidence} confidence) - ${parsed.reason}`
        : 'No code detected',
    });
  }

  const passedCount = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}

// Standalone runner for node / tsx CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('otpPipeline.test')) {
  console.log('\n--- Running InboxForge Real Gmail OTP Pipeline Test Suite ---');
  const summary = runOtpTestSuite();
  for (const r of summary.results) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} [${r.name}] Expected: ${r.expected || '(None)'} | Actual: ${r.actual || '(None)'}`);
    if (!r.passed) {
      console.log(`   Details: ${r.details}`);
    }
  }
  console.log(`\nResults: ${summary.passed}/${summary.total} tests passed.\n`);
  if (summary.failed > 0) {
    process.exit(1);
  }
}
