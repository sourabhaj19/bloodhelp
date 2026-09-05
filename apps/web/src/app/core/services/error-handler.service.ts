import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  statusCode?: number;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private messageService = inject(MessageService);

  handleError(error: unknown, context?: string): ApiError {
    const apiError = this.normalizeError(error);
    
    const displayMessage = context ? `${context}: ${apiError.message}` : apiError.message;
    
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: displayMessage,
      life: 5000,
      closable: true,
    });

    console.error(`[ErrorHandler] ${context ?? 'Global'}`, error);
    
    return apiError;
  }

  handleHttpError(error: HttpErrorResponse, context?: string): ApiError {
    let message = 'An unexpected error occurred';
    let code = 'UNKNOWN_ERROR';
    let details: any = null;

    if (error.error instanceof ErrorEvent) {
      message = `Network error: ${error.error.message}`;
      code = 'NETWORK_ERROR';
    } else {
      const backendError = error.error;
      
      if (backendError?.error?.message) {
        message = backendError.error.message;
        code = backendError.error.code ?? `HTTP_${error.status}`;
        details = backendError.error.details;
      } else if (backendError?.message) {
        message = backendError.message;
        code = backendError.code ?? `HTTP_${error.status}`;
        details = backendError.details;
      } else {
        switch (error.status) {
          case 0:
            message = 'Unable to connect to the server. Please check your internet connection.';
            code = 'CONNECTION_FAILED';
            break;
          case 400:
            message = 'Invalid request. Please check your input.';
            code = 'BAD_REQUEST';
            break;
          case 401:
            message = 'Your session has expired. Please log in again.';
            code = 'UNAUTHORIZED';
            break;
          case 403:
            message = 'You do not have permission to perform this action.';
            code = 'FORBIDDEN';
            break;
          case 404:
            message = 'The requested resource was not found.';
            code = 'NOT_FOUND';
            break;
          case 409:
            message = 'A conflict occurred. The resource may already exist.';
            code = 'CONFLICT';
            break;
          case 422:
            message = 'Validation failed. Please check your input.';
            code = 'VALIDATION_ERROR';
            details = backendError?.errors;
            break;
          case 429:
            message = 'Too many requests. Please try again later.';
            code = 'RATE_LIMITED';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            code = 'INTERNAL_SERVER_ERROR';
            break;
          case 503:
            message = 'Service temporarily unavailable. Please try again later.';
            code = 'SERVICE_UNAVAILABLE';
            break;
          default:
            message = `Request failed with status ${error.status}`;
            code = `HTTP_${error.status}`;
        }
      }
    }

    const apiError: ApiError = { message, code, details, statusCode: error.status };
    
    const displayMessage = context ? `${context}: ${message}` : message;
    
    this.messageService.add({
      severity: 'error',
      summary: this.getErrorTitle(code),
      detail: displayMessage,
      life: 6000,
      closable: true,
    });

    console.error(`[ErrorHandler] ${context ?? 'HTTP'}`, { error, apiError });
    
    return apiError;
  }

  showSuccess(message: string, summary = 'Success'): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail: message,
      life: 4000,
      closable: true,
    });
  }

  showInfo(message: string, summary = 'Info'): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail: message,
      life: 4000,
      closable: true,
    });
  }

  showWarn(message: string, summary = 'Warning'): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail: message,
      life: 5000,
      closable: true,
    });
  }

  clear(): void {
    this.messageService.clear();
  }

  /** Extract a user-friendly message without showing a toast (for inline <p-message>). */
  getUserMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMsg =
        (error.error as any)?.error?.message ?? (error.error as any)?.message;
      if (backendMsg && typeof backendMsg === 'string') return backendMsg;
      if (error.status === 0)
        return 'Cannot reach the server. Check your connection and try again.';
      if (error.status === 400)
        return 'Invalid request. Please check your input.';
      if (error.status === 401)
        return 'Invalid credentials or session expired.';
      if (error.status === 403)
        return 'You do not have permission to perform this action.';
      if (error.status === 404) return 'The requested data was not found.';
      if (error.status === 409)
        return 'This record already exists. Please check your input.';
      if (error.status === 422)
        return 'Validation failed. Please check the highlighted fields.';
      if (error.status === 429)
        return 'Too many attempts. Please wait and try again.';
      if (error.status >= 500)
        return 'Server error. Please try again in a moment.';
      return 'Something went wrong. Please try again.';
    }
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    return 'Something went wrong. Please try again.';
  }

  /** Extract field-level validation details if backend provides them. */
  getValidationDetails(error: unknown): Record<string, string[]> | null {
    const e: any = (error as any)?.error ?? error;
    const details = e?.error?.details ?? e?.details ?? e?.errors ?? null;
    if (details && typeof details === 'object' && !Array.isArray(details))
      return details as Record<string, string[]>;
    return null;
  }

  private normalizeError(error: unknown): ApiError {
    if (error instanceof HttpErrorResponse) {
      return this.handleHttpError(error);
    }
    if (error instanceof Error) {
      return { message: error.message, code: 'CLIENT_ERROR' };
    }
    if (typeof error === 'string') {
      return { message: error, code: 'CLIENT_ERROR' };
    }
    return { message: 'An unknown error occurred', code: 'UNKNOWN_ERROR' };
  }

  private getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
      NETWORK_ERROR: 'Connection Error',
      CONNECTION_FAILED: 'Connection Failed',
      BAD_REQUEST: 'Invalid Request',
      UNAUTHORIZED: 'Authentication Required',
      FORBIDDEN: 'Access Denied',
      NOT_FOUND: 'Not Found',
      CONFLICT: 'Conflict',
      VALIDATION_ERROR: 'Validation Error',
      RATE_LIMITED: 'Rate Limited',
      INTERNAL_SERVER_ERROR: 'Server Error',
      SERVICE_UNAVAILABLE: 'Service Unavailable',
      UNKNOWN_ERROR: 'Error',
    };
    return titles[code] ?? 'Error';
  }
}