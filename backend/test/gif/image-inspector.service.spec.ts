import { BadRequestException } from '@nestjs/common';
import { ImageInspectorService } from '../../src/application/gif/services/image-inspector.service';
import { GIF_RESOURCE_LIMITS } from '../../src/application/gif/models/gif.model';

describe('ImageInspectorService — Phase 1 Binary Inspection & Security Validation', () => {
  let inspector: ImageInspectorService;

  beforeEach(() => {
    inspector = new ImageInspectorService();
  });

  // Helper to build synthetic PNG buffer (IHDR chunk with width, height, bitdepth, colortype)
  function createSyntheticPng(width: number, height: number, colorType: number = 6): Buffer {
    const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); // chunk data length (13 bytes)
    ihdr.write('IHDR', 4, 4, 'ascii'); // chunk type
    ihdr.writeUInt32BE(width, 8); // width
    ihdr.writeUInt32BE(height, 12); // height
    ihdr.writeUInt8(8, 16); // bit depth 8
    ihdr.writeUInt8(colorType, 17); // color type (6 = RGBA)
    ihdr.writeUInt8(0, 18); // compression
    ihdr.writeUInt8(0, 19); // filter
    ihdr.writeUInt8(0, 20); // interlace
    // CRC (dummy 4 bytes)
    ihdr.writeUInt32BE(0x12345678, 21);

    return Buffer.concat([header, ihdr]);
  }

  // Helper to build synthetic JPEG buffer (SOI + SOF0)
  function createSyntheticJpeg(width: number, height: number): Buffer {
    const header = Buffer.from([0xff, 0xd8, 0xff]); // SOI + marker start
    const sof0 = Buffer.alloc(18);
    sof0.writeUInt8(0xc0, 0); // SOF0 marker
    sof0.writeUInt16BE(17, 1); // Length (17 bytes: 1 precision + 2 height + 2 width + 1 comp + 3*3 data)
    sof0.writeUInt8(8, 3); // Precision (8 bits)
    sof0.writeUInt16BE(height, 4); // Height
    sof0.writeUInt16BE(width, 6); // Width
    sof0.writeUInt8(3, 8); // 3 components (Y, Cb, Cr)

    return Buffer.concat([header, sof0]);
  }

  // Helper to build synthetic GIF89a buffer
  function createSyntheticGif(width: number, height: number): Buffer {
    const buf = Buffer.alloc(32);
    buf.write('GIF89a', 0, 6, 'ascii');
    buf.writeUInt16LE(width, 6);
    buf.writeUInt16LE(height, 8);
    buf.writeUInt8(0x80, 10); // Global color table flag
    buf.writeUInt8(0, 11);
    buf.writeUInt8(0, 12);
    return buf;
  }

  // Helper to build synthetic WEBP VP8X buffer
  function createSyntheticWebp(width: number, height: number): Buffer {
    const buf = Buffer.alloc(30);
    buf.write('RIFF', 0, 4, 'ascii');
    buf.writeUInt32LE(22, 4); // file length - 8
    buf.write('WEBP', 8, 4, 'ascii');
    buf.write('VP8X', 12, 4, 'ascii');
    buf.writeUInt32LE(10, 16); // chunk size
    buf.writeUInt8(0x10, 20); // flags (hasAlpha = bit 4)
    // 24-bit width - 1 (LE)
    const wVal = width - 1;
    buf.writeUInt8(wVal & 0xff, 24);
    buf.writeUInt8((wVal >> 8) & 0xff, 25);
    buf.writeUInt8((wVal >> 16) & 0xff, 26);
    // 24-bit height - 1 (LE)
    const hVal = height - 1;
    buf.writeUInt8(hVal & 0xff, 27);
    buf.writeUInt8((hVal >> 8) & 0xff, 28);
    buf.writeUInt8((hVal >> 16) & 0xff, 29);
    return buf;
  }

  describe('Format and Dimension Inspection', () => {
    it('should correctly inspect a valid PNG image and detect RGBA alpha', () => {
      const pngBuffer = createSyntheticPng(400, 300, 6);
      const result = inspector.inspectBuffer(pngBuffer, 'avatar.png');

      expect(result.format).toBe('PNG');
      expect(result.mimeType).toBe('image/png');
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
      expect(result.hasAlpha).toBe(true);
      expect(result.fileHash).toHaveLength(64);
    });

    it('should correctly inspect a valid JPEG image', () => {
      const jpegBuffer = createSyntheticJpeg(800, 600);
      const result = inspector.inspectBuffer(jpegBuffer, 'photo.jpg');

      expect(result.format).toBe('JPEG');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.hasAlpha).toBe(false);
      expect(result.fileHash).toHaveLength(64);
    });

    it('should correctly inspect a valid GIF89a image', () => {
      const gifBuffer = createSyntheticGif(128, 128);
      const result = inspector.inspectBuffer(gifBuffer, 'sprite.gif');

      expect(result.format).toBe('GIF');
      expect(result.mimeType).toBe('image/gif');
      expect(result.width).toBe(128);
      expect(result.height).toBe(128);
    });

    it('should correctly inspect a valid WEBP image with alpha', () => {
      const webpBuffer = createSyntheticWebp(640, 480);
      const result = inspector.inspectBuffer(webpBuffer, 'artwork.webp');

      expect(result.format).toBe('WEBP');
      expect(result.mimeType).toBe('image/webp');
      expect(result.width).toBe(640);
      expect(result.height).toBe(480);
      expect(result.hasAlpha).toBe(true);
    });
  });

  describe('Security Boundaries & Attack Prevention', () => {
    it('should reject spoofed non-image files claiming to be images (e.g. PHP / Shell scripts)', () => {
      const spoofed = Buffer.from('<?php echo "evil"; ?>');
      expect(() => inspector.inspectBuffer(spoofed, 'payload.png')).toThrow(BadRequestException);
    });

    it('should reject empty buffers or truncated buffers', () => {
      expect(() => inspector.inspectBuffer(Buffer.alloc(0), 'empty.png')).toThrow(BadRequestException);
      expect(() => inspector.inspectBuffer(Buffer.from([0x89, 0x50]), 'tiny.png')).toThrow(BadRequestException);
    });

    it('should reject images below minimum dimension threshold (16px)', () => {
      const smallPng = createSyntheticPng(10, 10);
      expect(() => inspector.inspectBuffer(smallPng, 'small.png')).toThrow(BadRequestException);
    });

    it('should reject images above maximum dimension threshold (4096px)', () => {
      const oversizedPng = createSyntheticPng(5000, 5000);
      expect(() => inspector.inspectBuffer(oversizedPng, 'huge.png')).toThrow(BadRequestException);
    });

    it('should reject images with extreme aspect ratio (> 10:1)', () => {
      const stripPng = createSyntheticPng(2000, 100); // 20:1
      expect(() => inspector.inspectBuffer(stripPng, 'strip.png')).toThrow(BadRequestException);
    });

    it('should reject files exceeding maximum file size budget', () => {
      const oversizeBuffer = Buffer.alloc(GIF_RESOURCE_LIMITS.MAX_FILE_SIZE_BYTES + 1024);
      expect(() => inspector.inspectBuffer(oversizeBuffer, 'giant.png')).toThrow(BadRequestException);
    });
  });

  describe('Filename Sanitization against Path Traversal', () => {
    it('should sanitize directory traversal sequences and special characters', () => {
      expect(inspector.sanitizeFilename('../../etc/passwd')).toBe('etc_passwd');
      expect(inspector.sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('windows_system32_cmd.exe');
      expect(inspector.sanitizeFilename('image<script>alert(1)</script>.png')).toBe('image_script_alert_1___script_.png');
      expect(inspector.sanitizeFilename('normal-image_name.123.jpg')).toBe('normal-image_name.123.jpg');
    });

    it('should fallback to generated name for invalid or empty inputs', () => {
      const result = inspector.sanitizeFilename('');
      expect(result).toMatch(/^asset_\d+$/);
    });
  });
});
