import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import { ApiErrorResponse } from '@dtos';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body: unknown = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else if (isRecord(body)) {
        if (Array.isArray(body.message)) {
          message = body.message
            .filter((value): value is string => typeof value === 'string')
            .join('; ');
        } else if (typeof body.message === 'string') {
          message = body.message;
        }
        error = typeof body.error === 'string' ? body.error : exception.name;
      }
    } else if (
      isRecord(exception) &&
      typeof exception.statusCode === 'number' &&
      exception.statusCode >= 400 &&
      exception.statusCode < 500
    ) {
      status = exception.statusCode;
      message = 'Invalid request';
      error = 'Bad Request';
    }

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.path} ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    const body: ApiErrorResponse = { status: false, message, error };
    this.adapterHost.httpAdapter.reply(context.getResponse(), body, status);
  }
}
