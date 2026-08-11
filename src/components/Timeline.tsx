import { useState, useEffect, useRef } from 'react';
import { Video, Mic, ChevronRight } from 'lucide-react';
import { entryService } from '@/lib/entries';
import { storageService } from '@/lib/storage';
import { MOODS, FILTERS } from '@/lib/constants';
import { formatDuration, formatDate } from '@/lib/format';
import type { DiaryEntry } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface TimelineProps {
  onEntryClick: (entryId: string) => void;
  refreshKey: number;
}

export function Timeline({ onEntryClick, refreshKey }: TimelineProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const prevEntriesRef = useRef<DiaryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadEntries() {
      try {
        const data = await entryService.getAll();
        if (cancelled) return;
        setEntries(data);
        setError(null);

        // Poll for updates if any entry is still processing
        const hasProcessing = data.some(
          (e) => !['recorded', 'completed', 'error'].includes(e.processing_status),
        );
        if (hasProcessing) {
          pollTimer = setTimeout(loadEntries, 3000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load entries');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    loadEntries();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [refreshKey]);

  // Generate thumbnails for video entries
  useEffect(() => {
    let cancelled = false;

    async function generateThumbnails() {
      const videoEntries = entries.filter(
        (e) => e.recording_type === 'video' && !thumbnails[e.id],
      );

      for (const entry of videoEntries.slice(0, 10)) {
        if (cancelled) return;
        try {
          const url = await storageService.getLocalUrl(entry.storage_reference);
          const thumb = await generateVideoThumbnail(url);
          if (cancelled) return;
          setThumbnails((prev) => ({ ...prev, [entry.id]: thumb }));
        } catch {
          // Skip if thumbnail generation fails
        }
      }
    }

    generateThumbnails();
    return () => { cancelled = true; };
  }, [entries, thumbnails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-6">
        <div className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Video className="w-10 h-10 text-white/20" />
        </div>
        <h3 className="text-lg font-light text-white/60 mb-1">No entries yet</h3>
        <p className="text-sm text-white/30">Tap the Record button to capture your first entry</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {entries.map((entry) => {
        const mood = entry.user_mood ? MOODS.find((m) => m.id === entry.user_mood) : null;
        const filter = entry.filter_id ? FILTERS.find((f) => f.id === entry.filter_id) : null;

        return (
          <button
            key={entry.id}
            onClick={() => onEntryClick(entry.id)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left group"
          >
            {/* Thumbnail / icon */}
            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black/40">
              {entry.recording_type === 'video' && thumbnails[entry.id] ? (
                <img src={thumbnails[entry.id]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {entry.recording_type === 'video' ? (
                    <Video className="w-6 h-6 text-white/30" />
                  ) : (
                    <Mic className="w-6 h-6 text-white/30" />
                  )}
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm rounded px-1 py-0.5">
                <span className="text-[9px] font-mono text-white/80">{formatDuration(entry.duration)}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-white/80">{formatDate(entry.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {mood && (
                  <span className="text-xs text-white/50">
                    {mood.emoji} {mood.label}
                  </span>
                )}
                {filter && (
                  <span className="text-xs text-white/30">· {filter.name}</span>
                )}
              </div>
              <div className="mt-1.5">
                <StatusBadge status={entry.processing_status} />
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

async function generateVideoThumbnail(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No canvas context'));
          return;
        }
        const aspect = video.videoWidth / video.videoHeight;
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        if (aspect > 1) {
          sw = video.videoHeight;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth;
          sy = (video.videoHeight - sh) / 2;
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 160, 160);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => reject(new Error('Video load failed'));
    video.src = url;
  });
}
