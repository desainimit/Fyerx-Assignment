import { ApiProperty } from '@nestjs/swagger';

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResult<T> {
  message: string;
  data: T;
  metaData?: PaginationMetadata;
}

export interface ApiResponse<T> extends ApiResult<T> {
  status: true;
}

export interface ApiErrorResponse {
  status: false;
  message: string;
  error: string;
}

// Swagger-only classes describing the shapes above.
export class PaginationMetaDto implements PaginationMetadata {
  @ApiProperty({ example: 42 })
  declare total: number;

  @ApiProperty({ example: 1 })
  declare page: number;

  @ApiProperty({ example: 9 })
  declare limit: number;

  @ApiProperty({ example: 5 })
  declare totalPages: number;
}

export class ErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: false })
  declare status: false;

  @ApiProperty({ example: 'Event not found' })
  declare message: string;

  @ApiProperty({ example: 'Not Found' })
  declare error: string;
}
