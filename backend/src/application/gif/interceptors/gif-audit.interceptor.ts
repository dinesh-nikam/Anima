import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { GifMetricsService } from '../services/gif-metrics.service';

@Injectable()
export class GifAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('GifAuditTrail');

  constructor(private readonly metricsService: GifMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const startTime = Date.now();

    this.metricsService.recordRequest();

    const userId = (req as any).user?.id || 'anonymous';
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.socket.remoteAddress;

    return next.handle().pipe(
      tap(() => {
        const res = httpCtx.getResponse<Response>();
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode || 200;

        this.logger.log(
          JSON.stringify({
            event: 'HTTP_REQUEST_SUCCESS',
            userId,
            method,
            url,
            ip,
            statusCode,
            durationMs: duration,
            timestamp: new Date().toISOString(),
          }),
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;

        if (statusCode === 403 || statusCode === 400 || statusCode === 429) {
          this.metricsService.recordSecurityViolation();
        }

        this.logger.warn(
          JSON.stringify({
            event: 'HTTP_REQUEST_FAILED',
            userId,
            method,
            url,
            ip,
            statusCode,
            error: error.message || 'Internal Server Error',
            durationMs: duration,
            timestamp: new Date().toISOString(),
          }),
        );

        return throwError(() => error);
      }),
    );
  }
}
