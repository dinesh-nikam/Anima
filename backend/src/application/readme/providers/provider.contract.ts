import { RenderContext } from '../models/readme.model';

// ---------------------------------------------------------------------------
// Provider Enums & Types
// ---------------------------------------------------------------------------

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

export type ProviderFallbackPolicy =
  | 'HIDE'
  | 'FALLBACK_TO_INTERNAL'
  | 'SHOW_UNAVAILABLE'
  | 'USE_STATIC_FALLBACK';

export type ProviderResultStatus =
  | 'SUCCESS'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INVALID_CONFIGURATION'
  | 'DISABLED'
  | 'ERROR';

export type ProviderContentType = 'IMAGE_URL' | 'MARKDOWN' | 'DATA';

export type ProviderParameterType = 'string' | 'number' | 'boolean' | 'enum' | 'username';

export interface ProviderParameterSchema {
  name: string;
  type: ProviderParameterType;
  required: boolean;
  maxLength?: number;
  enumValues?: string[];
  pattern?: string;
  description?: string;
  default?: unknown;
}

export interface ProviderMetadata {
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
  createdAt?: string;
  updatedAt?: string;
}

export interface ProviderRequest {
  providerKey: string;
  parameters: Record<string, unknown>;
  theme?: string;
  fallbackPolicy?: ProviderFallbackPolicy;
}

export interface ProviderResult {
  providerKey: string;
  version: string;
  status: ProviderResultStatus;
  contentType: ProviderContentType;
  url?: string;
  content?: string;
  data?: unknown;
  metadata?: Record<string, unknown>;
  warnings?: string[];
  generatedAt: string;
}

export interface ProviderHealth {
  providerKey: string;
  status: ProviderStatus;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  failureCount: number;
  latencyMs?: number;
  errorCategory?: string;
  diagnostics?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Strict Dynamic Provider Contract
// ---------------------------------------------------------------------------

export interface DynamicProvider {
  metadata(): ProviderMetadata;
  capabilities(): ProviderCapability[];
  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown>;
  resolve(request: ProviderRequest, context?: RenderContext): Promise<ProviderResult> | ProviderResult;
  health?(): Promise<ProviderHealth> | ProviderHealth;
}
