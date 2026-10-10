import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse, ApiResult } from '@dtos';

@Injectable()
export class HttpHandlerInterceptor implements NestInterceptor<
  ApiResult<unknown>,
  ApiResponse<unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<ApiResult<unknown>>,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map(({ message, data, metaData }) => ({
        status: true as const,
        message,
        data,
        ...(metaData ? { metaData } : {}),
      })),
    );
  }
}
