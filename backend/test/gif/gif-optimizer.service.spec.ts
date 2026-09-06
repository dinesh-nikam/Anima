import { GifOptimizerService } from '../../src/application/gif/services/gif-optimizer.service';

describe('GifOptimizerService', () => {
  let optimizer: GifOptimizerService;

  beforeEach(() => {
    optimizer = new GifOptimizerService();
  });

  it('should detect full dirty rect when previous frame is null', () => {
    const curr = new Uint8Array(4 * 4 * 4).fill(255);
    const rect = optimizer.computeDirtyRect(curr, null, 4, 4);

    expect(rect.hasChanges).toBe(true);
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(4);
    expect(rect.height).toBe(4);
  });

  it('should detect minimal sub-frame dirty rect when only a central pixel changes', () => {
    const width = 8;
    const height = 8;
    const prev = new Uint8Array(width * height * 4).fill(100);
    const curr = new Uint8Array(width * height * 4).fill(100);

    // Change pixel at (3, 3)
    const targetIdx = (3 * width + 3) * 4;
    curr[targetIdx] = 255;
    curr[targetIdx + 1] = 0;
    curr[targetIdx + 2] = 0;
    curr[targetIdx + 3] = 255;

    const rect = optimizer.computeDirtyRect(curr, prev, width, height);
    expect(rect.hasChanges).toBe(true);
    expect(rect.x).toBe(3);
    expect(rect.y).toBe(3);
    expect(rect.width).toBe(1);
    expect(rect.height).toBe(1);
  });

  it('should apply lossy color clamping without array corruption', () => {
    const rgba = new Uint8Array([23, 47, 89, 255, 25, 49, 91, 255]);
    const clamped = optimizer.applyLossyColorClamping(rgba, 16);

    expect(clamped.length).toBe(rgba.length);
    expect(clamped[0]).toBe(16); // 23 quantized to 16
    expect(clamped[1]).toBe(48); // 47 quantized to 48
  });

  it('should encode valid Animated PNG (APNG) stream with PNG magic signature', () => {
    const width = 4;
    const height = 4;
    const frame1 = new Uint8Array(width * height * 4).fill(150);
    const frame2 = new Uint8Array(width * height * 4).fill(200);

    const apngBuffer = optimizer.encodeApng([frame1, frame2], width, height, 10);
    expect(apngBuffer.length).toBeGreaterThan(64);

    // Verify 8-byte PNG signature: \x89PNG\r\n\x1a\n
    expect(apngBuffer[0]).toBe(0x89);
    expect(apngBuffer[1]).toBe(0x50); // 'P'
    expect(apngBuffer[2]).toBe(0x4e); // 'N'
    expect(apngBuffer[3]).toBe(0x47); // 'G'

    // Verify chunk presence (IHDR, acTL)
    const asciiString = apngBuffer.toString('ascii');
    expect(asciiString).toContain('IHDR');
    expect(asciiString).toContain('acTL');
    expect(asciiString).toContain('fcTL');
    expect(asciiString).toContain('IDAT');
    expect(asciiString).toContain('IEND');
  });
});
