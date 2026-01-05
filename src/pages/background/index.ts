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

const buildCapture = (
  payload: CapturePayload,
  summary: string,
  enrichment: string,
  status: 'pending' | 'completed' | 'failed',
  id?: string
): Capture => ({
  id: id || `${payload.videoId ?? 'session'}-${Date.now()}`,
  timestamp: payload.timestamp,
  summary: summary,
  videoTitle: payload.videoTitle,
  url: payload.videoUrl,
  enrichment: enrichment,
  transcript: payload.transcript,
  status: status
});

const processCapture = async (payload: CapturePayload) => {
  console.info('🧠 [Debug] Received capture payload:', payload);
  
  // 1. Save Pending State
  const pendingId = `${payload.videoId ?? 'session'}-${Date.now()}`;
  const pendingEntry = buildCapture(payload, 'Processing...', 'Waiting for AI intelligence...', 'pending', pendingId);
  
  let existing = await loadCaptures();
  let next = [pendingEntry, ...existing].slice(0, MAX_CAPTURES);
  await saveCaptures(next);
  console.info('🧠 [Debug] Saved PENDING capture.');

  try {
    const settings = await loadSettings();
    
    // Debug: Log settings loaded
    console.info('🧠 [Debug] Loaded settings. Has Token:', !!settings.aiBuilderToken);

    const aha = await inferAhaMoment(payload.transcript, payload.videoTitle, payload.videoDescription, settings);
    console.info('🧠 [Debug] LLM Result:', aha);

    // Skip Web Search (User requested removal of raw search results)
    // const searchResults = await enrichWithSearch(aha.question ?? aha.summary, settings, payload.videoUrl);
    
    // Just use the AI Analysis
    const fullEnrichment = aha.analysis;
    
    // 2. Update to Completed State
    const completedEntry = buildCapture(payload, aha.summary, fullEnrichment, 'completed', pendingId);
    
    // Reload captures to avoid race conditions (in case user deleted something while processing)
    existing = await loadCaptures();
    
    // Replace the pending entry with the completed one
    next = existing.map(c => c.id === pendingId ? completedEntry : c);
    
    // If somehow the pending entry was deleted, prepend the new one
    if (!next.find(c => c.id === pendingId)) {
        next = [completedEntry, ...next].slice(0, MAX_CAPTURES);
    }
    
    await saveCaptures(next);
    console.info('🧠 [Debug] Updated capture to COMPLETED.');
  } catch (error) {
      console.error('🧠 [Debug] Processing failed:', error);
      const failedEntry = buildCapture(payload, 'Processing Failed', String(error), 'failed', pendingId);
      
      existing = await loadCaptures();
      next = existing.map(c => c.id === pendingId ? failedEntry : c);
      await saveCaptures(next);
  }
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
