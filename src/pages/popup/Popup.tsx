// src/pages/popup/Popup.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ApiSettings,
  Capture,
  clearCaptures,
  loadCaptures,
  loadSettings,
  saveCaptures,
  saveSettings
} from '../../services/storage';
import { buildCaptureMarkdown, formatTimestamp } from './markdown';

const defaultCapture: Capture = {
  id: 'placeholder',
  timestamp: 0,
  summary: 'No captures yet.',
  videoTitle: 'Waiting for the first idea',
  url: '',
  status: 'completed'
};

const Popup: React.FC = () => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [settings, setSettings] = useState<ApiSettings>({});
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCaptures().then(setCaptures);
    loadSettings().then((s) => {
        // Default to english if not set
        setSettings({ targetLanguage: 'english', ...s });
    });

    const storageChangeListener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'local' && changes.captures) {
        loadCaptures().then(setCaptures);
      }
    };

    chrome?.storage?.onChanged?.addListener(storageChangeListener);
    return () => {
      chrome?.storage?.onChanged?.removeListener?.(storageChangeListener);
    };
  }, []);

  const handleLanguageChange = (lang: 'original' | 'english') => {
      const updated = { 
          ...settings, 
          targetLanguage: lang
      };
      setSettings(updated);
      setSaving(true);
      saveSettings(updated).then(() => setSaving(false));
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const markdownDump = useMemo(() => buildCaptureMarkdown(captures, selectedIds), [captures, selectedIds]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdownDump);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownDump], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-ahas-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = async (key: keyof ApiSettings, value: any) => {
    const updated: ApiSettings = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    await saveSettings(updated);
    setSaving(false);
  };

  const handleClear = async () => {
    if (selectedIds.size > 0) {
        // Clear only selected
        const remaining = captures.filter(c => !selectedIds.has(c.id));
        // We need a way to save only remaining, but storage.ts only exposes 'saveCaptures' which overwrites.
        // Assuming 'saveCaptures' in storage.ts overwrites the whole list.
        await saveCaptures(remaining);
        setCaptures(remaining);
        setSelectedIds(new Set());
    } else {
        // Clear all
        await clearCaptures();
        setCaptures([]);
        setSelectedIds(new Set());
    }
  };

  return (
    <div className="w-[360px] p-4 space-y-4 text-sm">
      <header>
        <h1 className="text-lg font-semibold">YouTube Aha Catcher</h1>
        <p className="text-xs text-slate-300">Zero-friction captures, stored locally.</p>
      </header>

      <section className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            onClick={handleCopy}
          >
            {selectedIds.size > 0 ? `Copy (${selectedIds.size})` : 'Copy All'}
          </button>
          <button
            className="rounded-md bg-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            onClick={handleDownload}
          >
            {selectedIds.size > 0 ? `Download (${selectedIds.size})` : 'Download All'}
          </button>
          <button
            className="col-span-2 rounded-md border border-white/30 px-3 py-1 text-xs text-white"
            onClick={handleClear}
          >
            {selectedIds.size > 0 ? `Clear (${selectedIds.size})` : 'Clear All'}
          </button>
        </div>
        <span className="text-xs text-slate-400">
            {captures.length} capture(s) {selectedIds.size > 0 && `• ${selectedIds.size} selected`}
        </span>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</h2>
        
        <label className="flex flex-col text-xs">
          <span>AI Builder Token</span>
          <input
            className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
            type="password"
            placeholder="sk_..."
            value={settings.aiBuilderToken ?? ''}
            onChange={(event) => handleSaveSettings('aiBuilderToken', event.target.value)}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs">
            <span className="text-slate-300">Target Language</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="lang" 
                        checked={settings.targetLanguage === 'original'}
                        onChange={() => handleLanguageChange('original')}
                    />
                    <span>Original</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="lang" 
                        checked={settings.targetLanguage === 'english'}
                        onChange={() => handleLanguageChange('english')}
                    />
                    <span>English</span>
                </label>
            </div>
        </div>

        {saving && <p className="text-[10px] text-slate-400">Saving…</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Captured Moments</h2>
        {(captures.length === 0 ? [defaultCapture] : captures).map((capture) => (
          <article key={capture.id} className="rounded-md border border-white/15 bg-white/5 p-3 text-[11px] flex gap-2">
             {capture.id !== 'placeholder' && (
                <div className="pt-1">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.has(capture.id)}
                        onChange={() => toggleSelection(capture.id)}
                        className="cursor-pointer"
                    />
                </div>
             )}
            <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{formatTimestamp(capture.timestamp)}</span>
                <span className="truncate max-w-[150px]" title={capture.videoTitle}>{capture.videoTitle}</span>
                </div>
                {capture.status === 'pending' ? (
                    <div className="mt-1 flex items-center gap-2 text-yellow-400">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-[10px]">Analysing...</span>
                    </div>
                ) : capture.status === 'failed' ? (
                    <div className="mt-1 flex items-center gap-2 text-red-400">
                        <span className="text-[10px]">⚠ Processing Failed</span>
                    </div>
                ) : (
                    <p className="mt-1 text-[12px] leading-snug">{capture.summary}</p>
                )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default Popup;
