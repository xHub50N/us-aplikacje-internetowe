import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { prisma } from './prisma.js';
import type { JwtUserPayload } from '../types/index.js';

export function signAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  });
}

// Kompatybilność wsteczna
export const signToken = signAccessToken;

export function verifyToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (
    typeof decoded === 'object' &&
    decoded !== null &&
    'userId' in decoded &&
    'email' in decoded &&
    typeof (decoded as any).userId === 'number' &&
    typeof (decoded as any).email === 'string'
  ) {
    return {
      userId: (decoded as any).userId,
      email: (decoded as any).email,
    };
  }
  throw new Error('Invalid token payload');
}

export async function createRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(
    Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function verifyAndRotateRefreshToken(rawToken: string): Promise<{
  userId: number;
  newRefreshToken: string;
}> {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: rawToken },
  });

  if (!storedToken) {
    throw new Error('Invalid refresh token');
  }

  if (storedToken.revokedAt !== null) {
    // Wykrycie ponownego użycia unieważnionego tokenu (próba ataku replay)
    // Bezpieczeństwo: unieważniamy wszystkie aktywne sesje tego użytkownika
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new Error('Refresh token was revoked');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error('Refresh token expired');
  }

  // Rotacja: oznacz bieżący token jako unieważniony
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // Utwórz nowy refresh token
  const newRefreshToken = await createRefreshToken(storedToken.userId);

  return {
    userId: storedToken.userId,
    newRefreshToken,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: rawToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
