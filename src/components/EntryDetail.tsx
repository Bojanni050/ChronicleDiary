import { useState, useEffect } from 'react';
import { ArrowLeft, Video, Mic, RotateCcw, Sparkles, Brain, Wand2, Filter } from 'lucide-react';
import { entryService } from '@/lib/entries';
import { storageService } from '@/lib/storage';
import { processingService } from '@/lib/processing';
import { MOODS, FILTERS } from '@/lib/constants';
import { formatDuration, formatFullDate, formatConfidence } from '@/lib/format';
import type { DiaryEntry } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface EntryDetailProps {
  entryId: string;
  onBack: () => void;
}

export function EntryDetail({ entryId, onBack }: EntryDetailProps) {
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        setLoading(true);
        const data = await entryService.getById(entryId);
        if (cancelled) return;
        if (!data) {
          setError('Entry not found');
          return;
        }
        setEntry(data);

        try {
          const url = await storageService.getLocalUrl(data.storage_reference);
          if (!cancelled) setMediaUrl(url);
        } catch {
          // Non-fatal — recording may not be on this device
        }

        // Poll for updates if still processing
        if (!['recorded', 'completed', 'error'].includes(data.processing_status)) {
          pollTimer = setTimeout(load, 3000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load entry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [entryId]);

  const handleRetry = async () => {
    if (!entry) return;
    setRetrying(true);
    try {
      let blob: Blob | undefined;
      try {
        blob = await storageService.getLocal(entry.storage_reference) ?? undefined;
      } catch {
        // Recording may not be on this device
      }

      await entryService.updateStatus(entry.id, 'recorded', {
        error_message: null,
        raw_transcript: null,
        clean_transcript: null,
        ai_mood: null,
        ai_mood_confidence: null,
      });
      await processingService.startProcessing(entry.id, blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry processing');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
        <div className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          {error ?? 'Entry not found'}
        </div>
        <button onClick={onBack} className="text-sm text-white/50 hover:text-white/70">
          Go back
        </button>
      </div>
    );
  }

  const userMood = entry.user_mood ? MOODS.find((m) => m.id === entry.user_mood) : null;
  const filter = entry.filter_id ? FILTERS.find((f) => f.id === entry.filter_id) : null;
  const isProcessing = !['recorded', 'completed', 'error'].includes(entry.processing_status);

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-white/80 truncate">{formatFullDate(entry.created_at)}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={entry.processing_status} size="md" />
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs text-white/40">{formatDuration(entry.duration)}</span>
          </div>
        </div>
      </div>

      {/* Media player */}
      <div className="px-4 mb-6">
        <div className="relative rounded-2xl overflow-hidden bg-black/40">
          {entry.recording_type === 'video' ? (
            mediaUrl ? (
              <video src={mediaUrl} controls playsInline className="w-full max-h-[40vh] object-contain" />
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <Video className="w-12 h-12 text-white/20" />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-20 h-20 rounded-full bg-sky-500/10 flex items-center justify-center">
                <Mic className="w-10 h-10 text-sky-400" />
              </div>
              {mediaUrl ? (
                <audio src={mediaUrl} controls className="w-full max-w-sm px-4" />
              ) : (
                <p className="text-sm text-white/30">Audio unavailable</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mood signals — three independent observations */}
      <div className="px-4 mb-6">
        <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Mood</h3>
        <div className="grid grid-cols-1 gap-2">
          {/* User mood */}
          <MoodRow
            icon={<Brain className="w-4 h-4" />}
            label="Your mood"
            value={userMood ? `${userMood.emoji} ${userMood.label}` : 'Not selected'}
            isMuted={!userMood}
          />

          {/* Filter mood */}
          {entry.recording_type === 'video' && (
            <MoodRow
              icon={<Filter className="w-4 h-4" />}
              label="Filter mood"
              value={filter ? `${filter.name} · ${entry.filter_mood}` : 'No filter'}
              isMuted={!filter}
            />
          )}

          {/* AI mood */}
          <MoodRow
            icon={<Sparkles className="w-4 h-4" />}
            label="AI detected mood"
            value={entry.ai_mood ?? 'Not analyzed yet'}
            confidence={entry.ai_mood_confidence}
            isMuted={!entry.ai_mood}
          />
        </div>
      </div>

      {/* Transcript */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-wider text-white/30">Transcript</h3>
          {entry.raw_transcript && entry.clean_transcript && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              {showRaw ? 'Show cleaned' : 'Show raw'}
            </button>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          {isProcessing && !entry.clean_transcript ? (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <div className="w-3 h-3 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
              Transcribing your recording...
            </div>
          ) : showRaw && entry.raw_transcript ? (
            <p className="text-sm text-white/50 leading-relaxed">{entry.raw_transcript}</p>
          ) : entry.clean_transcript ? (
            <p className="text-sm text-white/70 leading-relaxed">{entry.clean_transcript}</p>
          ) : entry.raw_transcript ? (
            <p className="text-sm text-white/70 leading-relaxed">{entry.raw_transcript}</p>
          ) : (
            <p className="text-sm text-white/30">Transcript will appear after processing</p>
          )}
        </div>
      </div>

      {/* Error + retry */}
      {entry.processing_status === 'error' && entry.error_message && (
        <div className="px-4 mb-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-3">
            <p className="text-xs text-red-400 mb-1">Processing error</p>
            <p className="text-sm text-white/50">{entry.error_message}</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-sm font-medium transition-all disabled:opacity-30"
          >
            {retrying ? (
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Retry processing
          </button>
        </div>
      )}

      {/* Hindsight status */}
      {entry.hindsight_status && entry.hindsight_status !== 'not_configured' && (
        <div className="px-4">
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <span>Memory: {entry.hindsight_status}</span>
            {entry.hindsight_reference && (
              <span className="text-white/20">· ref: {entry.hindsight_reference.slice(0, 12)}...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MoodRow({
  icon,
  label,
  value,
  confidence,
  isMuted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  confidence?: number | null;
  isMuted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        isMuted ? 'bg-white/5' : 'bg-amber-500/10'
      }`}>
        <span className={isMuted ? 'text-white/30' : 'text-amber-400'}>{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
        <div className={`text-sm ${isMuted ? 'text-white/30' : 'text-white/70'}`}>
          {value}
          {confidence !== undefined && confidence !== null && !isMuted && (
            <span className="text-white/30 text-xs ml-2">
              {formatConfidence(confidence)} confidence
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
