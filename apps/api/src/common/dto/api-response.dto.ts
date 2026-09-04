export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}
export interface ApiPaginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
