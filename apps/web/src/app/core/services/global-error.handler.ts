import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector, private zone: NgZone) {}

  handleError(error: unknown): void {
    const messageService = this.injector.get(MessageService, null);

    // Unwrap zone / promise rejections
    const unwrapped: any = (error as any)?.rejection ?? error;
    const message = this.toUserMessage(unwrapped);

    // Always log for diagnostics
    // eslint-disable-next-line no-console
    console.error('[GlobalErrorHandler]', unwrapped);

    // Toast must run inside NgZone so change detection fires
    if (messageService) {
      this.zone.run(() => {
        // Avoid spamming for chunk-load / navigation aborts
        if (this.shouldSuppress(unwrapped)) return;
        messageService.add({
          severity: 'error',
          summary: 'Something went wrong',
          detail: message,
          life: 6000,
          closable: true,
        });
      });
    }
  }

  private shouldSuppress(error: any): boolean {
    const msg = String(error?.message ?? '');
    return (
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('NG04002') // unknown route, router already handles
    );
  }

  private toUserMessage(error: any): string {
    if (error instanceof HttpErrorResponse) {
      const backendMsg =
        error.error?.error?.message ?? error.error?.message ?? null;
      if (backendMsg && typeof backendMsg === 'string') return backendMsg;
      if (error.status === 0)
        return 'Cannot reach the server. Check your connection and try again.';
      if (error.status === 401)
        return 'Your session expired. Please log in again.';
      if (error.status === 403)
        return 'You do not have permission to do that.';
      if (error.status === 404) return 'Requested data was not found.';
      if (error.status >= 500)
        return 'Server error. Please try again in a moment.';
      return `Request failed${error.status ? ` (${error.status})` : ''}. Please try again.`;
    }
    if (error instanceof Error && error.message) {
      // Don't leak technical details for generic errors
      if (error.message.length < 160) return error.message;
      return 'An unexpected error occurred. Please try again.';
    }
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred. Please try again.';
  }
}
