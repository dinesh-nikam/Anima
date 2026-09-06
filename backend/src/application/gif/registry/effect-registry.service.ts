import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import {
  AnimationEffect,
  EffectMetadata,
  EffectCategory,
} from '../effects/effect.contract';

// Camera
import {
  ZoomEffect,
  CameraShakeEffect,
  MicroMovementEffect,
} from '../effects/camera.effects';

// Lighting
import {
  GlowPulseEffect,
  NeonFlickerEffect,
  LightSweepEffect,
  ScreenGlowEffect,
} from '../effects/lighting.effects';

// Atmosphere
import {
  FloatingParticlesEffect,
  RainEffect,
  SnowEffect,
  SparkEffect,
} from '../effects/atmosphere.effects';

// Retro
import {
  CrtScanlinesEffect,
  VhsDistortionEffect,
  FilmGrainEffect,
  ChromaticAberrationEffect,
} from '../effects/retro.effects';

// Glitch
import {
  RgbShiftEffect,
  PixelDisplacementEffect,
  DigitalNoiseEffect,
} from '../effects/glitch.effects';

// Motion
import {
  FloatingEffect,
  BobbingEffect,
  BreathingEffect,
  ObjectBounceEffect,
} from '../effects/motion.effects';

// Distortion
import {
  WaveDistortionEffect,
  RippleEffect,
} from '../effects/distortion.effects';

// Color
import {
  HueShiftEffect,
  SaturationPulseEffect,
  BrightnessPulseEffect,
} from '../effects/color.effects';

// Pixel Art
import {
  PixelJitterEffect,
  SpriteBounceEffect,
  PixelGlowEffect,
  ScreenFlickerEffect,
} from '../effects/pixel-art.effects';

// Phase 7 Advanced Pixel Art & Multi-Plane
import {
  PaletteCycleEffect,
  PixelOutlineGlowEffect,
  RetroIdleSteppedEffect,
  ParallaxDepthEffect,
} from '../effects/advanced-pixel.effects';

export interface CompatibilityConflict {
  effectA: string;
  effectB: string;
  reason: string;
}

export interface CompatibilityValidationResult {
  valid: boolean;
  conflicts: CompatibilityConflict[];
  recommendedReplacements?: Record<string, string>;
}

@Injectable()
export class EffectRegistryService implements OnModuleInit {
  private readonly logger = new Logger(EffectRegistryService.name);
  private readonly effects = new Map<string, AnimationEffect>();
  private readonly categoryIndex = new Map<EffectCategory, AnimationEffect[]>();

  constructor(
    // Injected effects
    private readonly zoomEffect: ZoomEffect,
    private readonly cameraShakeEffect: CameraShakeEffect,
    private readonly microMovementEffect: MicroMovementEffect,
    private readonly glowPulseEffect: GlowPulseEffect,
    private readonly neonFlickerEffect: NeonFlickerEffect,
    private readonly lightSweepEffect: LightSweepEffect,
    private readonly screenGlowEffect: ScreenGlowEffect,
    private readonly floatingParticlesEffect: FloatingParticlesEffect,
    private readonly rainEffect: RainEffect,
    private readonly snowEffect: SnowEffect,
    private readonly sparkEffect: SparkEffect,
    private readonly crtScanlinesEffect: CrtScanlinesEffect,
    private readonly vhsDistortionEffect: VhsDistortionEffect,
    private readonly filmGrainEffect: FilmGrainEffect,
    private readonly chromaticAberrationEffect: ChromaticAberrationEffect,
    private readonly rgbShiftEffect: RgbShiftEffect,
    private readonly pixelDisplacementEffect: PixelDisplacementEffect,
    private readonly digitalNoiseEffect: DigitalNoiseEffect,
    private readonly floatingEffect: FloatingEffect,
    private readonly bobbingEffect: BobbingEffect,
    private readonly breathingEffect: BreathingEffect,
    private readonly objectBounceEffect: ObjectBounceEffect,
    private readonly waveDistortionEffect: WaveDistortionEffect,
    private readonly rippleEffect: RippleEffect,
    private readonly hueShiftEffect: HueShiftEffect,
    private readonly saturationPulseEffect: SaturationPulseEffect,
    private readonly brightnessPulseEffect: BrightnessPulseEffect,
    private readonly pixelJitterEffect: PixelJitterEffect,
    private readonly spriteBounceEffect: SpriteBounceEffect,
    private readonly pixelGlowEffect: PixelGlowEffect,
    private readonly screenFlickerEffect: ScreenFlickerEffect,
    private readonly paletteCycleEffect?: PaletteCycleEffect,
    private readonly pixelOutlineGlowEffect?: PixelOutlineGlowEffect,
    private readonly retroIdleSteppedEffect?: RetroIdleSteppedEffect,
    private readonly parallaxDepthEffect?: ParallaxDepthEffect,
  ) {}

  onModuleInit() {
    this.registerAll([
      this.zoomEffect,
      this.cameraShakeEffect,
      this.microMovementEffect,
      this.glowPulseEffect,
      this.neonFlickerEffect,
      this.lightSweepEffect,
      this.screenGlowEffect,
      this.floatingParticlesEffect,
      this.rainEffect,
      this.snowEffect,
      this.sparkEffect,
      this.crtScanlinesEffect,
      this.vhsDistortionEffect,
      this.filmGrainEffect,
      this.chromaticAberrationEffect,
      this.rgbShiftEffect,
      this.pixelDisplacementEffect,
      this.digitalNoiseEffect,
      this.floatingEffect,
      this.bobbingEffect,
      this.breathingEffect,
      this.objectBounceEffect,
      this.waveDistortionEffect,
      this.rippleEffect,
      this.hueShiftEffect,
      this.saturationPulseEffect,
      this.brightnessPulseEffect,
      this.pixelJitterEffect,
      this.spriteBounceEffect,
      this.pixelGlowEffect,
      this.screenFlickerEffect,
      this.paletteCycleEffect || new PaletteCycleEffect(),
      this.pixelOutlineGlowEffect || new PixelOutlineGlowEffect(),
      this.retroIdleSteppedEffect || new RetroIdleSteppedEffect(),
      this.parallaxDepthEffect || new ParallaxDepthEffect(),
    ].filter(Boolean) as AnimationEffect[]);

    this.logger.log(
      `Effect Registry initialized with ${this.effects.size} effects across ${this.categoryIndex.size} categories.`,
    );
  }

  private register(effect: AnimationEffect): void {
    const meta = effect.metadata;
    if (this.effects.has(meta.id)) {
      throw new Error(`Duplicate effect ID registration: ${meta.id}`);
    }

    this.effects.set(meta.id, effect);

    const categoryList = this.categoryIndex.get(meta.category) ?? [];
    categoryList.push(effect);
    this.categoryIndex.set(meta.category, categoryList);
  }

  private registerAll(effectList: AnimationEffect[]): void {
    for (const effect of effectList) {
      this.register(effect);
    }
  }

  /**
   * Retrieves total count of registered effects.
   */
  getRegisteredCount(): number {
    return this.effects.size;
  }

  /**
   * Retrieves all registered animation effect instances.
   */
  getAll(): AnimationEffect[] {
    return Array.from(this.effects.values());
  }

  /**
   * Alias for getAll() to retrieve all registered effects.
   */
  getAllEffects(): AnimationEffect[] {
    return this.getAll();
  }

  /**
   * Retrieves array of all registered category names.
   */
  getCategories(): string[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * Retrieves metadata list for all or filtered effects.
   */
  getMetadataList(category?: EffectCategory): EffectMetadata[] {
    if (category) {
      const list = this.categoryIndex.get(category) ?? [];
      return list.map((e) => e.metadata);
    }
    return Array.from(this.effects.values()).map((e) => e.metadata);
  }

  /**
   * Looks up an effect by unique ID.
   */
  getById(id: string): AnimationEffect | undefined {
    return this.effects.get(id);
  }

  /**
   * Looks up effect metadata by ID or throws 404.
   */
  getMetadataById(id: string): EffectMetadata {
    const effect = this.effects.get(id);
    if (!effect) {
      throw new NotFoundException(`Animation effect '${id}' not found in registry`);
    }
    return effect.metadata;
  }

  /**
   * Retrieves effects belonging to a category.
   */
  getByCategory(category: EffectCategory): AnimationEffect[] {
    return this.categoryIndex.get(category) ?? [];
  }

  /**
   * Validates compatibility between a set of active effect IDs.
   * Prevents visual clashing, conflicting geometry modulations, or contradictory transforms.
   */
  validateCompatibility(effectIds: string[]): CompatibilityValidationResult {
    const conflicts: CompatibilityConflict[] = [];
    const activeEffects: AnimationEffect[] = [];

    for (const id of effectIds) {
      const eff = this.effects.get(id);
      if (eff) {
        activeEffects.push(eff);
      }
    }

    // Check for duplicate geometry dominant conflict
    const geometryModifying = activeEffects.filter((e) => e.metadata.modifiesGeometry);
    if (geometryModifying.length > 2) {
      conflicts.push({
        effectA: geometryModifying[0].metadata.id,
        effectB: geometryModifying[1].metadata.id,
        reason: `More than 2 concurrent geometry-modifying effects (${geometryModifying.map((e) => e.metadata.name).join(', ')}) can cause visual tearing and severe clipping.`,
      });
    }

    // Check mutual category exclusions
    for (let i = 0; i < activeEffects.length; i++) {
      for (let j = i + 1; j < activeEffects.length; j++) {
        const a = activeEffects[i].metadata;
        const b = activeEffects[j].metadata;

        // Incompatible pairs: e.g. Extreme Distortion + Pixel Art Grid Jitter
        if (a.category === 'DISTORTION' && b.category === 'PIXEL_ART') {
          conflicts.push({
            effectA: a.id,
            effectB: b.id,
            reason: `Distortion effect '${a.name}' breaks pixel-grid integrity required by '${b.name}'.`,
          });
        }

        // Two full-canvas color matrix shifts
        if (a.id === 'color_hue_shift' && b.id === 'retro_vhs_distortion') {
          conflicts.push({
            effectA: a.id,
            effectB: b.id,
            reason: `Full spectrum '${a.name}' severely clashes with chromatic VHS color bleed of '${b.name}'.`,
          });
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }
}
