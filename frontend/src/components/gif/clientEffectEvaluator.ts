// Client-side 60 FPS Continuous Frame Evaluation Engine for Live Canvas Preview
import type { AnimationEffectInstance } from '../../types/gif';

export interface EvaluatedTransform {
  scale: number;
  translateX: number;
  translateY: number;
  rotationDegrees: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hueShiftDegrees: number;
  rgbOffsets: { r: [number, number]; g: [number, number]; b: [number, number] };
  overlayAlpha: number;
  particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }>;
  scanlines?: { spacing: number; offset: number; alpha: number };
  vhsTrackingY?: number;
  paletteCycleOffset?: number;
  outlineGlow?: { active: boolean; intensity: number; color: string };
  parallaxOffset?: { fgX: number; bgX: number };
}

export function evaluateFrameTransforms(
  effects: AnimationEffectInstance[],
  normalizedTime: number, // t in [0, 1)
  width: number,
  height: number,
  seed: number,
  pixelArtMode: boolean,
): EvaluatedTransform {
  let scale = 1.0;
  let translateX = 0.0;
  let translateY = 0.0;
  let rotationDegrees = 0.0;
  let brightness = 1.0;
  let contrast = 1.0;
  let saturation = 1.0;
  let hueShiftDegrees = 0.0;
  let overlayAlpha = 0.0;
  const rgbOffsets = {
    r: [0, 0] as [number, number],
    g: [0, 0] as [number, number],
    b: [0, 0] as [number, number],
  };
  const particles: Array<{ x: number; y: number; radius: number; opacity: number; color: string }> = [];
  let scanlines: { spacing: number; offset: number; alpha: number } | undefined;
  let vhsTrackingY: number | undefined;
  let paletteCycleOffset: number | undefined;
  let outlineGlow: { active: boolean; intensity: number; color: string } | undefined;
  let parallaxOffset: { fgX: number; bgX: number } | undefined;

  const t = normalizedTime;

  for (const eff of effects) {
    if (!eff.enabled) continue;
    const intensity = eff.intensity ?? 0.5;
    const speed = eff.speed ?? 1.0;
    const effT = (t * speed) % 1.0;

    switch (eff.id) {
      // Camera
      case 'camera_zoom': {
        const delta = ((1.0 - Math.cos(2.0 * Math.PI * effT)) / 2.0) * intensity * 0.25;
        scale *= 1.0 + delta;
        break;
      }
      case 'camera_shake': {
        const maxPx = 8 * intensity;
        translateX += maxPx * (Math.sin(2.0 * Math.PI * 2 * effT) + 0.5 * Math.sin(2.0 * Math.PI * 4 * effT));
        translateY += maxPx * (Math.cos(2.0 * Math.PI * 3 * effT) - 1.0) * 0.5;
        break;
      }
      case 'micro_movement': {
        const r = 4 * intensity;
        translateX += r * Math.sin(2.0 * Math.PI * effT);
        translateY += r * Math.sin(4.0 * Math.PI * effT) * 0.5;
        rotationDegrees += 0.5 * intensity * Math.sin(2.0 * Math.PI * effT);
        break;
      }

      // Lighting
      case 'lighting_glow_pulse': {
        const osc = (1.0 - Math.cos(2.0 * Math.PI * effT)) / 2.0;
        brightness *= 1.0 + osc * intensity * 0.4;
        contrast *= 1.0 + osc * intensity * 0.15;
        overlayAlpha = Math.max(overlayAlpha, osc * intensity * 0.3);
        break;
      }
      case 'lighting_neon_flicker': {
        const h1 = Math.sin(2.0 * Math.PI * 1 * effT);
        const h3 = Math.sin(2.0 * Math.PI * 3 * effT) * 0.5;
        const h7 = Math.sin(2.0 * Math.PI * 7 * effT) * 0.25;
        const flicker = Math.max(0, (h1 + h3 + h7) / 1.75);
        brightness *= 1.0 + flicker * intensity * 0.45;
        break;
      }
      case 'lighting_light_sweep': {
        brightness *= 1.0 + Math.sin(Math.PI * effT) * intensity * 0.3;
        overlayAlpha = Math.max(overlayAlpha, intensity * 0.25);
        break;
      }
      case 'lighting_screen_glow': {
        const osc = (1.0 - Math.cos(2.0 * Math.PI * effT)) / 2.0;
        brightness *= 1.0 + osc * intensity * 0.25;
        overlayAlpha = Math.max(overlayAlpha, osc * intensity * 0.3);
        break;
      }

      // Atmosphere
      case 'atmosphere_particles': {
        const count = Math.max(8, Math.round(32 * intensity));
        for (let i = 0; i < count; i++) {
          const pSeed = (seed * 1103515245 + i * 12345) & 0x7fffffff;
          const x0 = (pSeed % 1000) / 1000.0;
          const y0 = ((pSeed >> 10) % 1000) / 1000.0;
          const k = 1 + (i % 3);
          const dx = 0.08 * Math.sin(2.0 * Math.PI * k * effT + x0 * Math.PI * 2);
          const dy = 0.08 * Math.cos(2.0 * Math.PI * k * effT + y0 * Math.PI * 2);
          const px = ((x0 + dx + 1.0) % 1.0) * width;
          const py = ((y0 + dy + 1.0) % 1.0) * height;
          const op = 0.3 + 0.7 * ((1.0 + Math.sin(2.0 * Math.PI * k * effT + i)) / 2.0);
          particles.push({
            x: px,
            y: py,
            radius: 1.5 + (i % 3) * 0.8,
            opacity: op * intensity * 0.8,
            color: '#ffffff',
          });
        }
        break;
      }
      case 'atmosphere_rain': {
        const count = Math.max(16, Math.round(64 * intensity));
        for (let i = 0; i < count; i++) {
          const pSeed = (seed * 1664525 + i * 1013904223) & 0x7fffffff;
          const x0 = (pSeed % 1000) / 1000.0;
          const y0 = ((pSeed >> 9) % 1000) / 1000.0;
          const yNorm = (y0 + 4 * effT) % 1.0;
          const xNorm = (x0 + 4 * effT * -0.2 + 10.0) % 1.0;
          particles.push({
            x: xNorm * width,
            y: yNorm * height,
            radius: 1.2,
            opacity: (0.4 + 0.5 * ((i % 3) / 2.0)) * intensity,
            color: 'rgba(180, 215, 255, 0.7)',
          });
        }
        break;
      }
      case 'atmosphere_snow': {
        const count = Math.max(12, Math.round(48 * intensity));
        for (let i = 0; i < count; i++) {
          const pSeed = (seed * 22695477 + i * 1) & 0x7fffffff;
          const x0 = (pSeed % 1000) / 1000.0;
          const y0 = ((pSeed >> 8) % 1000) / 1000.0;
          const yNorm = (y0 + 2 * effT) % 1.0;
          const swayPx = 12 * intensity * Math.sin(2.0 * Math.PI * 4 * effT + i);
          particles.push({
            x: Math.min(width, Math.max(0, x0 * width + swayPx)),
            y: yNorm * height,
            radius: 1.5 + (i % 4) * 0.8,
            opacity: 0.6 * intensity,
            color: '#ffffff',
          });
        }
        break;
      }
      case 'atmosphere_sparks': {
        const count = Math.max(10, Math.round(36 * intensity));
        for (let i = 0; i < count; i++) {
          const pSeed = (seed * 1103515245 + i * 54321) & 0x7fffffff;
          const x0 = (pSeed % 1000) / 1000.0;
          const y0 = ((pSeed >> 8) % 1000) / 1000.0;
          const yNorm = (y0 - 3 * effT + 10.0) % 1.0;
          const xJitter = 0.03 * Math.sin(2.0 * Math.PI * 3 * effT + i * 1.5);
          particles.push({
            x: ((x0 + xJitter + 1.0) % 1.0) * width,
            y: yNorm * height,
            radius: 1.2 + (i % 3) * 0.7,
            opacity: Math.max(0.1, Math.sin(yNorm * Math.PI)) * intensity,
            color: i % 2 === 0 ? '#ffb347' : '#ff5722',
          });
        }
        break;
      }

      // Retro
      case 'retro_crt_scanlines': {
        const spacing = 3;
        scanlines = {
          spacing,
          offset: Math.round((effT * spacing) % spacing),
          alpha: intensity * 0.4,
        };
        contrast *= 1.0 + intensity * 0.1;
        break;
      }
      case 'retro_vhs_distortion': {
        const jump = Math.sin(2.0 * Math.PI * 3 * effT) * Math.cos(2.0 * Math.PI * 1 * effT) * 6 * intensity;
        translateX += jump;
        vhsTrackingY = (effT * height) % height;
        rgbOffsets.r[0] += Math.round(3 * intensity);
        rgbOffsets.b[0] -= Math.round(3 * intensity);
        break;
      }
      case 'retro_chromatic_aberration': {
        const osc = Math.sin(2.0 * Math.PI * effT);
        const shift = Math.round(6 * intensity * osc);
        rgbOffsets.r[0] += shift;
        rgbOffsets.b[0] -= shift;
        break;
      }

      // Glitch
      case 'glitch_rgb_shift': {
        const burst = Math.pow(Math.sin(Math.PI * effT), 16);
        const shiftX = Math.round(12 * intensity * burst * Math.sin(2.0 * Math.PI * 8 * effT));
        rgbOffsets.r[0] += shiftX;
        rgbOffsets.b[0] -= shiftX;
        break;
      }
      case 'glitch_pixel_displacement': {
        const activity = Math.pow(Math.sin(2.0 * Math.PI * effT), 8);
        translateX += Math.round(16 * intensity * activity);
        break;
      }

      // Motion
      case 'motion_floating': {
        translateY += 12 * intensity * Math.sin(2.0 * Math.PI * effT);
        break;
      }
      case 'motion_bobbing': {
        translateY += 10 * intensity * Math.sin(2.0 * Math.PI * effT);
        rotationDegrees += 3.5 * intensity * Math.sin(2.0 * Math.PI * effT + Math.PI / 4.0);
        break;
      }
      case 'motion_breathing': {
        const breath = ((1.0 - Math.cos(2.0 * Math.PI * effT)) / 2.0) * 0.08 * intensity;
        scale *= 1.0 + breath;
        break;
      }
      case 'motion_bounce': {
        const bounce = Math.pow(Math.sin(Math.PI * effT), 2.0);
        translateY -= bounce * 18 * intensity;
        break;
      }

      // Distortion
      case 'distortion_wave': {
        translateX += 10 * intensity * 0.3 * Math.sin(2.0 * Math.PI * effT);
        break;
      }

      // Color
      case 'color_hue_shift': {
        hueShiftDegrees = (hueShiftDegrees + (360.0 * effT)) % 360.0;
        break;
      }
      case 'color_saturation_pulse': {
        const satOsc = Math.sin(2.0 * Math.PI * effT);
        saturation *= Math.max(0.1, 1.0 + satOsc * intensity * 0.8);
        break;
      }
      case 'color_brightness_pulse': {
        const brightOsc = (1.0 - Math.cos(2.0 * Math.PI * effT)) / 2.0;
        brightness *= 1.0 + brightOsc * intensity * 0.4;
        break;
      }

      // Pixel Art
      case 'pixel_art_jitter': {
        const steps = 8;
        const stepIdx = Math.floor(effT * steps);
        const sinH = Math.sin(2.0 * Math.PI * (stepIdx / steps));
        translateX += Math.round(sinH * 2 * intensity);
        break;
      }
      case 'pixel_art_sprite_bounce': {
        const bounce = Math.pow(Math.sin(Math.PI * effT), 2.0);
        translateY -= Math.round(bounce * 4 * intensity);
        break;
      }
      case 'pixel_art_glow': {
        const levels = 5;
        const smoothC = (1.0 - Math.cos(2.0 * Math.PI * effT)) / 2.0;
        const stepped = Math.round(smoothC * levels) / levels;
        brightness *= 1.0 + stepped * intensity * 0.4;
        break;
      }
      case 'pixel_art_flicker': {
        const osc = Math.sin(2.0 * Math.PI * 2 * effT);
        const f = osc > 0.7 ? 1.0 : (osc < -0.7 ? -1.0 : 0.0);
        brightness *= 1.0 + f * intensity * 0.2;
        break;
      }

      // Phase 7 — Advanced Pixel Art & Multi-Plane
      case 'palette_cycle':
      case 'pixel_art_palette_cycle': {
        hueShiftDegrees = (hueShiftDegrees + effT * 360.0) % 360.0;
        break;
      }
      case 'pixel_outline_glow': {
        const pulse = 0.5 + 0.5 * Math.sin(2.0 * Math.PI * effT);
        outlineGlow = {
          active: true,
          intensity: intensity * pulse,
          color: (eff.parameters as any)?.outlineColor || '#a855f7',
        };
        break;
      }
      case 'retro_idle_stepped': {
        const stepCount = 4;
        const stepIdx = Math.floor(effT * stepCount) % stepCount;
        const steps = [0, 1, 2, 1];
        const hop = Math.round(3 * intensity);
        translateY += steps[stepIdx] * hop;
        break;
      }
      case 'parallax_depth': {
        const amp = intensity * 6.0;
        const fgX = Math.sin(2.0 * Math.PI * effT) * amp;
        const bgX = -Math.sin(2.0 * Math.PI * effT) * (amp * 0.4);
        parallaxOffset = { fgX, bgX };
        translateX += fgX;
        break;
      }
    }
  }

  // Integer snap translations when in pixel art mode
  if (pixelArtMode) {
    translateX = Math.round(translateX);
    translateY = Math.round(translateY);
  }

  return {
    scale,
    translateX,
    translateY,
    rotationDegrees,
    brightness,
    contrast,
    saturation,
    hueShiftDegrees,
    rgbOffsets,
    overlayAlpha,
    particles,
    scanlines,
    vhsTrackingY,
    paletteCycleOffset,
    outlineGlow,
    parallaxOffset,
  };
}
