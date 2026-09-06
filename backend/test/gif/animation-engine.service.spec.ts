import { EffectRegistryService } from '../../src/application/gif/registry/effect-registry.service';
import { AnimationEngineService } from '../../src/application/gif/services/animation-engine.service';
import { FrameContext } from '../../src/application/gif/effects/effect.contract';

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

describe('AnimationEngineService', () => {
  let engine: AnimationEngineService;
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
    engine = new AnimationEngineService(registry);
  });

  describe('Mathematical Easing Functions', () => {
    it('linear should preserve normalized values', () => {
      expect(engine.linear(0.0)).toBe(0.0);
      expect(engine.linear(0.5)).toBe(0.5);
      expect(engine.linear(1.0)).toBe(1.0);
    });

    it('easeInOut should compute smooth s-curve', () => {
      expect(engine.easeInOut(0.0)).toBe(0.0);
      expect(engine.easeInOut(0.5)).toBeCloseTo(0.5, 4);
      expect(engine.easeInOut(1.0)).toBe(1.0);
    });

    it('smoothStep should compute standard cubic Hermite curve', () => {
      expect(engine.smoothStep(0.0)).toBe(0.0);
      expect(engine.smoothStep(0.5)).toBe(0.5);
      expect(engine.smoothStep(1.0)).toBe(1.0);
    });

    it('bounce should start and end at zero for seamless loops', () => {
      expect(engine.bounce(0.0)).toBe(0.0);
      expect(engine.bounce(1.0)).toBeCloseTo(0.0, 4);
      expect(engine.bounce(0.5)).toBeCloseTo(1.0, 4);
    });

    it('applyEasing should route correctly', () => {
      expect(engine.applyEasing(0.5, 'EASE_IN_OUT')).toBeCloseTo(0.5, 4);
      expect(engine.applyEasing(0.5, 'BOUNCE')).toBeCloseTo(1.0, 4);
      expect(engine.applyEasing(0.5, 'LINEAR')).toBe(0.5);
    });
  });

  describe('Seamless Loop Continuity', () => {
    it('all registered effects should pass seamless loop continuity verification', () => {
      const allEffects = registry.getAll();
      for (const effect of allEffects) {
        const loopCheck = engine.verifyLoopContinuity(effect);
        expect(loopCheck.isSeamless).toBe(true);
        expect(loopCheck.maxDelta).toBeLessThan(0.001);
      }
    });
  });

  describe('Multi-Effect Frame Transform Evaluation', () => {
    const baseContext: FrameContext = {
      timeSeconds: 0.75,
      normalizedTime: 0.25,
      duration: 3.0,
      fps: 15,
      frameIndex: 11,
      totalFrames: 45,
      width: 400,
      height: 400,
      seed: 12345,
      pixelArtMode: false,
    };

    it('should compose transforms from multiple active effects', () => {
      const activeEffects = [
        {
          id: 'camera_zoom',
          name: 'Camera Zoom',
          category: 'CAMERA',
          enabled: true,
          locked: false,
          intensity: 0.2,
        },
        {
          id: 'motion_floating',
          name: 'Floating Hover',
          category: 'MOTION',
          enabled: true,
          locked: false,
          intensity: 0.5,
        },
        {
          id: 'lighting_glow_pulse',
          name: 'Glow Pulse',
          category: 'LIGHTING',
          enabled: true,
          locked: false,
          intensity: 0.3,
        },
        {
          id: 'atmosphere_particles',
          name: 'Floating Particles',
          category: 'ATMOSPHERE',
          enabled: true,
          locked: false,
          intensity: 0.4,
        },
      ];

      const composite = engine.evaluateFrame(baseContext, activeEffects);

      expect(composite.scale).toBeGreaterThan(1.0);
      expect(composite.translateY).toBeDefined();
      expect(composite.brightnessMultiplier).toBeGreaterThan(1.0);
      expect(composite.particles.length).toBeGreaterThan(0);
      expect(composite.individualTransforms['camera_zoom']).toBeDefined();
      expect(composite.individualTransforms['motion_floating']).toBeDefined();
    });

    it('should ignore disabled effect instances', () => {
      const effects = [
        {
          id: 'camera_zoom',
          name: 'Camera Zoom',
          category: 'CAMERA',
          enabled: false,
          locked: false,
          intensity: 0.5,
        },
      ];

      const composite = engine.evaluateFrame(baseContext, effects);
      expect(composite.scale).toBe(1.0);
      expect(composite.translateX).toBe(0.0);
    });

    it('should quantize translations when pixelArtMode is enabled', () => {
      const pixelContext: FrameContext = {
        ...baseContext,
        pixelArtMode: true,
      };

      const effects = [
        {
          id: 'motion_floating',
          name: 'Floating Hover',
          category: 'MOTION',
          enabled: true,
          locked: false,
          intensity: 0.37,
        },
      ];

      const composite = engine.evaluateFrame(pixelContext, effects);
      expect(Number.isInteger(composite.translateX)).toBe(true);
      expect(Number.isInteger(composite.translateY)).toBe(true);
    });
  });

  describe('Resource & Budget Estimator', () => {
    it('should accurately calculate frame counts and memory footprints', () => {
      const estimate = engine.estimateBudget({
        width: 320,
        height: 240,
        duration: 2.0,
        fps: 15,
        effectIds: ['camera_zoom', 'lighting_glow_pulse'],
      });

      expect(estimate.totalFrames).toBe(30);
      expect(estimate.frameDelayCentiseconds).toBe(7);
      expect(estimate.uncompressedFrameSizeBytes).toBe(320 * 240 * 4);
      expect(estimate.totalRawMemoryBytes).toBe(30 * 320 * 240 * 4);
      expect(estimate.estimatedGifSizeBytes).toBeGreaterThan(0);
      expect(estimate.estimatedRenderTimeMs).toBeGreaterThan(0);
      expect(estimate.warnings.length).toBe(0);
    });

    it('should emit warnings when limits are exceeded', () => {
      const heavyEstimate = engine.estimateBudget({
        width: 1920,
        height: 1080,
        duration: 8.0,
        fps: 30, // 240 frames
        effectIds: ['distortion_ripple', 'atmosphere_particles'],
      });

      expect(heavyEstimate.totalFrames).toBe(240);
      expect(heavyEstimate.warnings.some((w) => w.includes('High frame count'))).toBe(true);
      expect(heavyEstimate.warnings.some((w) => w.includes('High uncompressed frame buffer'))).toBe(true);
      expect(heavyEstimate.aggregatePerformanceTier).toBe('EXTREME');
    });
  });
});
