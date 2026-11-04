import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import {
  signAccessToken,
  createRefreshToken,
  verifyAndRotateRefreshToken,
  revokeRefreshToken,
} from '../lib/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../lib/errors.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../schemas/index.js';

export const authRouter = Router();

const BCRYPT_SALT_ROUNDS = 10;

// Rate limiting dla endpointów logowania i rejestracji
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Too many attempts from this IP, please try again after 15 minutes.',
  },
});

// POST /api/auth/register
authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  async (req, res, next) => {
    const { email, password, name } = req.body;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw AppError.conflict('User with this email already exists');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      const token = signAccessToken({ userId: user.id, email: user.email });
      const refreshToken = await createRefreshToken(user.id);

      res.status(201).json({
        user,
        token,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login
authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw AppError.unauthorized('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw AppError.unauthorized('Invalid email or password');
      }

      const token = signAccessToken({ userId: user.id, email: user.email });
      const refreshToken = await createRefreshToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/refresh - odświeżenie tokenu sesji z rotacją
authRouter.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  async (req, res, next) => {
    const { refreshToken } = req.body;

    try {
      const { userId, newRefreshToken } = await verifyAndRotateRefreshToken(
        refreshToken
      );

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw AppError.unauthorized('User not found');
      }

      const token = signAccessToken({ userId: user.id, email: user.email });

      res.json({
        token,
        refreshToken: newRefreshToken,
        user,
      });
    } catch (error: any) {
      next(AppError.unauthorized(error.message || 'Invalid or expired refresh token'));
    }
  }
);

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout - unieważnienie refresh tokenu
authRouter.post(
  '/logout',
  validate({ body: logoutSchema }),
  async (req, res, next) => {
    const { refreshToken } = req.body;
    try {
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
);
