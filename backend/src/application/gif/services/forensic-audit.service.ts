import { Injectable, Logger } from '@nestjs/common';
import { EffectRegistryService } from '../registry/effect-registry.service';
import { GifQuantizerService } from './gif-quantizer.service';
import { GifDitheringService } from './gif-dithering.service';
import { GifGuardrailsService } from './gif-guardrails.service';
import { SecuritySanitizerService } from './security-sanitizer.service';
import { GifMetricsService } from './gif-metrics.service';
import * as crypto from 'crypto';

export interface AuditSubsystemResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
  metrics?: Record<string, any>;
}

export interface ForensicAuditReport {
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  timestamp: string;
  durationMs: number;
  subsystems: AuditSubsystemResult[];
  effectRegistryReport: {
    totalRegisteredEffects: number;
    totalCategories: number;
    categories: string[];
  };
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    heapMemoryMb: number;
  };
}

@Injectable()
export class ForensicAuditService {
  private readonly logger = new Logger(ForensicAuditService.name);

  constructor(
    private readonly effectRegistry: EffectRegistryService,
    private readonly quantizer: GifQuantizerService,
    private readonly dithering: GifDitheringService,
    private readonly guardrails: GifGuardrailsService,
    private readonly sanitizer: SecuritySanitizerService,
    private readonly metrics: GifMetricsService,
  ) {}

  /**
   * Performs an instant full-system forensic audit across all GIF engine components.
   */
  async runForensicAudit(): Promise<ForensicAuditReport> {
    const startTime = Date.now();
    const subsystems: AuditSubsystemResult[] = [];

    // 1. Audit Effect Registry & Effects Catalog
    subsystems.push(this.auditEffectRegistry());

    // 2. Audit Color Quantizer & Dithering Engine
    subsystems.push(this.auditQuantizerEngine());

    // 3. Audit Guardrails & System Memory
    subsystems.push(this.auditGuardrailsAndMemory());

    // 4. Audit Security Sanitizer
    subsystems.push(this.auditSecuritySanitizer());

    // 5. Audit Observability & Telemetry Metrics
    subsystems.push(this.auditMetricsTelemetry());

    const hasFailures = subsystems.some((s) => s.status === 'FAIL');
    const hasWarnings = subsystems.some((s) => s.status === 'WARN');
    const overallStatus = hasFailures ? 'FAIL' : hasWarnings ? 'WARN' : 'PASS';

    const categories = this.effectRegistry.getCategories();
    const allEffects = this.effectRegistry.getAllEffects();

    const memUsage = process.memoryUsage();

    const report: ForensicAuditReport = {
      overallStatus,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      subsystems,
      effectRegistryReport: {
        totalRegisteredEffects: allEffects.length,
        totalCategories: categories.length,
        categories,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        heapMemoryMb: Number((memUsage.heapUsed / (1024 * 1024)).toFixed(2)),
      },
    };

    this.logger.log(
      `Forensic Audit Completed in ${report.durationMs}ms with status: [${report.overallStatus}]`,
    );

    return report;
  }

  private auditEffectRegistry(): AuditSubsystemResult {
    try {
      const effects = this.effectRegistry.getAllEffects();
      const expectedEffectCount = 35;

      if (effects.length < expectedEffectCount) {
        return {
          name: 'Effect Registry Catalog',
          status: 'WARN',
          details: `Registered effects count (${effects.length}) is below target threshold (${expectedEffectCount}).`,
          metrics: { count: effects.length },
        };
      }

      // Verify all effects have valid metadata, categories, and evaluate functions
      for (const effect of effects) {
        if (!effect.metadata?.id || !effect.metadata?.category || typeof effect.evaluate !== 'function') {
          return {
            name: 'Effect Registry Catalog',
            status: 'FAIL',
            details: `Effect [${effect.metadata?.id || 'unknown'}] fails contract validation.`,
          };
        }
      }

      return {
        name: 'Effect Registry Catalog',
        status: 'PASS',
        details: `All ${effects.length} effects successfully verified across ${this.effectRegistry.getCategories().length} categories.`,
        metrics: {
          totalEffects: effects.length,
          categories: this.effectRegistry.getCategories().length,
        },
      };
    } catch (err: any) {
      return {
        name: 'Effect Registry Catalog',
        status: 'FAIL',
        details: `Effect Registry diagnostic exception: ${err.message}`,
      };
    }
  }

  private auditQuantizerEngine(): AuditSubsystemResult {
    try {
      // Benchmark 32x32 synthetic frame quantization and Floyd-Steinberg dither
      const testBuffer = new Uint8Array(32 * 32 * 4);
      for (let i = 0; i < testBuffer.length; i += 4) {
        testBuffer[i] = (i * 7) % 256;
        testBuffer[i + 1] = (i * 13) % 256;
        testBuffer[i + 2] = (i * 19) % 256;
        testBuffer[i + 3] = 255;
      }

      const quantStart = Date.now();
      const quantResult = this.quantizer.quantize([testBuffer], 256);
      const quantTime = Date.now() - quantStart;

      const ditherStart = Date.now();
      const ditheredIndices = this.dithering.ditherFrame(
        testBuffer,
        32,
        32,
        quantResult,
      );
      const ditherTime = Date.now() - ditherStart;

      if (!quantResult.palette || quantResult.palette.length === 0 || !ditheredIndices) {
        return {
          name: 'Color Quantizer & Dithering Engine',
          status: 'FAIL',
          details: 'Quantizer benchmark produced invalid palette or empty index map.',
        };
      }

      return {
        name: 'Color Quantizer & Dithering Engine',
        status: 'PASS',
        details: `Median-Cut Quantizer (256 colors in ${quantTime}ms) & Floyd-Steinberg Dithering (${ditherTime}ms) operational.`,
        metrics: {
          paletteSize: quantResult.palette.length,
          quantizationLatencyMs: quantTime,
          ditheringLatencyMs: ditherTime,
        },
      };
    } catch (err: any) {
      return {
        name: 'Color Quantizer & Dithering Engine',
        status: 'FAIL',
        details: `Quantizer diagnostic exception: ${err.message}`,
      };
    }
  }

  private auditGuardrailsAndMemory(): AuditSubsystemResult {
    try {
      const health = this.guardrails.getSystemHealth();

      if (health.isMemoryPressureHigh) {
        return {
          name: 'Memory & CPU Guardrails',
          status: 'WARN',
          details: `Heap memory pressure is high: ${health.heapUtilizationPercent.toFixed(1)}%.`,
          metrics: health,
        };
      }

      return {
        name: 'Memory & CPU Guardrails',
        status: 'PASS',
        details: `Heap utilization normal at ${health.heapUtilizationPercent.toFixed(1)}% (${(health.heapUsedBytes / (1024 * 1024)).toFixed(1)}MB / ${(health.heapTotalBytes / (1024 * 1024)).toFixed(1)}MB).`,
        metrics: health,
      };
    } catch (err: any) {
      return {
        name: 'Memory & CPU Guardrails',
        status: 'FAIL',
        details: `Guardrails diagnostic exception: ${err.message}`,
      };
    }
  }

  private auditSecuritySanitizer(): AuditSubsystemResult {
    try {
      // Test ID validation, filename sanitization, and path bounds
      const validId = '12345678-1234-4234-8234-123456789012';
      this.sanitizer.validateId(validId);
      const cleanFile = this.sanitizer.sanitizeFilename('../../etc/passwd.gif');

      if (cleanFile.includes('..') || cleanFile.includes('/')) {
        return {
          name: 'Security Sanitizer',
          status: 'FAIL',
          details: 'Sanitizer failed to strip path traversal indicators.',
        };
      }

      return {
        name: 'Security Sanitizer',
        status: 'PASS',
        details: 'Path traversal protection, ID validation, and filename sanitizers passed verification.',
      };
    } catch (err: any) {
      return {
        name: 'Security Sanitizer',
        status: 'FAIL',
        details: `Security sanitizer diagnostic exception: ${err.message}`,
      };
    }
  }

  private auditMetricsTelemetry(): AuditSubsystemResult {
    try {
      const snapshot = this.metrics.getSnapshot();
      const promText = this.metrics.getPrometheusFormat();

      if (typeof snapshot.requestsTotal !== 'number' || !promText.includes('gif_requests_total')) {
        return {
          name: 'Metrics & Telemetry',
          status: 'FAIL',
          details: 'Prometheus format output missing required counters.',
        };
      }

      return {
        name: 'Metrics & Telemetry',
        status: 'PASS',
        details: 'Prometheus telemetry registry and structured metrics operational.',
        metrics: { requestsTotal: snapshot.requestsTotal },
      };
    } catch (err: any) {
      return {
        name: 'Metrics & Telemetry',
        status: 'FAIL',
        details: `Metrics diagnostic exception: ${err.message}`,
      };
    }
  }
}
