import { Injectable } from '@nestjs/common';
import { AnimationEffectInstance } from '../models/gif.model';

export interface DecodedImageSource {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

export interface RasterizeFrameOptions {
  source: DecodedImageSource;
  effects: AnimationEffectInstance[];
  timeSeconds: number;
  durationSeconds: number;
  fps: number;
  outputWidth: number;
  outputHeight: number;
  pixelArtMode?: boolean;
  seed?: number | string;
}

interface EvaluatedFrameState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number; // radians
  brightness: number;
  contrast: number;
  saturation: number;
  hueShift: number; // degrees
  rgbShift: number; // pixels
  crtScanlines: number; // 0 to 1
  vhsTracking: number; // 0 to 1
  noise: number; // 0 to 1
  particles: { x: number; y: number; size: number; alpha: number }[];
  paletteCycleOffset?: number;
  pixelOutlineGlow?: { active: boolean; intensity: number; colorRgb: [number, number, number] };
  parallaxOffset?: { fgX: number; bgX: number };
}

@Injectable()
export class FrameRasterizerService {
  /**
   * Evaluates all active animation effects at time t and renders an RGBA frame buffer.
   */
  rasterizeFrame(options: RasterizeFrameOptions): Uint8Array {
    const {
      source,
      effects,
      timeSeconds,
      durationSeconds,
      outputWidth,
      outputHeight,
      pixelArtMode = false,
      seed = 12345,
    } = options;

    const totalPixels = outputWidth * outputHeight;
    const outputBuffer = new Uint8Array(totalPixels * 4);

    // 1. Evaluate effect transforms mathematically at time t
    const state = this.evaluateEffects(
      effects,
      timeSeconds,
      durationSeconds,
      outputWidth,
      outputHeight,
      seed,
    );

    // If pixel art mode, snap translation to whole pixel values
    if (pixelArtMode) {
      state.translateX = Math.round(state.translateX);
      state.translateY = Math.round(state.translateY);
      state.rgbShift = Math.round(state.rgbShift);
    }

    const cosTheta = Math.cos(state.rotation);
    const sinTheta = Math.sin(state.rotation);
    const invScale = 1.0 / Math.max(0.01, state.scale);

    const destCenterX = outputWidth * 0.5;
    const destCenterY = outputHeight * 0.5;
    const srcCenterX = source.width * 0.5;
    const srcCenterY = source.height * 0.5;

    const srcW = source.width;
    const srcH = source.height;
    const srcData = source.data;

    // Fast HSL pre-conversions for hue shift if applicable
    const hasHueShift = Math.abs(state.hueShift % 360) > 0.5;
    const hasSaturationShift = Math.abs(state.saturation - 1.0) > 0.01;
    const hasColorFilter =
      hasHueShift ||
      hasSaturationShift ||
      Math.abs(state.brightness - 1.0) > 0.01 ||
      Math.abs(state.contrast - 1.0) > 0.01;

    // 2. Pixel Transformation Loop (Inverse Mapping)
    for (let dy = 0; dy < outputHeight; dy++) {
      const destRowOffset = dy * outputWidth;
      const crtDim =
        state.crtScanlines > 0.05 && (dy & 1) === 0
          ? 1.0 - state.crtScanlines * 0.35
          : 1.0;

      for (let dx = 0; dx < outputWidth; dx++) {
        const destIdx = (destRowOffset + dx) * 4;

        // Apply VHS horizontal glitch jitter if active
        let adjustedDx = dx;
        if (state.vhsTracking > 0.1) {
          const glitchRow = Math.floor(dy / 4);
          const jitter = Math.sin(glitchRow * 12.34 + timeSeconds * 20.0) * state.vhsTracking * 6.0;
          adjustedDx += jitter;
        }

        // Relative coordinates from center of destination frame
        const relX = adjustedDx - destCenterX - state.translateX;
        const relY = dy - destCenterY - state.translateY;

        // Rotate by -theta and apply inverse scale
        const rotX = (relX * cosTheta + relY * sinTheta) * invScale;
        const rotY = (-relX * sinTheta + relY * cosTheta) * invScale;

        const srcX = srcCenterX + rotX;
        const srcY = srcCenterY + rotY;

        // Sample base pixel
        let r = 0, g = 0, b = 0, a = 0;

        if (state.rgbShift > 0.5) {
          // Chromatic aberration: split R and B sampling positions
          const redSample = this.samplePixel(srcData, srcW, srcH, srcX - state.rgbShift, srcY, pixelArtMode);
          const greenSample = this.samplePixel(srcData, srcW, srcH, srcX, srcY, pixelArtMode);
          const blueSample = this.samplePixel(srcData, srcW, srcH, srcX + state.rgbShift, srcY, pixelArtMode);

          r = redSample.r;
          g = greenSample.g;
          b = blueSample.b;
          a = Math.max(redSample.a, greenSample.a, blueSample.a);
        } else {
          const sample = this.samplePixel(srcData, srcW, srcH, srcX, srcY, pixelArtMode);
          r = sample.r;
          g = sample.g;
          b = sample.b;
          a = sample.a;
        }

        if (a === 0) {
          // Transparent pixel
          outputBuffer[destIdx] = 0;
          outputBuffer[destIdx + 1] = 0;
          outputBuffer[destIdx + 2] = 0;
          outputBuffer[destIdx + 3] = 0;
          continue;
        }

        // 3. Apply Color Filters (Brightness, Contrast, Saturation, Hue)
        if (hasColorFilter) {
          if (hasHueShift || hasSaturationShift) {
            const hsl = this.rgbToHsl(r, g, b);
            if (hasHueShift) {
              hsl.h = (hsl.h + state.hueShift / 360) % 1.0;
              if (hsl.h < 0) hsl.h += 1.0;
            }
            if (hasSaturationShift) {
              hsl.s = Math.max(0, Math.min(1, hsl.s * state.saturation));
            }
            const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
          }

          if (state.brightness !== 1.0) {
            r = Math.min(255, r * state.brightness);
            g = Math.min(255, g * state.brightness);
            b = Math.min(255, b * state.brightness);
          }

          if (state.contrast !== 1.0) {
            r = Math.max(0, Math.min(255, (r - 128) * state.contrast + 128));
            g = Math.max(0, Math.min(255, (g - 128) * state.contrast + 128));
            b = Math.max(0, Math.min(255, (b - 128) * state.contrast + 128));
          }
        }

        // Apply CRT scanlines dimming
        if (crtDim !== 1.0) {
          r *= crtDim;
          g *= crtDim;
          b *= crtDim;
        }

        // Apply Noise / Grain
        if (state.noise > 0.05) {
          const noiseFactor = (Math.sin((dx * 9301 + dy * 49297 + timeSeconds * 1000) % 233280) * 0.5) * state.noise * 50;
          r = Math.max(0, Math.min(255, r + noiseFactor));
          g = Math.max(0, Math.min(255, g + noiseFactor));
          b = Math.max(0, Math.min(255, b + noiseFactor));
        }

        outputBuffer[destIdx] = Math.round(r);
        outputBuffer[destIdx + 1] = Math.round(g);
        outputBuffer[destIdx + 2] = Math.round(b);
        outputBuffer[destIdx + 3] = Math.round(a);
      }
    }

    // 4. Render Particle Overlays
    if (state.particles.length > 0) {
      this.renderParticles(outputBuffer, outputWidth, outputHeight, state.particles);
    }

    // 5. Phase 7 — Render 1-pixel Outline Glow along Sprite Boundary
    if (state.pixelOutlineGlow?.active && state.pixelOutlineGlow.intensity > 0.05) {
      this.renderPixelOutline(
        outputBuffer,
        outputWidth,
        outputHeight,
        state.pixelOutlineGlow.intensity,
        state.pixelOutlineGlow.colorRgb,
      );
    }

    return outputBuffer;
  }

  /**
   * Mathematical state evaluation for all active effects.
   */
  private evaluateEffects(
    effects: AnimationEffectInstance[],
    time: number,
    duration: number,
    width: number,
    height: number,
    seedInput: number | string,
  ): EvaluatedFrameState {
    const seed = typeof seedInput === 'string' ? parseInt(seedInput, 10) || 12345 : seedInput;
    const progress = (time % duration) / duration; // tau in [0, 1)
    const tau2Pi = progress * 2 * Math.PI;

    let scale = 1.0;
    let translateX = 0.0;
    let translateY = 0.0;
    let rotation = 0.0;
    let brightness = 1.0;
    let contrast = 1.0;
    let saturation = 1.0;
    let hueShift = 0.0;
    let rgbShift = 0.0;
    let crtScanlines = 0.0;
    let vhsTracking = 0.0;
    let noise = 0.0;
    const particleList: { x: number; y: number; size: number; alpha: number }[] = [];
    let paletteCycleOffset: number | undefined;
    let pixelOutlineGlow: { active: boolean; intensity: number; colorRgb: [number, number, number] } | undefined;
    let parallaxOffset: { fgX: number; bgX: number } | undefined;

    for (const fx of effects) {
      if (!fx.enabled) continue;
      const intensity = Math.max(0, Math.min(1, fx.intensity ?? 0.5));
      const speed = Math.max(0.1, Math.min(5, fx.speed ?? 1.0));
      const phase = tau2Pi * speed;

      switch (fx.id) {
        // Camera
        case 'zoom': {
          const maxZoom = 0.05 + intensity * 0.15;
          scale *= 1.0 + Math.sin(phase) * maxZoom;
          break;
        }
        case 'camera_shake': {
          const shakeAmp = intensity * 6.0;
          translateX += Math.sin(phase * 3.0) * shakeAmp;
          translateY += Math.cos(phase * 4.0) * (shakeAmp * 0.7);
          break;
        }
        case 'micro_movement': {
          const microAmp = intensity * 3.0;
          translateX += Math.sin(phase) * microAmp;
          translateY += Math.cos(phase) * (microAmp * 0.5);
          break;
        }

        // Lighting
        case 'glow_pulse':
        case 'screen_glow': {
          brightness *= 1.0 + Math.sin(phase) * (intensity * 0.4);
          break;
        }
        case 'neon_flicker': {
          const flicker = Math.sin(phase * 5.0) > 0.7 ? 1.0 + intensity * 0.5 : 1.0;
          brightness *= flicker;
          break;
        }
        case 'light_sweep': {
          const sweep = (Math.sin(phase) + 1.0) * 0.5;
          brightness *= 1.0 + sweep * intensity * 0.3;
          break;
        }

        // Retro & Glitch
        case 'crt_scanlines': {
          crtScanlines = Math.max(crtScanlines, intensity);
          break;
        }
        case 'vhs_distortion': {
          vhsTracking = Math.max(vhsTracking, intensity);
          rgbShift = Math.max(rgbShift, intensity * 4.0);
          break;
        }
        case 'film_grain':
        case 'digital_noise': {
          noise = Math.max(noise, intensity);
          break;
        }
        case 'chromatic_aberration':
        case 'rgb_shift': {
          const shift = (Math.sin(phase) * 0.5 + 0.5) * intensity * 8.0;
          rgbShift = Math.max(rgbShift, shift);
          break;
        }

        // Motion
        case 'floating':
        case 'bobbing': {
          const floatAmp = intensity * 12.0;
          translateY += Math.sin(phase) * floatAmp;
          break;
        }
        case 'breathing': {
          const breathAmp = intensity * 0.06;
          scale *= 1.0 + Math.sin(phase) * breathAmp;
          break;
        }
        case 'object_bounce':
        case 'sprite_bounce': {
          const bounceAmp = intensity * 14.0;
          translateY += Math.abs(Math.sin(phase)) * -bounceAmp;
          break;
        }
        case 'pixel_jitter': {
          const jitterAmp = intensity * 3.0;
          translateX += Math.round(Math.sin(phase * 4.0) * jitterAmp);
          translateY += Math.round(Math.cos(phase * 4.0) * jitterAmp);
          break;
        }

        // Color
        case 'hue_shift': {
          hueShift += progress * 360 * speed;
          break;
        }
        case 'saturation_pulse': {
          saturation *= 1.0 + Math.sin(phase) * (intensity * 0.6);
          break;
        }
        case 'brightness_pulse': {
          brightness *= 1.0 + Math.sin(phase) * (intensity * 0.5);
          break;
        }

        // Atmosphere
        case 'floating_particles':
        case 'snow':
        case 'rain':
        case 'sparks': {
          const count = Math.round(15 + intensity * 40);
          const isDownward = fx.id === 'snow' || fx.id === 'rain';
          const isSpark = fx.id === 'sparks';

          for (let p = 0; p < count; p++) {
            const pSeed = (seed + p * 7919) % 100000;
            const startX = ((pSeed * 13) % width);
            const startY = ((pSeed * 29) % height);
            const pSpeed = 0.5 + ((pSeed % 100) / 100.0) * 1.5;

            let curX = startX;
            let curY = startY;

            if (isDownward) {
              curY = (startY + progress * height * pSpeed) % height;
              curX += Math.sin(tau2Pi + p) * 5.0;
            } else if (isSpark) {
              curY = (startY - progress * height * pSpeed + height) % height;
              curX += Math.cos(tau2Pi + p) * 8.0;
            } else {
              curX = (startX + Math.sin(tau2Pi * pSpeed + p) * 20.0 + width) % width;
              curY = (startY + Math.cos(tau2Pi * pSpeed + p) * 20.0 + height) % height;
            }

            particleList.push({
              x: curX,
              y: curY,
              size: Math.max(1, Math.round(1 + ((pSeed % 30) / 10.0) * intensity)),
              alpha: 0.3 + 0.6 * Math.sin(tau2Pi + p),
            });
          }
          break;
        }

        // Phase 7 — Advanced Pixel Art & Multi-Plane
        case 'palette_cycle': {
          paletteCycleOffset = (progress * (fx.parameters?.cycleSpeed || 2.0) * duration) % 1.0;
          break;
        }
        case 'pixel_outline_glow': {
          const pulse = 0.5 + 0.5 * Math.sin(phase);
          pixelOutlineGlow = {
            active: true,
            intensity: intensity * pulse,
            colorRgb: [168, 85, 247], // Purple glow
          };
          break;
        }
        case 'retro_idle_stepped': {
          const stepCount = 4;
          const stepIdx = Math.floor(progress * stepCount) % stepCount;
          const steps = [0, 1, 2, 1];
          const hop = Math.round(3 * intensity);
          translateY += steps[stepIdx] * hop;
          break;
        }
        case 'parallax_depth': {
          const amp = intensity * 6.0;
          const fgX = Math.sin(phase) * amp;
          const bgX = -Math.sin(phase) * (amp * 0.4);
          parallaxOffset = { fgX, bgX };
          translateX += fgX;
          break;
        }
      }
    }

    return {
      scale,
      translateX,
      translateY,
      rotation,
      brightness,
      contrast,
      saturation,
      hueShift,
      rgbShift,
      crtScanlines,
      vhsTracking,
      noise,
      particles: particleList,
      paletteCycleOffset,
      pixelOutlineGlow,
      parallaxOffset,
    };
  }

  /**
   * Fast pixel sampler with nearest-neighbor or bilinear interpolation.
   */
  private samplePixel(
    data: Uint8Array | Buffer,
    w: number,
    h: number,
    x: number,
    y: number,
    pixelArtMode: boolean,
  ): { r: number; g: number; b: number; a: number } {
    if (pixelArtMode) {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix < 0 || ix >= w || iy < 0 || iy >= h) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
      const idx = (iy * w + ix) * 4;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
      };
    }

    // Bilinear Interpolation
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    if (x1 < 0 || x0 >= w || y1 < 0 || y0 >= h) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    const fx = x - x0;
    const fy = y - y0;
    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;

    const getP = (px: number, py: number) => {
      if (px < 0 || px >= w || py < 0 || py >= h) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
      const pIdx = (py * w + px) * 4;
      return {
        r: data[pIdx],
        g: data[pIdx + 1],
        b: data[pIdx + 2],
        a: data[pIdx + 3],
      };
    };

    const p00 = getP(x0, y0);
    const p10 = getP(x1, y0);
    const p01 = getP(x0, y1);
    const p11 = getP(x1, y1);

    return {
      r: p00.r * w00 + p10.r * w10 + p01.r * w01 + p11.r * w11,
      g: p00.g * w00 + p10.g * w10 + p01.g * w01 + p11.g * w11,
      b: p00.b * w00 + p10.b * w10 + p01.b * w01 + p11.b * w11,
      a: p00.a * w00 + p10.a * w10 + p01.a * w01 + p11.a * w11,
    };
  }

  private renderParticles(
    buf: Uint8Array,
    w: number,
    h: number,
    particles: { x: number; y: number; size: number; alpha: number }[],
  ) {
    for (const p of particles) {
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      const radius = p.size;
      const alpha = Math.max(0, Math.min(1, p.alpha));

      for (let dy = -radius; dy <= radius; dy++) {
        const targetY = py + dy;
        if (targetY < 0 || targetY >= h) continue;

        for (let dx = -radius; dx <= radius; dx++) {
          const targetX = px + dx;
          if (targetX < 0 || targetX >= w) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq <= radius * radius) {
            const idx = (targetY * w + targetX) * 4;
            // Additive particle blend
            buf[idx] = Math.min(255, buf[idx] + 255 * alpha * 0.6);
            buf[idx + 1] = Math.min(255, buf[idx + 1] + 255 * alpha * 0.6);
            buf[idx + 2] = Math.min(255, buf[idx + 2] + 255 * alpha * 0.7);
            buf[idx + 3] = Math.max(buf[idx + 3], Math.round(alpha * 255));
          }
        }
      }
    }
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  /**
   * Identifies exterior 1-pixel boundary pixels and blends glowing neon outline.
   */
  private renderPixelOutline(
    buf: Uint8Array,
    w: number,
    h: number,
    intensity: number,
    colorRgb: [number, number, number],
  ) {
    const outlinePixels: number[] = [];
    const [glowR, glowG, glowB] = colorRgb;

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = (rowOffset + x) * 4;
        // Only target transparent or near-black background pixels
        if (buf[idx + 3] < 128) {
          // Check 4-way neighbors for opaque sprite pixels
          const upOpaque = buf[((y - 1) * w + x) * 4 + 3] >= 128;
          const downOpaque = buf[((y + 1) * w + x) * 4 + 3] >= 128;
          const leftOpaque = buf[(rowOffset + (x - 1)) * 4 + 3] >= 128;
          const rightOpaque = buf[(rowOffset + (x + 1)) * 4 + 3] >= 128;

          if (upOpaque || downOpaque || leftOpaque || rightOpaque) {
            outlinePixels.push(idx);
          }
        }
      }
    }

    const blendAlpha = Math.max(0, Math.min(1, intensity));
    for (const idx of outlinePixels) {
      buf[idx] = glowR;
      buf[idx + 1] = glowG;
      buf[idx + 2] = glowB;
      buf[idx + 3] = Math.round(255 * blendAlpha);
    }
  }
}
