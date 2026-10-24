import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import { config } from './lib/config.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';

const app = express();

app.use(cors());
app.use(express.json());

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
