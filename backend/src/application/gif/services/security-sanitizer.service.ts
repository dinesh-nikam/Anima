import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as path from 'path';

export interface BufferLimitOptions {
  maxSizeBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
}

@Injectable()
export class SecuritySanitizerService {
  private readonly DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_MAX_DIMENSION = 4096; // 4096px

  /**
   * Validates and sanitizes standard entity IDs (UUID or safe alphanumeric token).
   */
  validateId(id: string, entityName = 'Resource'): string {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException(`${entityName} ID must be a non-empty string.`);
    }

    const trimmed = id.trim();
    // UUID v4 or alphanumeric hyphen/underscore token (8 to 64 chars)
    const validPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$|^[a-zA-Z0-9_-]{8,64}$/;

    if (!validPattern.test(trimmed)) {
      throw new BadRequestException(
        `Invalid ${entityName} ID format. Must be a valid UUID or alphanumeric string.`,
      );
    }

    return trimmed;
  }

  /**
   * Sanitizes filenames to prevent path traversal, control character injection, or command injection.
   */
  sanitizeFilename(filename: string, defaultName = 'artifact'): string {
    if (!filename || typeof filename !== 'string') {
      return defaultName;
    }

    // Strip path traversal indicators and null bytes
    let clean = filename
      .replace(/\\/g, '/')
      .replace(/\0/g, '')
      .replace(/\.\./g, '');

    // Extract base name to avoid path prefixes
    clean = path.basename(clean);

    // Keep alphanumeric, dots, dashes, underscores
    clean = clean.replace(/[^a-zA-Z0-9_.-]/g, '_');

    // Prevent hidden files starting with dot
    clean = clean.replace(/^\.+/, '');

    if (!clean) {
      return defaultName;
    }

    // Truncate long filenames
    if (clean.length > 128) {
      const ext = path.extname(clean);
      const base = path.basename(clean, ext).substring(0, 100);
      clean = `${base}${ext}`;
    }

    return clean;
  }

  /**
   * Enforces strict path traversal prevention by asserting target path resides inside base directory.
   */
  assertSafePath(baseDir: string, targetPath: string): string {
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new ForbiddenException(
        'Access denied: Path traversal outside designated storage directory detected.',
      );
    }

    return resolvedTarget;
  }

  /**
   * Asserts image/canvas dimensions do not exceed security caps.
   */
  assertCanvasBounds(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new BadRequestException('Canvas dimensions must be valid integers.');
    }

    if (width <= 0 || height <= 0) {
      throw new BadRequestException('Canvas dimensions must be greater than 0.');
    }

    if (width > this.DEFAULT_MAX_DIMENSION || height > this.DEFAULT_MAX_DIMENSION) {
      throw new BadRequestException(
        `Canvas dimensions (${width}x${height}) exceed maximum allowed bound of ${this.DEFAULT_MAX_DIMENSION}x${this.DEFAULT_MAX_DIMENSION}px.`,
      );
    }
  }

  /**
   * Asserts payload size is within limits.
   */
  assertBufferLimits(buffer: Buffer, options: BufferLimitOptions = {}): void {
    const maxSize = options.maxSizeBytes || this.DEFAULT_MAX_SIZE;

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty or invalid file payload provided.');
    }

    if (buffer.length > maxSize) {
      const maxMb = (maxSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `File payload size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds safety cap of ${maxMb}MB.`,
      );
    }
  }
}
