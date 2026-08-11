import { api } from './api';

export interface AppSettings {
  keep_original_recordings: boolean;
}

export const settingsService = {
  async getAll(): Promise<AppSettings> {
    const raw = await api.get<Record<string, string>>('/settings');
    return {
      keep_original_recordings: raw.keep_original_recordings === 'true',
    };
  },

  async update(updates: Partial<AppSettings>): Promise<void> {
    const payload: Record<string, string> = {};
    if (updates.keep_original_recordings !== undefined) {
      payload.keep_original_recordings = String(updates.keep_original_recordings);
    }
    await api.patch('/settings', payload);
  },
};
