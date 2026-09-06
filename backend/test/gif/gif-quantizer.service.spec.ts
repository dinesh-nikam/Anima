import { GifQuantizerService } from '../../src/application/gif/services/gif-quantizer.service';

describe('GifQuantizerService', () => {
  let quantizer: GifQuantizerService;

  beforeEach(() => {
    quantizer = new GifQuantizerService();
  });

  it('should generate a palette with length equal to a power of 2', () => {
    // Synthetic 16x16 image with random colors
    const buffer = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = (i * 13) % 256;
      buffer[i + 1] = (i * 17) % 256;
      buffer[i + 2] = (i * 23) % 256;
      buffer[i + 3] = 255;
    }

    const result = quantizer.quantize([buffer], 64);
    expect(result.palette.length).toBeGreaterThanOrEqual(2);
    expect(result.palette.length).toBeLessThanOrEqual(256);

    // Verify power of 2
    const len = result.palette.length;
    expect((len & (len - 1))).toBe(0);
    expect(result.transparentIndex).toBeNull();
  });

  it('should preserve transparency and reserve index 0 when transparent pixels are present', () => {
    const buffer = new Uint8Array(8 * 8 * 4);
    // Half opaque red, half transparent
    for (let i = 0; i < buffer.length; i += 4) {
      if (i < buffer.length / 2) {
        buffer[i] = 255;
        buffer[i + 1] = 0;
        buffer[i + 2] = 0;
        buffer[i + 3] = 255;
      } else {
        buffer[i] = 0;
        buffer[i + 1] = 0;
        buffer[i + 2] = 0;
        buffer[i + 3] = 0; // Alpha 0
      }
    }

    const result = quantizer.quantize([buffer], 32, 128);
    expect(result.transparentIndex).toBe(0);
    expect(result.palette[0]).toBe(0x000000); // Index 0 reserved for transparent

    // Verify lookup of transparent pixel returns index 0
    const transparentLookup = result.findNearestIndex(100, 100, 100, 50);
    expect(transparentLookup).toBe(0);

    // Verify lookup of opaque red returns an opaque color index (> 0)
    const redLookup = result.findNearestIndex(250, 5, 5, 255);
    expect(redLookup).toBeGreaterThan(0);
  });

  it('should find nearest color accurately with redmean metric', () => {
    // Solid green and solid blue
    const buffer = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < buffer.length; i += 8) {
      buffer[i] = 0;
      buffer[i + 1] = 255; // Green
      buffer[i + 2] = 0;
      buffer[i + 3] = 255;

      buffer[i + 4] = 0;
      buffer[i + 5] = 0;
      buffer[i + 6] = 255; // Blue
      buffer[i + 7] = 255;
    }

    const result = quantizer.quantize([buffer], 16);
    const greenIdx = result.findNearestIndex(10, 240, 15);
    const blueIdx = result.findNearestIndex(5, 10, 245);

    expect(greenIdx).not.toBe(blueIdx);
  });
});
