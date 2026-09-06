import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class ZoomEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'camera_zoom',
    name: 'Camera Zoom',
    category: 'CAMERA',
    description: 'Smooth continuous camera zoom in and out with seamless loop continuity.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['LIGHTING', 'ATMOSPHERE', 'RETRO', 'COLOR', 'PIXEL_ART'],
    intensityRange: { min: 0.05, max: 0.5, default: 0.15 },
    defaultParameters: { direction: 'IN_OUT', zoomScale: 0.15 },
    minDuration: 1.0,
    maxDuration: 10.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    // Smooth cosine oscillation: scale begins at 1.0, expands to 1 + intensity, returns to 1.0
    const delta = ((1.0 - Math.cos(2.0 * Math.PI * context.normalizedTime)) / 2.0) * intensity;
    return {
      scale: 1.0 + delta,
    };
  }
}

@Injectable()
export class CameraShakeEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'camera_shake',
    name: 'Camera Shake',
    category: 'CAMERA',
    description: 'Dynamic kinetic camera vibration using harmonic multi-frequency oscillation.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['GLITCH', 'LIGHTING', 'RETRO'],
    intensityRange: { min: 0.05, max: 0.8, default: 0.2 },
    defaultParameters: { frequency: 3, amplitudePx: 6 },
    minDuration: 0.5,
    maxDuration: 8.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const maxPx = (params.amplitudePx ?? 8) * intensity;
    const t = context.normalizedTime;

    // Harmonic multi-frequency waves ensuring f(0) == f(1) == 0
    const dx = maxPx * (Math.sin(2.0 * Math.PI * 2 * t) + 0.5 * Math.sin(2.0 * Math.PI * 4 * t));
    const dy = maxPx * (Math.cos(2.0 * Math.PI * 3 * t) - 1.0) * 0.5;

    return {
      translateX: dx,
      translateY: dy,
    };
  }
}

@Injectable()
export class MicroMovementEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'micro_movement',
    name: 'Micro Movement',
    category: 'CAMERA',
    description: 'Gentle organic handheld micro-drift bringing subtle vitality to static scenes.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['ATMOSPHERE', 'LIGHTING', 'MOTION', 'COLOR'],
    intensityRange: { min: 0.02, max: 0.3, default: 0.08 },
    defaultParameters: { radiusPx: 4 },
    minDuration: 2.0,
    maxDuration: 10.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const r = (params.radiusPx ?? 4) * intensity;
    const t = context.normalizedTime;

    return {
      translateX: r * Math.sin(2.0 * Math.PI * t),
      translateY: r * Math.sin(4.0 * Math.PI * t) * 0.5,
      rotationDegrees: 0.5 * intensity * Math.sin(2.0 * Math.PI * t),
    };
  }
}
