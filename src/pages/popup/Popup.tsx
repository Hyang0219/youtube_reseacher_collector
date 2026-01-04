// src/pages/popup/Popup.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ApiSettings,
  Capture,
  clearCaptures,
  loadCaptures,
  loadSettings,
  saveSettings
} from '../../services/storage';

const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const defaultCapture: Capture = {
  id: 'placeholder',
  timestamp: 0,
  summary: 'No captures yet.',
  videoTitle: 'Waiting for the first idea',
  url: ''
};

const Popup: React.FC = () => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [settings, setSettings] = useState<ApiSettings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCaptures().then(setCaptures);
    loadSettings().then(setSettings);

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

  const markdownDump = useMemo(() => {
    if (captures.length === 0) {
      return '*No captures yet.*';
    }
    return captures
      .map((capture) => {
        return `## [${formatTimestamp(capture.timestamp)}] ${capture.videoTitle}
**URL:** ${capture.url}

**Summary:**
${capture.summary}

**Enrichment/Intelligence:**
${capture.enrichment || 'N/A'}

**Transcript:**
> ${capture.transcript || '(No transcript available)'}

---`;
      })
      .join('\n\n');
  }, [captures]);

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

  const handleSaveSettings = async (key: keyof ApiSettings, value: string) => {
    const updated: ApiSettings = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    await saveSettings(updated);
    setSaving(false);
  };

  const handleClear = async () => {
    await clearCaptures();
    setCaptures([]);
  };

  return (
    <div className="w-[360px] p-4 space-y-4 text-sm">
      <header>
        <h1 className="text-lg font-semibold">YouTube Aha Catcher</h1>
        <p className="text-xs text-slate-300">Zero-friction captures, stored locally.</p>
      </header>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            className="flex-1 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            onClick={handleCopy}
          >
            Copy MD
          </button>
          <button
            className="flex-1 rounded-md bg-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            onClick={handleDownload}
          >
            Download
          </button>
          <button
            className="rounded-md border border-white/30 px-3 py-1 text-xs text-white"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
        <span className="text-xs text-slate-400">{captures.length} capture(s)</span>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Debug/Test
        </h2>
        <button
          className="w-full rounded-md border border-white/30 px-3 py-2 text-xs text-white"
          onClick={async () => {
            const testPayload = {
              videoTitle: 'Test Video',
              videoUrl: 'https://www.youtube.com/watch?v=test',
              timestamp: 42,
              transcript: 'This is a test context to verify capture flows.',
              videoId: 'test'
            };
            console.info('🧪 [Debug] Sending test capture:', testPayload);
            chrome.runtime.sendMessage(
              { type: 'CAPTURE_TRIGGERED', payload: testPayload },
              (response) => {
                console.info('🧪 [Debug] sendMessage response', response);
                loadCaptures().then(setCaptures);
              }
            );
          }}
        >
          Send Debug Capture
        </button>
        <p className="text-[10px] text-slate-500">
          This button sends a synthetic capture so you can verify the workflow end-to-end
          with console logs.
        </p>
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
        {saving && <p className="text-[10px] text-slate-400">Saving…</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Captured Moments</h2>
        {(captures.length === 0 ? [defaultCapture] : captures).map((capture) => (
          <article key={capture.id} className="rounded-md border border-white/15 bg-white/5 p-3 text-[11px]">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{formatTimestamp(capture.timestamp)}</span>
              <span>{capture.videoTitle}</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug">{capture.summary}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default Popup;
