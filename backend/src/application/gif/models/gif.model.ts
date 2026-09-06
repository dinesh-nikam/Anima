// Phase 1 — Random GIF Animation Studio Domain Models
// Explicit State Machine, Resource Budgets & Image Inspection Contracts

export type GifProjectStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'READY'
  | 'RENDERING'
  | 'RENDERED'
  | 'EXPORTING'
  | 'EXPORTED'
  | 'ANALYSIS_FAILED'
  | 'RENDER_FAILED'
  | 'EXPORT_FAILED'
  | 'CANCELLED';

export type GifAssetFormat = 'PNG' | 'JPEG' | 'WEBP' | 'GIF';
export type GifOutputFormat = 'GIF' | 'MP4' | 'WEBM' | 'APNG';

/**
 * Explicit State Machine Transition Rules (Section 21 of Specification)
 * Strictly governs valid lifecycle transitions.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<GifProjectStatus, GifProjectStatus[]> = {
  DRAFT: ['ANALYZING', 'READY', 'CANCELLED'],
  ANALYZING: ['READY', 'ANALYSIS_FAILED', 'CANCELLED'],
  READY: ['RENDERING', 'ANALYZING', 'DRAFT', 'CANCELLED'],
  RENDERING: ['RENDERED', 'RENDER_FAILED', 'CANCELLED'],
  RENDERED: ['EXPORTING', 'READY', 'DRAFT', 'RENDERING'],
  EXPORTING: ['EXPORTED', 'EXPORT_FAILED', 'CANCELLED'],
  EXPORTED: ['READY', 'RENDERING', 'DRAFT'],
  ANALYSIS_FAILED: ['ANALYZING', 'READY', 'DRAFT'],
  RENDER_FAILED: ['RENDERING', 'READY', 'DRAFT'],
  EXPORT_FAILED: ['EXPORTING', 'READY', 'DRAFT'],
  CANCELLED: ['DRAFT', 'READY'],
};

export function isValidStatusTransition(from: GifProjectStatus, to: GifProjectStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Resource Budgets and Limits (Section 26 of Specification)
 */
export const GIF_RESOURCE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15 Megabytes
  MIN_DIMENSION_PX: 16,
  MAX_DIMENSION_PX: 4096,
  MAX_ASPECT_RATIO: 10.0,
  MAX_UNCOMPRESSED_FRAME_BYTES: 64 * 1024 * 1024, // 64 MB frame buffer ceiling
  MIN_DURATION_SECONDS: 0.5,
  MAX_DURATION_SECONDS: 10.0,
  DEFAULT_DURATION_SECONDS: 3.0,
  MIN_FPS: 5,
  MAX_FPS: 30,
  DEFAULT_FPS: 15,
  MAX_EFFECTS_PER_PROJECT: 16,
} as const;

export const RENDERER_VERSION = '1.0.0';
export const EFFECT_ENGINE_VERSION = '1.0.0';

/**
 * Animation Effect Configuration Instance
 */
export interface AnimationEffectInstance {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  locked: boolean;
  intensity: number; // 0.0 to 1.0
  speed?: number; // 0.1 to 5.0
  parameters?: Record<string, any>;
  startTime?: number;
  endTime?: number;
}

/**
 * Animation Configuration Object (Deterministic Representation)
 */
export interface AnimationConfiguration {
  duration: number;
  fps: number;
  loopCount: number; // 0 = loop forever
  quality: number; // 1 to 100
  dithering: boolean;
  pixelArtMode: boolean;
  effects: AnimationEffectInstance[];
  seed: string;
  estimatedTotalFrames?: number;
}

/**
 * Parsed Binary Image Header Inspection Result
 */
export interface ImageInspectionResult {
  format: GifAssetFormat;
  mimeType: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  fileSizeBytes: number;
  fileHash: string; // SHA-256
  colorDepth?: number;
}
