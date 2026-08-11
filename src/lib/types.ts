export type RecordingType = 'audio' | 'video';

export type ProcessingStatus =
  | 'recorded'
  | 'transcribing'
  | 'transcribed'
  | 'mood_processed'
  | 'cleaning'
  | 'cleaned'
  | 'sending_to_hindsight'
  | 'completed'
  | 'error';

export type HindsightStatus = 'pending' | 'sent' | 'failed' | 'not_configured';

export interface DiaryEntry {
  id: string;
  created_at: string;
  recording_type: RecordingType;
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
  processing_status: ProcessingStatus;
  hindsight_status: HindsightStatus | null;
  hindsight_reference: string | null;
  error_message: string | null;
}

export interface BeautyFilterParams {
  skinSmooth: number;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  glow: number;
  vignette: number;
  blur: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  mood: string;
  cssFilter: string;
  thumbnailGradient: string;
  beauty?: BeautyFilterParams;
}

export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
}

export interface ProcessEntryResponse {
  success: boolean;
  error?: string;
}

export interface TranscriptionResult {
  transcript: string;
}

export interface MoodDetectionResult {
  mood: string;
  confidence: number;
}

export interface CleanupResult {
  cleanTranscript: string;
}

export interface HindsightPayload {
  entry_id: string;
  timestamp: string;
  clean_transcript: string;
  user_mood: string | null;
  filter_mood: string | null;
  ai_mood: string | null;
  ai_mood_confidence: number | null;
  recording_type: RecordingType;
}

export interface HindsightResult {
  reference: string;
}
