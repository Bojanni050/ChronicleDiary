import type { RecordingType } from './types';

const DB_NAME = 'chronicle-diary';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
  };
  return map[mimeType] ?? 'webm';
}

function buildStorageKey(recordingType: RecordingType, mimeType: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const entryId = crypto.randomUUID();
  const ext = getExtension(mimeType);
  return `chronicle-diary/${year}/${month}/${entryId}/original.${ext}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

interface StoredRecording {
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

export const storageService = {
  async saveLocal(
    blob: Blob,
    recordingType: RecordingType,
    mimeType: string,
  ): Promise<string> {
    const key = buildStorageKey(recordingType, mimeType);
    const db = await openDB();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredRecording = { blob, mimeType, createdAt: Date.now() };
      const request = store.put(record, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    return key;
  },

  async getLocal(key: string): Promise<Blob | null> {
    const db = await openDB();
    const record = await new Promise<StoredRecording | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record?.blob ?? null;
  },

  async getLocalUrl(key: string): Promise<string> {
    const blob = await this.getLocal(key);
    if (!blob) throw new Error('Recording not found on device');
    return URL.createObjectURL(blob);
  },

  async deleteLocal(key: string): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  },

  async existsLocal(key: string): Promise<boolean> {
    const db = await openDB();
    const exists = await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count(key);
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return exists;
  },
};
