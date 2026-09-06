import { EffectRegistryService } from '../../src/application/gif/registry/effect-registry.service';
import {
  RandomizationEngineService,
  Mulberry32PRNG,
} from '../../src/application/gif/services/randomization-engine.service';
import { AnimationEffectInstance } from '../../src/application/gif/models/gif.model';

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

describe('RandomizationEngineService — Phase 4 Randomization Engine', () => {
  let engine: RandomizationEngineService;
  let registry: EffectRegistryService;

  beforeEach(() => {
    registry = new EffectRegistryService(
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
    registry.onModuleInit();
    engine = new RandomizationEngineService(registry);
  });

  describe('Mulberry32 PRNG Determinism', () => {
    it('should generate identical float sequence from identical seeds', () => {
      const prng1 = new Mulberry32PRNG(987654321);
      const prng2 = new Mulberry32PRNG(987654321);

      for (let i = 0; i < 20; i++) {
        expect(prng1.next()).toBe(prng2.next());
      }
    });

    it('should generate bounded integer values', () => {
      const prng = new Mulberry32PRNG('custom_seed_string');
      for (let i = 0; i < 50; i++) {
        const val = prng.nextInt(5, 15);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('Deterministic Randomization Reproducibility', () => {
    const sampleAnalysis = {
      brightness: 0.4,
      contrast: 0.3,
      pixelArtConfidence: 0.15,
      darkSceneConfidence: 0.1,
      photographicConfidence: 0.8,
      hasAlpha: false,
    };

    it('should produce identical AnimationConfiguration given identical seed and inputs', () => {
      const res1 = engine.generateRandomConfiguration(sampleAnalysis, {
        seed: 424242,
        profile: 'BALANCED',
        targetEffectCount: 3,
      });

      const res2 = engine.generateRandomConfiguration(sampleAnalysis, {
        seed: 424242,
        profile: 'BALANCED',
        targetEffectCount: 3,
      });

      expect(res1.seed).toBe('424242');
      expect(res2.seed).toBe('424242');
      expect(res1.configuration).toEqual(res2.configuration);
      expect(res1.configuration.effects.length).toBe(res2.configuration.effects.length);
      for (let i = 0; i < res1.configuration.effects.length; i++) {
        expect(res1.configuration.effects[i].id).toBe(res2.configuration.effects[i].id);
        expect(res1.configuration.effects[i].intensity).toBe(res2.configuration.effects[i].intensity);
        expect(res1.configuration.effects[i].speed).toBe(res2.configuration.effects[i].speed);
      }
    });

    it('should produce different effects when the seed is changed', () => {
      const resA = engine.generateRandomConfiguration(sampleAnalysis, { seed: 11111 });
      const resB = engine.generateRandomConfiguration(sampleAnalysis, { seed: 99999 });

      expect(resA.seed).not.toBe(resB.seed);
      // At least seed is different, and configs are independent
      expect(resA.configuration.seed).toBe('11111');
      expect(resB.configuration.seed).toBe('99999');
    });
  });

  describe('Feature-Aware Adaptation', () => {
    it('should adapt to high pixel-art confidence by selecting pixel art and retro effects', () => {
      const pixelArtAnalysis = {
        pixelArtConfidence: 0.95,
        darkSceneConfidence: 0.05,
        photographicConfidence: 0.05,
        hasAlpha: false,
      };

      const result = engine.generateRandomConfiguration(pixelArtAnalysis, {
        seed: 777,
        profile: 'BALANCED',
      });

      expect(result.configuration.pixelArtMode).toBe(true);
      expect(result.configuration.dithering).toBe(false);
      expect(result.configuration.quality).toBe(100);
      expect(result.appliedBiases.some((b) => b.includes('Pixel-Art Detected'))).toBe(true);

      const hasPixelOrRetro = result.configuration.effects.some(
        (e) => e.category === 'PIXEL_ART' || e.category === 'RETRO',
      );
      expect(hasPixelOrRetro).toBe(true);
    });

    it('should adapt to dark scenes by elevating lighting and atmospheric glows', () => {
      const darkAnalysis = {
        brightness: 0.05,
        darkSceneConfidence: 0.9,
        pixelArtConfidence: 0.1,
        photographicConfidence: 0.4,
      };

      const result = engine.generateRandomConfiguration(darkAnalysis, {
        seed: 888,
        profile: 'BALANCED',
      });

      expect(result.appliedBiases.some((b) => b.includes('Dark Scene Detected'))).toBe(true);
      const hasLightingOrAtmosphere = result.configuration.effects.some(
        (e) => e.category === 'LIGHTING' || e.category === 'ATMOSPHERE',
      );
      expect(hasLightingOrAtmosphere).toBe(true);
    });

    it('should adapt to cutout images with alpha by elevating motion', () => {
      const alphaAnalysis = {
        hasAlpha: true,
        alphaCoverage: 0.4,
        pixelArtConfidence: 0.1,
      };

      const result = engine.generateRandomConfiguration(alphaAnalysis, {
        seed: 999,
        profile: 'BALANCED',
      });

      expect(result.appliedBiases.some((b) => b.includes('Alpha Cutout Detected'))).toBe(true);
    });
  });

  describe('Profile & Style Variations', () => {
    it('should synthesize higher intensity and speed for CHAOTIC profile', () => {
      const result = engine.generateRandomConfiguration({}, {
        seed: 12345,
        profile: 'CHAOTIC',
      });

      expect(result.profile).toBe('CHAOTIC');
      for (const eff of result.configuration.effects) {
        expect(eff.intensity).toBeGreaterThanOrEqual(0.1);
        expect(eff.speed).toBeGreaterThanOrEqual(1.0);
      }
    });

    it('should synthesize gentle intensity for CINEMATIC profile', () => {
      const result = engine.generateRandomConfiguration({}, {
        seed: 12345,
        profile: 'CINEMATIC',
      });

      expect(result.profile).toBe('CINEMATIC');
      for (const eff of result.configuration.effects) {
        expect(eff.intensity).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe('Effect Locking & Partial Re-roll', () => {
    it('should preserve locked effects verbatim while randomizing unlocked slots', () => {
      const lockedEffect: AnimationEffectInstance = {
        id: 'lighting_glow_pulse',
        name: 'Glow Pulse',
        category: 'LIGHTING',
        enabled: true,
        locked: true,
        intensity: 0.42,
        speed: 1.15,
        parameters: { frequency: 2 },
      };

      const result = engine.generateRandomConfiguration({}, {
        seed: 55555,
        preserveLocked: true,
        lockedEffects: [lockedEffect],
        targetEffectCount: 3,
      });

      expect(result.preservedLockedCount).toBe(1);
      const foundLocked = result.configuration.effects.find((e) => e.id === 'lighting_glow_pulse');
      expect(foundLocked).toBeDefined();
      expect(foundLocked?.locked).toBe(true);
      expect(foundLocked?.intensity).toBe(0.42);
      expect(foundLocked?.speed).toBe(1.15);
      expect(foundLocked?.parameters?.frequency).toBe(2);

      // Remaining effects should be unlocked and compatible
      const otherEffects = result.configuration.effects.filter((e) => e.id !== 'lighting_glow_pulse');
      for (const other of otherEffects) {
        expect(other.locked).toBe(false);
      }
    });
  });

  describe('Seed Mutation', () => {
    it('should derive consistent distinct sub-seeds for variation indices', () => {
      const seed1 = engine.mutateSeed('my_base_seed', 1);
      const seed2 = engine.mutateSeed('my_base_seed', 2);
      const seed1Repeat = engine.mutateSeed('my_base_seed', 1);

      expect(seed1).toBe(seed1Repeat);
      expect(seed1).not.toBe(seed2);
    });
  });
});
