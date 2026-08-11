import { Router } from 'express';
import { getDb } from '../db.js';
import { TranscriptionService } from '../services/transcription.js';
import { MoodDetectionService } from '../services/moodDetection.js';
import { TranscriptCleanupService } from '../services/transcriptCleanup.js';
import { MemoryService } from '../services/memory.js';
import type { HindsightPayload } from '../services/memory.js';

export const processRouter = Router();

const transcriptionService = new TranscriptionService();
const moodDetectionService = new MoodDetectionService();
const cleanupService = new TranscriptCleanupService();
const memoryService = new MemoryService();

processRouter.post('/', async (req, res) => {
  try {
    const { entryId, recordingBase64 } = req.body;
    if (!entryId) {
      res.status(400).json({ success: false, error: 'Missing entryId' });
      return;
    }

    const db = await getDb();
    const entryResult = await db.query(`SELECT * FROM entries WHERE id = $1`, [entryId]);
    if (entryResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    const entry = entryResult.rows[0] as {
      id: string; created_at: string; recording_type: string;
      user_mood: string | null; filter_mood: string | null;
    };

    // Step 1: Transcription
    await db.query(`UPDATE entries SET processing_status = 'transcribing' WHERE id = $1`, [entryId]);

    let rawTranscript: string;
    try {
      rawTranscript = await transcriptionService.transcribe(recordingBase64 ?? '', entry.recording_type);
      await db.query(
        `UPDATE entries SET raw_transcript = $1, processing_status = 'transcribed' WHERE id = $2`,
        [rawTranscript, entryId],
      );
    } catch (err) {
      await db.query(
        `UPDATE entries SET processing_status = 'error', error_message = $1 WHERE id = $2`,
        [`Transcription failed: ${(err as Error).message}`, entryId],
      );
      res.status(500).json({ success: false, error: 'Transcription failed' });
      return;
    }

    // Step 2: Mood Detection
    await db.query(`UPDATE entries SET processing_status = 'mood_processed' WHERE id = $1`, [entryId]);

    let aiMood = 'unknown';
    let aiConfidence = 0;
    try {
      const moodResult = await moodDetectionService.detect(rawTranscript);
      aiMood = moodResult.mood;
      aiConfidence = moodResult.confidence;
      await db.query(
        `UPDATE entries SET ai_mood = $1, ai_mood_confidence = $2 WHERE id = $3`,
        [aiMood, aiConfidence, entryId],
      );
    } catch (err) {
      console.error('Mood detection failed:', err);
      await db.query(
        `UPDATE entries SET ai_mood = 'unknown', ai_mood_confidence = 0 WHERE id = $1`,
        [entryId],
      );
    }

    // Step 3: Transcript Cleanup
    await db.query(`UPDATE entries SET processing_status = 'cleaning' WHERE id = $1`, [entryId]);

    let cleanTranscript: string;
    try {
      cleanTranscript = await cleanupService.clean(rawTranscript);
      await db.query(
        `UPDATE entries SET clean_transcript = $1, processing_status = 'cleaned' WHERE id = $2`,
        [cleanTranscript, entryId],
      );
    } catch (err) {
      await db.query(
        `UPDATE entries SET processing_status = 'error', error_message = $1 WHERE id = $2`,
        [`Cleanup failed: ${(err as Error).message}`, entryId],
      );
      res.status(500).json({ success: false, error: 'Cleanup failed' });
      return;
    }

    // Step 4: Send to Hindsight
    await db.query(`UPDATE entries SET processing_status = 'sending_to_hindsight' WHERE id = $1`, [entryId]);

    try {
      const payload: HindsightPayload = {
        entry_id: entryId,
        timestamp: entry.created_at,
        clean_transcript: cleanTranscript,
        user_mood: entry.user_mood,
        filter_mood: entry.filter_mood,
        ai_mood: aiMood,
        ai_mood_confidence: aiConfidence,
        recording_type: entry.recording_type,
      };

      const hindsightResult = await memoryService.sendToHindsight(payload);
      await db.query(
        `UPDATE entries SET processing_status = 'completed', hindsight_status = $1, hindsight_reference = $2 WHERE id = $3`,
        [hindsightResult.configured ? 'sent' : 'not_configured', hindsightResult.reference, entryId],
      );
    } catch (err) {
      await db.query(
        `UPDATE entries SET processing_status = 'completed', hindsight_status = 'failed', error_message = $1 WHERE id = $2`,
        [`Hindsight failed: ${(err as Error).message}`, entryId],
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
