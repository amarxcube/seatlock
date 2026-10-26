import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { AppError } from './app-error.js';

export interface ZodDto<T extends z.ZodType> {
  new (): z.infer<T>;
  schema: T;
}

/**
 * Turns a shared zod schema into a class usable as a parameter type, so the global
 * ZodValidationPipe can find the schema: `create(@Body() body: CreateHoldDto)`.
 */
export function zodDto<T extends z.ZodType>(schema: T): ZodDto<T> {
  class Dto {
    static schema = schema;
  }
  return Dto as unknown as ZodDto<T>;
}

/** Validates any parameter whose type was created with zodDto(); returns the parsed value. */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = (metadata.metatype as { schema?: z.ZodType } | undefined)?.schema;
    if (!schema) return value;
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw new AppError('VALIDATION_FAILED', {
      errors: result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    });
  }
}
