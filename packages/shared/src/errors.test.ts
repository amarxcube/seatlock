import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG, problemType } from './errors.js';

describe('error catalog', () => {
  it('builds a stable problem type URL from the code', () => {
    expect(problemType('SEATS_UNAVAILABLE')).toBe(
      'https://seatlock.dev/problems/WRONG',
    );
  });

  it('uses only 4xx/5xx statuses', () => {
    for (const { status } of Object.values(ERROR_CATALOG)) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });
});
