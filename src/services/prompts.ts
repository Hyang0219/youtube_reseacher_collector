// src/services/prompts.ts
import { RunMode } from '../types/aha';

interface ModeGuideline {
  backgroundNote: string;
  followUpNote: string;
  detailNote: string;
}

const MODE_GUIDELINES: Record<RunMode, ModeGuideline> = {
  baseline: {
    backgroundNote:
      'Deliver 3 concise bullet points anchored to definitions, minimal context, and why this observation matters to someone capturing it. Avoid speculation.',
    followUpNote:
      'Offer 3 curiosity-driven follow-up angles (questions or research directions) without heavy claims.',
    detailNote:
      'Pick 1–3 suggested_next_modes that feel most relevant to the transcript and intent. Provide short rerun prompts that reference the current intent or highlight what to focus on next.'
  },
  research: {
    backgroundNote:
      'Frame 3 bullets summarizing the research opportunity, focusing on the user intent (e.g., topics, sources, or hypotheses the user wants you to explore). Mention key trends, definitions, or frameworks that help you do that research.',
    followUpNote:
      'Generate 3 follow-up explorations that are themselves research directives (studies to read, sources to cross-check, angles to test) tied directly to the user intent.',
    detailNote:
      'No suggested_next_modes required unless it naturally arises.'
  },
  youtube: {
    backgroundNote:
      'Center 3 bullets on how to turn the insight plus user intent into audience-facing framing, hooks, or narrative gaps that match the requested tone.',
    followUpNote:
      'Offer 3 follow-ups that translate the intent into video angles, pacing ideas, call-to-action prompts, or scripting cues.',
    detailNote:
      'No suggested_next_modes required unless it naturally arises.'
  },
  investing: {
    backgroundNote:
      'Deliver 3 bullets that outline the investment hypothesis implied by the user intent, plus supporting context or signals that help evaluate that hypothesis.',
    followUpNote:
      'Provide 3 follow-ups listing metrics to monitor, hypotheses to falsify, and risks/opportunities tied to the intent (strictly as research questions, no advice).',
    detailNote:
      'No suggested_next_modes required unless it naturally arises.'
  },
  collector: {
    backgroundNote:
      'Capture 3 bullets turning the user intent into a mental model or checklist that catalogs the insight for future reference.',
    followUpNote:
      'Write 3 follow-ups that suggest practical experiments, reminders, or ways to weave the insight into a broader collection.',
    detailNote:
      'No suggested_next_modes required unless it naturally arises.'
  }
};

const SCHEMA_INSTRUCTIONS = `
Return a single JSON object that follows this schema precisely (no markdown, no explanation, no surrounding text):
{
  "schema_version": "1.0",
  "summary": string (one sentence),
  "capture": {
    "video": { "title": string, "channel": string|null, "url": string|null },
    "timestamp": { "start_s": number|null, "end_s": number|null },
    "context": { "transcript_excerpt": string, "language": string|null }
  },
  "runs": [
    {
      "run_mode": one of ["baseline","research","youtube","investing","collector"],
      "user_intent": { "text": string|null, "provided": boolean },
      "understanding": {
        "aha_summary": string (exactly one sentence),
        "aha_type": one of ["mental_model","tactic","explanation","prediction","warning","framework","definition","other"],
        "key_points": array of 2–4 short strings,
        "topics": array of 3–6 objects { "label": string, "confidence": number (0.0–1.0) },
        "entities": array of objects { "name": string, "type": one of ["person","company","product","concept","ticker","law","other"] },
        "claims": array of objects { "text": string, "claim_type": one of ["fact","opinion","forecast","causal"] },
        "confidence": one of ["high","medium","low"],
        "notes_ambiguities": array of strings (empty if none)
      },
      "baseline_enrichment": {
        "background_context": array of strings (counts vary per mode),
        "follow_up_explorations": array of strings (counts vary per mode)
      },
      "enhancement": {
        "suggested_next_modes": array of 1–3 run_mode values,
        "mode_rerun_prompts": array of objects { "mode": run_mode, "prompt": string }
      }
    }
  ]
}
`;

export const buildSystemPrompt = (mode: RunMode): string => {
  const guideline = MODE_GUIDELINES[mode];
  const modeReminder = mode === 'baseline'
    ? 'Suggested_next_modes should pick the most relevant 1–3 modes for further exploration.'
    : 'Suggested_next_modes may remain empty for this mode; focus on fulfilling the user intent.';
  return `
You are the intelligence layer of YouTube Aha Catcher. You MUST respond with a single JSON object that matches the schema below exactly. ${guideline.detailNote}

${SCHEMA_INSTRUCTIONS}

When the run_mode is "${mode}":
- ${guideline.backgroundNote}
- ${guideline.followUpNote}
- Keep the tone concise, factual, and helpful to the requested workflow.
- The "baseline_enrichment" fields should adapt to the mode expectations above.
- ${modeReminder}
- Mode rerun prompts should be short, actionable invites to rerun the analysis for that mode.

Do not explain your reasoning outside the JSON, and do not include extra fields.
`.trim();
};

export interface PromptContext {
  mode: RunMode;
  transcript: string;
  title: string;
  description: string | undefined;
  channel: string | null;
  url: string | null;
  timestamp: number;
  userIntent?: string | null;
  language?: string | null;
}

export const buildUserPrompt = (context: PromptContext): string => {
  const includeIntent = context.mode !== 'baseline' && Boolean(context.userIntent);
  const intentLine = includeIntent
    ? `User Intent (user-provided): "${context.userIntent}"`
    : 'User Intent: not provided.';
  const languageLine = context.language ? `Language cue: ${context.language}` : 'Language cue: not provided.';
  return `
Mode: ${context.mode}
${intentLine}
${languageLine}

Video Title: ${context.title}
Channel: ${context.channel ?? 'Unknown'}
URL: ${context.url ?? 'Unknown'}
Timestamp (seconds): ${context.timestamp.toFixed(2)}

Description: ${context.description?.slice(0, 400) ?? 'No description'}

Transcript excerpt (≈30s window):
${context.transcript || 'Transcript missing or empty.'}

Respond with the JSON schema declared in the system prompt, using the transcript and metadata above to fill each field.
${includeIntent ? 'The “User Intent” line above should guide any non-baseline modes so the enrichment aligns with what the user wants to explore next.' : ''}
If no intent text was provided, you may infer why the user saved it, but set user_intent.text to null and provided to false.
`.trim();
};
