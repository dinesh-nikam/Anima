import { Injectable } from '@nestjs/common';

export interface MetricSnapshot {
  requestsTotal: number;
  rendersTotal: number;
  rendersCompleted: number;
  rendersFailed: number;
  exportsTotal: Record<string, number>;
  securityViolationsTotal: number;
  renderDurationMs: {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
  };
  quantizationDurationMs: {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
  };
  exportFileSizeBytes: {
    count: number;
    sum: number;
    avg: number;
  };
}

@Injectable()
export class GifMetricsService {
  private requestsTotal = 0;
  private rendersTotal = 0;
  private rendersCompleted = 0;
  private rendersFailed = 0;
  private securityViolationsTotal = 0;

  private exportsTotalFormat: Record<string, number> = {
    gif: 0,
    apng: 0,
    mp4: 0,
    webm: 0,
  };

  private renderDurations: number[] = [];
  private quantizationDurations: number[] = [];
  private exportSizes: number[] = [];

  /**
   * Increment request counter.
   */
  recordRequest(): void {
    this.requestsTotal++;
  }

  /**
   * Increment security violation counter.
   */
  recordSecurityViolation(): void {
    this.securityViolationsTotal++;
  }

  /**
   * Record render job lifecycle metrics.
   */
  recordRenderStart(): void {
    this.rendersTotal++;
  }

  recordRenderSuccess(durationMs: number): void {
    this.rendersCompleted++;
    this.renderDurations.push(durationMs);
    if (this.renderDurations.length > 500) {
      this.renderDurations.shift();
    }
  }

  recordRenderFailure(): void {
    this.rendersFailed++;
  }

  /**
   * Record color quantization performance.
   */
  recordQuantizationDuration(durationMs: number): void {
    this.quantizationDurations.push(durationMs);
    if (this.quantizationDurations.length > 500) {
      this.quantizationDurations.shift();
    }
  }

  /**
   * Record export completion metrics.
   */
  recordExport(format: string, sizeBytes: number): void {
    const fmt = format.toLowerCase();
    this.exportsTotalFormat[fmt] = (this.exportsTotalFormat[fmt] || 0) + 1;
    this.exportSizes.push(sizeBytes);
    if (this.exportSizes.length > 500) {
      this.exportSizes.shift();
    }
  }

  /**
   * Returns a structured snapshot of system metrics.
   */
  getSnapshot(): MetricSnapshot {
    return {
      requestsTotal: this.requestsTotal,
      rendersTotal: this.rendersTotal,
      rendersCompleted: this.rendersCompleted,
      rendersFailed: this.rendersFailed,
      exportsTotal: { ...this.exportsTotalFormat },
      securityViolationsTotal: this.securityViolationsTotal,
      renderDurationMs: this.computeHistogram(this.renderDurations),
      quantizationDurationMs: this.computeHistogram(this.quantizationDurations),
      exportFileSizeBytes: this.computeHistogram(this.exportSizes),
    };
  }

  /**
   * Exports metrics in standard Prometheus text format.
   */
  getPrometheusFormat(): string {
    const s = this.getSnapshot();
    const lines: string[] = [
      '# HELP gif_requests_total Total HTTP requests processed by GIF studio',
      '# TYPE gif_requests_total counter',
      `gif_requests_total ${s.requestsTotal}`,
      '',
      '# HELP gif_renders_total Total render jobs initiated',
      '# TYPE gif_renders_total counter',
      `gif_renders_total ${s.rendersTotal}`,
      `gif_renders_completed_total ${s.rendersCompleted}`,
      `gif_renders_failed_total ${s.rendersFailed}`,
      '',
      '# HELP gif_security_violations_total Total security rule violations caught',
      '# TYPE gif_security_violations_total counter',
      `gif_security_violations_total ${s.securityViolationsTotal}`,
      '',
      '# HELP gif_render_duration_ms Render execution duration in milliseconds',
      '# TYPE gif_render_duration_ms summary',
      `gif_render_duration_ms_count ${s.renderDurationMs.count}`,
      `gif_render_duration_ms_sum ${s.renderDurationMs.sum}`,
      `gif_render_duration_ms_avg ${s.renderDurationMs.avg.toFixed(2)}`,
      '',
      '# HELP gif_export_jobs_total Total exports by format',
      '# TYPE gif_export_jobs_total counter',
    ];

    for (const [fmt, count] of Object.entries(s.exportsTotal)) {
      lines.push(`gif_export_jobs_total{format="${fmt}"} ${count}`);
    }

    return lines.join('\n') + '\n';
  }

  private computeHistogram(values: number[]) {
    if (values.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0 };
    }
    const count = values.length;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = sum / count;
    return { count, sum, min, max, avg };
  }
}
