import { SecuritySanitizerService } from '../../src/application/gif/services/security-sanitizer.service';
import { GifGuardrailsService } from '../../src/application/gif/services/gif-guardrails.service';
import { GifMetricsService } from '../../src/application/gif/services/gif-metrics.service';
import { RateLimitGuard } from '../../src/application/gif/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';
import { BadRequestException, ForbiddenException, PayloadTooLargeException, HttpException } from '@nestjs/common';

describe('Phase 9 Security, Guardrails & Observability', () => {
  let sanitizer: SecuritySanitizerService;
  let guardrails: GifGuardrailsService;
  let metrics: GifMetricsService;
  let rateLimiter: RateLimitGuard;

  beforeEach(() => {
    sanitizer = new SecuritySanitizerService();
    guardrails = new GifGuardrailsService(sanitizer);
    metrics = new GifMetricsService();
    rateLimiter = new RateLimitGuard(new Reflector());
  });

  describe('SecuritySanitizerService', () => {
    it('should validate legitimate UUID v4 IDs', () => {
      const uuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
      expect(sanitizer.validateId(uuid)).toBe(uuid);
    });

    it('should reject invalid or malicious ID formats', () => {
      expect(() => sanitizer.validateId('../../etc/passwd')).toThrow(BadRequestException);
      expect(() => sanitizer.validateId('<script>alert(1)</script>')).toThrow(BadRequestException);
      expect(() => sanitizer.validateId('')).toThrow(BadRequestException);
    });

    it('should sanitize unsafe filenames and strip path traversal', () => {
      const unsafe = '../../../etc/passwd.png';
      const clean = sanitizer.sanitizeFilename(unsafe);
      expect(clean).not.toContain('..');
      expect(clean).not.toContain('/');
      expect(clean).toBe('passwd.png');
    });

    it('should enforce safe storage directory path traversal checks', () => {
      const baseDir = 'C:\\storage\\exports';
      const safePath = 'C:\\storage\\exports\\artifact.gif';
      const unsafePath = 'C:\\storage\\etc\\passwd';

      expect(() => sanitizer.assertSafePath(baseDir, unsafePath)).toThrow(ForbiddenException);
    });

    it('should assert canvas bounds and reject dimensions > 4096px', () => {
      expect(() => sanitizer.assertCanvasBounds(5000, 1080)).toThrow(BadRequestException);
      expect(() => sanitizer.assertCanvasBounds(0, 500)).toThrow(BadRequestException);
      expect(() => sanitizer.assertCanvasBounds(1920, 1080)).not.toThrow();
    });

    it('should assert buffer size limits', () => {
      const hugeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      expect(() => sanitizer.assertBufferLimits(hugeBuffer)).toThrow(BadRequestException);
    });
  });

  describe('GifGuardrailsService', () => {
    it('should validate render request memory budget', () => {
      // 1000x1000 * 4 * 100 frames = 400MB > 64MB cap
      expect(() =>
        guardrails.validateRenderBudget({
          width: 1000,
          height: 1000,
          frameCount: 100,
          fps: 30,
        }),
      ).toThrow(PayloadTooLargeException);
    });

    it('should pass reasonable render budgets', () => {
      expect(() =>
        guardrails.validateRenderBudget({
          width: 320,
          height: 240,
          frameCount: 20,
          fps: 15,
        }),
      ).not.toThrow();
    });

    it('should inspect system memory health', () => {
      const health = guardrails.getSystemHealth();
      expect(health.heapUsedBytes).toBeGreaterThan(0);
      expect(health.heapTotalBytes).toBeGreaterThan(0);
      expect(health.heapUtilizationPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GifMetricsService', () => {
    it('should track request counters and render performance histograms', () => {
      metrics.recordRequest();
      metrics.recordRenderStart();
      metrics.recordRenderSuccess(120);
      metrics.recordRenderSuccess(180);
      metrics.recordExport('gif', 102400);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.requestsTotal).toBe(1);
      expect(snapshot.rendersTotal).toBe(1);
      expect(snapshot.rendersCompleted).toBe(2);
      expect(snapshot.renderDurationMs.avg).toBe(150);
      expect(snapshot.exportsTotal['gif']).toBe(1);
    });

    it('should generate Prometheus text output', () => {
      metrics.recordRequest();
      metrics.recordExport('apng', 204800);
      const prom = metrics.getPrometheusFormat();

      expect(prom).toContain('gif_requests_total');
      expect(prom).toContain('gif_export_jobs_total{format="apng"} 1');
    });
  });

  describe('RateLimitGuard', () => {
    it('should block requests exceeding window threshold', () => {
      const mockReq: any = {
        method: 'POST',
        path: '/gif/upload',
        ip: '127.0.0.1',
        socket: {},
      };
      const mockRes: any = { setHeader: jest.fn() };
      const mockCtx: any = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
        getHandler: () => ({}),
      };

      // Execute 60 allowed calls
      for (let i = 0; i < 60; i++) {
        expect(rateLimiter.canActivate(mockCtx)).toBe(true);
      }

      // 61st call should trigger 429 exception
      expect(() => rateLimiter.canActivate(mockCtx)).toThrow(HttpException);
    });
  });
});
