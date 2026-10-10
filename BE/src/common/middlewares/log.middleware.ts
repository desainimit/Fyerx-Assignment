import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { AuthenticatedRequest } from '@app-types/auth.types';
import { RequestContextService } from '@context/request-context';

@Injectable()
export class LogMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LogMiddleware.name);

  constructor(private readonly context: RequestContextService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const requestId = randomUUID();
    const startedAt = performance.now();
    res.setHeader('X-Request-Id', requestId);

    this.context.run({ requestId }, () => {
      let logged = false;
      const log = (aborted = false): void => {
        if (logged) return;
        logged = true;
        this.logger.log({
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
          userId: req.user?.id ?? null,
          ...(aborted ? { aborted: true } : {}),
        });
      };
      res.once('finish', () => log());
      res.once('close', () => log(!res.writableFinished));
      next();
    });
  }
}
