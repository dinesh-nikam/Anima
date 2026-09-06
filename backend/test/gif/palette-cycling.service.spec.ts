import { PaletteCyclingService } from '../../src/application/gif/services/palette-cycling.service';
import { ColorRampGroup } from '../../src/application/gif/services/pixel-art-analyzer.service';

describe('PaletteCyclingService', () => {
  let service: PaletteCyclingService;

  beforeEach(() => {
    service = new PaletteCyclingService();
  });

  it('should map ramps to palette indices without collisions', () => {
    const ramps: ColorRampGroup[] = [
      {
        id: 'ramp-1',
        name: 'Cyan/Water',
        colors: ['#003366', '#0066cc', '#00ccff'],
        averageHue: 200,
      },
    ];

    const palette = [0x000000, 0x003366, 0x0066cc, 0x00ccff, 0xffffff];
    const mockFindNearest = (r: number, g: number, b: number) => {
      if (b > 220) return 3;
      if (b > 150) return 2;
      return 1;
    };

    const config = service.mapRampsToPaletteIndices(ramps, palette, mockFindNearest);
    expect(config.ramps.length).toBe(1);
    expect(config.ramps[0].indices.length).toBe(3);
  });

  it('should rotate palette cyclically over time while keeping other colors intact', () => {
    const basePalette = [0x111111, 0x222222, 0x333333, 0x999999];
    const cycleConfig = {
      ramps: [
        {
          name: 'Test Ramp',
          indices: [0, 1, 2],
          speed: 1.0,
        },
      ],
    };

    // At t = 0s
    const palette0 = service.cyclePaletteAtTime(basePalette, cycleConfig, 0.0, 3.0);
    expect(palette0[0]).toBe(0x111111);
    expect(palette0[3]).toBe(0x999999); // Unchanged

    // At t = 0.5s (partial cycle, shift = 1)
    const palette1 = service.cyclePaletteAtTime(basePalette, cycleConfig, 0.5, 3.0);
    expect(palette1[3]).toBe(0x999999); // Unchanged
    // Colors should have shifted
    expect(palette1[0]).not.toBe(palette0[0]);
  });
});
