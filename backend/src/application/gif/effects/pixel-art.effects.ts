import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class PixelJitterEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'pixel_art_jitter',
    name: 'Pixel Grid Jitter',
    category: 'PIXEL_ART',
    description: 'Grid-locked integer displacement preserving crisp pixel-perfect sharp boundaries.',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'RETRO', 'GLITCH', 'LIGHTING'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.4 },
    defaultParameters: { maxJitterPixels: 2, stepsPerLoop: 8 },
    minDuration: 0.5,
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
    const maxPx = Math.max(1, Math.round((params.maxJitterPixels ?? 2) * intensity));
    const steps = Math.max(4, Math.round(Number(params.stepsPerLoop ?? 8)));
    const t = context.normalizedTime;

    // Quantized step index in [0, steps - 1]
    const stepIdx = Math.floor(t * steps);
    // Integer-quantized displacement meeting f(0) == f(1)
    const sinHarmonic = Math.sin(2.0 * Math.PI * (stepIdx / steps));
    const quantizedDx = Math.round(sinHarmonic * maxPx);

    return {
      translateX: quantizedDx,
      customData: {
        quantized: true,
        pixelStep: stepIdx,
      },
    };
  }
}

@Injectable()
export class SpriteBounceEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'pixel_art_sprite_bounce',
    name: 'Pixel Sprite Bounce',
    category: 'PIXEL_ART',
    description: 'Classic 8-bit/16-bit discrete integer pixel hop with zero sub-pixel interpolation.',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'LIGHTING', 'RETRO', 'CAMERA'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.5 },
    defaultParameters: { hopHeightPx: 4 },
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
    const hopHeight = Math.max(1, Math.round((params.hopHeightPx ?? 4) * intensity));
    const t = context.normalizedTime;

    // Harmonic bounce mapped strictly to integers
    const continuousBounce = Math.pow(Math.sin(Math.PI * t), 2.0);
    const quantizedDy = -Math.round(continuousBounce * hopHeight);

    return {
      translateY: quantizedDy,
      customData: {
        quantized: true,
      },
    };
  }
}

@Injectable()
export class PixelGlowEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'pixel_art_glow',
    name: 'Pixel Palette Pulsing',
    category: 'PIXEL_ART',
    description: 'Crisp palette brightness cycle without anti-aliasing or edge blurring.',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'LIGHTING', 'RETRO'],
    intensityRange: { min: 0.1, max: 0.8, default: 0.3 },
    defaultParameters: { discreteLevels: 5 },
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
    const levels = Math.max(2, Math.round(Number(params.discreteLevels ?? 5)));
    const t = context.normalizedTime;

    // Discrete quantized brightness steps across harmonic cosine
    const smoothCycle = (1.0 - Math.cos(2.0 * Math.PI * t)) / 2.0;
    const steppedCycle = Math.round(smoothCycle * levels) / levels;
    const bright = 1.0 + steppedCycle * intensity * 0.4;

    return {
      brightnessMultiplier: bright,
      customData: {
        quantizedLevel: steppedCycle,
      },
    };
  }
}

@Injectable()
export class ScreenFlickerEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'pixel_art_flicker',
    name: 'Arcade Screen Flicker',
    category: 'PIXEL_ART',
    description: 'Retro arcade cabinet phosphor refresh flicker with integer-locked cycles.',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'RETRO', 'GLITCH'],
    intensityRange: { min: 0.05, max: 0.5, default: 0.15 },
    defaultParameters: { flashRateHz: 2 },
    minDuration: 1.0,
    maxDuration: 6.0,
    performanceCost: 'LOW',
    requiresSegmentation: false,
    isLoopSafe: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const cycles = Math.max(1, Math.round(Number(params.flashRateHz ?? 2)));
    const t = context.normalizedTime;

    // Integer square-ish pulse with harmonic smoothing to guarantee loop safety
    const osc = Math.sin(2.0 * Math.PI * cycles * t);
    const flicker = osc > 0.7 ? 1.0 : (osc < -0.7 ? -1.0 : 0.0);
    const brightness = 1.0 + flicker * intensity * 0.2;

    return {
      brightnessMultiplier: brightness,
      customData: {
        flickerStep: flicker,
      },
    };
  }
}
