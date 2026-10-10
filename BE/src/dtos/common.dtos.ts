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
