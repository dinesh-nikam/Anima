import { Injectable } from '@nestjs/common';
import {
  AnimationEffect,
  EffectMetadata,
  FrameContext,
  EffectTransform,
} from './effect.contract';

/**
 * Palette Cycle Effect
 * Traditional 16-bit palette color cycling for flowing water, neon signs, and energy cores.
 */
@Injectable()
export class PaletteCycleEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'palette_cycle',
    name: 'Palette Cycling',
    category: 'PIXEL_ART',
    description: 'Rotates indexed color ramps to animate flowing rivers, waterfalls, or glowing crystals',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP', 'JPEG'],
    compatibility: ['PIXEL_ART', 'RETRO', 'LIGHTING'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.6 },
    defaultParameters: {
      cycleSpeed: 2.0, // Rotations per second
      direction: 'FORWARD',
    },
    minDuration: 0.5,
    maxDuration: 8.0,
    performanceCost: 'LOW',
    isLoopSafe: true,
    requiresSegmentation: false,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const speed = Number(params.cycleSpeed ?? 2.0);
    const t = context.normalizedTime;
    const cycleOffset = (t * speed * context.duration) % 1.0;

    return {
      hueShiftDegrees: cycleOffset * 360,
      customData: {
        paletteCycleOffset: cycleOffset,
        speed,
      },
    };
  }
}

/**
 * Pixel Outline Glow Effect
 * Highlights the 1-pixel outer contour of character sprites or logos with a pulsing retro glow.
 */
@Injectable()
export class PixelOutlineGlowEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'pixel_outline_glow',
    name: 'Pixel Outline Glow',
    category: 'PIXEL_ART',
    description: 'Extracts the 1-pixel silhouette boundary of sprites and pulses with glowing color',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'RETRO', 'GLITCH', 'LIGHTING'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.7 },
    defaultParameters: {
      outlineThickness: 1,
      outlineColor: '#a855f7',
    },
    minDuration: 0.5,
    maxDuration: 6.0,
    performanceCost: 'LOW',
    isLoopSafe: true,
    requiresSegmentation: true,
    modifiesGeometry: false,
    modifiesColors: true,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const t = context.normalizedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.0 * Math.PI);

    return {
      brightnessMultiplier: 1.0 + pulse * intensity * 0.3,
      customData: {
        outlineGlowActive: true,
        intensity: intensity * pulse,
        outlineColor: params.outlineColor ?? '#a855f7',
      },
    };
  }
}

/**
 * Retro Idle Stepped Effect
 * Discrete stepped vertical bounce quantized strictly to integer pixel coordinates.
 */
@Injectable()
export class RetroIdleSteppedEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'retro_idle_stepped',
    name: 'Retro Idle (Stepped)',
    category: 'PIXEL_ART',
    description: '4-frame retro RPG character idle breathing animation quantized to whole pixels',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'RETRO', 'CAMERA'],
    intensityRange: { min: 0.2, max: 1.0, default: 0.6 },
    defaultParameters: {
      stepCount: 4,
      pixelHop: 2,
    },
    minDuration: 0.5,
    maxDuration: 6.0,
    performanceCost: 'LOW',
    isLoopSafe: true,
    requiresSegmentation: false,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const stepCount = Number(params.stepCount ?? 4);
    const pixelHop = Math.max(1, Math.round(Number(params.pixelHop ?? 2) * intensity));

    const t = context.normalizedTime;
    const currentStep = Math.floor(t * stepCount) % stepCount;
    const stepOffsets = [0, 1, 2, 1];
    const quantizedDy = Math.round((stepOffsets[currentStep] / 2.0) * pixelHop);

    return {
      translateY: quantizedDy,
      customData: {
        currentStep,
        quantizedDy,
      },
    };
  }
}

/**
 * Parallax Depth Effect
 * Splits image into foreground cutout and background plane for layered 2.5D retro motion.
 */
@Injectable()
export class ParallaxDepthEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'parallax_depth',
    name: 'Parallax Depth Multi-Plane',
    category: 'MOTION',
    description: 'Separates foreground sprite from backdrop with differential parallax movement and drop shadow',
    supportedImageTypes: ['PNG', 'GIF', 'WEBP'],
    compatibility: ['PIXEL_ART', 'MOTION', 'CAMERA'],
    intensityRange: { min: 0.1, max: 1.0, default: 0.5 },
    defaultParameters: {
      parallaxSeparation: 0.4,
      castShadow: true,
    },
    minDuration: 1.0,
    maxDuration: 6.0,
    performanceCost: 'MEDIUM',
    isLoopSafe: true,
    requiresSegmentation: true,
    modifiesGeometry: true,
    modifiesColors: false,
    generatesParticles: false,
  };

  evaluate(context: FrameContext, params: Record<string, any>): EffectTransform {
    const intensity = Number(params.intensity ?? this.metadata.intensityRange.default);
    const t = context.normalizedTime;
    const angle = t * 2.0 * Math.PI;

    const amp = intensity * 6.0;
    const fgTranslateX = Math.round(Math.sin(angle) * amp);

    return {
      translateX: fgTranslateX,
      customData: {
        parallaxDepth: true,
        fgTranslateX,
        bgTranslateX: Math.round(-fgTranslateX * 0.4),
      },
    };
  }
}
