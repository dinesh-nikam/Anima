import { Injectable, Logger } from '@nestjs/common';
import { EffectRegistryService } from '../registry/effect-registry.service';
import {
  AnimationEffect,
  EffectCategory,
} from '../effects/effect.contract';
import {
  AnimationEffectInstance,
  AnimationConfiguration,
  GIF_RESOURCE_LIMITS,
} from '../models/gif.model';
import {
  RandomizationProfile,
  RandomizeResult,
} from '../dto/gif-randomize.dto';

/**
 * 32-bit Deterministic Pseudorandom Number Generator (Mulberry32)
 * Ensures 100% reproducible randomization given identical seed and inputs.
 */
export class Mulberry32PRNG {
  private state: number;

  constructor(seed: number | string | bigint) {
    this.state = Mulberry32PRNG.hashSeed(seed);
  }

  static hashSeed(input: number | string | bigint): number {
    if (typeof input === 'number') {
      return (input >>> 0) || 0x12345678;
    }
    const str = input.toString();
    let hash = 0x811c9dc5; // 32-bit FNV-1a offset
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }
}

export interface RandomizeOptions {
  seed?: string | number;
  profile?: RandomizationProfile;
  preserveLocked?: boolean;
  targetEffectCount?: number;
  duration?: number;
  fps?: number;
  lockedEffects?: AnimationEffectInstance[];
}

@Injectable()
export class RandomizationEngineService {
  private readonly logger = new Logger(RandomizationEngineService.name);

  constructor(private readonly registry: EffectRegistryService) {}

  /**
   * Generates a complete, reproducible animation configuration based on image analysis, profile, and seed.
   */
  generateRandomConfiguration(
    analysis?: Record<string, any>,
    options: RandomizeOptions = {},
  ): RandomizeResult {
    // 1. Seed Resolution (Deterministic)
    const seedInput = options.seed !== undefined
      ? options.seed
      : Math.floor(Math.random() * 90000000) + 10000000;
    const seedString = seedInput.toString();
    const prng = new Mulberry32PRNG(seedInput);

    const profile: RandomizationProfile = options.profile || 'BALANCED';
    const appliedBiases: string[] = [];

    // 2. Determine duration, fps, and quality
    const duration = options.duration
      ?? Number((prng.nextFloat(2.0, 4.0)).toFixed(1));
    const fps = options.fps
      ?? (analysis?.pixelArtConfidence >= 0.70 ? 12 : 15);

    // 3. Detect features from analysis
    const pixelArtMode = Boolean(
      analysis?.pixelArtConfidence >= 0.70 || profile === 'RETRO_ARCADE',
    );
    if (analysis?.pixelArtConfidence >= 0.70) {
      appliedBiases.push(`Pixel-Art Detected (${Math.round(analysis.pixelArtConfidence * 100)}%): Biased toward integer quantization and retro styling.`);
    }

    const isDarkScene = Boolean(analysis?.darkSceneConfidence >= 0.60);
    if (isDarkScene) {
      appliedBiases.push(`Dark Scene Detected (${Math.round(analysis.darkSceneConfidence * 100)}%): Boosted glow, neon, and atmospheric particulate lighting.`);
    }

    const isPhotographic = Boolean(analysis?.photographicConfidence >= 0.60);
    if (isPhotographic) {
      appliedBiases.push(`Photographic Scene Detected (${Math.round(analysis.photographicConfidence * 100)}%): Prioritized subtle cinematic micro-movements.`);
    }

    const hasAlpha = Boolean(analysis?.hasAlpha);
    if (hasAlpha) {
      appliedBiases.push('Alpha Cutout Detected: Elevated buoyant motion and hover physics.');
    }

    // 4. Compute Category Weights
    const categoryWeights = this.computeCategoryWeights(profile, analysis, prng);

    // 5. Handle Locked Effects
    const lockedEffects = options.preserveLocked
      ? (options.lockedEffects || []).filter((e) => e.locked)
      : [];

    const selectedEffects: AnimationEffectInstance[] = [...lockedEffects];
    const targetCount = options.targetEffectCount
      ?? this.resolveTargetCount(profile, prng);

    // 6. Select Compatible Additional Effects
    const allEffects = this.registry.getAll();
    let attempts = 0;
    const maxAttempts = 50;

    while (selectedEffects.length < targetCount && attempts < maxAttempts) {
      attempts++;

      // Pick a candidate category based on weighted distribution
      const candidateCategory = this.sampleCategory(categoryWeights, prng);
      const categoryEffects = allEffects.filter(
        (e) => e.metadata.category === candidateCategory,
      );

      if (categoryEffects.length === 0) continue;

      const candidateEffect = prng.pick(categoryEffects);
      const candidateId = candidateEffect.metadata.id;

      // Check if already selected
      if (selectedEffects.some((e) => e.id === candidateId)) continue;

      // Verify compatibility with all currently selected effects
      const testIds = [...selectedEffects.map((e) => e.id), candidateId];
      const compat = this.registry.validateCompatibility(testIds);
      if (!compat.valid) continue;

      // Synthesize randomized parameters
      const instance = this.synthesizeEffectInstance(
        candidateEffect,
        profile,
        analysis,
        prng,
      );

      selectedEffects.push(instance);
    }

    // 7. Assemble Final Animation Configuration
    const configuration: AnimationConfiguration = {
      duration,
      fps,
      loopCount: 0, // Infinite seamless loop
      quality: pixelArtMode ? 100 : 85,
      dithering: !pixelArtMode,
      pixelArtMode,
      effects: selectedEffects,
      seed: seedString,
      estimatedTotalFrames: Math.round(duration * fps),
    };

    return {
      configuration,
      seed: seedString,
      profile,
      selectedEffectCount: selectedEffects.length,
      preservedLockedCount: lockedEffects.length,
      appliedBiases,
    };
  }

  /**
   * Derives a sub-seed for variations or incremental mutation while preserving baseline randomness.
   */
  mutateSeed(baseSeed: string | number, variationIndex: number = 1): string {
    const hash = Mulberry32PRNG.hashSeed(`${baseSeed}_variation_${variationIndex}`);
    return hash.toString();
  }

  // ==========================================================================
  // Weighting & Sampling Algorithms
  // ==========================================================================

  private computeCategoryWeights(
    profile: RandomizationProfile,
    analysis?: Record<string, any>,
    prng?: Mulberry32PRNG,
  ): Record<EffectCategory, number> {
    // Baseline equal distribution
    const weights: Record<EffectCategory, number> = {
      CAMERA: 1.0,
      LIGHTING: 1.0,
      ATMOSPHERE: 1.0,
      RETRO: 1.0,
      GLITCH: 0.8,
      MOTION: 1.0,
      DISTORTION: 0.7,
      COLOR: 0.9,
      PIXEL_ART: 0.6,
    };

    // Apply Profile Modifiers
    switch (profile) {
      case 'CHAOTIC':
        weights.GLITCH *= 3.5;
        weights.DISTORTION *= 3.0;
        weights.CAMERA *= 2.0;
        weights.RETRO *= 1.5;
        break;
      case 'CINEMATIC':
        weights.CAMERA *= 3.0;
        weights.ATMOSPHERE *= 2.5;
        weights.LIGHTING *= 2.0;
        weights.MOTION *= 1.8;
        weights.GLITCH *= 0.1;
        weights.DISTORTION *= 0.2;
        break;
      case 'RETRO_ARCADE':
        weights.RETRO *= 4.0;
        weights.PIXEL_ART *= 3.5;
        weights.GLITCH *= 2.0;
        weights.LIGHTING *= 1.8;
        weights.DISTORTION *= 0.2;
        break;
      case 'NATURE_AMBIENT':
        weights.ATMOSPHERE *= 4.0;
        weights.MOTION *= 2.5;
        weights.LIGHTING *= 1.5;
        weights.GLITCH *= 0.05;
        weights.DISTORTION *= 0.5;
        break;
      case 'CYBERPUNK':
        weights.GLITCH *= 3.0;
        weights.LIGHTING *= 3.0;
        weights.RETRO *= 2.5;
        weights.COLOR *= 2.0;
        break;
      case 'BALANCED':
      default:
        // Balanced uses adaptive analysis weighting below
        break;
    }

    // Apply Computer Vision Feature Weights
    if (analysis) {
      if (analysis.pixelArtConfidence >= 0.70) {
        weights.PIXEL_ART *= 4.5;
        weights.RETRO *= 2.5;
        weights.DISTORTION *= 0.2; // Avoid blurring crisp pixels
      }

      if (analysis.darkSceneConfidence >= 0.60) {
        weights.LIGHTING *= 3.5;
        weights.ATMOSPHERE *= 2.0;
      }

      if (analysis.photographicConfidence >= 0.60) {
        weights.CAMERA *= 2.8;
        weights.ATMOSPHERE *= 2.0;
        weights.GLITCH *= 0.2;
      }

      if (analysis.hasAlpha) {
        weights.MOTION *= 3.0;
      }

      if (analysis.flatAreaRatio >= 0.60) {
        weights.LIGHTING *= 2.0;
        weights.COLOR *= 1.8;
      }

      if (analysis.complexity >= 0.70) {
        weights.DISTORTION *= 0.3; // Avoid noisy distortions on complex textures
        weights.CAMERA *= 1.5;
      }
    }

    // Add subtle procedural jitter (+/- 15%) so repeated runs don't lock onto identical patterns
    if (prng) {
      for (const cat of Object.keys(weights) as EffectCategory[]) {
        weights[cat] *= prng.nextFloat(0.85, 1.15);
      }
    }

    return weights;
  }

  private sampleCategory(
    weights: Record<EffectCategory, number>,
    prng: Mulberry32PRNG,
  ): EffectCategory {
    const entries = Object.entries(weights) as [EffectCategory, number][];
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    const target = prng.next() * totalWeight;

    let cumulative = 0;
    for (const [cat, w] of entries) {
      cumulative += w;
      if (target <= cumulative) {
        return cat;
      }
    }

    return entries[entries.length - 1][0];
  }

  private resolveTargetCount(profile: RandomizationProfile, prng: Mulberry32PRNG): number {
    switch (profile) {
      case 'CHAOTIC':
        return prng.nextInt(3, 4);
      case 'CINEMATIC':
        return prng.nextInt(1, 2);
      case 'BALANCED':
      default:
        return prng.nextInt(2, 3);
    }
  }

  // ==========================================================================
  // Parameter Synthesis
  // ==========================================================================

  private synthesizeEffectInstance(
    effect: AnimationEffect,
    profile: RandomizationProfile,
    analysis?: Record<string, any>,
    prng: Mulberry32PRNG = new Mulberry32PRNG(42),
  ): AnimationEffectInstance {
    const meta = effect.metadata;
    const { min, max, default: def } = meta.intensityRange;

    // Intensity profile bias
    let intensity = def;
    if (profile === 'CHAOTIC') {
      intensity = prng.nextFloat(Math.max(min, 0.5), max);
    } else if (profile === 'CINEMATIC') {
      intensity = prng.nextFloat(min, Math.min(max, 0.35));
    } else {
      intensity = prng.nextFloat(min, max);
    }

    // Speed synthesis
    const speed = profile === 'CHAOTIC'
      ? prng.nextFloat(1.2, 2.0)
      : (profile === 'CINEMATIC' ? prng.nextFloat(0.6, 1.0) : prng.nextFloat(0.8, 1.4));

    // Synthesize custom parameters from defaults with smart variations
    const parameters: Record<string, any> = { ...meta.defaultParameters };

    // Extract dominant color if available for colored particles/effects
    const dominantHex = analysis?.dominantColors?.[0]?.hex;
    if (dominantHex && (parameters.baseColor || parameters.sparkColor)) {
      if (parameters.baseColor) parameters.baseColor = dominantHex;
      if (parameters.sparkColor) parameters.sparkColor = dominantHex;
    }

    // Randomize frequencies or counts within reasonable bounds
    if (parameters.dropCount) {
      parameters.dropCount = prng.nextInt(32, 96);
    }
    if (parameters.count) {
      parameters.count = prng.nextInt(20, 64);
    }
    if (parameters.amplitudePx) {
      parameters.amplitudePx = prng.nextInt(6, 16);
    }
    if (parameters.waveCount) {
      parameters.waveCount = prng.nextInt(2, 5);
    }

    return {
      id: meta.id,
      name: meta.name,
      category: meta.category,
      enabled: true,
      locked: false,
      intensity: Number(intensity.toFixed(2)),
      speed: Number(speed.toFixed(2)),
      parameters,
    };
  }
}
