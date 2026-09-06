import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class HueShiftEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'color_hue_shift',
    name: 'Hue Cycle Rotation',
    category: 'COLOR',
    description: 'Continuous 360-degree chromatic hue spectrum rotation with seamless cycle closure.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'MOTION', 'RETRO'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.5 },
    defaultParameters: { fullCycles: 1 },
    minDuration: 1.0,
    maxDuration: 10.0,
    performanceCost: 'HIGH',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const cycles = Math.max(1, Math.round(Number(params.fullCycles ?? 1)));
    const t = context.normalizedTime;

    // Exactly 360 degrees * cycles guarantees 360 == 0 at loop boundary
    const deg = (360.0 * cycles * t) % 360.0;

    return {
      hueShiftDegrees: deg,
    };
  }

  applyPixelTransform(
    sourceBuffer: Uint8Array | Buffer,
    targetBuffer: Uint8Array | Buffer,
    context: FrameContext,
    params: Record<string, any>,
  ): void {
    const transform = this.evaluate(context, params);
    const deg = transform.hueShiftDegrees ?? 0;
    const rad = (deg * Math.PI) / 180.0;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Precise 3x3 RGB hue rotation matrix (preserving Rec. 709 luminance)
    const m00 = 0.213 + cosA * 0.787 - sinA * 0.213;
    const m01 = 0.715 - cosA * 0.715 - sinA * 0.715;
    const m02 = 0.072 - cosA * 0.072 + sinA * 0.928;

    const m10 = 0.213 - cosA * 0.213 + sinA * 0.143;
    const m11 = 0.715 + cosA * 0.285 + sinA * 0.140;
    const m12 = 0.072 - cosA * 0.072 - sinA * 0.283;

    const m20 = 0.213 - cosA * 0.213 - sinA * 0.787;
    const m21 = 0.715 - cosA * 0.715 + sinA * 0.715;
    const m22 = 0.072 + cosA * 0.928 + sinA * 0.072;

    const len = sourceBuffer.length;
    for (let i = 0; i < len; i += 4) {
      const r = sourceBuffer[i];
      const g = sourceBuffer[i + 1];
      const b = sourceBuffer[i + 2];

      targetBuffer[i] = Math.max(0, Math.min(255, Math.round(r * m00 + g * m01 + b * m02)));
      targetBuffer[i + 1] = Math.max(0, Math.min(255, Math.round(r * m10 + g * m11 + b * m12)));
      targetBuffer[i + 2] = Math.max(0, Math.min(255, Math.round(r * m20 + g * m21 + b * m22)));
      targetBuffer[i + 3] = sourceBuffer[i + 3];
    }
  }
}

@Injectable()
export class SaturationPulseEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'color_saturation_pulse',
    name: 'Saturation Pulse',
    category: 'COLOR',
    description: 'Vivid color saturation modulation pulsing rhythmically on harmonic cycles.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'MOTION', 'RETRO'],
    intensityRange: { min: 0.1, max: 0.9, default: 0.4 },
    defaultParameters: { minSat: 0.5, maxSat: 1.8 },
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
    const t = context.normalizedTime;

    // Harmonic sine cycle: f(0) == f(1) == 1.0
    const osc = Math.sin(2.0 * Math.PI * t);
    const sat = 1.0 + osc * intensity * 0.8;

    return {
      saturationMultiplier: Math.max(0.0, sat),
    };
  }

  applyPixelTransform(
    sourceBuffer: Uint8Array | Buffer,
    targetBuffer: Uint8Array | Buffer,
    context: FrameContext,
    params: Record<string, any>,
  ): void {
    const transform = this.evaluate(context, params);
    const sat = transform.saturationMultiplier ?? 1.0;
    const len = sourceBuffer.length;

    for (let i = 0; i < len; i += 4) {
      const r = sourceBuffer[i];
      const g = sourceBuffer[i + 1];
      const b = sourceBuffer[i + 2];

      // Rec. 709 Grayscale Luminance
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      targetBuffer[i] = Math.max(0, Math.min(255, Math.round(lum + sat * (r - lum))));
      targetBuffer[i + 1] = Math.max(0, Math.min(255, Math.round(lum + sat * (g - lum))));
      targetBuffer[i + 2] = Math.max(0, Math.min(255, Math.round(lum + sat * (b - lum))));
      targetBuffer[i + 3] = sourceBuffer[i + 3];
    }
  }
}

@Injectable()
export class BrightnessPulseEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'color_brightness_pulse',
    name: 'Brightness Harmonic Pulse',
    category: 'COLOR',
    description: 'Harmonic brightness wave modulation with flawless loop continuity.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'ATMOSPHERE', 'MOTION', 'RETRO'],
    intensityRange: { min: 0.05, max: 0.6, default: 0.2 },
    defaultParameters: { cycles: 1 },
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
    const cycles = Math.max(1, Math.round(Number(params.cycles ?? 1)));
    const t = context.normalizedTime;

    // Harmonic cosine cycle: f(0) = f(1) = 1.0
    const osc = (1.0 - Math.cos(2.0 * Math.PI * cycles * t)) / 2.0;
    const bright = 1.0 + osc * intensity * 0.5 - (1.0 - osc) * intensity * 0.15;

    return {
      brightnessMultiplier: bright,
    };
  }
}
