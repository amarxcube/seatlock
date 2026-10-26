// The error catalog from docs/api.md §3. Clients branch on `code`, never on `title`.

export const PROBLEM_TYPE_BASE = 'https://seatlock.dev/problems/';

export const ERROR_CATALOG = {
  VALIDATION_FAILED: { status: 400, title: 'The request is invalid' },
  UNAUTHENTICATED: { status: 401, title: 'Authentication is required' },
  TOKEN_EXPIRED: { status: 401, title: 'The access token has expired' },
  INVALID_CREDENTIALS: { status: 401, title: 'The email or password is incorrect' },
  REFRESH_INVALID: { status: 401, title: 'The refresh token is not valid' },
  FORBIDDEN: { status: 403, title: 'You are not allowed to do this' },
  ACCOUNT_DISABLED: { status: 403, title: 'This account has been disabled' },
  NOT_FOUND: { status: 404, title: 'The resource was not found' },
  EMAIL_TAKEN: { status: 409, title: 'This email is already registered' },
  EVENT_NOT_ON_SALE: { status: 409, title: 'This event is not on sale' },
  SEATS_UNAVAILABLE: { status: 409, title: 'Some seats are no longer available' },
  HOLD_NOT_ACTIVE: { status: 409, title: 'The hold is no longer active' },
  HOLD_EXPIRING: { status: 409, title: 'Not enough time left on the hold to pay' },
  LAYOUT_LOCKED: { status: 409, title: 'The venue layout is locked' },
  INVALID_STATE_TRANSITION: {
    status: 409,
    title: 'This change is not allowed in the current state',
  },
  IDEMPOTENCY_KEY_REUSED: {
    status: 409,
    title: 'The idempotency key was used with a different request',
  },
  UNKNOWN_SEATS: { status: 422, title: 'Some seats do not belong to this event' },
  EVENT_NOT_PUBLISHABLE: { status: 422, title: 'The event cannot be published yet' },
  RATE_LIMITED: { status: 429, title: 'Too many requests' },
  INTERNAL: { status: 500, title: 'Something went wrong' },
  SERVICE_UNAVAILABLE: { status: 503, title: 'A dependency is temporarily unavailable' },
} as const satisfies Record<string, { status: number; title: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  instance?: string;
  requestId: string;
  errors?: { path: string; message: string }[];
  conflicts?: string[];
}

/** `SEATS_UNAVAILABLE` → `https://seatlock.dev/problems/seats-unavailable` */
export function problemType(code: ErrorCode): string {
  return PROBLEM_TYPE_BASE + code.toLowerCase().replaceAll('_', '-');
}
