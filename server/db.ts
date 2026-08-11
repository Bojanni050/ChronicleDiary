import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

let db: PGlite | null = null;

export async function getDb(): Promise<PGlite> {
  if (db) return db;

  if (DATABASE_URL) {
    // Filesystem-backed PGlite for local dev
    // e.g. postgresql://user:password@localhost:5432/chronicle_diary
    // We extract the database name to use as the PGlite data directory
    const dbName = DATABASE_URL.split('/').pop() ?? 'chronicle_diary';
    db = new PGlite(`./pgdata/${dbName}`);
  } else {
    // Fallback: in-memory (lost on restart)
    db = new PGlite();
  }

  await initSchema(db);
  return db;
}

async function initSchema(database: PGlite): Promise<void> {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  await database.exec(schema);
}

export interface EntryRow {
  id: string;
  created_at: string;
  recording_type: string;
  storage_reference: string;
  duration: number;
  filter_id: string | null;
  filter_name: string | null;
  filter_mood: string | null;
  user_mood: string | null;
  raw_transcript: string | null;
  clean_transcript: string | null;
  ai_mood: string | null;
  ai_mood_confidence: number | null;
  processing_status: string;
  hindsight_status: string | null;
  hindsight_reference: string | null;
  error_message: string | null;
}
