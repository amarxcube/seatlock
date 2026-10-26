import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ERROR_CATALOG, type ErrorCode, type Problem, problemType } from '@seatlock/shared';
import type { Request, Response } from 'express';
import { AppError, type AppErrorOptions } from './app-error.js';
import { requestIdFor } from './request-id.js';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

/** Renders every error as RFC 9457 problem+json with a stable `code` (docs/api.md §3). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: unknown }>();
    const res = http.getResponse<Response>();
    const requestId = typeof req.id === 'string' ? req.id : requestIdFor(req, res);

    const problem = toProblem(exception, requestId, req.originalUrl.split('?')[0] ?? '/');
    if (problem.status >= 500) {
      this.logger.error({ err: exception, requestId }, 'Unhandled error');
    }
    res.status(problem.status).type('application/problem+json').json(problem);
  }
}

export function toProblem(exception: unknown, requestId: string, instance: string): Problem {
  if (exception instanceof AppError) {
    return build(exception.code, exception.status, requestId, instance, exception.options);
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = CODE_BY_STATUS[status] ?? (status < 500 ? 'VALIDATION_FAILED' : 'INTERNAL');
    // Framework errors (malformed JSON, unknown route…) carry a message that is safe to show.
    const options: AppErrorOptions =
      code === 'VALIDATION_FAILED'
        ? { errors: [{ path: '', message: exception.message }] }
        : status < 500
          ? { detail: exception.message }
          : {};
    return build(code, status, requestId, instance, options);
  }
  // Never leak details of unexpected errors to the client.
  return build('INTERNAL', 500, requestId, instance, {});
}

function build(
  code: ErrorCode,
  status: number,
  requestId: string,
  instance: string,
  options: AppErrorOptions,
): Problem {
  return {
    type: problemType(code),
    title: ERROR_CATALOG[code].title,
    status,
    code,
    ...(options.detail ? { detail: options.detail } : {}),
    instance,
    requestId,
    ...(options.errors ? { errors: options.errors } : {}),
    ...(options.conflicts ? { conflicts: options.conflicts } : {}),
  };
}
