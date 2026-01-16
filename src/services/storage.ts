// src/services/storage.ts
import { RunMode, StructuredAnalysis } from '../types/aha';

export type Capture = {
  id: string;
  timestamp: number;
  summary: string;
  videoTitle: string;
  url: string;
  videoDescription?: string;
  videoId?: string;
  channelName?: string | null;
  enrichment?: string;
  transcript?: string;
  status: 'pending' | 'completed' | 'failed';
  structuredAnalysis?: StructuredAnalysis;
  userIntent?: string;
  mode?: RunMode;
};

export type LegacyProviderKey = 'ai-builder' | 'openai' | 'gemini';
export type ProviderOption = 'ai-builder';

export type ApiSettings = {
  provider?: ProviderOption;
  tokens?: Partial<Record<LegacyProviderKey, string>>;
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
    storage.get<{ captures?: Capture[] }>({ captures: [] }, (result) => {
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
