import { ERROR_CATALOG, type ErrorCode } from '@seatlock/shared';

export interface AppErrorOptions {
  detail?: string;
  errors?: { path: string; message: string }[];
  conflicts?: string[];
}

/** A domain error with a code from the error catalog; rendered as problem+json. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly options: AppErrorOptions = {},
  ) {
    super(options.detail ?? ERROR_CATALOG[code].title);
    this.name = 'AppError';
  }

  get status(): number {
    return ERROR_CATALOG[this.code].status;
  }
}
