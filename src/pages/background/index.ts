// src/pages/background/index.ts
import {
  Capture,
  loadCaptures,
  loadSettings,
  saveCaptures
} from '../../services/storage';
import { CapturePayload } from '../../services/youtube';
import { enrichWithSearch } from '../../services/search';
import { inferAhaMoment } from '../../services/llm';

const MAX_CAPTURES = 60;

const buildCapture = (payload: CapturePayload, note: string): Capture => ({
  id: `${payload.videoId ?? 'session'}-${Date.now()}`,
  timestamp: payload.timestamp,
  summary: note,
  videoTitle: payload.videoTitle,
  url: payload.videoUrl,
  enrichment: note,
  transcript: payload.transcript
});

const processCapture = async (payload: CapturePayload) => {
  console.info('🧠 [Debug] Received capture payload:', payload);
  const settings = await loadSettings();
  
  // Debug: Log settings loaded
  console.info('🧠 [Debug] Loaded settings. Has Token:', !!settings.aiBuilderToken);

  const aha = await inferAhaMoment(payload.transcript, settings);
  console.info('🧠 [Debug] LLM Result:', aha);

  const enrichment = await enrichWithSearch(aha.question ?? aha.summary, settings);
  
  const note = `${aha.summary}

${enrichment}`;
  const entry = buildCapture(payload, note);
  
  const existing = await loadCaptures();
  const next = [entry, ...existing].slice(0, MAX_CAPTURES);
  
  await saveCaptures(next);
  console.info('🧠 [Debug] Capture saved to storage. Total count:', next.length);
};

// Handle messages
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message?.type === 'CAPTURE_TRIGGERED' && message.payload) {
    void processCapture(message.payload as CapturePayload);
    sendResponse({ status: 'queued' });
    return true;
  }
  
  if (message?.type === 'FETCH_TRANSCRIPT' && message.url) {
    console.log('[Background] Proxying fetch for:', message.url);
    fetch(message.url)
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const text = await resp.text();
        try {
            return text ? JSON.parse(text) : null;
        } catch {
            return text; // Return raw text if not JSON (e.g. XML)
        }
      })
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        console.warn('[Background] Fetch failed:', error);
        sendResponse({ success: false, error: String(error) });
      });
    return true; 
  }
  
  return false;
});
