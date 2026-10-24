import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: jwtSecret || 'dev-secret-key-change-in-production-1234567890',
  jwtExpiresIn: '24h',
};
