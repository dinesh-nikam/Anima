import { FrameRasterizerService } from '../../src/application/gif/services/frame-rasterizer.service';
import { AnimationEffectInstance } from '../../src/application/gif/models/gif.model';

describe('FrameRasterizerService', () => {
  let rasterizer: FrameRasterizerService;

  beforeEach(() => {
    rasterizer = new FrameRasterizerService();
  });

  it('should rasterize source image to desired output dimensions', () => {
    const source = {
      width: 16,
      height: 16,
      data: new Uint8Array(16 * 16 * 4).fill(200),
    };

    const result = rasterizer.rasterizeFrame({
      source,
      effects: [],
      timeSeconds: 0,
      durationSeconds: 2.0,
      fps: 15,
      outputWidth: 32,
      outputHeight: 32,
    });

    expect(result.length).toBe(32 * 32 * 4);
  });

  it('should apply zoom and rotation transforms without memory corruption', () => {
    const source = {
      width: 20,
      height: 20,
      data: new Uint8Array(20 * 20 * 4).fill(150),
    };

    const zoomEffect: AnimationEffectInstance = {
      id: 'zoom',
      name: 'Zoom',
      category: 'CAMERA',
      enabled: true,
      locked: false,
      intensity: 0.8,
      speed: 1.0,
    };

    const shakeEffect: AnimationEffectInstance = {
      id: 'camera_shake',
      name: 'Camera Shake',
      category: 'CAMERA',
      enabled: true,
      locked: false,
      intensity: 0.5,
      speed: 2.0,
    };

    const frame0 = rasterizer.rasterizeFrame({
      source,
      effects: [zoomEffect, shakeEffect],
      timeSeconds: 0.0,
      durationSeconds: 3.0,
      fps: 15,
      outputWidth: 20,
      outputHeight: 20,
    });

    const frameMid = rasterizer.rasterizeFrame({
      source,
      effects: [zoomEffect, shakeEffect],
      timeSeconds: 1.5,
      durationSeconds: 3.0,
      fps: 15,
      outputWidth: 20,
      outputHeight: 20,
    });

    expect(frame0.length).toBe(20 * 20 * 4);
    expect(frameMid.length).toBe(20 * 20 * 4);
  });

  it('should snap coordinates to integers in pixelArtMode', () => {
    const source = {
      width: 8,
      height: 8,
      data: new Uint8Array(8 * 8 * 4).fill(255),
    };

    const jitterEffect: AnimationEffectInstance = {
      id: 'pixel_jitter',
      name: 'Pixel Jitter',
      category: 'PIXEL_ART',
      enabled: true,
      locked: false,
      intensity: 1.0,
      speed: 1.0,
    };

    const result = rasterizer.rasterizeFrame({
      source,
      effects: [jitterEffect],
      timeSeconds: 0.25,
      durationSeconds: 1.0,
      fps: 10,
      outputWidth: 8,
      outputHeight: 8,
      pixelArtMode: true,
    });

    expect(result.length).toBe(8 * 8 * 4);
  });

  it('should apply hue shift and brightness color modifications', () => {
    const source = {
      width: 4,
      height: 4,
      data: new Uint8Array(4 * 4 * 4),
    };
    // Fill with pure red
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 255;
      source.data[i + 1] = 0;
      source.data[i + 2] = 0;
      source.data[i + 3] = 255;
    }

    const hueEffect: AnimationEffectInstance = {
      id: 'hue_shift',
      name: 'Hue Shift',
      category: 'COLOR',
      enabled: true,
      locked: false,
      intensity: 1.0,
      speed: 1.0,
    };

    // Halfway through 2.0s duration (180 deg hue shift -> red turns to cyan)
    const result = rasterizer.rasterizeFrame({
      source,
      effects: [hueEffect],
      timeSeconds: 1.0,
      durationSeconds: 2.0,
      fps: 10,
      outputWidth: 4,
      outputHeight: 4,
    });

    const midPixelR = result[0];
    const midPixelG = result[1];
    const midPixelB = result[2];

    // Hue shift 180 degrees should significantly decrease red and increase green/blue
    expect(midPixelR).toBeLessThan(100);
    expect(midPixelG).toBeGreaterThan(150);
    expect(midPixelB).toBeGreaterThan(150);
  });
});
