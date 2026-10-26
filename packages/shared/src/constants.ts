/** How long a seat hold lasts before its seats can be reclaimed (PRD §7.4, decision 1). */
export const HOLD_TTL_SECONDS = 600;

/** Maximum seats in one hold request (PRD §7.4). */
export const MAX_SEATS_PER_HOLD = 10;

/** Checkout is refused when the hold has less time left than this (ADR-0009). */
export const MIN_CHECKOUT_SECONDS_LEFT = 60;

/** Single currency for the MVP; amounts are always integer cents (ADR-0012). */
export const CURRENCY = 'USD';

export const API_PREFIX = '/api/v1';
