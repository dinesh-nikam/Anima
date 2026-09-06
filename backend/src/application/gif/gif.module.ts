import { Module } from '@nestjs/common';
import { ImageInspectorService } from './services/image-inspector.service';
import { ImageAnalyzerService } from './services/image-analyzer.service';
import { GifAssetService } from './services/gif-asset.service';
import { GifProjectService } from './services/gif-project.service';
import { GifController } from '../../api/controllers/gif.controller';
import { AuthService } from '../services/auth.service';
import { GithubClient } from '../../integration/github.client';
import { EncryptionService } from '../../security/encryption.service';
import { SessionService } from '../../infrastructure/external-services/session.service';
import { AuthGuard } from '../../security/auth.guard';

// Effect Registry & Engine
import { EffectRegistryService } from './registry/effect-registry.service';
import { AnimationEngineService } from './services/animation-engine.service';
import { RandomizationEngineService } from './services/randomization-engine.service';

// Phase 6 Rendering & Encoding Services
import { GifQuantizerService } from './services/gif-quantizer.service';
import { GifDitheringService } from './services/gif-dithering.service';
import { FrameRasterizerService } from './services/frame-rasterizer.service';
import { GifRenderingService } from './services/gif-rendering.service';
import { GifOptimizerService } from './services/gif-optimizer.service';
import { GifExportService } from './services/gif-export.service';

// Camera Effects
import {
  ZoomEffect,
  CameraShakeEffect,
  MicroMovementEffect,
} from './effects/camera.effects';

// Lighting Effects
import {
  GlowPulseEffect,
  NeonFlickerEffect,
  LightSweepEffect,
  ScreenGlowEffect,
} from './effects/lighting.effects';

// Atmosphere Effects
import {
  FloatingParticlesEffect,
  RainEffect,
  SnowEffect,
  SparkEffect,
} from './effects/atmosphere.effects';

// Retro Effects
import {
  CrtScanlinesEffect,
  VhsDistortionEffect,
  FilmGrainEffect,
  ChromaticAberrationEffect,
} from './effects/retro.effects';

// Glitch Effects
import {
  RgbShiftEffect,
  PixelDisplacementEffect,
  DigitalNoiseEffect,
} from './effects/glitch.effects';

// Motion Effects
import {
  FloatingEffect,
  BobbingEffect,
  BreathingEffect,
  ObjectBounceEffect,
} from './effects/motion.effects';

// Distortion Effects
import {
  WaveDistortionEffect,
  RippleEffect,
} from './effects/distortion.effects';

// Color Effects
import {
  HueShiftEffect,
  SaturationPulseEffect,
  BrightnessPulseEffect,
} from './effects/color.effects';

// Pixel Art Effects
import {
  PixelJitterEffect,
  SpriteBounceEffect,
  PixelGlowEffect,
  ScreenFlickerEffect,
} from './effects/pixel-art.effects';

// Phase 7 Advanced Pixel & Multi-Plane Effects
import {
  PaletteCycleEffect,
  PixelOutlineGlowEffect,
  RetroIdleSteppedEffect,
  ParallaxDepthEffect,
} from './effects/advanced-pixel.effects';

// Phase 7 Services
import { PixelArtAnalyzerService } from './services/pixel-art-analyzer.service';
import { PaletteCyclingService } from './services/palette-cycling.service';

// Phase 9 Security, Guardrails, and Observability
import { SecuritySanitizerService } from './services/security-sanitizer.service';
import { GifGuardrailsService } from './services/gif-guardrails.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { GifMetricsService } from './services/gif-metrics.service';
import { GifAuditInterceptor } from './interceptors/gif-audit.interceptor';

import { ForensicAuditService } from './services/forensic-audit.service';

const EFFECT_PROVIDERS = [
  // Camera
  ZoomEffect,
  CameraShakeEffect,
  MicroMovementEffect,
  // Lighting
  GlowPulseEffect,
  NeonFlickerEffect,
  LightSweepEffect,
  ScreenGlowEffect,
  // Atmosphere
  FloatingParticlesEffect,
  RainEffect,
  SnowEffect,
  SparkEffect,
  // Retro
  CrtScanlinesEffect,
  VhsDistortionEffect,
  FilmGrainEffect,
  ChromaticAberrationEffect,
  // Glitch
  RgbShiftEffect,
  PixelDisplacementEffect,
  DigitalNoiseEffect,
  // Motion
  FloatingEffect,
  BobbingEffect,
  BreathingEffect,
  ObjectBounceEffect,
  // Distortion
  WaveDistortionEffect,
  RippleEffect,
  // Color
  HueShiftEffect,
  SaturationPulseEffect,
  BrightnessPulseEffect,
  // Pixel Art
  PixelJitterEffect,
  SpriteBounceEffect,
  PixelGlowEffect,
  ScreenFlickerEffect,
  PaletteCycleEffect,
  PixelOutlineGlowEffect,
  RetroIdleSteppedEffect,
  ParallaxDepthEffect,
];

@Module({
  controllers: [GifController],
  providers: [
    ImageInspectorService,
    ImageAnalyzerService,
    PixelArtAnalyzerService,
    PaletteCyclingService,
    GifAssetService,
    GifProjectService,
    AuthService,
    GithubClient,
    EncryptionService,
    SessionService,
    AuthGuard,
    SecuritySanitizerService,
    GifGuardrailsService,
    RateLimitGuard,
    GifMetricsService,
    GifAuditInterceptor,
    ForensicAuditService,
    ...EFFECT_PROVIDERS,
    EffectRegistryService,
    AnimationEngineService,
    RandomizationEngineService,
    GifQuantizerService,
    GifDitheringService,
    FrameRasterizerService,
    GifRenderingService,
    GifOptimizerService,
    GifExportService,
  ],
  exports: [
    ImageInspectorService,
    ImageAnalyzerService,
    PixelArtAnalyzerService,
    PaletteCyclingService,
    GifAssetService,
    GifProjectService,
    SecuritySanitizerService,
    GifGuardrailsService,
    RateLimitGuard,
    GifMetricsService,
    GifAuditInterceptor,
    ForensicAuditService,
    EffectRegistryService,
    AnimationEngineService,
    RandomizationEngineService,
    GifQuantizerService,
    GifDitheringService,
    FrameRasterizerService,
    GifRenderingService,
    GifOptimizerService,
    GifExportService,
    ...EFFECT_PROVIDERS,
  ],
})
export class GifModule {}
