import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto, PaginationMetaDto } from '@dtos';
import { UserRole } from '@app-types/auth.types';
import { Roles } from './roles.decorator';

interface EnvelopeOptions {
  status?: HttpStatus.OK | HttpStatus.CREATED;
  description?: string;
  message?: string;
  isArray?: boolean;
  // Paginated lists are arrays with a metaData block.
  paginated?: boolean;
}

/**
 * Documents the `{ status, message, data, metaData? }` body that
 * HttpHandlerInterceptor wraps around every successful response.
 */
export function ApiEnvelope(
  model: Type<unknown>,
  {
    status = HttpStatus.OK,
    description = 'Success',
    message,
    isArray = false,
    paginated = false,
  }: EnvelopeOptions = {},
) {
  const item = { $ref: getSchemaPath(model) };
  const array = isArray || paginated;
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['status', 'message', 'data'].concat(
          paginated ? ['metaData'] : [],
        ),
        properties: {
          status: { type: 'boolean', example: true },
          message: { type: 'string', example: message },
          data: array ? { type: 'array', items: item } : item,
          ...(paginated
            ? { metaData: { $ref: getSchemaPath(PaginationMetaDto) } }
            : {}),
        },
      },
    }),
  );
}

const ERRORS = {
  [HttpStatus.BAD_REQUEST]: ['Validation failed', 'Bad Request'],
  [HttpStatus.UNAUTHORIZED]: ['Bearer token required', 'Unauthorized'],
  [HttpStatus.FORBIDDEN]: ['Access restricted to admin accounts', 'Forbidden'],
  [HttpStatus.NOT_FOUND]: ['Event not found', 'Not Found'],
  [HttpStatus.CONFLICT]: ['Resource already exists', 'Conflict'],
  [HttpStatus.SERVICE_UNAVAILABLE]: [
    'Database connection unavailable',
    'Service Unavailable',
  ],
} as const;

type ErrorStatus = keyof typeof ERRORS;

/** Documents an error with the `{ status: false, message, error }` body. */
export function ApiError(
  status: ErrorStatus,
  description?: string,
  message?: string,
) {
  const [defaultMessage, error] = ERRORS[status];
  return ApiResponse({
    status,
    description: description ?? defaultMessage,
    type: ErrorResponseDto,
    example: { status: false, message: message ?? defaultMessage, error },
  });
}

/** Any signed-in user. Pair with the global AuthGuard, which enforces it. */
export function Auth() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiError(HttpStatus.UNAUTHORIZED, 'Missing, invalid or expired token'),
  );
}

/** Signed-in admins only; other accounts get 403. */
export function AdminOnly() {
  return applyDecorators(
    Roles(UserRole.Admin),
    Auth(),
    ApiError(HttpStatus.FORBIDDEN, 'Signed in, but not an admin'),
  );
}
