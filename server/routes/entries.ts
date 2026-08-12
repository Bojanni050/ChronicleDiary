import { Router } from 'express';
import { getDb } from '../db.js';

export const entriesRouter = Router();

entriesRouter.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM entries ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

entriesRouter.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM entries WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

entriesRouter.post('/', async (req, res) => {
  try {
    const {
      recording_type,
      storage_reference,
      duration,
      filter_id,
      filter_name,
      filter_mood,
      user_mood,
    } = req.body;

    const db = await getDb();
    const result = await db.query(`
      INSERT INTO entries (recording_type, storage_reference, duration, filter_id, filter_name, filter_mood, user_mood, processing_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'recorded')
      RETURNING *
    `, [recording_type, storage_reference, duration, filter_id ?? null, filter_name ?? null, filter_mood ?? null, user_mood ?? null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

entriesRouter.patch('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const entry = await db.query(`SELECT * FROM entries WHERE id = $1`, [req.params.id]);
    if (entry.rows.length === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    const allowed = [
      'processing_status', 'raw_transcript', 'clean_transcript',
      'ai_mood', 'ai_mood_confidence', 'hindsight_status',
      'hindsight_reference', 'error_message',
    ];

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(req.body[key]);
        idx++;
      }
    }

    if (sets.length === 0) {
      res.json(entry.rows[0]);
      return;
    }

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE entries SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

entriesRouter.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.query(`DELETE FROM entries WHERE id = $1`, [req.params.id]);
    res.status(204).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
