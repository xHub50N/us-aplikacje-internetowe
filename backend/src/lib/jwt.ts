import jwt from 'jsonwebtoken';
import { config } from './config.js';
import type { JwtUserPayload } from '../types/index.js';

export function signToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
  });
}

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
