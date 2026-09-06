import { Injectable, Logger } from '@nestjs/common';
import { EffectRegistryService } from '../registry/effect-registry.service';
import {
  FrameContext,
  EffectTransform,
  AnimationEffect,
  PerformanceCostTier,
} from '../effects/effect.contract';
import { AnimationEffectInstance } from '../models/gif.model';
import { EstimateBudgetDto, AnimationBudgetEstimate } from '../dto/gif-engine.dto';

export interface CompositeFrameTransform {
  frameIndex: number;
  timeSeconds: number;
  normalizedTime: number;
  scale: number;
  translateX: number;
  translateY: number;
  rotationDegrees: number;
  brightnessMultiplier: number;
  contrastMultiplier: number;
  saturationMultiplier: number;
  hueShiftDegrees: number;
  rgbChannelOffsets: { r: [number, number]; g: [number, number]; b: [number, number] };
  overlayAlpha: number;
  particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }>;
  individualTransforms: Record<string, EffectTransform>;
}

@Injectable()
export class AnimationEngineService {
  private readonly logger = new Logger(AnimationEngineService.name);

  constructor(private readonly registry: EffectRegistryService) {}

  // ==========================================================================
  // Easing Functions & Interpolation Curves
  // ==========================================================================

  linear(t: number): number {
    return Math.max(0, Math.min(1, t));
  }

  easeInOut(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return (1.0 - Math.cos(Math.PI * clamped)) / 2.0;
  }

  smoothStep(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3.0 - 2.0 * clamped);
  }

  bounce(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return Math.pow(Math.sin(Math.PI * clamped), 2.0);
  }

  elastic(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    if (clamped === 0 || clamped === 1) return clamped;
    return Math.sin(2.0 * Math.PI * 2 * clamped) * Math.sin(Math.PI * clamped);
  }

  applyEasing(t: number, easingType?: string): number {
    switch (easingType?.toUpperCase()) {
      case 'EASE_IN_OUT':
        return this.easeInOut(t);
      case 'SMOOTH_STEP':
        return this.smoothStep(t);
      case 'BOUNCE':
        return this.bounce(t);
      case 'ELASTIC':
        return this.elastic(t);
      case 'LINEAR':
      default:
        return this.linear(t);
    }
  }

  // ==========================================================================
  // Multi-Effect Frame Transform Evaluation
  // ==========================================================================

  /**
   * Evaluates all active effects at a given frame context and composes them into a composite transform.
   */
  evaluateFrame(
    context: FrameContext,
    effectInstances: AnimationEffectInstance[],
  ): CompositeFrameTransform {
    let compositeScale = 1.0;
    let compositeTranslateX = 0.0;
    let compositeTranslateY = 0.0;
    let compositeRotation = 0.0;
    let compositeBrightness = 1.0;
    let compositeContrast = 1.0;
    let compositeSaturation = 1.0;
    let compositeHue = 0.0;
    let compositeOverlayAlpha = 0.0;

    const compositeRgbOffsets = {
      r: [0, 0] as [number, number],
      g: [0, 0] as [number, number],
      b: [0, 0] as [number, number],
    };

    const compositeParticles: Array<{
      x: number;
      y: number;
      radius: number;
      opacity: number;
      color: string;
    }> = [];

    const individualTransforms: Record<string, EffectTransform> = {};

    for (const instance of effectInstances) {
      if (!instance.enabled) continue;

      const effect = this.registry.getById(instance.id);
      if (!effect) continue;

      const params = {
        intensity: instance.intensity,
        speed: instance.speed ?? 1.0,
        ...(instance.parameters ?? {}),
      };

      const transform = effect.evaluate(context, params);
      individualTransforms[instance.id] = transform;

      // Compose geometric transforms
      if (transform.scale !== undefined) compositeScale *= transform.scale;
      if (transform.translateX !== undefined) compositeTranslateX += transform.translateX;
      if (transform.translateY !== undefined) compositeTranslateY += transform.translateY;
      if (transform.rotationDegrees !== undefined) compositeRotation += transform.rotationDegrees;

      // Compose color transforms
      if (transform.brightnessMultiplier !== undefined) {
        compositeBrightness *= transform.brightnessMultiplier;
      }
      if (transform.contrastMultiplier !== undefined) {
        compositeContrast *= transform.contrastMultiplier;
      }
      if (transform.saturationMultiplier !== undefined) {
        compositeSaturation *= transform.saturationMultiplier;
      }
      if (transform.hueShiftDegrees !== undefined) {
        compositeHue = (compositeHue + transform.hueShiftDegrees) % 360;
      }

      // Compose chromatic offsets
      if (transform.rgbChannelOffsets) {
        compositeRgbOffsets.r[0] += transform.rgbChannelOffsets.r[0];
        compositeRgbOffsets.r[1] += transform.rgbChannelOffsets.r[1];
        compositeRgbOffsets.g[0] += transform.rgbChannelOffsets.g[0];
        compositeRgbOffsets.g[1] += transform.rgbChannelOffsets.g[1];
        compositeRgbOffsets.b[0] += transform.rgbChannelOffsets.b[0];
        compositeRgbOffsets.b[1] += transform.rgbChannelOffsets.b[1];
      }

      // Compose overlay alpha (take max or blend)
      if (transform.overlayAlpha !== undefined) {
        compositeOverlayAlpha = Math.max(compositeOverlayAlpha, transform.overlayAlpha);
      }

      // Accumulate particles
      if (transform.particles && transform.particles.length > 0) {
        compositeParticles.push(...transform.particles);
      }
    }

    // In pixel art mode, quantize translations to integer pixels
    if (context.pixelArtMode) {
      compositeTranslateX = Math.round(compositeTranslateX);
      compositeTranslateY = Math.round(compositeTranslateY);
    }

    return {
      frameIndex: context.frameIndex,
      timeSeconds: context.timeSeconds,
      normalizedTime: context.normalizedTime,
      scale: compositeScale,
      translateX: compositeTranslateX,
      translateY: compositeTranslateY,
      rotationDegrees: compositeRotation,
      brightnessMultiplier: compositeBrightness,
      contrastMultiplier: compositeContrast,
      saturationMultiplier: compositeSaturation,
      hueShiftDegrees: compositeHue,
      rgbChannelOffsets: compositeRgbOffsets,
      overlayAlpha: Math.min(1.0, compositeOverlayAlpha),
      particles: compositeParticles,
      individualTransforms,
    };
  }

  // ==========================================================================
  // Seamless Loop Continuity Verification
  // ==========================================================================

  /**
   * Verifies that an effect evaluates with zero visual discontinuity across the loop seam (t = 0 vs t = 1).
   */
  verifyLoopContinuity(
    effect: AnimationEffect,
    params: Record<string, any> = {},
  ): { isSeamless: boolean; maxDelta: number; seamJumpDescription?: string } {
    const dummyContext0: FrameContext = {
      timeSeconds: 0,
      normalizedTime: 0.0,
      duration: 3.0,
      fps: 15,
      frameIndex: 0,
      totalFrames: 45,
      width: 512,
      height: 512,
      seed: 42,
      pixelArtMode: false,
    };

    // Evaluate at t=0 and t=1.0 (limit as normalizedTime reaches 1.0)
    const dummyContext1: FrameContext = {
      ...dummyContext0,
      timeSeconds: 3.0,
      normalizedTime: 1.0,
      frameIndex: 45,
    };

    const t0 = effect.evaluate(dummyContext0, params);
    const t1 = effect.evaluate(dummyContext1, params);

    const deltaScale = Math.abs((t0.scale ?? 1.0) - (t1.scale ?? 1.0));
    const deltaTx = Math.abs((t0.translateX ?? 0) - (t1.translateX ?? 0));
    const deltaTy = Math.abs((t0.translateY ?? 0) - (t1.translateY ?? 0));
    const deltaRot = Math.abs((t0.rotationDegrees ?? 0) - (t1.rotationDegrees ?? 0));
    const deltaBright = Math.abs((t0.brightnessMultiplier ?? 1.0) - (t1.brightnessMultiplier ?? 1.0));
    const deltaHue = Math.abs(((t0.hueShiftDegrees ?? 0) % 360) - ((t1.hueShiftDegrees ?? 0) % 360));

    const maxDelta = Math.max(deltaScale, deltaTx, deltaTy, deltaRot, deltaBright, deltaHue);
    const isSeamless = maxDelta < 0.001;

    return {
      isSeamless,
      maxDelta,
      seamJumpDescription: isSeamless
        ? undefined
        : `Discontinuity detected: maxDelta=${maxDelta.toFixed(5)} at loop boundary`,
    };
  }

  // ==========================================================================
  // Resource & Frame Budget Estimator
  // ==========================================================================

  /**
   * Estimates render frame count, uncompressed memory footprint, GIF output size, and latency.
   */
  estimateBudget(dto: EstimateBudgetDto): AnimationBudgetEstimate {
    const totalFrames = Math.max(1, Math.round(dto.duration * dto.fps));
    const frameDelayCentiseconds = Math.max(2, Math.round(100 / dto.fps));

    const uncompressedFrameSizeBytes = dto.width * dto.height * 4;
    const totalRawMemoryBytes = totalFrames * uncompressedFrameSizeBytes;

    // Compression heuristic:
    // Base 256-color paletted GIF has ~0.15 bytes per pixel for clean images
    let compressionFactor = 0.18;
    if (dto.dithering) compressionFactor += 0.05;
    if (dto.pixelArtMode) compressionFactor -= 0.04;

    const effectIds = dto.effectIds ?? [];
    let hasExtremeDistortion = false;
    let particleCount = 0;
    let costPoints = 0;

    for (const id of effectIds) {
      const effect = this.registry.getById(id);
      if (!effect) continue;

      const tier = effect.metadata.performanceCost;
      if (tier === 'EXTREME') {
        hasExtremeDistortion = true;
        costPoints += 8;
        compressionFactor += 0.08;
      } else if (tier === 'HIGH') {
        costPoints += 4;
        compressionFactor += 0.04;
      } else if (tier === 'MEDIUM') {
        costPoints += 2;
        compressionFactor += 0.02;
      } else {
        costPoints += 1;
      }

      if (effect.metadata.generatesParticles) {
        particleCount += 32;
        compressionFactor += 0.05;
      }
    }

    const estimatedGifSizeBytes = Math.round(
      totalFrames * dto.width * dto.height * Math.min(0.6, compressionFactor),
    );

    // Render time estimation (ms)
    // Base canvas blit ~ 2ms/frame + effect computation
    const msPerFrame = 2.0 + (costPoints * 1.5) + (particleCount > 0 ? 3.0 : 0);
    const estimatedRenderTimeMs = Math.round(totalFrames * msPerFrame);

    // Aggregate performance tier
    let aggregatePerformanceTier: PerformanceCostTier = 'LOW';
    if (hasExtremeDistortion || costPoints >= 12 || estimatedRenderTimeMs > 4000) {
      aggregatePerformanceTier = 'EXTREME';
    } else if (costPoints >= 6 || estimatedRenderTimeMs > 2000) {
      aggregatePerformanceTier = 'HIGH';
    } else if (costPoints >= 3 || estimatedRenderTimeMs > 800) {
      aggregatePerformanceTier = 'MEDIUM';
    }

    // Warnings and optimization recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (totalFrames > 150) {
      warnings.push(`High frame count (${totalFrames} frames). Rendering may take over 5 seconds.`);
      recommendations.push('Consider lowering FPS to 12-15 or reducing duration to 2-3 seconds.');
    }

    if (totalRawMemoryBytes > 128 * 1024 * 1024) {
      warnings.push(
        `High uncompressed frame buffer (${(totalRawMemoryBytes / (1024 * 1024)).toFixed(1)} MB).`,
      );
      recommendations.push('Downscale output dimensions to 512x512 or lower for faster export.');
    }

    if (hasExtremeDistortion) {
      warnings.push('Concentric ripple or heavy distortion active; increases per-frame CPU load.');
    }

    if (estimatedGifSizeBytes > 8 * 1024 * 1024) {
      warnings.push(
        `Estimated GIF size (${(estimatedGifSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds 8 MB.`,
      );
      recommendations.push('Disable dithering or reduce particle count to optimize LZW compression.');
    }

    return {
      totalFrames,
      frameDelayCentiseconds,
      uncompressedFrameSizeBytes,
      totalRawMemoryBytes,
      estimatedGifSizeBytes,
      estimatedGifSizeFormatted: this.formatBytes(estimatedGifSizeBytes),
      estimatedRenderTimeMs,
      estimatedRenderTimeFormatted: `${(estimatedRenderTimeMs / 1000).toFixed(2)}s`,
      aggregatePerformanceTier,
      warnings,
      recommendations,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
