import { Router } from 'express';
import { getDb } from '../db.js';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT key, value FROM settings`);
    const settings: Record<string, string> = {};
    for (const row of result.rows as { key: string; value: string }[]) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

settingsRouter.patch('/', async (req, res) => {
  try {
    const db = await getDb();
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
        [key, value],
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
