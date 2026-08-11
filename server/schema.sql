CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recording_type TEXT NOT NULL CHECK (recording_type IN ('audio', 'video')),
  storage_reference TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  filter_id TEXT,
  filter_name TEXT,
  filter_mood TEXT,
  user_mood TEXT,
  raw_transcript TEXT,
  clean_transcript TEXT,
  ai_mood TEXT,
  ai_mood_confidence REAL,
  processing_status TEXT NOT NULL DEFAULT 'recorded',
  hindsight_status TEXT,
  hindsight_reference TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value)
VALUES ('keep_original_recordings', 'true')
ON CONFLICT (key) DO NOTHING;
