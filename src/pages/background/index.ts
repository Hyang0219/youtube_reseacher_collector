// src/pages/background/index.ts
import {
  Capture,
  loadCaptures,
  loadSettings,
  saveCaptures
} from '../../services/storage';
import { CapturePayload } from '../../services/youtube';
import { generateInsight } from '../../services/llm';
import { RunMode, StructuredAnalysis } from '../../types/aha';

const MAX_CAPTURES = 60;

type ProcessCaptureOptions = {
  captureId?: string;
  mode?: RunMode;
  userIntent?: string | null;
  enrichmentOverride?: string;
};

const buildCapture = (
  payload: CapturePayload,
  summary: string,
  structuredAnalysis: StructuredAnalysis | null,
  status: 'pending' | 'completed' | 'failed',
  options: ProcessCaptureOptions = {}
): Capture => {
  const enrichment =
    options.enrichmentOverride ??
    structuredAnalysis?.runs?.[0]?.baseline_enrichment.background_context
      .slice(0, 2)
      .join('\n') ??
    'Enrichment pending.';

  return {
    id: options.captureId || `${payload.videoId ?? 'session'}-${Date.now()}`,
    timestamp: payload.timestamp,
    summary,
    videoTitle: payload.videoTitle,
    videoDescription: payload.videoDescription,
    videoId: payload.videoId,
    channelName: payload.channelName ?? null,
    url: payload.videoUrl,
    transcript: payload.transcript,
    enrichment,
    status,
    structuredAnalysis: structuredAnalysis ?? undefined,
    mode: options.mode,
    userIntent: options.userIntent ?? undefined
  };
};

const mergeAnalysisRun = (
  existing: StructuredAnalysis | undefined,
  incoming: StructuredAnalysis
): StructuredAnalysis => {
  if (!existing) {
    return incoming;
  }
  const newRun = incoming.runs[0];
  return {
    ...existing,
    runs: [...existing.runs, newRun]
  };
};

const processCapture = async (payload: CapturePayload, options: ProcessCaptureOptions = {}) => {
  console.info('🧠 [Debug] Received capture payload:', payload);
  const mode = options.mode ?? 'baseline';
  const userIntent = options.userIntent?.trim() || null;
  const captureId = options.captureId || `${payload.videoId ?? 'session'}-${Date.now()}`;

  let existing = await loadCaptures();
  const existingCapture = existing.find((capture) => capture.id === captureId);
  const pendingSummary = existingCapture?.summary ?? 'Processing...';
  const pendingAnalysis = existingCapture?.structuredAnalysis ?? null;

  const pendingEntry = buildCapture(payload, pendingSummary, pendingAnalysis, 'pending', {
    ...options,
    captureId,
    mode,
    userIntent,
    enrichmentOverride: existingCapture ? undefined : 'Waiting for AI intelligence...'
  });

  const pendingList = [pendingEntry, ...existing.filter((capture) => capture.id !== captureId)];
  await saveCaptures(pendingList.slice(0, MAX_CAPTURES));
  console.info('🧠 [Debug] Saved PENDING capture.');

  try {
    const settings = await loadSettings();
    const provider = settings.provider ?? 'ai-builder';
    const tokenAvailable = Boolean(settings.tokens?.[provider]);
    console.info('🧠 [Debug] Loaded settings. Provider:', provider, 'Token set:', tokenAvailable);

    const insight = await generateInsight(payload, settings, { mode, userIntent });
    console.info('🧠 [Debug] LLM Result:', insight);

    const mergedAnalysis = mergeAnalysisRun(existingCapture?.structuredAnalysis, insight);
    const completedSummary = existingCapture?.summary ?? mergedAnalysis.summary;
    const completedEntry = buildCapture(payload, completedSummary, mergedAnalysis, 'completed', {
      ...options,
      captureId,
      mode,
      userIntent
    });

    existing = await loadCaptures();
    const completedList = existing.map((capture) => (capture.id === captureId ? completedEntry : capture));
    if (!completedList.find((capture) => capture.id === captureId)) {
      completedList.unshift(completedEntry);
    }

    await saveCaptures(completedList.slice(0, MAX_CAPTURES));
    console.info('🧠 [Debug] Updated capture to COMPLETED.');
  } catch (error) {
    console.error('🧠 [Debug] Processing failed:', error);
    const failedEntry = buildCapture(payload, existingCapture?.summary ?? 'Processing Failed', pendingAnalysis, 'failed', {
      ...options,
      captureId,
      mode,
      userIntent,
      enrichmentOverride: `Error: ${String(error)}`
    });

    existing = await loadCaptures();
    const failureList = existing.map((capture) => (capture.id === captureId ? failedEntry : capture));
    await saveCaptures(failureList.slice(0, MAX_CAPTURES));
  }
};

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message?.type === 'CAPTURE_TRIGGERED' && message.payload) {
    void processCapture(message.payload as CapturePayload);
    sendResponse({ status: 'queued' });
    return true;
  }

  if (message?.type === 'REFINE_CAPTURE' && message.payload) {
    const mode = (message.mode as RunMode) ?? 'baseline';
    const userIntent = typeof message.userIntent === 'string' ? message.userIntent : null;
    void processCapture(message.payload as CapturePayload, {
      captureId: message.captureId,
      mode,
      userIntent
    });
    sendResponse({ status: 'refining' });
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
          return text;
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
