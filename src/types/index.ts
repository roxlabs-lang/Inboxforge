/**
 * InboxForge — TypeScript Type Definitions
 */

export type VariantStatus = 'unused' | 'reserved' | 'used' | 'archived';

// ================= VOX THEMES =================
export type VoxTheme =
  | 'vox_obsidian'
  | 'crimson_cyber'
  | 'electric_purple'
  | 'midnight_matrix'
  | 'clean_titanium';

// ================= PERSISTENT JOBS =================
export type JobStatus =
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Recovering'
  | 'Cancelled'
  | 'Pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'recovering';

export type JobType = 'variant_generation' | 'gmail_sync' | 'bulk_export' | 'bulk_delete' | 'custom_script' | string;

export interface PersistentJob {
  // Canonical fields required by Persistent Job Architecture
  jobId: string;
  type: JobType;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  updatedAt: number;
  completedAt?: number;
  progress: number; // 0 - 100 percentage
  total: number;
  processed: number;
  failed: number;
  error?: string;
  metadata?: Record<string, any>;

  // Backward-compatibility and telemetry fields
  id: string; // alias of jobId
  workspaceId: string;
  name: string;
  totalTarget: number;
  generatedCount: number;
  persistedCount: number;
  remainingCount: number;
  progressPercent: number;
  ratePerSecond: number;
  elapsedMs: number;
  estimatedRemainingSeconds: number;
  startTime: number;
  lastUpdated: number;
  completionTime?: number;
  config: {
    username?: string;
    domain?: string;
    baseEmail?: string;
    startIndex?: string;
    batchSize?: number;
    [key: string]: any;
  };
}

// ================= CONNECTED GMAIL ACCOUNTS =================
export type GmailAccountStatus = 'CONNECTED' | 'SYNCING' | 'AUTHENTICATION REQUIRED' | 'DISCONNECTED' | 'ERROR';
export type GmailAuthState =
  | 'authorized'
  | 'expired'
  | 'revoked'
  | 'unauthorized'
  | 'AUTHORIZED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'UNAUTHORIZED';

export interface ConnectedGmailAccount {
  id: string; // Mailbox ID (e.g., unique email or account ID)
  mailboxId?: string; // Explicit mailbox ID alias
  email: string; // Email address
  displayName?: string;
  photoUrl?: string;
  connectedAt: number;
  
  // Connection and Synchronization
  status: GmailAccountStatus;
  connectionStatus?: GmailAccountStatus;
  lastSyncedAt?: number;
  lastSuccessfulSync?: number | null; // Timestamp of last successful sync
  lastHistoryId?: string;
  syncCursor?: string | null; // Sync cursor / history state
  
  // Authorization and Errors
  authState?: GmailAuthState; // 'authorized' | 'expired' | 'revoked' | 'unauthorized'
  errorMessage?: string;
  lastError?: string | null; // Last recorded error description
  
  // Active / Primary selection
  isPrimary?: boolean;
  isActive?: boolean;
  totalMessagesSynced?: number;
}

export interface Workspace {
  id: string;
  name: string;
  baseEmail: string;
  username: string;
  domain: string;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
  color?: string;
  notes?: string;
}

export type IdentityCategory = 'PERSON' | 'COMPANY' | 'PROJECT' | 'USERNAME';

export type IdentitySubCategory =
  | 'person_name'
  | 'nickname'
  | 'creator'
  | 'professional'
  | 'fictional_company'
  | 'fictional_startup'
  | 'fictional_studio'
  | 'fictional_tech_company'
  | 'fictional_agency'
  | 'fictional_product'
  | 'fictional_application'
  | 'fictional_project'
  | 'fictional_organization'
  | 'structured_username';

export type IdentityType = 'personal' | 'creator' | 'company' | 'startup' | 'project';

export interface Variant {
  id: string;
  workspaceId: string;
  email: string;
  baseEmail: string;
  username: string;
  status: VariantStatus;
  starred: boolean;
  labelIds: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
  lastCopiedAt?: number;
  copyCount: number;
  lastUsedAt?: number;
  usageCount: number;
  // Synthetic Identity Extensions
  identityName?: string;
  identityType?: IdentityType;
  identityCategory?: IdentityCategory;
  subCategory?: IdentitySubCategory;
  syntheticUsername?: string;
  isSyntheticTestIdentity?: boolean;
  seedUsed?: string;
  organization?: string;
  roleTitle?: string;
  avatarSeed?: string;
  tags?: string[];
  suffix?: string;
  combinationIndex?: string;
  dotCount?: number;
}

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  description?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  variantIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export type TestCaseStatus = 'Not Started' | 'Running' | 'Passed' | 'Failed' | 'Blocked';

export interface TestCase {
  id: string;
  workspaceId: string;
  projectId?: string;
  name: string;
  description: string;
  identityEmail?: string;
  status: TestCaseStatus;
  expectedResult: string;
  actualResult?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
}

export type OTPStatus = 'Received' | 'Used' | 'Expired';

export interface OTPRecord {
  id: string;
  workspaceId: string;
  identityEmail: string;
  service: string;
  otp: string;
  receivedAt: number;
  status: OTPStatus;
  notes?: string;
  createdAt: number;
}

export type ActivityLogType =
  | 'generate'
  | 'generation_completed'
  | 'copy'
  | 'use'
  | 'unuse'
  | 'reserve'
  | 'release'
  | 'label'
  | 'archive'
  | 'unarchive'
  | 'delete'
  | 'export'
  | 'import'
  | 'test_run'
  | 'otp_received'
  | 'email_received'
  | 'template_apply'
  | 'template_applied'
  | 'custom_rules_updated'
  | 'api_tested'
  | 'workspace_create'
  | 'workspace_delete'
  | 'workspace_duplicate'
  | 'star'
  | 'unstar'
  | 'general';

export type ActivityType = ActivityLogType;

export interface ActivityLog {
  id: string;
  workspaceId: string;
  type: ActivityLogType;
  details: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type GenerationState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'recovering'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface GenerationCheckpoint {
  workspaceId: string;
  baseEmail: string;
  username: string;
  currentCombination: string; // Serialized BigInt or string representation
  generatedCount: number;
  lastIndex?: string | number;
  lastIndexProcessed?: string | number;
  totalEstimated: string; // Serialized BigInt or number
  timestamp: number;
  isComplete: boolean;
}

export interface GeneratorConfig {
  chunkSize: number;
  batchInsertSize: number;
  delayBetweenChunksMs: number;
}

export interface GeneratorProgress {
  state: GenerationState;
  workspaceId?: string;
  baseEmail?: string;
  username?: string;
  domain?: string;
  totalCombinations: bigint | number;
  generatedCount: number;
  persistedCount: number;
  processedCount: number;
  errorCount: number;
  errorMessage?: string;
  remaining: bigint | number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  batchSize: number;
  ratePerSecond: number;
  elapsedMs: number;
  estimatedRemainingSeconds: number;
  startTime: number;
  completionTime?: number;
  isPaused: boolean;
  isCancelled: boolean;
  isComplete?: boolean;
  currentCombinationIndex?: bigint | number;
}

export interface AppSettings {
  id?: string;
  theme: 'dark' | 'light' | 'system';
  voxTheme?: VoxTheme;
  compactMode: boolean;
  defaultPageSize?: number;
  defaultExportFormat?: 'txt' | 'csv' | 'json';
  autoSaveNotes?: boolean;
  generationBatchSize: number;
  checkpointFrequency: number;
  exportFormat?: 'txt' | 'csv' | 'json';
  confirmOnDelete?: boolean;
  confirmDestructiveActions?: boolean;
  autoReconnectGmail?: boolean;
}

export type UserSettings = AppSettings;

export interface ImportSummary {
  recordsScanned: number;
  valid: number;
  invalid: number;
  duplicates: number;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface StorageStats {
  estimatedBytes: number;
  quotaBytes: number;
  usagePercent: number;
  variantCount: number;
  workspaceCount: number;
  projectCount: number;
  testCaseCount: number;
  otpCount: number;
  logCount: number;
}

// Local Test Lab Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SavedApiRequest {
  id: string;
  workspaceId: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[] | Record<string, string> | string;
  body: string;
  identityEmail?: string;
  expectedStatus: number;
  expectedBody?: string;
  simulatedLatencyMs?: number;
  mockResponseOverride?: {
    status: number;
    body: string;
  };
  createdAt: number;
}

export interface ApiResponseResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  timestamp: number;
  matchesExpectation: boolean;
  error?: string;
}

export interface AutomationStep {
  id: string;
  name: string;
  action: 'generate_identity' | 'mock_signup' | 'mock_send_otp' | 'mock_verify_otp' | 'mock_login' | 'custom_api';
  config: Record<string, any>;
}

export interface AutomationFlow {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  steps: AutomationStep[];
  lastRunResult?: {
    status: 'Passed' | 'Failed';
    durationMs: number;
    timestamp: number;
    stepResults: { stepId: string; passed: boolean; message: string; durationMs: number }[];
  };
}

// ================= SIMULATED MOCK EMAIL INBOX =================
export interface MockEmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface MimePartSummary {
  partId?: string;
  mimeType: string;
  filename?: string;
  size?: number;
  encoding?: string;
  hasData?: boolean;
  subParts?: MimePartSummary[];
}

export interface MockEmail {
  id: string;
  workspaceId: string;
  mailboxId?: string; // The connected mailbox ID / account email from which it was received
  recipientEmail: string; // The dot-variant identity that received it
  canonicalAddress?: string; // The canonical root mailbox
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml?: string;
  extractedOtp?: string;
  isRead: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'archive' | 'trash' | 'spam';
  tags: string[];
  attachments?: MockEmailAttachment[];
  headers?: Record<string, string>;
  receivedAt: number;
  isLocalSimulated?: boolean;
  // Debug & MIME Inspection (Requirement 9)
  gmailMessageId?: string;
  gmailThreadId?: string;
  detectedBodyType?: string;
  extractedTextLength?: number;
  mimeStructure?: MimePartSummary[];
  parserReason?: string;
  parserConfidence?: 'high' | 'medium' | 'low';
}

// ================= CUSTOM INSTRUCTIONS & QA RULES =================
export interface CustomInstructions {
  workspaceId: string;
  // Generation rules
  generationPrefix?: string;
  generationSuffix?: string;
  namingConvention?: string; // e.g. "qa-{user}+{tag}"
  autoApplyLabels: string[]; // Label IDs
  defaultVariantStatus: VariantStatus;
  
  // UI & Output formatting preferences
  exportFormatTemplate: 'standard' | 'rfc_name_email' | 'json_array' | 'csv_extended' | 'sql_insert';
  customExportHeader?: string;
  
  // Test configuration
  mockLatencyMs: number;
  mockFailureRate: number; // 0 to 100%
  simulatedOtpLength: number;
  defaultPassword?: string;
  
  // Custom guidelines / prompt rules
  customNotes?: string;
  updatedAt: number;
}

// ================= PROJECT & TESTING TEMPLATES =================
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'E-Commerce' | 'SaaS & Auth' | 'Security & 2FA' | 'Stress Testing' | 'Custom';
  isBuiltIn?: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  
  // Template contents
  generationConfig?: {
    username?: string;
    targetCount?: number;
    status?: VariantStatus;
  };
  labels: { name: string; color: string; description?: string }[];
  testCases: {
    name: string;
    description: string;
    expectedResult: string;
  }[];
  mockRequests?: {
    name: string;
    method: HttpMethod;
    url: string;
    body: string;
    expectedStatus: number;
  }[];
  initialMockEmails?: {
    senderName: string;
    senderEmail: string;
    subject: string;
    bodyText: string;
    tags: string[];
  }[];
  customInstructions?: Partial<CustomInstructions>;
}

