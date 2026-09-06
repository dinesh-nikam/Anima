import { Injectable, Logger } from '@nestjs/common';
import { ColorRampGroup } from './pixel-art-analyzer.service';

export interface PaletteCycleConfig {
  ramps: {
    name: string;
    indices: number[]; // Indices inside palette that will rotate
    speed: number; // Cycles per second
    reverse?: boolean;
    pingPong?: boolean;
  }[];
}

@Injectable()
export class PaletteCyclingService {
  private readonly logger = new Logger(PaletteCyclingService.name);

  /**
   * Maps color ramp hex values to matching indices inside a quantized 256-color palette.
   */
  mapRampsToPaletteIndices(
    ramps: ColorRampGroup[],
    palette: number[],
    findNearestIndex: (r: number, g: number, b: number) => number,
  ): PaletteCycleConfig {
    const cycleRamps: PaletteCycleConfig['ramps'] = [];

    for (const ramp of ramps) {
      const indices: number[] = [];
      for (const hex of ramp.colors) {
        const rgb = this.hexToRgb(hex);
        if (rgb) {
          const idx = findNearestIndex(rgb.r, rgb.g, rgb.b);
          // Avoid duplicate adjacent indices
          if (!indices.includes(idx) && idx > 0) {
            indices.push(idx);
          }
        }
      }

      if (indices.length >= 2) {
        cycleRamps.push({
          name: ramp.name,
          indices,
          speed: 2.0, // Default 2 full rotations per second
          reverse: false,
          pingPong: false,
        });
      }
    }

    return { ramps: cycleRamps };
  }

  /**
   * Rotates palette colors at time t according to active cycle ramps.
   * Returns a new cloned palette with rotated entries.
   */
  cyclePaletteAtTime(
    basePalette: number[],
    cycleConfig: PaletteCycleConfig,
    timeSeconds: number,
    durationSeconds: number,
  ): number[] {
    if (!cycleConfig.ramps || cycleConfig.ramps.length === 0) {
      return basePalette;
    }

    const modifiedPalette = [...basePalette];

    for (const ramp of cycleConfig.ramps) {
      const len = ramp.indices.length;
      if (len < 2) continue;

      // Calculate cyclic shift offset k (integer rotation to maintain clean colors)
      // Enforce loop-safety: total cycles across duration must be an integer
      const targetCycles = Math.max(1, Math.round(ramp.speed * durationSeconds));
      const progress = (timeSeconds % durationSeconds) / durationSeconds;
      let shift = Math.floor(progress * targetCycles * len) % len;

      if (ramp.reverse) {
        shift = (len - (shift % len)) % len;
      }

      // Read current colors of the ramp
      const originalColors = ramp.indices.map((idx) => basePalette[idx]);

      // Write cyclically rotated colors back to palette
      for (let i = 0; i < len; i++) {
        const targetPaletteIdx = ramp.indices[i];
        const sourceColorIdx = (i + shift) % len;
        modifiedPalette[targetPaletteIdx] = originalColors[sourceColorIdx];
      }
    }

    return modifiedPalette;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
      };
    }
    return null;
  }
}
