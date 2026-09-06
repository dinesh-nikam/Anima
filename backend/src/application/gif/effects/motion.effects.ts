import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class FloatingEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'motion_floating',
    name: 'Floating Hover',
    category: 'MOTION',
    description: 'Smooth weightless vertical floating using a continuous harmonic sine cycle.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['LIGHTING', 'ATMOSPHERE', 'CAMERA', 'COLOR', 'PIXEL_ART'],
    intensityRange: { min: 0.05, max: 0.8, default: 0.25 },
    defaultParameters: { amplitudePx: 12, cycles: 1 },
    minDuration: 1.5,
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
    const amp = (params.amplitudePx ?? 12) * intensity;
    const cycles = Math.max(1, Math.round(Number(params.cycles ?? 1)));
    const t = context.normalizedTime;

    // Pure sine wave guarantees f(0) == f(1) == 0
    const dy = amp * Math.sin(2.0 * Math.PI * cycles * t);

    return {
      translateY: dy,
    };
  }
}

@Injectable()
export class BobbingEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'motion_bobbing',
    name: 'Bobbing and Tilt',
    category: 'MOTION',
    description: 'Buoyant nautical bobbing with synchronized harmonic rotational sway.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['LIGHTING', 'ATMOSPHERE', 'CAMERA', 'DISTORTION'],
    intensityRange: { min: 0.05, max: 0.8, default: 0.2 },
    defaultParameters: { verticalAmpPx: 10, maxTiltDegrees: 3.5 },
    minDuration: 1.5,
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
    const dyAmp = (params.verticalAmpPx ?? 10) * intensity;
    const tiltAmp = (params.maxTiltDegrees ?? 3.5) * intensity;
    const t = context.normalizedTime;

    // Dual harmonic oscillation
    const dy = dyAmp * Math.sin(2.0 * Math.PI * t);
    const rot = tiltAmp * Math.sin(2.0 * Math.PI * t + Math.PI / 4.0); // 45 deg phase offset

    return {
      translateY: dy,
      rotationDegrees: rot,
    };
  }
}

@Injectable()
export class BreathingEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'motion_breathing',
    name: 'Organic Breathing',
    category: 'MOTION',
    description: 'Subtle rhythmic organic expansion and deflation simulating living breath.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['LIGHTING', 'ATMOSPHERE', 'CAMERA', 'COLOR', 'PIXEL_ART'],
    intensityRange: { min: 0.02, max: 0.4, default: 0.1 },
    defaultParameters: { maxScaleDelta: 0.06 },
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
    const delta = (params.maxScaleDelta ?? 0.06) * intensity;
    const t = context.normalizedTime;

    // Smooth cosine breath cycle: f(0) = f(1) = 1.0
    const scale = 1.0 + ((1.0 - Math.cos(2.0 * Math.PI * t)) / 2.0) * delta;

    return {
      scale,
    };
  }
}

@Injectable()
export class ObjectBounceEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'motion_bounce',
    name: 'Squash and Stretch Bounce',
    category: 'MOTION',
    description: 'Classic cartoon physics vertical bounce with volume-preserving squash and stretch.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'LIGHTING', 'PIXEL_ART'],
    intensityRange: { min: 0.1, max: 0.8, default: 0.3 },
    defaultParameters: { bounceHeightPx: 18, squashRatio: 0.15 },
    minDuration: 1.0,
    maxDuration: 6.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const bounceHeight = (params.bounceHeightPx ?? 18) * intensity;
    const squash = (params.squashRatio ?? 0.15) * intensity;
    const t = context.normalizedTime;

    // Harmonic bounce curve: f(0) = f(1) = 0
    const bounce = Math.pow(Math.sin(Math.PI * t), 2.0); // 0 -> 1 -> 0
    const dy = -bounce * bounceHeight;

    // Squash when hitting the ground (near t=0 and t=1)
    const groundFactor = 1.0 - bounce;
    const scaleX = 1.0 + groundFactor * squash;
    const scaleY = 1.0 - groundFactor * squash * 0.8;

    return {
      translateY: dy,
      scale: (scaleX + scaleY) / 2.0,
      customData: {
        scaleX,
        scaleY,
        dy,
      },
    };
  }
}
