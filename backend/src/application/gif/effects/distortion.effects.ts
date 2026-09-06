import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class WaveDistortionEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'distortion_wave',
    name: 'Sine Wave Distortion',
    category: 'DISTORTION',
    description: 'Continuous horizontal sinusoidal wave ripple propagating seamlessly across rows.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['GLITCH', 'RETRO', 'COLOR', 'LIGHTING'],
    intensityRange: { min: 0.1, max: 0.9, default: 0.35 },
    defaultParameters: { waveCount: 3, amplitudePx: 10, speedCycles: 1 },
    minDuration: 1.0,
    maxDuration: 8.0,
    performanceCost: 'HIGH',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const amp = (params.amplitudePx ?? 10) * intensity;
    const waveCount = params.waveCount ?? 3;
    const speedCycles = Math.max(1, Math.round(Number(params.speedCycles ?? 1)));

    return {
      translateX: amp * 0.3 * Math.sin(2.0 * Math.PI * speedCycles * context.normalizedTime),
      customData: {
        amplitudePx: amp,
        waveCount,
        phase: 2.0 * Math.PI * speedCycles * context.normalizedTime,
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
    const amp = (params.amplitudePx ?? 10) * intensity;
    const waves = Number(params.waveCount ?? 3);
    const speedCycles = Math.max(1, Math.round(Number(params.speedCycles ?? 1)));
    const phase = 2.0 * Math.PI * speedCycles * context.normalizedTime;
    const { width, height } = context;

    for (let y = 0; y < height; y++) {
      // Harmonic displacement along y: seamless over normalized time
      const shiftX = Math.round(amp * Math.sin((y / height) * waves * 2.0 * Math.PI + phase));
      const rowStart = y * width * 4;

      for (let x = 0; x < width; x++) {
        const srcX = Math.min(width - 1, Math.max(0, x - shiftX));
        const srcIdx = rowStart + srcX * 4;
        const dstIdx = rowStart + x * 4;

        targetBuffer[dstIdx] = sourceBuffer[srcIdx];
        targetBuffer[dstIdx + 1] = sourceBuffer[srcIdx + 1];
        targetBuffer[dstIdx + 2] = sourceBuffer[srcIdx + 2];
        targetBuffer[dstIdx + 3] = sourceBuffer[srcIdx + 3];
      }
    }
  }
}

@Injectable()
export class RippleEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'distortion_ripple',
    name: 'Concentric Water Ripple',
    category: 'DISTORTION',
    description: 'Circular water droplet ripples expanding from center with continuous phase wrapping.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['GLITCH', 'RETRO', 'COLOR', 'CAMERA'],
    intensityRange: { min: 0.1, max: 0.8, default: 0.3 },
    defaultParameters: { rings: 4, amplitudePx: 8, cycles: 2 },
    minDuration: 1.5,
    maxDuration: 8.0,
    performanceCost: 'EXTREME',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const amp = (params.amplitudePx ?? 8) * intensity;
    const cycles = Math.max(1, Math.round(Number(params.cycles ?? 2)));

    return {
      customData: {
        amplitudePx: amp,
        rings: params.rings ?? 4,
        phase: 2.0 * Math.PI * cycles * context.normalizedTime,
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
    const amp = (params.amplitudePx ?? 8) * intensity;
    const rings = Number(params.rings ?? 4);
    const cycles = Math.max(1, Math.round(Number(params.cycles ?? 2)));
    const phase = 2.0 * Math.PI * cycles * context.normalizedTime;
    const { width, height } = context;

    const cx = width / 2.0;
    const cy = height / 2.0;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
      const dy = y - cy;
      const dy2 = dy * dy;

      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dist = Math.sqrt(dx * dx + dy2);

        if (dist === 0) {
          const idx = (y * width + x) * 4;
          targetBuffer[idx] = sourceBuffer[idx];
          targetBuffer[idx + 1] = sourceBuffer[idx + 1];
          targetBuffer[idx + 2] = sourceBuffer[idx + 2];
          targetBuffer[idx + 3] = sourceBuffer[idx + 3];
          continue;
        }

        // Concentric radial wave offset
        const wave = Math.sin((dist / maxRadius) * rings * 2.0 * Math.PI - phase);
        const shift = amp * wave * (1.0 - dist / maxRadius);

        const srcX = Math.min(width - 1, Math.max(0, Math.round(x + (dx / dist) * shift)));
        const srcY = Math.min(height - 1, Math.max(0, Math.round(y + (dy / dist) * shift)));

        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;

        targetBuffer[dstIdx] = sourceBuffer[srcIdx];
        targetBuffer[dstIdx + 1] = sourceBuffer[srcIdx + 1];
        targetBuffer[dstIdx + 2] = sourceBuffer[srcIdx + 2];
        targetBuffer[dstIdx + 3] = sourceBuffer[srcIdx + 3];
      }
    }
  }
}
