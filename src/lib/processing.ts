import type { ProcessEntryResponse } from './types';
import { api } from './api';

export const processingService = {
  async startProcessing(entryId: string, recordingBlob?: Blob): Promise<ProcessEntryResponse> {
    if (recordingBlob) {
      const arrayBuffer = await recordingBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return api.post<ProcessEntryResponse>('/process', {
        entryId,
        recordingBase64: base64,
      });
    }

    return api.post<ProcessEntryResponse>('/process', { entryId });
  },
};
