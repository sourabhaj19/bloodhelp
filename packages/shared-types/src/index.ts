export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
