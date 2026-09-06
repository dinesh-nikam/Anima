import { GifAssetFormat } from '../models/gif.model';

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
  compatibility: string[]; // compatible effect categories / tags
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

export interface FrameContext {
  timeSeconds: number;
  normalizedTime: number; // t in [0, 1) — guarantees seamless loop continuity
  duration: number;
  fps: number;
  frameIndex: number;
  totalFrames: number;
  width: number;
  height: number;
  seed: number;
  pixelArtMode: boolean;
}

export interface EffectTransform {
  scale?: number;
  translateX?: number;
  translateY?: number;
  rotationDegrees?: number;
  brightnessMultiplier?: number;
  contrastMultiplier?: number;
  saturationMultiplier?: number;
  hueShiftDegrees?: number;
  rgbChannelOffsets?: { r: [number, number]; g: [number, number]; b: [number, number] };
  overlayAlpha?: number;
  particles?: Array<{ x: number; y: number; radius: number; opacity: number; color: string }>;
  customData?: Record<string, any>;
}

/**
 * Standard Animation Effect Contract
 * Every effect in the engine implements this interface.
 */
export interface AnimationEffect {
  readonly metadata: EffectMetadata;

  /**
   * Evaluates mathematical continuous transformation at normalized frame time.
   * Guarantees f(0) == f(1) for loop safety.
   */
  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform;

  /**
   * Applies pixel-level RGBA buffer manipulation in place (e.g. scanlines, noise, color shift).
   */
  applyPixelTransform?(
    sourceBuffer: Uint8Array | Buffer,
    targetBuffer: Uint8Array | Buffer,
    context: FrameContext,
    params: Record<string, any>,
  ): void;
}
