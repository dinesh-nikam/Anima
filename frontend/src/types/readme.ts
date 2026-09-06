export type ReadmeDraftStatus = 'DRAFT' | 'VALID' | 'INVALID' | 'ARCHIVED';

export type AvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'STALE' | 'UNAVAILABLE';

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'object';

export interface SettingDefinition {
  name: string;
  type: SettingType;
  required: boolean;
  default?: unknown;
  enumValues?: string[];
  maxLength?: number;
  description?: string;
}

export type ProviderCategory =
  | 'GITHUB_STATS'
  | 'STREAK'
  | 'TOP_LANGUAGES'
  | 'CONTRIBUTIONS'
  | 'TROPHIES'
  | 'ACHIEVEMENTS'
  | 'BADGES'
  | 'VISITOR_COUNTER'
  | 'ACTIVITY'
  | 'CUSTOM_IMAGE';

export type ProviderStatus =
  | 'ENABLED'
  | 'DISABLED'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'DEPRECATED';

export type ProviderCapability =
  | 'STATIC_MARKDOWN'
  | 'DYNAMIC_IMAGE'
  | 'PROFILE_DATA'
  | 'STATISTICS'
  | 'CONTRIBUTION_DATA'
  | 'BADGE'
  | 'TROPHY';

export interface ProviderParameterSchema {
  name: string;
  type: string;
  required: boolean;
  maxLength?: number;
  enumValues?: string[];
  pattern?: string;
  description?: string;
  default?: unknown;
}

export interface ProviderDefinition {
  providerKey: string;
  name: string;
  description: string;
  version: string;
  category: ProviderCategory;
  enabled: boolean;
  status: ProviderStatus;
  configurationSchema: ProviderParameterSchema[];
  capabilities: ProviderCapability[];
  supportedComponents: string[];
  documentationUrl?: string;
  isSystem: boolean;
  defaultConfiguration?: Record<string, unknown>;
}

export interface ProviderHealthInfo {
  providerKey: string;
  status: ProviderStatus;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  failureCount: number;
  latencyMs?: number;
  errorCategory?: string;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  settings: SettingDefinition[];
  requiredData: string[];
  supportedThemes: string[];
  defaultSettings: Record<string, unknown>;
  supportedProviders?: string[];
  defaultProvider?: string;
  providerCapabilities?: string[];
}

export type ComponentSummary = ComponentDefinition;

export interface ReadmeSectionInstance {
  id: string;
  draftId: string;
  componentKey: string;
  displayOrder: number;
  enabled: boolean;
  configuration: Record<string, unknown>;
  schemaVersion: string;
  componentVersion: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadmeDraft {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  templateId: string | null;
  templateVersion: string;
  themeId: string;
  themeVersion: string;
  rendererVersion: string;
  configuration: Record<string, unknown>;
  revision: number;
  status: ReadmeDraftStatus;
  createdAt: string;
  updatedAt: string;
  lastRenderedAt: string | null;
  sections: ReadmeSectionInstance[];
}

export interface ThemePalette {
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
  link: string;
  badge: string;
}

export interface ThemeTypography {
  heading: string;
  body: string;
  code: string;
}

export interface ThemeDefinition {
  themeId: string;
  themeKey: string;
  name: string;
  description: string;
  version: string;
  palette: ThemePalette;
  typography: ThemeTypography;
  alignment: {
    defaultImageAlignment: 'left' | 'center' | 'right';
    defaultHeroAlignment: 'left' | 'center' | 'right';
  };
  style: {
    headingPrefix: string;
    dividerStyle: 'hr' | 'blank' | 'thematic';
    tableStyle: 'github' | 'compact';
    codeBlockFenced: boolean;
    listBullet: '-' | '*';
  };
}

export type ThemeSummary = ThemeDefinition;

export interface TemplateSectionSpec {
  sectionKey: string;
  componentKey: string;
  displayOrder: number;
  enabled: boolean;
  configuration: Record<string, unknown>;
  schemaVersion: string;
}

export interface TemplateDefinition {
  templateKey: string;
  name: string;
  description: string;
  version: string;
  status: 'PUBLISHED' | 'DRAFT' | 'DEPRECATED' | 'DISABLED';
  themeKey: string;
  schemaVersion: string;
  isSystem: boolean;
  sections: TemplateSectionSpec[];
  sectionCount?: number;
}

export type TemplateSummary = TemplateDefinition;

export interface ProviderSummary {
  providerKey: string;
  name: string;
  category: string;
  baseUrl: string;
  version: string;
  enabled: boolean;
}

export interface DraftValidationError {
  sectionId?: string;
  componentKey?: string;
  field?: string;
  reason: string;
}

export interface PreviewResult {
  markdown: string;
  metadata: {
    rendererVersion: string;
    templateId: string;
    templateVersion: string;
    themeId: string;
    themeVersion: string;
    generatedAt: string;
    dataCompleteness: AvailabilityStatus;
    warnings: string[];
  };
  validation: {
    valid: boolean;
    errors: DraftValidationError[];
  };
}

export type RenderResult = PreviewResult;

export interface RenderRequest {
  templateKey: string;
  themeKey: string;
  sections?: Array<{
    sectionKey: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
  }>;
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';

// ============================================================================
// PHASE 8 — Publishing & Version Control Types
// ============================================================================

export type DiffChangeStatus = 'CREATED' | 'CHANGED' | 'UNCHANGED';

export type DiffLineType = 'ADDED' | 'REMOVED' | 'UNCHANGED' | 'HEADER';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffSummary {
  status: DiffChangeStatus;
  additions: number;
  deletions: number;
  unchanged: number;
  totalChanges: number;
  isNoOp: boolean;
  truncated: boolean;
  renderedHash: string;
  currentHash: string | null;
}

export interface ReadmeDiffResult {
  summary: DiffSummary;
  lines: DiffLine[];
}

export interface TargetRepositoryItem {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  visibility: string;
  isArchived: boolean;
  isDisabled: boolean;
  canWrite: boolean;
  htmlUrl: string;
  pushedAt: string;
}

export interface BranchItem {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface PublishPreviewResponse {
  intentId: string;
  draftId: string;
  target: {
    repositoryId: string;
    githubRepoId: string;
    owner: string;
    repo: string;
    fullName: string;
    branch: string;
    path: string;
    defaultBranch: string;
    visibility: string;
  };
  currentSha: string | null;
  renderedHash: string;
  changeStatus: DiffChangeStatus;
  diff: ReadmeDiffResult;
  warnings: string[];
  expiresAt: string;
}

export interface PublicationReceipt {
  publicationId: string;
  draftId: string;
  versionId?: string | null;
  status: string;
  isNoOp: boolean;
  commitSha: string | null;
  publishedFileSha: string | null;
  previousFileSha: string | null;
  commitUrl: string | null;
  contentHash: string;
  target: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    fullName: string;
  };
  diffSummary?: DiffSummary | null;
  completedAt: string;
}

export interface ReadmeVersionItem {
  id: string;
  userId: string;
  draftId?: string;
  templateId: string;
  templateVersion: string;
  themeId: string;
  themeVersion: string;
  rendererVersion: string;
  canonicalMarkdown: string;
  contentHash: string;
  sourceRevision: number;
  metadata: Record<string, unknown>;
  githubRepositoryId?: string;
  branch?: string;
  path?: string;
  commitSha?: string;
  previousFileSha?: string;
  fileSha?: string;
  status: string;
  capturedAt: string;
  createdAt: string;
}
