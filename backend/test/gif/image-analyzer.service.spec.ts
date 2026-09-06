import { ImageAnalyzerService } from '../../src/application/gif/services/image-analyzer.service';
import { PNG } from 'pngjs';
import * as jpeg from 'jpeg-js';

describe('ImageAnalyzerService — Phase 2 Algorithmic Image Analysis & Feature Extraction', () => {
  let analyzer: ImageAnalyzerService;

  beforeEach(() => {
    analyzer = new ImageAnalyzerService();
  });

  // Helper to generate real decoded PNG buffer with custom pixels
  function generateTestPng(
    width: number,
    height: number,
    pixelGenerator: (x: number, y: number) => [number, number, number, number],
  ): Buffer {
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const [r, g, b, a] = pixelGenerator(x, y);
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = a;
      }
    }
    return PNG.sync.write(png);
  }

  // Helper to generate real decoded JPEG buffer
  function generateTestJpeg(
    width: number,
    height: number,
    pixelGenerator: (x: number, y: number) => [number, number, number],
  ): Buffer {
    const data = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) * 4;
        const [r, g, b] = pixelGenerator(x, y);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    const rawImageData = { data, width, height };
    const encoded = jpeg.encode(rawImageData, 80);
    return encoded.data;
  }

  describe('Dark Scene Analysis', () => {
    it('should detect a dark scene with low average brightness and high confidence', async () => {
      // Create a 64x64 dark image (deep navy/black with occasional dim stars)
      const buffer = generateTestPng(64, 64, (x, y) => {
        if (x === 10 && y === 10) return [200, 200, 255, 255]; // dim star
        return [10, 15, 25, 255]; // deep night sky
      });

      const analysis = await analyzer.analyze(buffer, 'PNG');

      expect(analysis.width).toBe(64);
      expect(analysis.height).toBe(64);
      expect(analysis.brightness).toBeLessThan(0.20);
      expect(analysis.darkScene.detected).toBe(true);
      expect(analysis.darkScene.confidence).toBeGreaterThanOrEqual(0.70);
      expect(analysis.dominantColors.length).toBeGreaterThan(0);
      expect(analysis.dominantColors[0].hex).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Pixel Art Characteristics Detection', () => {
    it('should detect pixel art characteristics for quantized, low-color palette sprite art', async () => {
      // 32x32 retro sprite using only 4 distinct colors in flat 4x4 blocks
      const palette: [number, number, number, number][] = [
        [34, 32, 52, 255],   // dark outline
        [106, 190, 48, 255], // green
        [217, 87, 99, 255],  // red
        [251, 242, 54, 255], // yellow
      ];

      // 64x64 retro sprite with flat solid background and 4-color palette in center
      const buffer = generateTestPng(64, 64, (x, y) => {
        if (x < 16 || x > 48 || y < 16 || y > 48) {
          return [34, 32, 52, 255]; // solid flat background
        }
        const colorIdx = (Math.floor(x / 4) + Math.floor(y / 4)) % palette.length;
        return palette[colorIdx];
      });

      const analysis = await analyzer.analyze(buffer, 'PNG');

      expect(analysis.pixelArt.detected).toBe(true);
      expect(analysis.pixelArt.confidence).toBeGreaterThanOrEqual(0.70);
      expect(analysis.uniqueColorCount).toBeLessThanOrEqual(32);
      expect(analysis.flatAreaRatio).toBeGreaterThan(0.20);
    });
  });

  describe('Photographic Characteristics Detection', () => {
    it('should detect photographic characteristics for continuous-tone gradients with high palette variation', async () => {
      // 120x80 smooth continuous spectrum gradient
      const buffer = generateTestJpeg(120, 80, (x, y) => {
        const r = Math.floor((x / 120) * 255);
        const g = Math.floor((y / 80) * 255);
        const b = Math.floor(((x + y) / 200) * 255);
        return [r, g, b];
      });

      const analysis = await analyzer.analyze(buffer, 'JPEG');

      expect(analysis.photographic.detected).toBe(true);
      expect(analysis.photographic.confidence).toBeGreaterThanOrEqual(0.60);
      expect(analysis.uniqueColorCount).toBeGreaterThan(300);
      expect(analysis.pixelArt.detected).toBe(false);
    });
  });

  describe('Transparency & Alpha Foreground Separation', () => {
    it('should detect transparency and separate foreground when alpha channel is present', async () => {
      // 50x50 icon: transparent perimeter, solid center circle
      const buffer = generateTestPng(50, 50, (x, y) => {
        const dx = x - 25;
        const dy = y - 25;
        if (dx * dx + dy * dy <= 15 * 15) {
          return [255, 100, 50, 255]; // center circle
        }
        return [0, 0, 0, 0]; // transparent outside
      });

      const analysis = await analyzer.analyze(buffer, 'PNG');

      expect(analysis.hasAlpha).toBe(true);
      expect(analysis.alphaCoverage).toBeGreaterThan(0.30);
      expect(analysis.foregroundBackgroundSeparation.separated).toBe(true);
      expect(analysis.foregroundBackgroundSeparation.confidence).toBeGreaterThanOrEqual(0.90);
      expect(analysis.foregroundBackgroundSeparation.method).toBe('TRANSPARENT_ALPHA_CHANNEL');
    });
  });

  describe('Strict No-Hallucination Semantic Rules (Section 3 & 37)', () => {
    it('must report NOT_SUPPORTED for semantic object segmentation rather than inventing objects', async () => {
      const buffer = generateTestPng(40, 40, () => [128, 128, 128, 255]);
      const analysis = await analyzer.analyze(buffer, 'PNG');

      expect(analysis.semanticObjects.status).toBe('NOT_SUPPORTED');
      expect(analysis.semanticObjects.confidence).toBe(0.0);
      expect(analysis.semanticObjects.detected).toBe(false);
      expect(analysis.characters.status).toBe('NOT_SUPPORTED');
      expect(analysis.characters.confidence).toBe(0.0);
      expect(analysis.characters.detected).toBe(false);
    });
  });
});
