import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chronicle_diary';

let pool: pg.Pool | null = null;
let schemaInitialized = false;

export async function getDb(): Promise<pg.Pool> {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
    });
  }

  if (!schemaInitialized) {
    await initSchema(pool);
    schemaInitialized = true;
  }

  return pool;
}

async function initSchema(databasePool: pg.Pool): Promise<void> {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  await databasePool.query(schema);
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
