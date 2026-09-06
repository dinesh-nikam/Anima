import { Injectable, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { SecuritySanitizerService } from './security-sanitizer.service';

export interface RenderBudgetRequest {
  width: number;
  height: number;
  frameCount: number;
  fps: number;
}

export interface SystemHealthStatus {
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number;
  heapUtilizationPercent: number;
  isMemoryPressureHigh: boolean;
}

@Injectable()
export class GifGuardrailsService {
  // Maximum frame buffer uncompressed memory limit per request (64MB)
  private readonly MAX_FRAME_BUFFER_MEMORY_BYTES = 64 * 1024 * 1024;
  // Heap memory pressure threshold (85%)
  private readonly HEAP_PRESSURE_THRESHOLD = 0.85;
  // Constraints
  private readonly MIN_FPS = 1;
  private readonly MAX_FPS = 60;
  private readonly MAX_FRAME_COUNT = 120;

  constructor(private readonly sanitizer: SecuritySanitizerService) {}

  /**
   * Asserts render request parameter safety and memory budget availability.
   */
  validateRenderBudget(req: RenderBudgetRequest): void {
    const { width, height, frameCount, fps } = req;

    // Validate canvas bounds
    this.sanitizer.assertCanvasBounds(width, height);

    // Validate FPS and Frame count
    if (!Number.isInteger(fps) || fps < this.MIN_FPS || fps > this.MAX_FPS) {
      throw new BadRequestException(
        `FPS must be an integer between ${this.MIN_FPS} and ${this.MAX_FPS}. Received: ${fps}`,
      );
    }

    if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > this.MAX_FRAME_COUNT) {
      throw new BadRequestException(
        `Frame count must be an integer between 1 and ${this.MAX_FRAME_COUNT}. Received: ${frameCount}`,
      );
    }

    // Estimate uncompressed memory footprint: width * height * 4 RGBA bytes * frame count
    const estimatedMemoryBytes = width * height * 4 * frameCount;

    if (estimatedMemoryBytes > this.MAX_FRAME_BUFFER_MEMORY_BYTES) {
      const estimatedMb = (estimatedMemoryBytes / (1024 * 1024)).toFixed(2);
      const limitMb = (this.MAX_FRAME_BUFFER_MEMORY_BYTES / (1024 * 1024)).toFixed(0);
      throw new PayloadTooLargeException(
        `Render job uncompressed memory budget (${estimatedMb}MB) exceeds safety cap of ${limitMb}MB. Reduce resolution or frame count.`,
      );
    }

    // System memory pressure check
    const health = this.getSystemHealth();
    if (health.isMemoryPressureHigh) {
      throw new PayloadTooLargeException(
        `Server heap memory pressure is dangerously high (${health.heapUtilizationPercent.toFixed(1)}%). Render job rejected to protect server availability.`,
      );
    }
  }

  /**
   * Returns Node process heap & memory health metrics.
   */
  getSystemHealth(): SystemHealthStatus {
    const mem = process.memoryUsage();
    const heapUtilization = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0;

    return {
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      rssBytes: mem.rss,
      heapUtilizationPercent: heapUtilization * 100,
      isMemoryPressureHigh: heapUtilization >= this.HEAP_PRESSURE_THRESHOLD,
    };
  }
}
