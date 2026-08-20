import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entriesRouter } from './routes/entries.js';
import { processRouter } from './routes/process.js';
import { settingsRouter } from './routes/settings.js';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use('/api/entries', entriesRouter);
app.use('/api/process', processRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', async (_req, res) => {
  try {
    const db = await getDb();
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: (err as Error).message });
  }
});

// Serve frontend static files in production / container
const staticPath = path.join(__dirname, '../dist');
app.use(express.static(staticPath));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(staticPath, 'index.html'), (err) => {
    if (err) next();
  });
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
