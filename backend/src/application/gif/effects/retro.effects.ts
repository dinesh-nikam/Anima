import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class CrtScanlinesEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'retro_crt_scanlines',
    name: 'CRT Scanlines',
    category: 'RETRO',
    description: 'Cathode ray tube horizontal raster scanlines with smooth harmonic roll.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'GLITCH', 'LIGHTING', 'PIXEL_ART'],
    intensityRange: { min: 0.1, max: 0.8, default: 0.35 },
    defaultParameters: { scanlineSpacingPx: 2, rollCycles: 1 },
    minDuration: 1.0,
    maxDuration: 8.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const spacing = Math.max(1, Math.round(Number(params.scanlineSpacingPx ?? 2)));
    const rollCycles = Math.max(1, Math.round(Number(params.rollCycles ?? 1)));
    const rollOffsetPx = Math.round((context.normalizedTime * rollCycles * spacing) % spacing);

    return {
      contrastMultiplier: 1.0 + intensity * 0.1,
      customData: {
        scanlineSpacingPx: spacing,
        rollOffsetPx,
        scanlineAlpha: intensity * 0.45,
      },
    };
  }

  applyPixelTransform(
    sourceBuffer: Uint8Array | Buffer,
    targetBuffer: Uint8Array | Buffer,
    context: FrameContext,
    params: Record<string, any>,
  ): void {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const spacing = Math.max(1, Math.round(Number(params.scanlineSpacingPx ?? 2)));
    const rollOffset = Math.round((context.normalizedTime * spacing) % spacing);
    const darkFactor = 1.0 - intensity * 0.4;
    const { width, height } = context;

    for (let y = 0; y < height; y++) {
      const isScanline = (y + rollOffset) % spacing === 0;
      const factor = isScanline ? darkFactor : 1.0;
      const rowStart = y * width * 4;

      for (let x = 0; x < width; x++) {
        const idx = rowStart + x * 4;
        targetBuffer[idx] = Math.round(sourceBuffer[idx] * factor);
        targetBuffer[idx + 1] = Math.round(sourceBuffer[idx + 1] * factor);
        targetBuffer[idx + 2] = Math.round(sourceBuffer[idx + 2] * factor);
        targetBuffer[idx + 3] = sourceBuffer[idx + 3];
      }
    }
  }
}

@Injectable()
export class VhsDistortionEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'retro_vhs_distortion',
    name: 'VHS Tape Tracking',
    category: 'RETRO',
    description: 'Analog VHS tape tracking distortion with periodic noise bands and color bleed.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['GLITCH', 'RETRO', 'LIGHTING'],
    intensityRange: { min: 0.1, max: 0.8, default: 0.3 },
    defaultParameters: { bandHeightPx: 16, tapeSpeed: 1 },
    minDuration: 1.0,
    maxDuration: 6.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const t = context.normalizedTime;

    // Harmonic periodic horizontal glitch jump
    const jump = Math.sin(2.0 * Math.PI * 3 * t) * Math.cos(2.0 * Math.PI * 1 * t) * 6 * intensity;
    const trackingY = (t * context.height) % context.height;

    return {
      translateX: jump,
      rgbChannelOffsets: {
        r: [Math.round(2 * intensity), 0],
        g: [0, 0],
        b: [-Math.round(2 * intensity), 0],
      },
      customData: {
        trackingLineY: trackingY,
        bandHeight: params.bandHeightPx ?? 16,
      },
    };
  }
}

@Injectable()
export class FilmGrainEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'retro_film_grain',
    name: 'Film Grain',
    category: 'RETRO',
    description: 'Authentic cinematic 35mm silver-halide film grain with cyclic micro-texture.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'MOTION', 'COLOR'],
    intensityRange: { min: 0.05, max: 0.5, default: 0.18 },
    defaultParameters: { grainScale: 1 },
    minDuration: 1.0,
    maxDuration: 10.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    return {
      contrastMultiplier: 1.0 + intensity * 0.08,
      customData: {
        grainAmount: intensity,
        noiseSeed: (context.seed + context.frameIndex * 1013904223) & 0x7fffffff,
      },
    };
  }

  applyPixelTransform(
    sourceBuffer: Uint8Array | Buffer,
    targetBuffer: Uint8Array | Buffer,
    context: FrameContext,
    params: Record<string, any>,
  ): void {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const maxNoise = Math.round(intensity * 40);
    const seed = (context.seed + context.frameIndex * 2654435761) & 0x7fffffff;
    let prng = seed;

    const len = sourceBuffer.length;
    for (let i = 0; i < len; i += 4) {
      // Linear congruential generator step
      prng = (prng * 1664525 + 1013904223) & 0x7fffffff;
      const noise = ((prng % (2 * maxNoise + 1)) - maxNoise);

      targetBuffer[i] = Math.max(0, Math.min(255, sourceBuffer[i] + noise));
      targetBuffer[i + 1] = Math.max(0, Math.min(255, sourceBuffer[i + 1] + noise));
      targetBuffer[i + 2] = Math.max(0, Math.min(255, sourceBuffer[i + 2] + noise));
      targetBuffer[i + 3] = sourceBuffer[i + 3];
    }
  }
}

@Injectable()
export class ChromaticAberrationEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'retro_chromatic_aberration',
    name: 'Chromatic Aberration',
    category: 'RETRO',
    description: 'Optical prism lens refraction splitting red, green, and blue color channels.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'GLITCH', 'LIGHTING', 'MOTION'],
    intensityRange: { min: 0.05, max: 0.8, default: 0.25 },
    defaultParameters: { maxOffsetPx: 6 },
    minDuration: 1.0,
    maxDuration: 8.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const maxOffset = (params.maxOffsetPx ?? 6) * intensity;
    const t = context.normalizedTime;

    // Harmonic breath separation: f(0) == f(1) == 0
    const osc = Math.sin(2.0 * Math.PI * t);
    const dx = Math.round(maxOffset * osc);
    const dy = Math.round(maxOffset * 0.5 * Math.sin(4.0 * Math.PI * t));

    return {
      rgbChannelOffsets: {
        r: [dx, dy],
        g: [0, 0],
        b: [-dx, -dy],
      },
    };
  }

  applyPixelTransform(
    sourceBuffer: Uint8Array | Buffer,
    targetBuffer: Uint8Array | Buffer,
    context: FrameContext,
    params: Record<string, any>,
  ): void {
    const transform = this.evaluate(context, params);
    const offsets = transform.rgbChannelOffsets;
    if (!offsets) return;

    const { width, height } = context;
    const [rx, ry] = offsets.r;
    const [bx, by] = offsets.b;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const destIdx = (y * width + x) * 4;

        // Sample R from (x - rx, y - ry)
        const rxCoord = Math.min(width - 1, Math.max(0, x - rx));
        const ryCoord = Math.min(height - 1, Math.max(0, y - ry));
        const rIdx = (ryCoord * width + rxCoord) * 4;
        targetBuffer[destIdx] = sourceBuffer[rIdx];

        // Sample G from (x, y)
        targetBuffer[destIdx + 1] = sourceBuffer[destIdx + 1];

        // Sample B from (x - bx, y - by)
        const bxCoord = Math.min(width - 1, Math.max(0, x - bx));
        const byCoord = Math.min(height - 1, Math.max(0, y - by));
        const bIdx = (byCoord * width + bxCoord) * 4;
        targetBuffer[destIdx + 2] = sourceBuffer[bIdx + 2];

        // Preserve Alpha
        targetBuffer[destIdx + 3] = sourceBuffer[destIdx + 3];
      }
    }
  }
}
