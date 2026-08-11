import { api } from './api';
import type { DiaryEntry, RecordingType, ProcessingStatus, HindsightStatus } from './types';

export interface CreateEntryInput {
  recordingType: RecordingType;
  storageReference: string;
  duration: number;
  filterId: string | null;
  filterName: string | null;
  filterMood: string | null;
  userMood: string | null;
}

export const entryService = {
  async create(input: CreateEntryInput): Promise<DiaryEntry> {
    return api.post<DiaryEntry>('/entries', {
      recording_type: input.recordingType,
      storage_reference: input.storageReference,
      duration: input.duration,
      filter_id: input.filterId,
      filter_name: input.filterName,
      filter_mood: input.filterMood,
      user_mood: input.userMood,
    });
  },

  async getAll(): Promise<DiaryEntry[]> {
    return api.get<DiaryEntry[]>('/entries');
  },

  async getById(id: string): Promise<DiaryEntry | null> {
    try {
      return await api.get<DiaryEntry>(`/entries/${id}`);
    } catch {
      return null;
    }
  },

  async updateStatus(
    id: string,
    status: ProcessingStatus,
    additional?: Partial<DiaryEntry>,
  ): Promise<void> {
    await api.patch(`/entries/${id}`, {
      processing_status: status,
      ...additional,
    });
  },

  async updateHindsightStatus(
    id: string,
    status: HindsightStatus,
    reference: string | null,
  ): Promise<void> {
    await api.patch(`/entries/${id}`, {
      hindsight_status: status,
      hindsight_reference: reference,
    });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/entries/${id}`);
  },
};
