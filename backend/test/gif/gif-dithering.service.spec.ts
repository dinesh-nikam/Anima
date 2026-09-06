import { GifDitheringService } from '../../src/application/gif/services/gif-dithering.service';
import { GifQuantizerService } from '../../src/application/gif/services/gif-quantizer.service';
import { DitherMode } from '../../src/application/gif/dto/gif-render.dto';

describe('GifDitheringService', () => {
  let dithering: GifDitheringService;
  let quantizer: GifQuantizerService;

  beforeEach(() => {
    dithering = new GifDitheringService();
    quantizer = new GifQuantizerService();
  });

  it('should dither with Floyd-Steinberg without exceeding bounds', () => {
    const width = 8;
    const height = 8;
    const buffer = new Uint8Array(width * height * 4);

    // Gradient
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        buffer[idx] = (x * 32) % 256;
        buffer[idx + 1] = (y * 32) % 256;
        buffer[idx + 2] = 128;
        buffer[idx + 3] = 255;
      }
    }

    const paletteResult = quantizer.quantize([buffer], 16);
    const indexed = dithering.ditherFrame(
      buffer,
      width,
      height,
      paletteResult,
      DitherMode.FLOYD_STEINBERG,
    );

    expect(indexed.length).toBe(width * height);
    for (let i = 0; i < indexed.length; i++) {
      expect(indexed[i]).toBeGreaterThanOrEqual(0);
      expect(indexed[i]).toBeLessThan(paletteResult.palette.length);
    }
  });

  it('should support Bayer 4x4 ordered dithering', () => {
    const width = 4;
    const height = 4;
    const buffer = new Uint8Array(width * height * 4);
    buffer.fill(128); // Grey image

    const paletteResult = quantizer.quantize([buffer], 16);
    const indexed = dithering.ditherFrame(
      buffer,
      width,
      height,
      paletteResult,
      DitherMode.BAYER,
    );

    expect(indexed.length).toBe(16);
  });

  it('should support crisp None (zero dither) mode for pixel art', () => {
    const width = 4;
    const height = 4;
    const buffer = new Uint8Array(width * height * 4);

    // Solid magenta
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = 255;
      buffer[i + 1] = 0;
      buffer[i + 2] = 255;
      buffer[i + 3] = 255;
    }

    const paletteResult = quantizer.quantize([buffer], 16);
    const indexed = dithering.ditherFrame(
      buffer,
      width,
      height,
      paletteResult,
      DitherMode.NONE,
    );

    // All indexed pixels should map to the exact same color index
    const firstVal = indexed[0];
    for (let i = 1; i < indexed.length; i++) {
      expect(indexed[i]).toBe(firstVal);
    }
  });

  it('should preserve transparent pixels across all dithering modes', () => {
    const width = 4;
    const height = 4;
    const buffer = new Uint8Array(width * height * 4);
    // Pixel 0 is transparent
    buffer[3] = 0; // Alpha 0
    // Remaining pixels opaque white
    for (let i = 4; i < buffer.length; i += 4) {
      buffer[i] = 255;
      buffer[i + 1] = 255;
      buffer[i + 2] = 255;
      buffer[i + 3] = 255;
    }

    const paletteResult = quantizer.quantize([buffer], 16, 128);
    expect(paletteResult.transparentIndex).toBe(0);

    for (const mode of [DitherMode.FLOYD_STEINBERG, DitherMode.BAYER, DitherMode.NONE]) {
      const indexed = dithering.ditherFrame(buffer, width, height, paletteResult, mode, 128);
      expect(indexed[0]).toBe(0); // Pixel 0 must be transparent index 0
    }
  });
});
