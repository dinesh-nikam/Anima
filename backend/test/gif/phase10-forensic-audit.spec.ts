import { ForensicAuditService } from '../../src/application/gif/services/forensic-audit.service';
import { EffectRegistryService } from '../../src/application/gif/registry/effect-registry.service';
import { GifQuantizerService } from '../../src/application/gif/services/gif-quantizer.service';
import { GifDitheringService } from '../../src/application/gif/services/gif-dithering.service';
import { GifGuardrailsService } from '../../src/application/gif/services/gif-guardrails.service';
import { SecuritySanitizerService } from '../../src/application/gif/services/security-sanitizer.service';
import { GifMetricsService } from '../../src/application/gif/services/gif-metrics.service';

// Camera Effects
import { ZoomEffect, CameraShakeEffect, MicroMovementEffect } from '../../src/application/gif/effects/camera.effects';
// Lighting Effects
import { GlowPulseEffect, NeonFlickerEffect, LightSweepEffect, ScreenGlowEffect } from '../../src/application/gif/effects/lighting.effects';
// Atmosphere Effects
import { FloatingParticlesEffect, RainEffect, SnowEffect, SparkEffect } from '../../src/application/gif/effects/atmosphere.effects';
// Retro Effects
import { CrtScanlinesEffect, VhsDistortionEffect, FilmGrainEffect, ChromaticAberrationEffect } from '../../src/application/gif/effects/retro.effects';
// Glitch Effects
import { RgbShiftEffect, PixelDisplacementEffect, DigitalNoiseEffect } from '../../src/application/gif/effects/glitch.effects';
// Motion Effects
import { FloatingEffect, BobbingEffect, BreathingEffect, ObjectBounceEffect } from '../../src/application/gif/effects/motion.effects';
// Distortion Effects
import { WaveDistortionEffect, RippleEffect } from '../../src/application/gif/effects/distortion.effects';
// Color Effects
import { HueShiftEffect, SaturationPulseEffect, BrightnessPulseEffect } from '../../src/application/gif/effects/color.effects';
// Pixel Art Effects
import { PixelJitterEffect, SpriteBounceEffect, PixelGlowEffect, ScreenFlickerEffect } from '../../src/application/gif/effects/pixel-art.effects';
// Advanced Pixel Effects
import { PaletteCycleEffect, PixelOutlineGlowEffect, RetroIdleSteppedEffect, ParallaxDepthEffect } from '../../src/application/gif/effects/advanced-pixel.effects';

describe('Phase 10 Full Forensic Audit & Production Hardening', () => {
  let auditService: ForensicAuditService;
  let effectRegistry: EffectRegistryService;
  let quantizer: GifQuantizerService;
  let dithering: GifDitheringService;
  let guardrails: GifGuardrailsService;
  let sanitizer: SecuritySanitizerService;
  let metrics: GifMetricsService;

  beforeEach(() => {
    sanitizer = new SecuritySanitizerService();
    guardrails = new GifGuardrailsService(sanitizer);
    metrics = new GifMetricsService();
    quantizer = new GifQuantizerService();
    dithering = new GifDitheringService();

    effectRegistry = new EffectRegistryService(
      new ZoomEffect(),
      new CameraShakeEffect(),
      new MicroMovementEffect(),
      new GlowPulseEffect(),
      new NeonFlickerEffect(),
      new LightSweepEffect(),
      new ScreenGlowEffect(),
      new FloatingParticlesEffect(),
      new RainEffect(),
      new SnowEffect(),
      new SparkEffect(),
      new CrtScanlinesEffect(),
      new VhsDistortionEffect(),
      new FilmGrainEffect(),
      new ChromaticAberrationEffect(),
      new RgbShiftEffect(),
      new PixelDisplacementEffect(),
      new DigitalNoiseEffect(),
      new FloatingEffect(),
      new BobbingEffect(),
      new BreathingEffect(),
      new ObjectBounceEffect(),
      new WaveDistortionEffect(),
      new RippleEffect(),
      new HueShiftEffect(),
      new SaturationPulseEffect(),
      new BrightnessPulseEffect(),
      new PixelJitterEffect(),
      new SpriteBounceEffect(),
      new PixelGlowEffect(),
      new ScreenFlickerEffect(),
      new PaletteCycleEffect(),
      new PixelOutlineGlowEffect(),
      new RetroIdleSteppedEffect(),
      new ParallaxDepthEffect(),
    );
    effectRegistry.onModuleInit();

    auditService = new ForensicAuditService(
      effectRegistry,
      quantizer,
      dithering,
      guardrails,
      sanitizer,
      metrics,
    );
  });

  it('should execute full forensic audit and report PASS status across all subsystems', async () => {
    const report = await auditService.runForensicAudit();

    expect(report.overallStatus).toBe('PASS');
    expect(report.subsystems.length).toBe(5);
    expect(report.effectRegistryReport.totalRegisteredEffects).toBe(35);
    expect(report.environment.nodeVersion).toBeDefined();
    expect(report.environment.heapMemoryMb).toBeGreaterThan(0);
  });

  it('should verify all 35 animation effects evaluate without runtime exceptions', () => {
    const effects = effectRegistry.getAllEffects();
    expect(effects.length).toBe(35);

    const syntheticCtx: any = {
      width: 64,
      height: 64,
      params: {},
    };

    for (const effect of effects) {
      const transform = effect.evaluate(0.5, syntheticCtx);
      expect(transform).toBeDefined();
      expect(typeof transform).toBe('object');
    }
  });

  it('should verify multi-format quantizer and dithering accuracy', () => {
    const buffer = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = (i * 11) % 256;
      buffer[i + 1] = (i * 17) % 256;
      buffer[i + 2] = (i * 29) % 256;
      buffer[i + 3] = 255;
    }

    const quantResult = quantizer.quantize([buffer], 64);
    expect(quantResult.palette.length).toBeGreaterThan(0);

    const dithered = dithering.ditherFrame(buffer, 16, 16, quantResult);
    expect(dithered.length).toBe(16 * 16);
  });
});
