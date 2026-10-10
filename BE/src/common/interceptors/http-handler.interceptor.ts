import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, map, tap } from 'rxjs';
import { ApiResponse, ApiResult } from '@dtos';

@Injectable()
export class HttpHandlerInterceptor implements NestInterceptor<
  ApiResult<unknown>,
  ApiResponse<unknown>
> {
  private readonly logger = new Logger(HttpHandlerInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<ApiResult<unknown>>,
  ): Observable<ApiResponse<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();
    const logResponse = (statusCode: number): void => {
      this.logger.log(
        `${request.method} ${request.path} ${statusCode} ${Date.now() - startedAt}ms`,
      );
    };

    return next.handle().pipe(
      map(({ message, data, metaData }) => ({
        status: true as const,
        message,
        data,
        ...(metaData ? { metaData } : {}),
      })),
      tap({
        next: () => logResponse(response.statusCode),
        error: (error: unknown) =>
          logResponse(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
