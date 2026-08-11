import { useRef, useState, useCallback, useEffect } from 'react';
import type { RecordingType, FilterPreset } from '@/lib/types';
import { applyBeautyFilter } from '@/lib/beautyFilters';

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

interface UseRecorderResult {
  state: RecorderState;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioLevel: number;
  startRecording: (type: RecordingType, filter: FilterPreset) => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string; duration: number } | null>;
  discardRecording: () => void;
}

const PREFERRED_VIDEO_MIME = 'video/webm;codecs=vp9,opus';
const PREFERRED_AUDIO_MIME = 'audio/webm;codecs=opus';

function getSupportedMime(type: RecordingType): string {
  const candidates = type === 'video'
    ? [PREFERRED_VIDEO_MIME, 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : [PREFERRED_AUDIO_MIME, 'audio/webm', 'audio/mp4', 'audio/ogg'];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return type === 'video' ? 'video/webm' : 'audio/webm';
}

export function useRecorder(): UseRecorderResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentFilterRef = useRef<FilterPreset | null>(null);
  const recordingTypeRef = useRef<RecordingType>('audio');

  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });
  const [audioLevel, setAudioLevel] = useState(0);

  const drawVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const filter = currentFilterRef.current;
    if (filter?.beauty) {
      applyBeautyFilter(ctx, video, canvas.width, canvas.height, filter.beauty);
    } else if (filter && filter.cssFilter !== 'none') {
      ctx.filter = filter.cssFilter;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    animationFrameRef.current = requestAnimationFrame(drawVideoFrame);
  }, []);

  const updateAudioLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    setAudioLevel(Math.min(average / 128, 1));
  }, []);

  const startRecording = useCallback(async (type: RecordingType, filter: FilterPreset) => {
    setState({ isRecording: false, isPaused: false, duration: 0, error: null });
    chunksRef.current = [];
    currentFilterRef.current = filter;
    recordingTypeRef.current = type;

    try {
      const constraints: MediaStreamConstraints = type === 'video'
        ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
        : { video: false, audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (type === 'video') {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          requestAnimationFrame(drawVideoFrame);
        }
      }

      // Audio analysis for level visualization
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        intervalRef.current = setInterval(updateAudioLevel, 100);
      }

      // For video with beauty filters, record from canvas; otherwise record from stream
      let recordStream: MediaStream;
      if (type === 'video' && filter.beauty) {
        const canvas = canvasRef.current;
        if (canvas && canvas.captureStream) {
          const canvasStream = canvas.captureStream(30);
          // Add audio track from the original stream
          const audioTracks = stream.getAudioTracks();
          audioTracks.forEach((track) => canvasStream.addTrack(track));
          recordStream = canvasStream;
        } else {
          recordStream = stream;
        }
      } else if (type === 'video' && filter.cssFilter !== 'none') {
        const canvas = canvasRef.current;
        if (canvas && canvas.captureStream) {
          const canvasStream = canvas.captureStream(30);
          // Add audio track from the original stream
          const audioTracks = stream.getAudioTracks();
          audioTracks.forEach((track) => canvasStream.addTrack(track));
          recordStream = canvasStream;
        } else {
          recordStream = stream;
        }
      } else {
        recordStream = stream;
      }

      const mimeType = getSupportedMime(type);
      const recorder = new MediaRecorder(recordStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000);
      startTimeRef.current = Date.now();
      setState({ isRecording: true, isPaused: false, duration: 0, error: null });

      // Duration counter
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      setState({ isRecording: false, isPaused: false, duration: 0, error: message });
    }
  }, [drawVideoFrame, updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<{ blob: Blob; mimeType: string; duration: number } | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return null;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = durationRef.current;

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);

        setState({ isRecording: false, isPaused: false, duration: 0, error: null });
        resolve({ blob, mimeType, duration });
      };

      durationRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
      recorder.stop();
    });
  }, []);

  const discardRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    chunksRef.current = [];
    setAudioLevel(0);
    setState({ isRecording: false, isPaused: false, duration: 0, error: null });
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return {
    state,
    videoRef,
    canvasRef,
    audioLevel,
    startRecording,
    stopRecording,
    discardRecording,
  };
}
