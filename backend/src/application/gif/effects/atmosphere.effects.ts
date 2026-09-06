import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class FloatingParticlesEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'atmosphere_particles',
    name: 'Floating Particles',
    category: 'ATMOSPHERE',
    description: 'Ambient particulate dust and motes floating along smooth Lissajous periodic paths.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'MOTION', 'COLOR', 'PIXEL_ART'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.5 },
    defaultParameters: { count: 32, maxRadius: 3.5, baseColor: '#ffffff' },
    minDuration: 2.0,
    maxDuration: 10.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: false,
    generatesParticles: true,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const count = Math.max(8, Math.min(128, Math.round((params.count ?? 32) * intensity)));
    const maxRadius = Number(params.maxRadius ?? 3.5);
    const t = context.normalizedTime;
    const { width, height, seed } = context;

    const particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }> = [];

    for (let i = 0; i < count; i++) {
      // Deterministic PRNG pseudo-hash based on particle index and project seed
      const pSeed = (seed * 1103515245 + i * 12345) & 0x7fffffff;
      const x0 = (pSeed % 1000) / 1000.0;
      const y0 = ((pSeed >> 10) % 1000) / 1000.0;
      const speedMult = 1 + (i % 3); // Integer cycles ensure seamless loop wrap

      // Lissajous periodic displacement: guarantees f(0) == f(1)
      const dx = 0.08 * Math.sin(2.0 * Math.PI * speedMult * t + x0 * Math.PI * 2);
      const dy = 0.08 * Math.cos(2.0 * Math.PI * speedMult * t + y0 * Math.PI * 2);

      const px = ((x0 + dx + 1.0) % 1.0) * width;
      const py = ((y0 + dy + 1.0) % 1.0) * height;

      // Opacity breathing cycle
      const opacityOsc = 0.3 + 0.7 * ((1.0 + Math.sin(2.0 * Math.PI * speedMult * t + i)) / 2.0);
      const radius = Math.max(1.0, (1.0 + ((i % 5) / 4.0) * (maxRadius - 1.0)));

      particles.push({
        x: px,
        y: py,
        radius,
        opacity: Number((opacityOsc * 0.75 * intensity).toFixed(3)),
        color: params.baseColor ?? '#ffffff',
      });
    }

    return {
      particles,
      overlayAlpha: 0.1 * intensity,
    };
  }
}

@Injectable()
export class RainEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'atmosphere_rain',
    name: 'Rain Streaks',
    category: 'ATMOSPHERE',
    description: 'Dynamic atmospheric rainfall with continuous cyclic wrap and directional slant.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'RETRO', 'GLITCH'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.5 },
    defaultParameters: { dropCount: 64, slantDegrees: -12, dropLength: 14 },
    minDuration: 1.0,
    maxDuration: 8.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: true,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const dropCount = Math.max(16, Math.min(160, Math.round((params.dropCount ?? 64) * intensity)));
    const t = context.normalizedTime;
    const { width, height, seed } = context;

    const particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }> = [];

    // Integer drop cycles per loop to enforce flawless loop wrap
    const CYCLES = 4;

    for (let i = 0; i < dropCount; i++) {
      const pSeed = (seed * 1664525 + i * 1013904223) & 0x7fffffff;
      const x0 = (pSeed % 1000) / 1000.0;
      const y0 = ((pSeed >> 9) % 1000) / 1000.0;

      // Linear motion wrapped modulo 1.0 with integer cycles
      const yNorm = (y0 + CYCLES * t) % 1.0;
      const xNorm = (x0 + CYCLES * t * -0.2 + 10.0) % 1.0;

      particles.push({
        x: xNorm * width,
        y: yNorm * height,
        radius: 1.2,
        opacity: Number((0.4 + 0.5 * ((i % 3) / 2.0) * intensity).toFixed(3)),
        color: 'rgba(180, 215, 255, 0.7)',
      });
    }

    return {
      brightnessMultiplier: 0.95, // Atmospheric dampening
      contrastMultiplier: 1.05,
      particles,
      customData: {
        slantDegrees: params.slantDegrees ?? -12,
        dropLength: params.dropLength ?? 14,
      },
    };
  }
}

@Injectable()
export class SnowEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'atmosphere_snow',
    name: 'Gentle Snowfall',
    category: 'ATMOSPHERE',
    description: 'Serene winter snowfall with swaying horizontal sinusoidal flutter and cyclic wrap.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'MOTION', 'COLOR'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.4 },
    defaultParameters: { flakeCount: 48, swayAmplitudePx: 12 },
    minDuration: 2.0,
    maxDuration: 10.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: false,
    generatesParticles: true,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const flakeCount = Math.max(12, Math.min(128, Math.round((params.flakeCount ?? 48) * intensity)));
    const t = context.normalizedTime;
    const { width, height, seed } = context;
    const swayAmp = (params.swayAmplitudePx ?? 12) * intensity;

    const particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }> = [];
    const CYCLES = 2; // Exact vertical cycles for seamless repetition

    for (let i = 0; i < flakeCount; i++) {
      const pSeed = (seed * 22695477 + i * 1) & 0x7fffffff;
      const x0 = (pSeed % 1000) / 1000.0;
      const y0 = ((pSeed >> 8) % 1000) / 1000.0;

      const yNorm = (y0 + CYCLES * t) % 1.0;
      // Sway uses integer harmonics ensuring f(0) == f(1)
      const swayPx = swayAmp * Math.sin(2.0 * Math.PI * (CYCLES * 2) * t + i);

      const px = Math.min(width, Math.max(0, x0 * width + swayPx));
      const py = yNorm * height;
      const radius = 1.5 + (i % 4) * 0.8;

      particles.push({
        x: px,
        y: py,
        radius,
        opacity: Number((0.5 + 0.4 * ((i % 4) / 3.0)).toFixed(3)),
        color: '#ffffff',
      });
    }

    return {
      particles,
    };
  }
}

@Injectable()
export class SparkEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'atmosphere_sparks',
    name: 'Ember Sparks',
    category: 'ATMOSPHERE',
    description: 'Incandescent ascending embers and sparks with harmonic fade and radiant flutter.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['LIGHTING', 'CAMERA', 'RETRO', 'GLITCH'],
    intensityRange: { min: 0.1, max: 0.9, default: 0.45 },
    defaultParameters: { sparkCount: 36, sparkColor: '#ffaa33' },
    minDuration: 1.5,
    maxDuration: 8.0,
    performanceCost: 'MEDIUM',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: false,
    generatesParticles: true,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const count = Math.max(10, Math.min(80, Math.round((params.sparkCount ?? 36) * intensity)));
    const t = context.normalizedTime;
    const { width, height, seed } = context;

    const particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }> = [];
    const ASCENT_CYCLES = 3;

    for (let i = 0; i < count; i++) {
      const pSeed = (seed * 1103515245 + i * 54321) & 0x7fffffff;
      const x0 = (pSeed % 1000) / 1000.0;
      const y0 = ((pSeed >> 8) % 1000) / 1000.0;

      // Ascend upwards (decrease y) with modulo wrap
      const yNorm = (y0 - ASCENT_CYCLES * t + 10.0) % 1.0;
      const xJitter = 0.03 * Math.sin(2.0 * Math.PI * ASCENT_CYCLES * t + i * 1.5);
      const px = ((x0 + xJitter + 1.0) % 1.0) * width;
      const py = yNorm * height;

      // Brightness pulse along the ascent
      const lifePhase = (yNorm) * Math.PI;
      const opacity = Math.max(0.1, Math.sin(lifePhase)) * intensity;

      particles.push({
        x: px,
        y: py,
        radius: 1.2 + (i % 3) * 0.7,
        opacity: Number(opacity.toFixed(3)),
        color: params.sparkColor ?? (i % 2 === 0 ? '#ffb347' : '#ff5722'),
      });
    }

    return {
      particles,
      brightnessMultiplier: 1.0 + 0.05 * intensity,
    };
  }
}
