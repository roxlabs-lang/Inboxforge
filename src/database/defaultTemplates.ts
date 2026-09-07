import { ProjectTemplate } from '../types';

export const BUILTIN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tmpl_ecommerce_suite',
    name: 'E-Commerce Checkout & Invoicing Suite',
    description: 'Comprehensive test workflow for cart checkout, order confirmation emails, and invoice reconciliation.',
    category: 'E-Commerce',
    isBuiltIn: true,
    tags: ['checkout', 'invoicing', 'orders', 'receipts'],
    createdAt: 1725100000000,
    updatedAt: 1725100000000,
    generationConfig: {
      username: 'shopper.qa',
      targetCount: 16,
      status: 'unused',
    },
    labels: [
      { name: 'VIP Buyer', color: '#8b5cf6', description: 'Simulated high-tier loyalty accounts' },
      { name: 'Tax Exempt', color: '#10b981', description: 'Business customer tax exemption' },
      { name: 'Fraud Check', color: '#f59e0b', description: 'High-risk checkout scenarios' },
    ],
    testCases: [
      {
        name: 'Order Confirmation Email Dispatch',
        description: 'Verify order receipt and invoice attachment is delivered to dot-variant identity.',
        expectedResult: 'HTTP 200 Order Placed and simulated confirmation email received in test inbox.',
      },
      {
        name: 'Dynamic Promo Code Application',
        description: 'Ensure 15% discount applies without corrupting cart subtotal or tax calculations.',
        expectedResult: 'Discount applied, total matches calculated amount, receipt reflects savings.',
      },
      {
        name: 'Payment Webhook Idempotency Check',
        description: 'Verify duplicate payment gateway webhooks do not double-bill or create duplicate orders.',
        expectedResult: 'Idempotency key acknowledged, single order record created.',
      },
    ],
    mockRequests: [
      {
        name: 'Create Cart & Checkout',
        method: 'POST',
        url: 'mock://ecommerce/cart/checkout',
        body: JSON.stringify({ items: [{ id: 'sku_101', qty: 2, price: 49.99 }], currency: 'USD' }, null, 2),
        expectedStatus: 201,
      },
      {
        name: 'Fetch Order Invoice',
        method: 'GET',
        url: 'mock://ecommerce/orders/ord_9941/invoice',
        body: '',
        expectedStatus: 200,
      },
    ],
    initialMockEmails: [
      {
        senderName: 'Acme Retail Store',
        senderEmail: 'orders@acmeretail.example.com',
        subject: 'Order Confirmation #84912 - Thank you for your purchase',
        bodyText: 'Hi there!\n\nYour order #84912 has been received and is being processed. Total: $99.98.\nYour receipt is attached below.\n\nThank you for choosing Acme Retail.',
        tags: ['Receipt', 'Order', 'E-Commerce'],
      },
    ],
    customInstructions: {
      namingConvention: 'buyer.{index}',
      mockLatencyMs: 80,
      mockFailureRate: 0,
      simulatedOtpLength: 6,
      defaultVariantStatus: 'unused',
      exportFormatTemplate: 'standard',
    },
  },
  {
    id: 'tmpl_saas_onboarding',
    name: 'SaaS Multi-Tenant Onboarding & Invites',
    description: 'Test invitation loops, magic links, team role permissions, and tenant isolation.',
    category: 'SaaS & Auth',
    isBuiltIn: true,
    tags: ['saas', 'onboarding', 'magic-link', 'tenancy', 'rbac'],
    createdAt: 1725100000000,
    updatedAt: 1725100000000,
    generationConfig: {
      username: 'team.member',
      targetCount: 16,
      status: 'unused',
    },
    labels: [
      { name: 'Org Admin', color: '#ef4444', description: 'Root tenant administrator' },
      { name: 'Invited Member', color: '#3b82f6', description: 'Pending onboarding invitation' },
      { name: 'Billing Contact', color: '#10b981', description: 'Financial delegate' },
    ],
    testCases: [
      {
        name: 'Workspace Invitation Magic Link Ingestion',
        description: 'Verify workspace invite email delivers with valid secure token.',
        expectedResult: 'Invite email received in inbox with valid clickable redemption token.',
      },
      {
        name: 'Role-Based Access Control (RBAC) Boundary',
        description: 'Confirm regular invited members cannot access billing or deletion endpoints.',
        expectedResult: 'HTTP 403 Forbidden returned on privileged endpoint calls.',
      },
      {
        name: 'Seat Allocation Limit Threshold',
        description: 'Attempt inviting 11th member when workspace cap is 10.',
        expectedResult: 'HTTP 422 Unprocessable Entity with upgrade prompt.',
      },
    ],
    mockRequests: [
      {
        name: 'Send Team Invitation',
        method: 'POST',
        url: 'mock://saas/teams/team_dev/invites',
        body: JSON.stringify({ role: 'member', expiresInHours: 48 }, null, 2),
        expectedStatus: 200,
      },
      {
        name: 'Accept Team Invite',
        method: 'POST',
        url: 'mock://saas/invites/inv_token_9831/accept',
        body: JSON.stringify({ acceptedAt: Date.now() }, null, 2),
        expectedStatus: 200,
      },
    ],
    initialMockEmails: [
      {
        senderName: 'Acme Cloud Platform',
        senderEmail: 'invites@cloud.example.com',
        subject: 'You have been invited to join Team Alpha on Acme Cloud',
        bodyText: 'Alex has invited you to collaborate on the Team Alpha project.\n\nClick the link below to accept your invitation:\nhttps://cloud.example.com/invite?token=sec_tok_991823\n\nThis link expires in 48 hours.',
        tags: ['Invite', 'Team', 'SaaS'],
      },
    ],
    customInstructions: {
      namingConvention: 'tenant.user.{index}',
      mockLatencyMs: 60,
      mockFailureRate: 0,
      simulatedOtpLength: 6,
      defaultVariantStatus: 'unused',
      exportFormatTemplate: 'standard',
    },
  },
  {
    id: 'tmpl_security_2fa',
    name: 'Security, SSO & 2FA Edge-Case Suite',
    description: 'Strict verification of OTP expiration, replay attacks, password resets, and session revocations.',
    category: 'Security & 2FA',
    isBuiltIn: true,
    tags: ['security', '2fa', 'otp', 'replay-attack', 'hardening'],
    createdAt: 1725100000000,
    updatedAt: 1725100000000,
    generationConfig: {
      username: 'sec.test',
      targetCount: 16,
      status: 'unused',
    },
    labels: [
      { name: '2FA Enforced', color: '#6366f1', description: 'Requires second factor verification' },
      { name: 'Locked Out', color: '#dc2626', description: 'Account locked due to consecutive bad attempts' },
      { name: 'Hardware Key', color: '#06b6d4', description: 'WebAuthn hardware security key user' },
    ],
    testCases: [
      {
        name: 'Simulated OTP Replay Attack Prevention',
        description: 'Attempt submitting an already verified OTP code a second time.',
        expectedResult: 'HTTP 400 Bad Request with code: OTP_ALREADY_USED.',
      },
      {
        name: 'Password Reset Token Expiration Window',
        description: 'Verify reset tokens become strictly invalid after 15 minutes.',
        expectedResult: 'Expired token rejected with status HTTP 401 Unauthorized.',
      },
      {
        name: 'Brute Force Throttling (Rate Limit 5 Attempts)',
        description: 'Trigger 6 consecutive invalid OTP attempts in under 60 seconds.',
        expectedResult: 'HTTP 429 Too Many Requests with Retry-After header.',
      },
    ],
    mockRequests: [
      {
        name: 'Submit 2FA Verification',
        method: 'POST',
        url: 'mock://auth/2fa/verify',
        body: JSON.stringify({ otp: '849201', device: 'Chrome-Linux-QA' }, null, 2),
        expectedStatus: 200,
      },
      {
        name: 'Request Password Reset',
        method: 'POST',
        url: 'mock://auth/password/forgot',
        body: JSON.stringify({ timestamp: Date.now() }, null, 2),
        expectedStatus: 200,
      },
    ],
    initialMockEmails: [
      {
        senderName: 'Security Ops Team',
        senderEmail: 'security-alerts@auth.example.com',
        subject: 'Security Alert: Your verification code is 849201',
        bodyText: 'A sign-in request was detected from an unrecognized browser.\n\nYour 6-digit one-time passcode is:\n\n   >>> 849201 <<<\n\nIf you did not make this request, please lock your account immediately.',
        tags: ['2FA', 'Security', 'OTP'],
      },
    ],
    customInstructions: {
      namingConvention: 'sec.{index}',
      mockLatencyMs: 120,
      mockFailureRate: 0,
      simulatedOtpLength: 6,
      defaultVariantStatus: 'unused',
      exportFormatTemplate: 'standard',
    },
  },
  {
    id: 'tmpl_stress_rfc',
    name: 'High-Volume Dot-Variant Stress & RFC Suite',
    description: 'High-throughput synthetic identity stress testing, bitwise placement correctness, and deduplication.',
    category: 'Stress Testing',
    isBuiltIn: true,
    tags: ['stress', 'rfc', 'performance', 'bitwise', 'scale'],
    createdAt: 1725100000000,
    updatedAt: 1725100000000,
    generationConfig: {
      username: 'scale.test',
      targetCount: 64,
      status: 'unused',
    },
    labels: [
      { name: 'Batch 10k', color: '#14b8a6', description: 'Mass dataset variant batch' },
      { name: 'RFC Compliant', color: '#84cc16', description: 'Passes standard email format RFC-5322' },
    ],
    testCases: [
      {
        name: 'Bitwise Placement Mathematical Exhaustiveness',
        description: 'Ensure exactly 2^(n-1) unique synthetic variants are generated without duplicate permutations.',
        expectedResult: 'Set size matches 2^(n-1) with 0 collision rate.',
      },
      {
        name: 'Virtual List Rendering Under High Volume',
        description: 'Verify smooth 60fps scrolling and instant filtering across 10,000+ variants.',
        expectedResult: 'Windowing table renders effortlessly with low memory footprint.',
      },
    ],
    mockRequests: [
      {
        name: 'Batch Identity Ingest',
        method: 'POST',
        url: 'mock://stress/batch/ingest',
        body: JSON.stringify({ batchSize: 500, timestamp: Date.now() }, null, 2),
        expectedStatus: 200,
      },
    ],
    initialMockEmails: [
      {
        senderName: 'Load Testing Engine',
        senderEmail: 'stress-agent@bench.example.com',
        subject: 'Benchmark Synthetic Ingestion Telemetry Report',
        bodyText: 'High throughput batch completed: 50,000 synthetic messages processed.\nZero dropped packets or memory spikes detected.',
        tags: ['Benchmark', 'Telemetry'],
      },
    ],
    customInstructions: {
      namingConvention: 'stress.{index}',
      mockLatencyMs: 20,
      mockFailureRate: 0,
      simulatedOtpLength: 6,
      defaultVariantStatus: 'unused',
      exportFormatTemplate: 'standard',
    },
  },
];
