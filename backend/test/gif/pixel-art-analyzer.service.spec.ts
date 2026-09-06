import { PixelArtAnalyzerService } from '../../src/application/gif/services/pixel-art-analyzer.service';

describe('PixelArtAnalyzerService', () => {
  let service: PixelArtAnalyzerService;

  beforeEach(() => {
    service = new PixelArtAnalyzerService();
  });

  it('should detect 1x1 standard resolution for non-chunky images', () => {
    // 16x16 alternating high-frequency noise
    const buffer = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = (i * 37) % 256;
      buffer[i + 1] = (i * 59) % 256;
      buffer[i + 2] = (i * 83) % 256;
      buffer[i + 3] = 255;
    }

    const result = service.inspectPixelArt(buffer, 16, 16, false);
    expect(result.detectedGridSize).toBe(1);
    expect(result.isChunkyPixelArt).toBe(false);
  });

  it('should detect 2x2 or 4x4 chunky pixel grid scale', () => {
    const width = 32;
    const height = 32;
    const buffer = new Uint8Array(width * height * 4);
    const blockSize = 4;

    // Create 4x4 chunky pixel blocks
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        const r = (bx * 17) % 256;
        const g = (by * 29) % 256;
        const b = 150;

        for (let py = 0; py < blockSize; py++) {
          for (let px = 0; px < blockSize; px++) {
            const idx = ((by + py) * width + (bx + px)) * 4;
            buffer[idx] = r;
            buffer[idx + 1] = g;
            buffer[idx + 2] = b;
            buffer[idx + 3] = 255;
          }
        }
      }
    }

    const result = service.inspectPixelArt(buffer, width, height, false);
    expect([2, 4]).toContain(result.detectedGridSize);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should extract color ramps when multiple luminance tones of a hue exist', () => {
    const width = 16;
    const height = 16;
    const buffer = new Uint8Array(width * height * 4);

    // Create 4 shades of purple (varying luminance)
    const purpleShades = [
      [60, 20, 90],
      [100, 40, 150],
      [150, 70, 210],
      [200, 120, 255],
    ];

    for (let i = 0; i < width * height; i++) {
      const shade = purpleShades[i % 4];
      const idx = i * 4;
      buffer[idx] = shade[0];
      buffer[idx + 1] = shade[1];
      buffer[idx + 2] = shade[2];
      buffer[idx + 3] = 255;
    }

    const result = service.inspectPixelArt(buffer, width, height, false);
    expect(result.colorRamps.length).toBeGreaterThanOrEqual(1);
    expect(result.colorRamps[0].colors.length).toBeGreaterThanOrEqual(3);
  });

  it('should extract foreground bounds correctly with alpha transparency', () => {
    const width = 20;
    const height = 20;
    const buffer = new Uint8Array(width * height * 4); // All transparent

    // Draw an opaque box in the center: [5, 5] to [15, 15]
    for (let y = 5; y <= 15; y++) {
      for (let x = 5; x <= 15; x++) {
        const idx = (y * width + x) * 4;
        buffer[idx] = 255;
        buffer[idx + 1] = 100;
        buffer[idx + 2] = 50;
        buffer[idx + 3] = 255; // Opaque
      }
    }

    const result = service.inspectPixelArt(buffer, width, height, true);
    expect(result.foregroundMask).toBeDefined();
    expect(result.foregroundMask?.bounds.minX).toBe(5);
    expect(result.foregroundMask?.bounds.maxX).toBe(15);
    expect(result.foregroundMask?.bounds.minY).toBe(5);
    expect(result.foregroundMask?.bounds.maxY).toBe(15);
  });
});
