import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import '../types/index.js';

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authorization header with Bearer token is required',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Token must not be empty',
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
