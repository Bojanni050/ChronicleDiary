import type { RecordingType } from './types';

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  duration: number;
}

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  static getSupportedMimeType(type: RecordingType): string {
    const candidates = type === 'video'
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

    for (const mime of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return type === 'video' ? 'video/webm' : 'audio/webm';
  }
}

export const recordingService = new RecordingService();
