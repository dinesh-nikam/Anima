import { Injectable, Logger } from '@nestjs/common';

export interface QuantizedPaletteResult {
  /**
   * Array of 24-bit packed RGB integers: (r << 16) | (g << 8) | b.
   * Length is guaranteed to be a power of 2 (up to 256).
   */
  palette: number[];
  transparentIndex: number | null;
  findNearestIndex: (r: number, g: number, b: number, a?: number) => number;
}

interface RgbPoint {
  r: number;
  g: number;
  b: number;
}

interface ColorBox {
  points: RgbPoint[];
  minR: number;
  maxR: number;
  minG: number;
  maxG: number;
  minB: number;
  maxB: number;
}

@Injectable()
export class GifQuantizerService {
  private readonly logger = new Logger(GifQuantizerService.name);

  /**
   * Generates an optimal 256-color palette (or smaller power-of-2) using Median-Cut quantization.
   * Properly preserves alpha transparency if transparent pixels exist.
   *
   * @param pixelBuffers Array of RGBA buffers (each 4 bytes per pixel: R, G, B, A)
   * @param maxColors Maximum number of colors (16 to 256, default 256)
   * @param alphaThreshold Alpha values below this are treated as transparent (default 128)
   */
  quantize(
    pixelBuffers: (Uint8Array | Buffer)[],
    maxColors = 256,
    alphaThreshold = 128,
  ): QuantizedPaletteResult {
    const clampedMaxColors = Math.max(16, Math.min(256, maxColors));
    let hasTransparency = false;
    const opaquePoints: RgbPoint[] = [];

    // 1. Collect sampled opaque pixels and detect transparency
    // To maintain fast performance on large resolutions, subsample if total pixels exceed 100,000
    let totalPixelCount = 0;
    for (const buf of pixelBuffers) {
      totalPixelCount += buf.length / 4;
    }

    const step = Math.max(1, Math.floor(totalPixelCount / 65536));

    for (const buf of pixelBuffers) {
      const len = buf.length;
      for (let i = 0; i < len; i += 4 * step) {
        const a = buf[i + 3];
        if (a < alphaThreshold) {
          hasTransparency = true;
        } else {
          opaquePoints.push({
            r: buf[i],
            g: buf[i + 1],
            b: buf[i + 2],
          });
        }
      }
    }

    const targetOpaqueColors = hasTransparency ? clampedMaxColors - 1 : clampedMaxColors;

    // 2. Perform Median-Cut partitioning
    const rawRgbPalette: [number, number, number][] = [];

    if (opaquePoints.length === 0) {
      // Degenerate case: completely transparent or empty image
      rawRgbPalette.push([0, 0, 0]);
    } else {
      const initialBox = this.createColorBox(opaquePoints);
      const boxes: ColorBox[] = [initialBox];

      while (boxes.length < targetOpaqueColors) {
        // Find box with greatest range across any channel
        let splitBoxIdx = -1;
        let maxSpread = -1;

        for (let i = 0; i < boxes.length; i++) {
          const box = boxes[i];
          if (box.points.length <= 1) continue;
          const spreadR = box.maxR - box.minR;
          const spreadG = box.maxG - box.minG;
          const spreadB = box.maxB - box.minB;
          const spread = Math.max(spreadR, spreadG, spreadB);

          if (spread > maxSpread && spread > 0) {
            maxSpread = spread;
            splitBoxIdx = i;
          }
        }

        if (splitBoxIdx === -1) {
          // No further box can be split
          break;
        }

        const boxToSplit = boxes.splice(splitBoxIdx, 1)[0];
        const [boxA, boxB] = this.splitBox(boxToSplit);
        boxes.push(boxA, boxB);
      }

      // Compute representative centroid color for each box
      for (const box of boxes) {
        rawRgbPalette.push(this.calculateBoxCentroid(box));
      }
    }

    // 3. Assemble palette with transparent index if necessary
    const transparentIndex = hasTransparency ? 0 : null;
    const finalRgbList: [number, number, number][] = [];

    if (hasTransparency) {
      // Reserve index 0 for transparent color (black placeholder)
      finalRgbList.push([0, 0, 0]);
    }

    for (const rgb of rawRgbPalette) {
      if (finalRgbList.length >= clampedMaxColors) break;
      finalRgbList.push(rgb);
    }

    // Pad to the next power of 2 (required by GIF specification and omggif)
    // Valid lengths: 2, 4, 8, 16, 32, 64, 128, 256
    let powerOfTwo = 2;
    while (powerOfTwo < finalRgbList.length) {
      powerOfTwo *= 2;
    }
    powerOfTwo = Math.min(256, Math.max(2, powerOfTwo));

    while (finalRgbList.length < powerOfTwo) {
      finalRgbList.push([0, 0, 0]);
    }

    // Convert to 24-bit integer packed format for omggif
    const packedPalette: number[] = finalRgbList.map(
      ([r, g, b]) => ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff),
    );

    // 4. Build 15-bit (32x32x32) fast lookup cache table for O(1) nearest-neighbor matching
    const lutSize = 32 * 32 * 32;
    const lookupTable = new Int16Array(lutSize);
    lookupTable.fill(-1);

    const startIndex = hasTransparency ? 1 : 0;
    const validColorsCount = Math.min(finalRgbList.length, clampedMaxColors);

    const findNearestIndex = (r: number, g: number, b: number, a = 255): number => {
      if (hasTransparency && a < alphaThreshold) {
        return 0;
      }

      // 5-bit quantized coordinates
      const qr = Math.min(31, Math.max(0, r >> 3));
      const qg = Math.min(31, Math.max(0, g >> 3));
      const qb = Math.min(31, Math.max(0, b >> 3));
      const lutKey = (qr << 10) | (qg << 5) | qb;

      const cached = lookupTable[lutKey];
      if (cached !== -1) {
        return cached;
      }

      // Compute nearest color using redmean color distance
      let bestDist = Infinity;
      let bestIndex = startIndex;

      for (let i = startIndex; i < validColorsCount; i++) {
        const [pr, pg, pb] = finalRgbList[i];
        const dr = r - pr;
        const dg = g - pg;
        const db = b - pb;
        const rmean = (r + pr) * 0.5;

        // Redmean perceptual formula
        const dist =
          (2 + rmean / 256) * dr * dr +
          4.0 * dg * dg +
          (2 + (255 - rmean) / 256) * db * db;

        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
          if (dist === 0) break;
        }
      }

      lookupTable[lutKey] = bestIndex;
      return bestIndex;
    };

    return {
      palette: packedPalette,
      transparentIndex,
      findNearestIndex,
    };
  }

  private createColorBox(points: RgbPoint[]): ColorBox {
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (const p of points) {
      if (p.r < minR) minR = p.r;
      if (p.r > maxR) maxR = p.r;
      if (p.g < minG) minG = p.g;
      if (p.g > maxG) maxG = p.g;
      if (p.b < minB) minB = p.b;
      if (p.b > maxB) maxB = p.b;
    }

    return { points, minR, maxR, minG, maxG, minB, maxB };
  }

  private splitBox(box: ColorBox): [ColorBox, ColorBox] {
    const spreadR = box.maxR - box.minR;
    const spreadG = box.maxG - box.minG;
    const spreadB = box.maxB - box.minB;

    let sortKey: 'r' | 'g' | 'b' = 'r';
    if (spreadG >= spreadR && spreadG >= spreadB) {
      sortKey = 'g';
    } else if (spreadB >= spreadR && spreadB >= spreadG) {
      sortKey = 'b';
    }

    box.points.sort((a, b) => a[sortKey] - b[sortKey]);
    const medianIdx = Math.floor(box.points.length / 2);

    const pointsA = box.points.slice(0, medianIdx);
    const pointsB = box.points.slice(medianIdx);

    return [this.createColorBox(pointsA), this.createColorBox(pointsB)];
  }

  private calculateBoxCentroid(box: ColorBox): [number, number, number] {
    if (box.points.length === 0) {
      return [box.minR, box.minG, box.minB];
    }

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;

    for (const p of box.points) {
      sumR += p.r;
      sumG += p.g;
      sumB += p.b;
    }

    const count = box.points.length;
    return [
      Math.round(sumR / count),
      Math.round(sumG / count),
      Math.round(sumB / count),
    ];
  }
}
