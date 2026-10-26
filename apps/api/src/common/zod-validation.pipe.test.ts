import { MAX_SEATS_PER_HOLD } from '@seatlock/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from './app-error.js';
import { ZodValidationPipe, zodDto } from './zod-validation.pipe.js';

const HoldDto = zodDto(z.object({ seatIds: z.array(z.uuid()).min(1).max(MAX_SEATS_PER_HOLD) }));

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();

  it('returns the parsed value for a valid body', () => {
    const body = { seatIds: ['0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'] };
    expect(pipe.transform(body, { type: 'body', metatype: HoldDto })).toEqual(body);
  });

  it('throws VALIDATION_FAILED with one entry per issue and dotted paths', () => {
    const body = { seatIds: ['ok?', 'also-bad'] };
    try {
      pipe.transform(body, { type: 'body', metatype: HoldDto });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('VALIDATION_FAILED');
      expect((error as AppError).options.errors?.map((e) => e.path)).toEqual([
        'seatIds.0',
        'seatIds.1',
      ]);
    }
  });

  it('leaves parameters without a zod schema untouched', () => {
    expect(pipe.transform('42', { type: 'param', metatype: String })).toBe('42');
  });
});
