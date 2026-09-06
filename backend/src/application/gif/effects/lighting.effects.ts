import { Injectable } from '@nestjs/common';
import { AnimationEffect, EffectMetadata, FrameContext, EffectTransform } from './effect.contract';

@Injectable()
export class GlowPulseEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'lighting_glow_pulse',
    name: 'Glow Pulse',
    category: 'LIGHTING',
    description: 'Rhythmic ambient luminance pulsing with smooth harmonic breath cycles.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'ATMOSPHERE', 'RETRO', 'COLOR', 'PIXEL_ART'],
    intensityRange: { min: 0.05, max: 0.8, default: 0.25 },
    defaultParameters: { frequency: 1, minBrightness: 0.9, maxBrightness: 1.3 },
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
    const freq = Math.max(1, Math.round(Number(params.frequency ?? 1)));
    const t = context.normalizedTime;

    // Harmonic cosine cycle: f(0) = f(1) = 1.0
    const oscillation = (1.0 - Math.cos(2.0 * Math.PI * freq * t)) / 2.0;
    const brightnessBoost = 1.0 + oscillation * intensity * 0.4;
    const overlayAlpha = oscillation * intensity * 0.35;

    return {
      brightnessMultiplier: brightnessBoost,
      contrastMultiplier: 1.0 + oscillation * intensity * 0.15,
      overlayAlpha,
      customData: {
        glowRadiusPx: Math.round(20 * intensity * (1.0 + oscillation)),
        color: '#ffffff',
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
    const freq = Math.max(1, Math.round(Number(params.frequency ?? 1)));
    const oscillation = (1.0 - Math.cos(2.0 * Math.PI * freq * context.normalizedTime)) / 2.0;
    const factor = 1.0 + oscillation * intensity * 0.35;

    const len = sourceBuffer.length;
    for (let i = 0; i < len; i += 4) {
      targetBuffer[i] = Math.min(255, Math.round(sourceBuffer[i] * factor));
      targetBuffer[i + 1] = Math.min(255, Math.round(sourceBuffer[i + 1] * factor));
      targetBuffer[i + 2] = Math.min(255, Math.round(sourceBuffer[i + 2] * factor));
      targetBuffer[i + 3] = sourceBuffer[i + 3]; // Preserve alpha
    }
  }
}

@Injectable()
export class NeonFlickerEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'lighting_neon_flicker',
    name: 'Neon Flicker',
    category: 'LIGHTING',
    description: 'Electric tube neon flicker with deterministic periodic high-frequency spikes.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['RETRO', 'GLITCH', 'CAMERA'],
    intensityRange: { min: 0.1, max: 0.9, default: 0.3 },
    defaultParameters: { baseDimLevel: 0.85, flickerHarmonics: 3 },
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
    const t = context.normalizedTime;

    // Periodic harmonic multi-frequency waveform strictly meeting f(0) == f(1) == 0
    const harmonic1 = Math.sin(2.0 * Math.PI * 1 * t);
    const harmonic3 = Math.sin(2.0 * Math.PI * 3 * t) * 0.5;
    const harmonic7 = Math.sin(2.0 * Math.PI * 7 * t) * 0.25;
    const harmonic13 = Math.sin(2.0 * Math.PI * 13 * t) * 0.125;
    const combined = (harmonic1 + harmonic3 + harmonic7 + harmonic13) / 1.875;

    const flicker = Math.max(0, combined);
    const brightness = 1.0 + flicker * intensity * 0.5 - (1.0 - flicker) * intensity * 0.15;

    return {
      brightnessMultiplier: Math.max(0.2, brightness),
      contrastMultiplier: 1.0 + flicker * intensity * 0.2,
      overlayAlpha: flicker * intensity * 0.25,
      customData: {
        flickerIntensity: flicker,
      },
    };
  }
}

@Injectable()
export class LightSweepEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'lighting_light_sweep',
    name: 'Light Sweep',
    category: 'LIGHTING',
    description: 'Diagonal optical highlight specular beam sweeping seamlessly across the canvas.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'COLOR', 'ATMOSPHERE', 'MOTION'],
    intensityRange: { min: 0.1, max: 0.8, default: 0.35 },
    defaultParameters: { angleDegrees: 45, beamWidthNormalized: 0.2 },
    minDuration: 1.5,
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
    const t = context.normalizedTime;
    const angle = Number(params.angleDegrees ?? 45);
    const beamWidth = Number(params.beamWidthNormalized ?? 0.2);

    // Position sweeps across the normalized range [-beamWidth, 1 + beamWidth]
    // To ensure loop safety, sweep completes an exact integer cycle
    const sweepProgress = t;

    return {
      brightnessMultiplier: 1.0 + Math.sin(Math.PI * sweepProgress) * intensity * 0.3,
      overlayAlpha: intensity * 0.4,
      customData: {
        sweepCenterNormalized: sweepProgress,
        angleDegrees: angle,
        beamWidthNormalized: beamWidth,
        beamColor: 'rgba(255, 255, 255, 0.4)',
      },
    };
  }
}

@Injectable()
export class ScreenGlowEffect implements AnimationEffect {
  readonly metadata: EffectMetadata = {
    id: 'lighting_screen_glow',
    name: 'Screen Glow',
    category: 'LIGHTING',
    description: 'Cinematic radial screen vignette bloom and atmospheric luminance expansion.',
    supportedImageTypes: ['PNG', 'JPEG', 'WEBP', 'GIF'],
    compatibility: ['CAMERA', 'ATMOSPHERE', 'RETRO', 'PIXEL_ART'],
    intensityRange: { min: 0.05, max: 0.7, default: 0.2 },
    defaultParameters: { radiusFraction: 0.75, innerAlpha: 0.3 },
    minDuration: 2.0,
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
    const t = context.normalizedTime;
    const oscillation = (1.0 - Math.cos(2.0 * Math.PI * t)) / 2.0;

    return {
      brightnessMultiplier: 1.0 + oscillation * intensity * 0.25,
      contrastMultiplier: 1.0 + oscillation * intensity * 0.1,
      overlayAlpha: oscillation * intensity * 0.3,
      customData: {
        radiusFraction: 0.6 + oscillation * 0.2,
        falloff: 'radial-gaussian',
      },
    };
  }
}
