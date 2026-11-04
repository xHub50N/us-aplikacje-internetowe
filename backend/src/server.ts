import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma.js';
import { config } from './lib/config.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';

const app = express();

// Nagłówki bezpieczeństwa HTTP
app.use(helmet());

// CORS i obsługa JSON
app.use(cors());
app.use(express.json());

// Ogólny rate limiter dla zapytań do API
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/api', generalApiLimiter);

// Trasy uwierzytelniania
app.use('/api/auth', authRouter);

// Trasy projektów
app.use('/api/projects', projectsRouter);

// Trasy zadań
app.use('/api/tasks', tasksRouter);

// Sprawdzenie połączenia z PostgreSQL
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});



let server: ReturnType<typeof app.listen> | undefined;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}

async function shutdown() {
  if (server) {
    server.close();
  }
  await prisma.$disconnect();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app };
