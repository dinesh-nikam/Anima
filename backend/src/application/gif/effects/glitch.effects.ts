import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class RgbShiftEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'glitch_rgb_shift',
    name: 'RGB Glitch Shift',
    category: 'GLITCH',
    description: 'Cyberpunk chromatic separation bursts with high-frequency harmonic kicks.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['RETRO', 'CAMERA', 'DISTORTION'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.4 },
    defaultParameters: { kickCount: 2, maxShiftPx: 12 },
    minDuration: 0.5,
    maxDuration: 6.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const maxShift = (params.maxShiftPx ?? 12) * intensity;
    const t = context.normalizedTime;

    // Harmonic spike envelope: sharp localized bursts that strictly zero at t=0 and t=1
    const burst1 = Math.pow(Math.sin(Math.PI * t), 16);
    const burst2 = Math.pow(Math.sin(Math.PI * 2 * t), 16);
    const envelope = Math.max(burst1, burst2);

    const shiftX = Math.round(maxShift * envelope * Math.sin(2.0 * Math.PI * 8 * t));
    const shiftY = Math.round(maxShift * 0.3 * envelope * Math.cos(2.0 * Math.PI * 8 * t));

    return {
      rgbChannelOffsets: {
        r: [shiftX, shiftY],
        g: [0, 0],
        b: [-shiftX, -shiftY],
      },
      customData: {
        envelope,
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

        const rxCoord = Math.min(width - 1, Math.max(0, x - rx));
        const ryCoord = Math.min(height - 1, Math.max(0, y - ry));
        const rIdx = (ryCoord * width + rxCoord) * 4;
        targetBuffer[destIdx] = sourceBuffer[rIdx];

        targetBuffer[destIdx + 1] = sourceBuffer[destIdx + 1];

        const bxCoord = Math.min(width - 1, Math.max(0, x - bx));
        const byCoord = Math.min(height - 1, Math.max(0, y - by));
        const bIdx = (byCoord * width + bxCoord) * 4;
        targetBuffer[destIdx + 2] = sourceBuffer[bIdx + 2];

        targetBuffer[destIdx + 3] = sourceBuffer[destIdx + 3];
      }
    }
  }
}

@Injectable()
export class PixelDisplacementEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'glitch_pixel_displacement',
    name: 'Slice Displacement',
    category: 'GLITCH',
    description: 'Horizontal line slice block shifts and tear lines with periodic return.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['RETRO', 'CAMERA', 'DISTORTION'],
    intensityRange: { min: 0.1, max: 0.9, default: 0.35 },
    defaultParameters: { sliceCount: 8, maxOffsetPx: 16 },
    minDuration: 1.0,
    maxDuration: 6.0,
    performanceCost: 'HIGH',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const t = context.normalizedTime;

    // Periodic harmonic activity gate
    const activity = Math.pow(Math.sin(2.0 * Math.PI * t), 8);
    const offset = Math.round(intensity * (params.maxOffsetPx ?? 16) * activity);

    return {
      translateX: offset,
      customData: {
        sliceActivity: activity,
        sliceCount: params.sliceCount ?? 8,
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
    const t = context.normalizedTime;
    const { width, height, seed } = context;

    // Zero out at t=0 and t=1
    const burst = Math.pow(Math.sin(Math.PI * t), 12);
    if (burst < 0.05) {
      targetBuffer.set(sourceBuffer);
      return;
    }

    const maxShift = Math.round((params.maxOffsetPx ?? 20) * intensity * burst);
    const sliceCount = params.sliceCount ?? 6;
    const sliceHeight = Math.max(4, Math.floor(height / sliceCount));

    for (let s = 0; s < sliceCount; s++) {
      const pSeed = (seed + s * 7919) & 0x7fffffff;
      const shift = ((pSeed % 2 === 0 ? 1 : -1) * (pSeed % maxShift));
      const yStart = s * sliceHeight;
      const yEnd = Math.min(height, yStart + sliceHeight);

      for (let y = yStart; y < yEnd; y++) {
        for (let x = 0; x < width; x++) {
          const srcX = Math.min(width - 1, Math.max(0, x - shift));
          const srcIdx = (y * width + srcX) * 4;
          const dstIdx = (y * width + x) * 4;

          targetBuffer[dstIdx] = sourceBuffer[srcIdx];
          targetBuffer[dstIdx + 1] = sourceBuffer[srcIdx + 1];
          targetBuffer[dstIdx + 2] = sourceBuffer[srcIdx + 2];
          targetBuffer[dstIdx + 3] = sourceBuffer[srcIdx + 3];
        }
      }
    }
  }
}

@Injectable()
export class DigitalNoiseEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'glitch_digital_noise',
    name: 'Digital Noise Burst',
    category: 'GLITCH',
    description: 'Quantized digital pixel corruption block bursts with cyclic envelope damping.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['RETRO', 'GLITCH', 'LIGHTING'],
    intensityRange: { min: 0.05, max: 0.7, default: 0.25 },
    defaultParameters: { blockSizePx: 8, corruptionRate: 0.08 },
    minDuration: 1.0,
    maxDuration: 6.0,
    performanceCost: 'HIGH',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const t = context.normalizedTime;

    // Harmonic burst pulse: zero at t=0 and t=1
    const burst = Math.pow(Math.sin(2.0 * Math.PI * t), 10) * intensity;

    return {
      contrastMultiplier: 1.0 + burst * 0.3,
      customData: {
        burstIntensity: burst,
        blockSizePx: params.blockSizePx ?? 8,
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
    const t = context.normalizedTime;
    const burst = Math.pow(Math.sin(2.0 * Math.PI * t), 10);
    const { width, height, seed } = context;

    if (burst < 0.05) {
      targetBuffer.set(sourceBuffer);
      return;
    }

    targetBuffer.set(sourceBuffer);
    const blockSize = Math.max(4, Number(params.blockSizePx ?? 8));
    const blocksX = Math.floor(width / blockSize);
    const blocksY = Math.floor(height / blockSize);
    const totalBlocks = blocksX * blocksY;
    const corruptCount = Math.floor(totalBlocks * intensity * burst * 0.25);

    let prng = (seed + context.frameIndex * 4099) & 0x7fffffff;
    for (let c = 0; c < corruptCount; c++) {
      prng = (prng * 1103515245 + 12345) & 0x7fffffff;
      const bx = (prng % blocksX) * blockSize;
      const by = ((prng >> 8) % blocksY) * blockSize;
      const fillR = (prng >> 16) & 0xff;
      const fillG = (prng >> 12) & 0xff;
      const fillB = (prng >> 4) & 0xff;

      for (let y = by; y < Math.min(height, by + blockSize); y++) {
        for (let x = bx; x < Math.min(width, bx + blockSize); x++) {
          const idx = (y * width + x) * 4;
          targetBuffer[idx] = fillR;
          targetBuffer[idx + 1] = fillG;
          targetBuffer[idx + 2] = fillB;
        }
      }
    }
  }
}
