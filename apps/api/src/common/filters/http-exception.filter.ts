import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = res.message || res.error || message;
        code = res.code || this.httpStatusToCode(status);
        details = res.details || (Array.isArray(res.message) ? res.message : undefined);
        if (Array.isArray(res.message)) {
          message = 'Validation failed';
          details = res.message;
          code = 'VALIDATION_ERROR';
        }
      }
      if (status >= 500) {
        this.logger.error(`${request.method} ${request.url} -> ${status} ${code}: ${message}`, exception.stack);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url} -> ${exception.message}`,
        exception.stack,
      );
      // Map common Prisma errors to proper HTTP codes instead of 500.
      const anyErr = exception as any;
      if (anyErr?.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE';
        message = 'Duplicate value violates a unique constraint';
        details = anyErr?.meta;
      } else if (anyErr?.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Record not found';
      } else if (anyErr?.code === 'P2023' || anyErr?.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        code = 'BAD_REQUEST';
        message = 'Invalid identifier or reference';
      }
    }

    // Never leak internal messages in production for 500s — but in
    // development return the real message so API errors are diagnosable
    // without digging through server logs.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      code = 'INTERNAL_ERROR';
      if (process.env.NODE_ENV !== 'production' && exception instanceof Error && exception.message) {
        message = exception.message;
      } else {
        message = 'An unexpected error occurred';
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }

  private httpStatusToCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'RATE_LIMITED';
      default: return `HTTP_${status}`;
    }
  }
}
