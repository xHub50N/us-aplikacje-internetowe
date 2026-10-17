
import express from 'express';

const app = express();
const PORT: number = 3001;

// Middleware do obsługi danych JSON
app.use(express.json());

// Pierwszy endpoint
app.get('/', (_req, res) => {
  res.send('Welcome to TypeScript backend!');
});

// Endpoint testowy zwracający JSON
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend działa poprawnie',
  });
});

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
