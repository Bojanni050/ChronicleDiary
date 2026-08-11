import express from 'express';
import cors from 'cors';
import { entriesRouter } from './routes/entries.js';
import { processRouter } from './routes/process.js';
import { settingsRouter } from './routes/settings.js';
import { getDb } from './db.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use('/api/entries', entriesRouter);
app.use('/api/process', processRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await getDb();
  app.listen(PORT, () => {
    console.log(`ChronicleDiary API server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
