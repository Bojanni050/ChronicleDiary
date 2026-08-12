import { useState, useRef, useEffect } from 'react';
import { Video, Mic, Square, Trash2, Save, RotateCcw, Camera } from 'lucide-react';
import { useRecorder } from '@/hooks/useRecorder';
import { FILTERS } from '@/lib/constants';
import type { RecordingType, FilterPreset } from '@/lib/types';
import { storageService } from '@/lib/storage';
import { entryService } from '@/lib/entries';
import { processingService } from '@/lib/processing';
import { settingsService } from '@/lib/settings';
import { FilterSelector } from './FilterSelector';
import { MoodSelector } from './MoodSelector';

type Screen = 'choose' | 'recording' | 'review';

interface RecordScreenProps {
  onSaved: () => void;
}

export function RecordScreen({ onSaved }: RecordScreenProps) {
  const recorder = useRecorder();
  const [screen, setScreen] = useState<Screen>('choose');
  const [recordingType, setRecordingType] = useState<RecordingType>('video');
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset>(FILTERS[0]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>('');
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const reviewAudioRef = useRef<HTMLAudioElement>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const handleChoose = (type: RecordingType) => {
    setRecordingType(type);
    setScreen('recording');
    recorder.startRecording(type, selectedFilter);
  };

  const handleStop = async () => {
    const result = await recorder.stopRecording();
    if (result) {
      setRecordedBlob(result.blob);
      setRecordedMime(result.mimeType);
      setRecordedDuration(result.duration);
      const url = URL.createObjectURL(result.blob);
      setRecordedUrl(url);
      setScreen('review');
    }
  };

  const handleDiscard = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    setRecordedMime('');
    setRecordedDuration(0);
    setSaveError(null);
    setScreen('choose');
  };

  const handleRecordAgain = async () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    setSaveError(null);
    setScreen('recording');
    await recorder.startRecording(recordingType, selectedFilter);
  };

  const handleSave = async () => {
    if (!recordedBlob) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const storageReference = await storageService.saveLocal(recordedBlob, recordingType, recordedMime);

      const entry = await entryService.create({
        recordingType,
        storageReference,
        duration: recordedDuration,
        filterId: recordingType === 'video' ? selectedFilter.id : null,
        filterName: recordingType === 'video' ? selectedFilter.name : null,
        filterMood: recordingType === 'video' ? selectedFilter.mood : null,
        userMood: selectedMood,
      });

      // Fire and forget — background processing
      processingService
        .startProcessing(entry.id, recordedBlob)
        .then(async (res) => {
          if (res.success) {
            const settings = await settingsService.getAll();
            if (!settings.keep_original_recordings) {
              await storageService.deleteLocal(storageReference);
            }
          }
        })
        .catch((err) => {
          console.error('Processing failed:', err);
        });

      onSaved();
      handleDiscard();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save recording');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Choose screen ──────────────────────────────────────────────
  if (screen === 'choose') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-light text-white/90 mb-2">Capture your day</h2>
          <p className="text-sm text-white/40">Choose how you'd like to record</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => handleChoose('video')}
            className="group relative flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 hover:border-amber-400/40 hover:from-amber-500/20 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Video className="w-7 h-7 text-amber-400" />
            </div>
            <div className="text-left">
              <div className="text-base font-medium text-white">Video</div>
              <div className="text-xs text-white/40">Record with camera + filters</div>
            </div>
          </button>

          <button
            onClick={() => handleChoose('audio')}
            className="group relative flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-500/20 hover:border-sky-400/40 hover:from-sky-500/20 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mic className="w-7 h-7 text-sky-400" />
            </div>
            <div className="text-left">
              <div className="text-base font-medium text-white">Audio</div>
              <div className="text-xs text-white/40">Record voice only</div>
            </div>
          </button>
        </div>

        {/* Optional mood pre-selection */}
        <div className="mt-10 w-full max-w-md">
          <p className="text-xs text-white/40 mb-2 text-center">How are you feeling? (optional)</p>
          <MoodSelector selectedMood={selectedMood} onSelect={setSelectedMood} />
        </div>

        {recorder.state.error && (
          <div className="mt-6 max-w-md text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {recorder.state.error}
          </div>
        )}
      </div>
    );
  }

  // ── Recording screen ───────────────────────────────────────────
  if (screen === 'recording') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Camera preview / audio visualization */}
        <div className="relative flex-1 flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden mx-4 mt-4">
          {recordingType === 'video' ? (
            <>
              <video
                ref={recorder.videoRef}
                playsInline
                muted
                className="hidden"
              />
              <canvas
                ref={recorder.canvasRef}
                className="w-full h-full object-cover"
                style={{ display: recorder.state.isRecording ? 'block' : 'none' }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full bg-sky-500/20"
                  style={{
                    transform: `scale(${1 + recorder.audioLevel * 0.5})`,
                    opacity: 0.3 + recorder.audioLevel * 0.4,
                  }}
                />
                <div
                  className="absolute inset-4 rounded-full bg-sky-500/30"
                  style={{
                    transform: `scale(${1 + recorder.audioLevel * 0.3})`,
                    opacity: 0.4 + recorder.audioLevel * 0.3,
                  }}
                />
                <div className="w-20 h-20 rounded-full bg-sky-500/40 flex items-center justify-center">
                  <Mic className="w-10 h-10 text-sky-300" />
                </div>
              </div>
              <p className="text-sm text-white/40">Listening...</p>
            </div>
          )}

          {/* Recording indicator */}
          {recorder.state.isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-white">
                {Math.floor(recorder.state.duration / 60)}:{(recorder.state.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Filter name badge */}
          {recordingType === 'video' && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="text-xs text-white/70">{selectedFilter.name}</span>
            </div>
          )}
        </div>

        {/* Filter selector (video only) */}
        {recordingType === 'video' && (
          <div className="px-4 mt-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Filter</p>
            <FilterSelector selectedFilter={selectedFilter} onSelect={setSelectedFilter} />
          </div>
        )}

        {/* Mood selector */}
        <div className="px-4 mt-3">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Mood</p>
          <MoodSelector selectedMood={selectedMood} onSelect={setSelectedMood} />
        </div>

        {/* Stop button */}
        <div className="flex items-center justify-center py-6">
          <button
            onClick={handleStop}
            disabled={!recorder.state.isRecording}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
          >
            <Square className="w-6 h-6 text-white" fill="white" />
          </button>
        </div>
      </div>
    );
  }

  // ── Review screen ──────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Preview */}
      <div className="relative flex-1 flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden mx-4 mt-4">
        {recordingType === 'video' && recordedUrl ? (
          <video
            ref={reviewVideoRef}
            src={recordedUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : recordedUrl ? (
          <div className="flex flex-col items-center gap-4 w-full px-8">
            <div className="w-24 h-24 rounded-full bg-sky-500/20 flex items-center justify-center">
              <Mic className="w-12 h-12 text-sky-400" />
            </div>
            <audio ref={reviewAudioRef} src={recordedUrl} controls className="w-full" />
          </div>
        ) : null}

        {/* Duration badge */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="text-xs font-mono text-white">
            {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* Filter badge */}
        {recordingType === 'video' && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Camera className="w-3 h-3 text-white/50" />
            <span className="text-xs text-white/70">{selectedFilter.name}</span>
          </div>
        )}
      </div>

      {/* Metadata review */}
      <div className="px-4 mt-4 space-y-3">
        {recordingType === 'video' && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Filter</p>
            <FilterSelector selectedFilter={selectedFilter} onSelect={setSelectedFilter} />
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Mood</p>
          <MoodSelector selectedMood={selectedMood} onSelect={setSelectedMood} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 py-6">
        <button
          onClick={handleDiscard}
          disabled={isSaving}
          className="flex flex-col items-center gap-1 disabled:opacity-30"
        >
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
            <Trash2 className="w-5 h-5 text-white/60" />
          </div>
          <span className="text-[10px] text-white/40">Discard</span>
        </button>

        <button
          onClick={handleRecordAgain}
          disabled={isSaving}
          className="flex flex-col items-center gap-1 disabled:opacity-30"
        >
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
            <RotateCcw className="w-5 h-5 text-white/60" />
          </div>
          <span className="text-[10px] text-white/40">Again</span>
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex flex-col items-center gap-1 disabled:opacity-30"
        >
          <div className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30">
            {isSaving ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-6 h-6 text-white" />
            )}
          </div>
          <span className="text-[10px] text-amber-400">{isSaving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>

      {saveError && (
        <div className="mx-4 mb-4 text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {saveError}
        </div>
      )}
    </div>
  );
}
