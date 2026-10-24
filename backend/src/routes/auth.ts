import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { authenticateToken } from '../middleware/auth.js';

export const authRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const BCRYPT_SALT_ROUNDS = 10;

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
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

    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
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

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});
