import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppError } from './app-error.js';
import { toProblem } from './problem.filter.js';

describe('toProblem', () => {
  it('renders an AppError with its catalog status and extras', () => {
    const problem = toProblem(
      new AppError('SEATS_UNAVAILABLE', {
        detail: '2 of 3 seats were taken',
        conflicts: ['a', 'b'],
      }),
      'req_1',
      '/api/v1/events/e1/holds',
    );
    expect(problem).toEqual({
      type: 'https://seatlock.dev/problems/seats-unavailable',
      title: 'Some seats are no longer available',
      status: 409,
      code: 'SEATS_UNAVAILABLE',
      detail: '2 of 3 seats were taken',
      instance: '/api/v1/events/e1/holds',
      requestId: 'req_1',
      conflicts: ['a', 'b'],
    });
  });

  it('maps framework 404s to NOT_FOUND', () => {
    const problem = toProblem(new NotFoundException('Cannot GET /x'), 'req_1', '/x');
    expect(problem).toMatchObject({ status: 404, code: 'NOT_FOUND', detail: 'Cannot GET /x' });
  });

  it('maps framework 400s to VALIDATION_FAILED with an errors array', () => {
    const problem = toProblem(new BadRequestException('Unexpected end of JSON'), 'req_1', '/x');
    expect(problem).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      errors: [{ path: '', message: 'Unexpected end of JSON' }],
    });
  });

  it('hides the details of unexpected errors', () => {
    const problem = toProblem(new Error('connection string with password'), 'req_1', '/x');
    expect(problem).toEqual({
      type: 'https://seatlock.dev/problems/internal',
      title: 'Something went wrong',
      status: 500,
      code: 'INTERNAL',
      instance: '/x',
      requestId: 'req_1',
    });
  });
});
