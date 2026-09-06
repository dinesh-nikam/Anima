import { Injectable, Logger } from '@nestjs/common';

export interface PixelGridInspection {
  detectedGridSize: number; // e.g. 1, 2, 3, 4, 8 (pixel block size)
  confidence: number; // 0.0 to 1.0
  isChunkyPixelArt: boolean;
  colorRamps: ColorRampGroup[];
  foregroundMask?: {
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    areaPixels: number;
    coverageRatio: number;
  };
}

export interface ColorRampGroup {
  id: string;
  name: string;
  colors: string[]; // Hex color strings sorted by luminance
  averageHue: number;
}

@Injectable()
export class PixelArtAnalyzerService {
  private readonly logger = new Logger(PixelArtAnalyzerService.name);

  /**
   * Analyzes an RGBA pixel buffer for pixel-art characteristics:
   * - Native pixel block size (run-length GCD analysis)
   * - Color ramps suitable for palette cycling
   * - Foreground object mask and bounding box
   */
  inspectPixelArt(
    rgbaData: Uint8Array | Buffer,
    width: number,
    height: number,
    hasAlpha = false,
  ): PixelGridInspection {
    // 1. Detect native pixel grid size via horizontal & vertical run lengths
    const { gridSize, confidence } = this.detectNativePixelSize(rgbaData, width, height);

    // 2. Identify color ramps from unique colors
    const colorRamps = this.extractColorRamps(rgbaData);

    // 3. Extract foreground object mask & bounding box
    const foregroundMask = this.detectForegroundBounds(rgbaData, width, height, hasAlpha);

    return {
      detectedGridSize: gridSize,
      confidence,
      isChunkyPixelArt: gridSize > 1 && confidence > 0.6,
      colorRamps,
      foregroundMask,
    };
  }

  /**
   * Measures contiguous color run-lengths to discover if pixels are scaled blocks (e.g. 2x2, 3x3, 4x4, 8x8).
   */
  private detectNativePixelSize(
    rgbaData: Uint8Array | Buffer,
    width: number,
    height: number,
  ): { gridSize: number; confidence: number } {
    const runCounts = new Map<number, number>();

    // Sample horizontal scanlines
    const rowStep = Math.max(1, Math.floor(height / 40));
    for (let y = 0; y < height; y += rowStep) {
      let currentRun = 1;
      const rowOffset = y * width * 4;

      for (let x = 1; x < width; x++) {
        const prevIdx = rowOffset + (x - 1) * 4;
        const curIdx = rowOffset + x * 4;

        const isSame =
          rgbaData[prevIdx] === rgbaData[curIdx] &&
          rgbaData[prevIdx + 1] === rgbaData[curIdx + 1] &&
          rgbaData[prevIdx + 2] === rgbaData[curIdx + 2] &&
          rgbaData[prevIdx + 3] === rgbaData[curIdx + 3];

        if (isSame) {
          currentRun++;
        } else {
          if (currentRun >= 1 && currentRun <= 16) {
            runCounts.set(currentRun, (runCounts.get(currentRun) || 0) + 1);
          }
          currentRun = 1;
        }
      }
      if (currentRun >= 1 && currentRun <= 16) {
        runCounts.set(currentRun, (runCounts.get(currentRun) || 0) + 1);
      }
    }

    // Evaluate candidate grid sizes: 2, 3, 4, 8
    const candidateSizes = [2, 3, 4, 8];
    let bestSize = 1;
    let bestScore = 0;

    const totalRuns = Array.from(runCounts.values()).reduce((sum, count) => sum + count, 0);

    if (totalRuns > 0) {
      for (const size of candidateSizes) {
        // Sum counts for runs that are multiples of this candidate size
        let multipleCount = 0;
        for (const [run, count] of runCounts.entries()) {
          if (run % size === 0) {
            multipleCount += count;
          }
        }

        const score = multipleCount / totalRuns;
        if (score > 0.45 && score > bestScore) {
          bestScore = score;
          bestSize = size;
        }
      }
    }

    return {
      gridSize: bestSize,
      confidence: bestSize > 1 ? Math.min(1.0, bestScore * 1.3) : 0.85,
    };
  }

  /**
   * Groups dominant colors by hue and sorts by luminance to discover retro color ramps.
   */
  private extractColorRamps(rgbaData: Uint8Array | Buffer): ColorRampGroup[] {
    const colorMap = new Map<number, { r: number; g: number; b: number; count: number }>();
    const len = rgbaData.length;

    // Subsample without periodic stride aliasing
    const step = Math.max(4, Math.floor(len / 16384) * 4);
    for (let i = 0; i < len; i += step) {
      const a = rgbaData[i + 3];
      if (a < 128) continue;

      const r = rgbaData[i];
      const g = rgbaData[i + 1];
      const b = rgbaData[i + 2];

      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { r, g, b, count: 1 });
      }
    }

    // Filter to top prominent colors
    const prominentColors = Array.from(colorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 48);

    // Group into hue buckets (12 buckets of 30 degrees each)
    const hueBuckets: { r: number; g: number; b: number; lum: number; hue: number }[][] = Array.from(
      { length: 12 },
      () => [],
    );

    for (const c of prominentColors) {
      const { h, l } = this.rgbToHsl(c.r, c.g, c.b);
      const bucketIdx = Math.min(11, Math.floor(h * 12));
      hueBuckets[bucketIdx].push({ ...c, lum: l, hue: h * 360 });
    }

    const ramps: ColorRampGroup[] = [];
    const rampNames = [
      'Red/Ruby',
      'Amber/Orange',
      'Gold/Yellow',
      'Lime/Chartreuse',
      'Green/Emerald',
      'Teal/Aqua',
      'Cyan/Sky',
      'Cobalt/Blue',
      'Indigo/Night',
      'Violet/Purple',
      'Magenta/Fuchsia',
      'Rose/Crimson',
    ];

    hueBuckets.forEach((bucket, idx) => {
      if (bucket.length >= 3) {
        // Sort by luminance ascending (darkest to brightest)
        bucket.sort((a, b) => a.lum - b.lum);

        ramps.push({
          id: `ramp-${idx}`,
          name: rampNames[idx],
          colors: bucket.map((c) => this.toHex(c.r, c.g, c.b)),
          averageHue: Math.round(bucket[0].hue),
        });
      }
    });

    return ramps.slice(0, 4); // Return up to 4 prominent ramps
  }

  /**
   * Detects the bounding rectangle of the primary foreground subject.
   */
  private detectForegroundBounds(
    rgbaData: Uint8Array | Buffer,
    width: number,
    height: number,
    hasAlpha: boolean,
  ): { bounds: { minX: number; minY: number; maxX: number; maxY: number }; areaPixels: number; coverageRatio: number } {
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let foregroundPixels = 0;

    // Background color heuristic if no alpha: sample top-left corner color
    const cornerR = rgbaData[0];
    const cornerG = rgbaData[1];
    const cornerB = rgbaData[2];

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x * 4;
        let isForeground = false;

        if (hasAlpha) {
          isForeground = rgbaData[idx + 3] >= 128;
        } else {
          // Chroma distance from corner color
          const dr = rgbaData[idx] - cornerR;
          const dg = rgbaData[idx + 1] - cornerG;
          const db = rgbaData[idx + 2] - cornerB;
          const distSq = dr * dr + dg * dg + db * db;
          isForeground = distSq > 900; // Delta E > 30 threshold
        }

        if (isForeground) {
          foregroundPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (foregroundPixels === 0) {
      minX = 0;
      maxX = width - 1;
      minY = 0;
      maxY = height - 1;
      foregroundPixels = width * height;
    }

    return {
      bounds: { minX, minY, maxX, maxY },
      areaPixels: foregroundPixels,
      coverageRatio: foregroundPixels / (width * height),
    };
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

  private toHex(r: number, g: number, b: number): string {
    const hex = (v: number) => {
      const s = Math.max(0, Math.min(255, v)).toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
}
