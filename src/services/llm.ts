// src/services/llm.ts
import { ApiSettings } from './storage';
import { CapturePayload } from './youtube';
import { buildSystemPrompt, buildUserPrompt, PromptContext } from './prompts';
import { RunMode, StructuredAnalysis, AnalysisRun, Claim, ClaimType, Entity, EntityType, Topic } from '../types/aha';

const MAX_EXCERPT_CHARS = 1200;
const JSON_ENDPOINT = 'https://space.ai-builders.com/backend/v1/chat/completions';

const NEXT_MODE_SUGGESTIONS: Record<RunMode, RunMode[]> = {
  baseline: ['research', 'collector'],
  research: ['investing', 'baseline'],
  youtube: ['baseline', 'collector'],
  investing: ['research', 'baseline'],
  collector: ['research', 'youtube']
};

const selectModel = (language?: string): string => (language === 'english' ? 'gemini-3-flash-preview' : 'deepseek');

export type InsightOptions = {
  mode?: RunMode;
  userIntent?: string | null;
};

export async function generateInsight(
  payload: CapturePayload,
  settings: ApiSettings,
  options: InsightOptions = {}
): Promise<StructuredAnalysis> {
  const mode: RunMode = options.mode ?? 'baseline';
  const userIntent = options.userIntent?.trim() || null;
  const transcript = (payload.transcript ?? '').trim();
  const transcriptExcerpt = transcript.slice(0, MAX_EXCERPT_CHARS);
  const timestampWindow = {
    start: Math.max(0, payload.timestamp - 30),
    end: payload.timestamp
  };
  const languageCue = settings.targetLanguage ?? null;

  const promptContext: PromptContext = {
    mode,
    transcript: transcriptExcerpt,
    title: payload.videoTitle,
    description: payload.videoDescription,
    channel: payload.channelName ?? null,
    url: payload.videoUrl ?? null,
    timestamp: payload.timestamp,
    userIntent,
    language: languageCue
  };

  if (!settings.aiBuilderToken) {
    return buildFallbackStructuredAnalysis(payload, mode, userIntent, transcriptExcerpt, timestampWindow, languageCue);
  }

  const requestBody = {
    model: selectModel(settings.targetLanguage),
    messages: [
      { role: 'system', content: buildSystemPrompt(mode) },
      { role: 'user', content: buildUserPrompt(promptContext) }
    ]
  };

  try {
    console.log('[YAC] LLM Request Body:', JSON.stringify(requestBody, null, 2));
    const response = await fetch(JSON_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.aiBuilderToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const rawPayload = await response.json();
    console.log('[YAC] LLM Raw Response:', JSON.stringify(rawPayload));
    const content = rawPayload.choices?.[0]?.message?.content ?? '';
    const parsed = parseStructuredAnalysis(content);
    const normalized = normalizeStructuredAnalysis(
      parsed,
      payload,
      mode,
      userIntent,
      transcriptExcerpt,
      timestampWindow,
      languageCue
    );
    return normalized;
  } catch (error) {
    console.warn('LLM call failed', error);
    return buildFallbackStructuredAnalysis(payload, mode, userIntent, transcriptExcerpt, timestampWindow, languageCue);
  }
}

const extractJsonBlock = (text: string): string => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
};

const parseStructuredAnalysis = (text: string): StructuredAnalysis => {
  const normalizedText = extractJsonBlock(text.trim());
  const parsed = JSON.parse(normalizedText);
  if (!isStructuredAnalysis(parsed)) {
    throw new Error('Parsed object does not match StructuredAnalysis schema.');
  }
  return parsed;
};

const isStructuredAnalysis = (candidate: unknown): candidate is StructuredAnalysis => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  const typed = candidate as Partial<StructuredAnalysis>;
  if (
    typed.schema_version !== '1.0' ||
    typeof typed.summary !== 'string' ||
    !typed.capture ||
    !typed.runs ||
    !Array.isArray(typed.runs) ||
    typed.runs.length === 0
  ) {
    return false;
  }
  const run = typed.runs[0];
  return (
    typeof run.run_mode === 'string' &&
    run.user_intent !== undefined &&
    run.understanding !== undefined &&
    Array.isArray(run.understanding.key_points) &&
    run.understanding.key_points.length >= 2 &&
    typeof run.understanding.aha_summary === 'string' &&
    Array.isArray(run.baseline_enrichment?.background_context) &&
    Array.isArray(run.baseline_enrichment?.follow_up_explorations)
  );
};

const normalizeStructuredAnalysis = (
  analysis: StructuredAnalysis,
  payload: CapturePayload,
  mode: RunMode,
  userIntent: string | null,
  transcriptExcerpt: string,
  timestampWindow: { start: number; end: number },
  languageCue: string | null
): StructuredAnalysis => {
  const videoTitle = analysis.capture.video.title || payload.videoTitle || 'YouTube Video';
  const channel = analysis.capture.video.channel ?? payload.channelName ?? null;
  const url = analysis.capture.video.url ?? payload.videoUrl ?? null;
  const start = analysis.capture.timestamp.start_s ?? timestampWindow.start;
  const end = analysis.capture.timestamp.end_s ?? timestampWindow.end;
  const contextTranscript =
    analysis.capture.context.transcript_excerpt || transcriptExcerpt || '';
  const contextLanguage = analysis.capture.context.language ?? languageCue ?? null;

  return {
    ...analysis,
    schema_version: '1.0',
    summary:
      analysis.summary ||
      analysis.runs?.[0]?.understanding.aha_summary ||
      'Captured insight from YouTube.',
    capture: {
      video: { title: videoTitle, channel, url },
      timestamp: { start_s: start, end_s: end },
      context: { transcript_excerpt: contextTranscript, language: contextLanguage }
    },
    runs: analysis.runs.map((run) => normalizeRun(run, mode, userIntent))
  };
};

const normalizeRun = (run: AnalysisRun, mode: RunMode, userIntent: string | null): AnalysisRun => {
  const intentProvided =
    typeof run.user_intent?.provided === 'boolean' ? run.user_intent.provided : Boolean(userIntent);
  return {
    ...run,
    run_mode: run.run_mode ?? mode,
    user_intent: {
      text: run.user_intent?.text ?? userIntent,
      provided: intentProvided
    }
  };
};

const buildFallbackStructuredAnalysis = (
  payload: CapturePayload,
  mode: RunMode,
  userIntent: string | null,
  transcriptExcerpt: string,
  timestampWindow: { start: number; end: number },
  languageCue: string | null
): StructuredAnalysis => {
  const summarySource =
    payload.transcript?.split('\n')[0] ||
    payload.videoTitle ||
    'Captured insight from YouTube.';
  const summary = summarySource.length > 200 ? `${summarySource.slice(0, 200)}...` : summarySource;
  const keyPoints = [
    summary,
    payload.videoTitle ? `Idea appeared in "${payload.videoTitle}".` : 'Idea captured during video watching.',
    payload.channelName ? `Channel: ${payload.channelName}.` : 'Channel information unavailable.'
  ].slice(0, 3);
  const topics: Topic[] = [
    { label: payload.videoTitle || 'YouTube idea', confidence: 0.6 },
    { label: payload.channelName || 'Unknown channel', confidence: 0.45 },
    { label: 'Transcript highlight', confidence: 0.35 },
    ...(payload.videoDescription
      ? [{ label: 'Video description', confidence: 0.3 }]
      : [])
  ].slice(0, 4);
  const entities: Entity[] = [
    ...(payload.channelName ? [{ name: payload.channelName, type: 'person' as EntityType }] : []),
    ...(payload.videoTitle ? [{ name: payload.videoTitle, type: 'product' as EntityType }] : []),
    { name: 'YouTube', type: 'concept' as EntityType }
  ];
  const claims: Claim[] = [
    { text: summary, claim_type: 'opinion' as ClaimType },
    ...(payload.videoDescription ? [{ text: payload.videoDescription, claim_type: 'fact' as ClaimType }] : [])
  ];
  const backgroundContext = [
    payload.videoDescription
      ? `Video description snippet: ${payload.videoDescription.slice(0, 120)}`
      : 'Context drawn from the captured video window.',
    `Timestamp window: ${timestampWindow.start.toFixed(1)}s–${timestampWindow.end.toFixed(1)}s.`,
    `Channel reference: ${payload.channelName ?? 'Unknown channel'}.`
  ];
  const followUpExplorations = [
    'Verify the definition of the core term by checking the video description or related notes.',
    'Search for commentary that echoes the same concept before leaning on it.',
    'Summarize the idea in your own words to ensure comprehension.',
    'Note any related mental models or frameworks that feel adjacent.'
  ];
  const suggestedModes = NEXT_MODE_SUGGESTIONS[mode] ?? ['baseline'];
  const rerunPrompts = suggestedModes.map((nextMode) => ({
    mode: nextMode,
    prompt: `Rerun in ${nextMode} mode${userIntent ? ` with intent "${userIntent}"` : ''}.`
  }));
  const run: AnalysisRun = {
    run_mode: mode,
    user_intent: {
      text: userIntent,
      provided: Boolean(userIntent)
    },
    understanding: {
      aha_summary: summary,
      aha_type: 'other',
      key_points: keyPoints,
      topics,
      entities,
      claims,
      confidence: 'medium',
      notes_ambiguities: []
    },
    baseline_enrichment: {
      background_context: backgroundContext,
      follow_up_explorations: followUpExplorations
    },
    enhancement: {
      suggested_next_modes: suggestedModes.slice(0, 3),
      mode_rerun_prompts: rerunPrompts
    }
  };

  return {
    schema_version: '1.0',
    summary,
    capture: {
      video: {
        title: payload.videoTitle,
        channel: payload.channelName ?? null,
        url: payload.videoUrl ?? null
      },
      timestamp: {
        start_s: timestampWindow.start,
        end_s: timestampWindow.end
      },
      context: {
        transcript_excerpt: transcriptExcerpt,
        language: languageCue
      }
    },
    runs: [run]
  };
};
