import { NotFoundException } from '@nestjs/common';
import { EffectRegistryService } from '../../src/application/gif/registry/effect-registry.service';

// Camera
import {
  ZoomEffect,
  CameraShakeEffect,
  MicroMovementEffect,
} from '../../src/application/gif/effects/camera.effects';

// Lighting
import {
  GlowPulseEffect,
  NeonFlickerEffect,
  LightSweepEffect,
  ScreenGlowEffect,
} from '../../src/application/gif/effects/lighting.effects';

// Atmosphere
import {
  FloatingParticlesEffect,
  RainEffect,
  SnowEffect,
  SparkEffect,
} from '../../src/application/gif/effects/atmosphere.effects';

// Retro
import {
  CrtScanlinesEffect,
  VhsDistortionEffect,
  FilmGrainEffect,
  ChromaticAberrationEffect,
} from '../../src/application/gif/effects/retro.effects';

// Glitch
import {
  RgbShiftEffect,
  PixelDisplacementEffect,
  DigitalNoiseEffect,
} from '../../src/application/gif/effects/glitch.effects';

// Motion
import {
  FloatingEffect,
  BobbingEffect,
  BreathingEffect,
  ObjectBounceEffect,
} from '../../src/application/gif/effects/motion.effects';

// Distortion
import {
  WaveDistortionEffect,
  RippleEffect,
} from '../../src/application/gif/effects/distortion.effects';

// Color
import {
  HueShiftEffect,
  SaturationPulseEffect,
  BrightnessPulseEffect,
} from '../../src/application/gif/effects/color.effects';

// Pixel Art
import {
  PixelJitterEffect,
  SpriteBounceEffect,
  PixelGlowEffect,
  ScreenFlickerEffect,
} from '../../src/application/gif/effects/pixel-art.effects';

describe('EffectRegistryService', () => {
  let service: EffectRegistryService;

  beforeEach(() => {
    service = new EffectRegistryService(
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
    );
    service.onModuleInit();
  });

  it('should register exactly 35 animation effects', () => {
    expect(service.getRegisteredCount()).toBe(35);
    expect(service.getAll().length).toBe(35);
  });

  it('should cover all 9 required effect categories', () => {
    const categories = [
      'CAMERA',
      'LIGHTING',
      'ATMOSPHERE',
      'RETRO',
      'GLITCH',
      'MOTION',
      'DISTORTION',
      'COLOR',
      'PIXEL_ART',
    ] as const;

    for (const cat of categories) {
      const effectsInCat = service.getByCategory(cat);
      expect(effectsInCat.length).toBeGreaterThan(0);
      for (const eff of effectsInCat) {
        expect(eff.metadata.category).toBe(cat);
      }
    }
  });

  it('should return metadata list correctly with and without filter', () => {
    const allMeta = service.getMetadataList();
    expect(allMeta.length).toBe(35);

    const cameraMeta = service.getMetadataList('CAMERA');
    expect(cameraMeta.length).toBe(3);
    expect(cameraMeta.map((m) => m.id)).toEqual(
      expect.arrayContaining(['camera_zoom', 'camera_shake', 'micro_movement']),
    );
  });

  it('should retrieve effect by id', () => {
    const zoom = service.getById('camera_zoom');
    expect(zoom).toBeDefined();
    expect(zoom?.metadata.name).toBe('Camera Zoom');
  });

  it('should throw NotFoundException for unknown effect id', () => {
    expect(() => service.getMetadataById('non_existent_id')).toThrow(NotFoundException);
  });

  it('should validate compatibility and detect conflicts', () => {
    // Valid combination
    const validResult = service.validateCompatibility(['camera_zoom', 'lighting_glow_pulse']);
    expect(validResult.valid).toBe(true);
    expect(validResult.conflicts.length).toBe(0);

    // Conflict: Distortion + Pixel Art
    const conflictResult = service.validateCompatibility([
      'distortion_wave',
      'pixel_art_jitter',
    ]);
    expect(conflictResult.valid).toBe(false);
    expect(conflictResult.conflicts.length).toBeGreaterThan(0);
    expect(conflictResult.conflicts[0].reason).toContain('breaks pixel-grid integrity');
  });

  it('should detect excessive geometry modification conflict', () => {
    const geoResult = service.validateCompatibility([
      'camera_zoom',
      'camera_shake',
      'motion_floating',
    ]);
    expect(geoResult.valid).toBe(false);
    expect(geoResult.conflicts.some((c) => c.reason.includes('geometry-modifying'))).toBe(true);
  });
});
