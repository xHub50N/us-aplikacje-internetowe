import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sseManager } from '../lib/sse.js';

export const eventsRouter = Router();

eventsRouter.get('/', authenticateToken, (req, res) => {
  const userId = req.user!.id;
  const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Nagłówki dla strumieniowania SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Wysłanie wiadomości inicjalizującej połączenie
  res.write(`: connected (clientId: ${clientId})\n\n`);

  sseManager.addClient(clientId, userId, res);

  req.on('close', () => {
    sseManager.removeClient(clientId);
  });
});
