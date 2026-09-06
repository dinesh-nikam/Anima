import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  GifAssetFormat,
  ImageInspectionResult,
  GIF_RESOURCE_LIMITS,
} from '../models/gif.model';

@Injectable()
export class ImageInspectorService {
  private readonly logger = new Logger(ImageInspectorService.name);

  /**
   * Performs deep byte-level inspection of image buffer.
   * Extracts dimensions, MIME type, alpha channel, and SHA-256 digest.
   * Validates safety bounds against decompression bombs and MIME spoofing.
   */
  inspectBuffer(buffer: Buffer, originalFilename: string): ImageInspectionResult {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    if (buffer.length > GIF_RESOURCE_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds limit of ${
          GIF_RESOURCE_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024)
        } MB`,
      );
    }

    if (buffer.length < 16) {
      throw new BadRequestException('File is too small to contain valid image headers');
    }

    const format = this.detectFormat(buffer);
    const { width, height, hasAlpha, colorDepth } = this.extractDimensions(buffer, format);

    // Dimension bounds
    if (
      width < GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX ||
      height < GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX
    ) {
      throw new BadRequestException(
        `Image dimensions (${width}x${height}) must be at least ${GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX}x${GIF_RESOURCE_LIMITS.MIN_DIMENSION_PX} pixels`,
      );
    }

    if (
      width > GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX ||
      height > GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX
    ) {
      throw new BadRequestException(
        `Image dimensions (${width}x${height}) exceed maximum allowed ${GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX}x${GIF_RESOURCE_LIMITS.MAX_DIMENSION_PX} pixels`,
      );
    }

    // Aspect ratio sanity
    const aspectRatio = Math.max(width / height, height / width);
    if (aspectRatio > GIF_RESOURCE_LIMITS.MAX_ASPECT_RATIO) {
      throw new BadRequestException(
        `Image aspect ratio (${aspectRatio.toFixed(1)}:1) exceeds maximum allowed ${GIF_RESOURCE_LIMITS.MAX_ASPECT_RATIO}:1`,
      );
    }

    // Decompression bomb protection (uncompressed 32-bit RGBA footprint)
    const projectedUncompressedBytes = width * height * 4;
    if (projectedUncompressedBytes > GIF_RESOURCE_LIMITS.MAX_UNCOMPRESSED_FRAME_BYTES) {
      throw new BadRequestException(
        `Projected uncompressed frame memory (${(
          projectedUncompressedBytes /
          (1024 * 1024)
        ).toFixed(1)} MB) exceeds security limit of ${
          GIF_RESOURCE_LIMITS.MAX_UNCOMPRESSED_FRAME_BYTES / (1024 * 1024)
        } MB`,
      );
    }

    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const mimeType = this.getMimeType(format);

    return {
      format,
      mimeType,
      width,
      height,
      hasAlpha,
      fileSizeBytes: buffer.length,
      fileHash,
      colorDepth,
    };
  }

  /**
   * Sanitizes filenames to eliminate path traversal, control codes, and shell injection.
   */
  sanitizeFilename(rawFilename: string): string {
    if (!rawFilename || typeof rawFilename !== 'string') {
      return 'asset_' + Date.now();
    }

    // 1. Remove path delimiters and null bytes
    let clean = rawFilename.replace(/[/\\?%*:|"<>]/g, '_').replace(/\0/g, '');

    // 2. Remove directory traversal patterns like ..
    clean = clean.replace(/\.\.+/g, '.');

    // 3. Keep only alphanumeric, dots, underscores, hyphens
    clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

    // 4. Trim leading/trailing periods and underscores
    clean = clean.replace(/^[._-]+|[._-]+$/g, '');

    // 5. Limit length to 100 chars
    if (clean.length > 100) {
      const extMatch = clean.match(/(\.[a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : '';
      clean = clean.substring(0, 100 - ext.length) + ext;
    }

    return clean || 'asset_' + Date.now();
  }

  /**
   * Detects image format using magic bytes.
   */
  private detectFormat(buffer: Buffer): GifAssetFormat {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'PNG';
    }

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'JPEG';
    }

    // GIF: "GIF87a" or "GIF89a"
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return 'GIF';
    }

    // WEBP: "RIFF" .... "WEBP"
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'WEBP';
    }

    throw new BadRequestException(
      'Unsupported image format. Allowed formats are: PNG, JPEG, WEBP, and GIF.',
    );
  }

  /**
   * Extracts dimensions and properties according to format standards.
   */
  private extractDimensions(
    buffer: Buffer,
    format: GifAssetFormat,
  ): { width: number; height: number; hasAlpha: boolean; colorDepth?: number } {
    switch (format) {
      case 'PNG':
        return this.parsePng(buffer);
      case 'JPEG':
        return this.parseJpeg(buffer);
      case 'GIF':
        return this.parseGif(buffer);
      case 'WEBP':
        return this.parseWebp(buffer);
    }
  }

  private parsePng(buffer: Buffer) {
    // IHDR chunk starts at offset 8 (after 8-byte PNG header)
    // 4 bytes length, 4 bytes chunk type "IHDR" (offset 12), then 4 bytes width, 4 bytes height
    if (buffer.length < 32) {
      throw new BadRequestException('Malformed PNG: Header truncated');
    }

    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType !== 'IHDR') {
      throw new BadRequestException('Malformed PNG: First chunk is not IHDR');
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const bitDepth = buffer.readUInt8(24);
    const colorType = buffer.readUInt8(25);

    // Color types: 4 (grayscale+alpha), 6 (RGBA) have alpha channel
    let hasAlpha = colorType === 4 || colorType === 6;

    // Also check for tRNS chunk in palette-based PNGs
    if (!hasAlpha && colorType === 3) {
      let offset = 8;
      while (offset < buffer.length - 8) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        if (type === 'tRNS') {
          hasAlpha = true;
          break;
        }
        if (type === 'IDAT') break;
        offset += 12 + length;
      }
    }

    return { width, height, hasAlpha, colorDepth: bitDepth };
  }

  private parseJpeg(buffer: Buffer) {
    let offset = 2; // after FF D8
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];

      // SOF markers that contain dimensions (SOF0, SOF1, SOF2, SOF3, SOF5, SOF6, SOF7, SOF9, SOF10)
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb);

      if (isSof) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        const components = buffer.readUInt8(offset + 9);
        return {
          width,
          height,
          hasAlpha: false, // Standard JPEGs do not have alpha channels
          colorDepth: components * 8,
        };
      }

      // Skip marker segment
      if (marker === 0xd9 || marker === 0xda) {
        // End of image or start of scan
        break;
      }

      const segmentLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }

    throw new BadRequestException('Malformed JPEG: Start of Frame marker not found');
  }

  private parseGif(buffer: Buffer) {
    if (buffer.length < 13) {
      throw new BadRequestException('Malformed GIF: Header truncated');
    }

    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);

    // Look for Graphic Control Extension (0x21 0xF9) indicating transparent color
    let hasAlpha = false;
    for (let i = 13; i < buffer.length - 8; i++) {
      if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9 && buffer[i + 2] === 0x04) {
        const flags = buffer[i + 3];
        if ((flags & 0x01) !== 0) {
          hasAlpha = true;
          break;
        }
      }
    }

    return { width, height, hasAlpha, colorDepth: 8 };
  }

  private parseWebp(buffer: Buffer) {
    if (buffer.length < 30) {
      throw new BadRequestException('Malformed WEBP: Header truncated');
    }

    const chunkType = buffer.toString('ascii', 12, 16);

    if (chunkType === 'VP8 ') {
      // Lossy format: Key frame byte at offset 23
      const keyframe = buffer[23];
      if ((keyframe & 0x01) !== 0) {
        throw new BadRequestException('Malformed WEBP: Not a keyframe');
      }
      const width = (buffer.readUInt16LE(26) & 0x3fff);
      const height = (buffer.readUInt16LE(28) & 0x3fff);
      return { width, height, hasAlpha: false, colorDepth: 24 };
    }

    if (chunkType === 'VP8L') {
      // Lossless format: 1-byte signature (0x2F) at offset 20, followed by 4 bytes with width/height/alpha
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];

      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      const hasAlpha = ((b3 & 0x10) >> 4) === 1;

      return { width, height, hasAlpha, colorDepth: 32 };
    }

    if (chunkType === 'VP8X') {
      // Extended format: Flags at offset 20
      const flags = buffer[20];
      const hasAlpha = (flags & 0x10) !== 0;

      // 24-bit width at 24-26, 24-bit height at 27-29 (both are 1-based)
      const width =
        1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height =
        1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));

      return { width, height, hasAlpha, colorDepth: 32 };
    }

    throw new BadRequestException(`Malformed or unsupported WEBP chunk: ${chunkType}`);
  }

  private getMimeType(format: GifAssetFormat): string {
    switch (format) {
      case 'PNG':
        return 'image/png';
      case 'JPEG':
        return 'image/jpeg';
      case 'GIF':
        return 'image/gif';
      case 'WEBP':
        return 'image/webp';
    }
  }
}
