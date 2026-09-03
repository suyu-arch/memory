import { BadRequestException } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException(result.error.flatten());
  return result.data as z.output<S>;
}
