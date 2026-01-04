// src/services/storage.ts
export type Capture = {
  id: string;
  timestamp: number;
  summary: string;
  videoTitle: string;
  url: string;
  enrichment?: string;
  transcript?: string;
  status: 'pending' | 'completed' | 'failed';
};

export type ApiSettings = {
  aiBuilderToken?: string;
  targetLanguage?: 'original' | 'english';
  // Deprecated
  llmKey?: string;
  searchKey?: string;
};

const storage = chrome?.storage?.local;

export function loadCaptures(): Promise<Capture[]> {
  if (!storage) {
    return Promise.resolve([]);
  }
  return new Promise((resolve) => {
    storage.get('captures', (result) => {
      resolve(result.captures ?? []);
    });
  });
}

export function saveCaptures(captures: Capture[]): Promise<void> {
  if (!storage) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    storage.set({ captures }, () => resolve());
  });
}

export function loadSettings(): Promise<ApiSettings> {
  if (!storage) {
    return Promise.resolve({});
  }
  return new Promise((resolve) => {
    storage.get('apiSettings', (result) => {
      resolve(result.apiSettings ?? {});
    });
  });
}

export function saveSettings(settings: ApiSettings): Promise<void> {
  if (!storage) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    storage.set({ apiSettings: settings }, () => resolve());
  });
}

export function clearCaptures(): Promise<void> {
  if (!storage) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    storage.remove('captures', () => resolve());
  });
}
