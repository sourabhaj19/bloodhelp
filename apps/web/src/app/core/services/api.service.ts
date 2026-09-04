import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  get<T>(path: string, params?: any) {
    return this.http.get<T>(`${this.base}${path}`, { params, withCredentials: true });
  }
  post<T>(path: string, body: any) {
    return this.http.post<T>(`${this.base}${path}`, body, { withCredentials: true });
  }
  patch<T>(path: string, body: any) {
    return this.http.patch<T>(`${this.base}${path}`, body, { withCredentials: true });
  }
  delete<T>(path: string) {
    return this.http.delete<T>(`${this.base}${path}`, { withCredentials: true });
  }
}
