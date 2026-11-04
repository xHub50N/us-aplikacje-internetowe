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

export const authRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const BCRYPT_SALT_ROUNDS = 10;

// Rate limiting dla endpointów logowania i rejestracji
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  limit: 20, // max 20 prób z jednego adresu IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Too many attempts from this IP, please try again after 15 minutes.',
  },
});

// POST /api/auth/register
authRouter.post('/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({ error: 'A valid email address is required' });
    return;
  }

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// POST /api/auth/refresh - odświeżenie tokenu sesji z rotacją
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const { userId, newRefreshToken } = await verifyAndRotateRefreshToken(
      refreshToken.trim()
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
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const token = signAccessToken({ userId: user.id, email: user.email });

    res.json({
      token,
      refreshToken: newRefreshToken,
      user,
    });
  } catch (error: any) {
    res.status(401).json({
      error: error.message || 'Invalid or expired refresh token',
    });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout - unieważnienie refresh tokenu
authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (typeof refreshToken === 'string' && refreshToken.trim()) {
    try {
      await revokeRefreshToken(refreshToken.trim());
    } catch (err) {
      console.error('Error revoking token on logout:', err);
    }
  }
  res.json({ message: 'Logged out successfully' });
});
