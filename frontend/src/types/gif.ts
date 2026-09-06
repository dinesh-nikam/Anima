// Frontend Types for Random GIF Animation Studio

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

export interface AnimationEffectInstance {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  locked: boolean;
  intensity: number; // 0.0 to 1.0
  speed?: number;
  parameters?: Record<string, any>;
  startTime?: number;
  endTime?: number;
}

export interface AnimationConfiguration {
  duration: number;
  fps: number;
  loopCount: number;
  quality: number;
  dithering: boolean;
  pixelArtMode: boolean;
  effects: AnimationEffectInstance[];
  seed: string;
  estimatedTotalFrames?: number;
}

export interface GifAsset {
  id: string;
  userId: string;
  originalFilename: string;
  sanitizedFilename: string;
  storageKey: string;
  mimeType: string;
  format: GifAssetFormat;
  fileSizeBytes: number;
  fileHash: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GifProject {
  id: string;
  userId: string;
  name: string;
  originalAssetId: string;
  originalImageHash: string;
  width: number;
  height: number;
  format: GifAssetFormat;
  animationConfiguration: AnimationConfiguration;
  randomSeed: string;
  rendererVersion: string;
  effectEngineVersion: string;
  duration: number;
  fps: number;
  outputFormat: GifOutputFormat;
  outputWidth: number;
  outputHeight: number;
  status: GifProjectStatus;
  statusReason?: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  asset?: GifAsset;
}

export interface GifProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  animationConfiguration: AnimationConfiguration;
  randomSeed: string;
  duration: number;
  fps: number;
  createdAt: string;
}

export interface CreateGifProjectPayload {
  assetId: string;
  name?: string;
  duration?: number;
  fps?: number;
  outputWidth?: number;
  outputHeight?: number;
  seed?: string | number;
}

export interface UpdateGifProjectPayload {
  name?: string;
  duration?: number;
  fps?: number;
  outputWidth?: number;
  outputHeight?: number;
  randomSeed?: string | number;
  animationConfiguration?: Record<string, any>;
  status?: GifProjectStatus;
  statusReason?: string;
}

export interface DominantColor {
  hex: string;
  rgb: [number, number, number];
  percentage: number;
}

export interface FeatureConfidence {
  detected: boolean;
  confidence: number;
  reason?: string;
}

export interface GifAnalysisResult {
  id: string;
  projectId: string;
  assetId: string;
  width: number;
  height: number;
  aspectRatio: number;
  hasAlpha: boolean;
  alphaCoverage: number;
  brightness: number;
  contrast: number;
  edgeDensity: number;
  complexity: number;
  darkSceneConfidence: number;
  pixelArtConfidence: number;
  photographicConfidence: number;
  flatAreaRatio: number;
  dominantColors: DominantColor[];
  uniqueColorCount: number;
  features: Record<string, any>;
  segmentationStatus: string;
  characterDetectionStatus: string;
  analyzerVersion: string;
  analysisDurationMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedGifProjects {
  items: GifProject[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type EffectCategory =
  | 'CAMERA'
  | 'LIGHTING'
  | 'ATMOSPHERE'
  | 'RETRO'
  | 'GLITCH'
  | 'MOTION'
  | 'DISTORTION'
  | 'COLOR'
  | 'PIXEL_ART';

export type PerformanceCostTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface EffectMetadata {
  id: string;
  name: string;
  category: EffectCategory;
  description: string;
  supportedImageTypes: GifAssetFormat[];
  compatibility: string[];
  intensityRange: { min: number; max: number; default: number };
  defaultParameters: Record<string, any>;
  minDuration: number;
  maxDuration: number;
  performanceCost: PerformanceCostTier;
  requiresSegmentation: boolean;
  isLoopSafe: boolean;
  modifiesGeometry: boolean;
  modifiesColors: boolean;
  generatesParticles: boolean;
}

export interface CompatibilityConflict {
  effectA: string;
  effectB: string;
  reason: string;
}

export interface CompatibilityValidationResult {
  valid: boolean;
  conflicts: CompatibilityConflict[];
}

export interface EstimateBudgetPayload {
  width: number;
  height: number;
  duration: number;
  fps: number;
  effectIds?: string[];
  dithering?: boolean;
  pixelArtMode?: boolean;
}

export interface AnimationBudgetEstimate {
  totalFrames: number;
  frameDelayCentiseconds: number;
  uncompressedFrameSizeBytes: number;
  totalRawMemoryBytes: number;
  estimatedGifSizeBytes: number;
  estimatedGifSizeFormatted: string;
  estimatedRenderTimeMs: number;
  estimatedRenderTimeFormatted: string;
  aggregatePerformanceTier: PerformanceCostTier;
  warnings: string[];
  recommendations: string[];
}

// Phase 4 — Randomization Engine Types
export type RandomizationProfile =
  | 'BALANCED'
  | 'CHAOTIC'
  | 'CINEMATIC'
  | 'RETRO_ARCADE'
  | 'NATURE_AMBIENT'
  | 'CYBERPUNK';

export interface RandomizeProjectPayload {
  seed?: string | number;
  profile?: RandomizationProfile;
  preserveLocked?: boolean;
  targetEffectCount?: number;
  duration?: number;
  fps?: number;
}

export interface StatelessRandomizePayload {
  seed?: string | number;
  profile?: RandomizationProfile;
  analysis?: Record<string, any>;
  lockedEffects?: AnimationEffectInstance[];
  targetEffectCount?: number;
  duration?: number;
  fps?: number;
}

export interface RandomizeResult {
  configuration: AnimationConfiguration;
  seed: string;
  profile: RandomizationProfile;
  selectedEffectCount: number;
  preservedLockedCount: number;
  appliedBiases: string[];
}

// Phase 6 — Render and Export Types
export type DitherMode = 'FLOYD_STEINBERG' | 'BAYER' | 'NONE';

export interface TriggerRenderPayload {
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  ditherMode?: DitherMode;
  maxColors?: number;
  pixelArtMode?: boolean;
}

export interface GifRenderJob {
  id: string;
  projectId: string;
  userId: string;
  status: GifProjectStatus;
  progress: number;
  totalFrames: number;
  renderedFrames: number;
  outputAssetPath?: string | null;
  outputSizeBytes?: number | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}



