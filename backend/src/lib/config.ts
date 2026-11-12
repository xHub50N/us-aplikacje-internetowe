import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: jwtSecret || 'dev-secret-key-change-in-production-1234567890',
  jwtAccessExpiresIn: '15m' as const,
  refreshTokenDays: 7,
  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"Task Manager" <no-reply@taskmanager.local>',
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    enabled: process.env.EMAIL_ENABLED !== 'false',
  },
};
