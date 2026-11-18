import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { sendPasswordResetEmail } from '../lib/email.js';
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
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
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
          avatarUrl: true,
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
          avatarUrl: user.avatarUrl,
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
          avatarUrl: true,
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

// PATCH /api/auth/profile - aktualizacja profilu (nazwa, awatar)
authRouter.patch(
  '/profile',
  authenticateToken,
  validate({ body: updateProfileSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const { name, avatarUrl } = req.body;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      res.json({ user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/auth/change-password - zmiana hasła zalogowanego użytkownika
authRouter.put(
  '/change-password',
  authenticateToken,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        throw AppError.notFound('User not found');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw AppError.unauthorized('Current password is incorrect');
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

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

// POST /api/auth/forgot-password - żądanie zresetowania hasła
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req, res, next) => {
    const { email } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Zawsze zwracamy sukces (ochrona przed user enumeration)
      if (!user) {
        return res.json({
          message: 'Jeśli podany adres istnieje w systemie, wysłaliśmy link do resetowania hasła.',
        });
      }

      // Unieważnij poprzednie aktywne tokeny resetu dla tego usera
      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          usedAt: new Date(),
        },
      });

      // Wygeneruj bezpieczny unikalny token (64 znaki hex)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresInMinutes = 60;
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${config.email.appUrl}/?resetToken=${token}`;

      // Wyślij e-mail z linkiem do resetu w tle (fail-safe)
      void sendPasswordResetEmail({
        to: user.email,
        recipientName: user.name,
        resetUrl,
        expiresInMinutes,
      });

      res.json({
        message: 'Jeśli podany adres istnieje w systemie, wysłaliśmy link do resetowania hasła.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password - ustawienie nowego hasła z tokenem
authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    const { token, password } = req.body;

    try {
      const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
        throw AppError.badRequest('Link do resetowania hasła jest nieprawidłowy lub wygasł.');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      // Aktualizacja hasła użytkownika
      await prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });

      // Oznacz token jako zużyty
      await prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Unieważnij wszystkie aktywne refresh tokeny użytkownika (wymuszenie ponownego logowania)
      await prisma.refreshToken.updateMany({
        where: {
          userId: resetRecord.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      res.json({
        message: 'Hasło zostało pomyślnie zresetowane. Możesz się teraz zalogować nowym hasłem.',
      });
    } catch (error) {
      next(error);
    }
  }
);
