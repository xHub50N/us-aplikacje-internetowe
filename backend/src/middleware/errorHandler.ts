import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Błędy aplikacyjne (kontrolowane)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Błędy Prisma (np. unikalność klucza P2002, brak rekordu P2025)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? err.meta?.target.join(', ')
        : (err.meta?.target as string) || 'field';
      res.status(409).json({
        error: `Unique constraint violation on ${target}`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'Record not found',
      });
      return;
    }
  }

  // Nieobsłużone błędy serwera (nigdy nie wyciekamy stack trace'a do klienta)
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
}
