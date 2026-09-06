import { Injectable } from '@nestjs/common';
import { DitherMode } from '../dto/gif-render.dto';
import { QuantizedPaletteResult } from './gif-quantizer.service';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

@Injectable()
export class GifDitheringService {
  /**
   * Dithers an RGBA frame buffer into an indexed pixel array (1 byte per pixel)
   * using the chosen dithering mode (Floyd-Steinberg, Bayer 4x4, or None).
   */
  ditherFrame(
    rgba: Uint8Array | Buffer,
    width: number,
    height: number,
    paletteResult: QuantizedPaletteResult,
    ditherMode: DitherMode = DitherMode.FLOYD_STEINBERG,
    alphaThreshold = 128,
  ): Uint8Array {
    const totalPixels = width * height;
    const indexed = new Uint8Array(totalPixels);
    const { findNearestIndex, transparentIndex, palette } = paletteResult;

    if (ditherMode === DitherMode.NONE) {
      // 1. Direct Nearest Neighbor (Zero Dither, pristine edges for pixel art)
      for (let i = 0; i < totalPixels; i++) {
        const p4 = i * 4;
        const r = rgba[p4];
        const g = rgba[p4 + 1];
        const b = rgba[p4 + 2];
        const a = rgba[p4 + 3];

        if (transparentIndex !== null && a < alphaThreshold) {
          indexed[i] = transparentIndex;
        } else {
          indexed[i] = findNearestIndex(r, g, b, a);
        }
      }
      return indexed;
    }

    if (ditherMode === DitherMode.BAYER) {
      // 2. Ordered Bayer 4x4 Dithering
      const spread = 24; // Subtle retro texture spread
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        const bayerRow = BAYER_4X4[y & 3];

        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          const p4 = idx * 4;
          const a = rgba[p4 + 3];

          if (transparentIndex !== null && a < alphaThreshold) {
            indexed[idx] = transparentIndex;
            continue;
          }

          const threshold = (bayerRow[x & 3] / 16.0 - 0.5) * spread;
          const r = Math.max(0, Math.min(255, Math.round(rgba[p4] + threshold)));
          const g = Math.max(0, Math.min(255, Math.round(rgba[p4 + 1] + threshold)));
          const b = Math.max(0, Math.min(255, Math.round(rgba[p4 + 2] + threshold)));

          indexed[idx] = findNearestIndex(r, g, b, a);
        }
      }
      return indexed;
    }

    // 3. Floyd-Steinberg Error Diffusion with Serpentine Scanning
    // Working buffer for RGB channels (floating point or signed 16-bit to avoid clipping during diffusion)
    const workR = new Float32Array(totalPixels);
    const workG = new Float32Array(totalPixels);
    const workB = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const p4 = i * 4;
      workR[i] = rgba[p4];
      workG[i] = rgba[p4 + 1];
      workB[i] = rgba[p4 + 2];
    }

    // Unpack palette colors for fast distance error calculation
    const unpackedPaletteR = new Uint8Array(palette.length);
    const unpackedPaletteG = new Uint8Array(palette.length);
    const unpackedPaletteB = new Uint8Array(palette.length);

    for (let i = 0; i < palette.length; i++) {
      const color = palette[i];
      unpackedPaletteR[i] = (color >> 16) & 0xff;
      unpackedPaletteG[i] = (color >> 8) & 0xff;
      unpackedPaletteB[i] = color & 0xff;
    }

    for (let y = 0; y < height; y++) {
      const isEvenRow = (y & 1) === 0;
      const startX = isEvenRow ? 0 : width - 1;
      const endX = isEvenRow ? width : -1;
      const stepX = isEvenRow ? 1 : -1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = y * width + x;
        const p4 = idx * 4;
        const a = rgba[p4 + 3];

        if (transparentIndex !== null && a < alphaThreshold) {
          indexed[idx] = transparentIndex;
          continue;
        }

        const oldR = Math.max(0, Math.min(255, workR[idx]));
        const oldG = Math.max(0, Math.min(255, workG[idx]));
        const oldB = Math.max(0, Math.min(255, workB[idx]));

        const colorIdx = findNearestIndex(
          Math.round(oldR),
          Math.round(oldG),
          Math.round(oldB),
          a,
        );
        indexed[idx] = colorIdx;

        const newR = unpackedPaletteR[colorIdx];
        const newG = unpackedPaletteG[colorIdx];
        const newB = unpackedPaletteB[colorIdx];

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Distribute error:
        // Even (Left-to-Right):
        //   (x+1, y)   : 7/16
        //   (x-1, y+1) : 3/16
        //   (x,   y+1) : 5/16
        //   (x+1, y+1) : 1/16
        // Odd (Right-to-Left):
        //   (x-1, y)   : 7/16
        //   (x+1, y+1) : 3/16
        //   (x,   y+1) : 5/16
        //   (x-1, y+1) : 1/16
        const nextX = x + stepX;
        const prevX = x - stepX;
        const nextY = y + 1;

        if (nextX >= 0 && nextX < width) {
          const target = y * width + nextX;
          workR[target] += (errR * 7) / 16;
          workG[target] += (errG * 7) / 16;
          workB[target] += (errB * 7) / 16;
        }

        if (nextY < height) {
          if (prevX >= 0 && prevX < width) {
            const target = nextY * width + prevX;
            workR[target] += (errR * 3) / 16;
            workG[target] += (errG * 3) / 16;
            workB[target] += (errB * 3) / 16;
          }

          const targetCenter = nextY * width + x;
          workR[targetCenter] += (errR * 5) / 16;
          workG[targetCenter] += (errG * 5) / 16;
          workB[targetCenter] += (errB * 5) / 16;

          if (nextX >= 0 && nextX < width) {
            const target = nextY * width + nextX;
            workR[target] += (errR * 1) / 16;
            workG[target] += (errG * 1) / 16;
            workB[target] += (errB * 1) / 16;
          }
        }
      }
    }

    return indexed;
  }
}
