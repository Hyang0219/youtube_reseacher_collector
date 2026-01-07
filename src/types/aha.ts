// src/types/aha.ts
export type RunMode = 'baseline' | 'research' | 'youtube' | 'investing' | 'collector';
export type AhaType = 'mental_model' | 'tactic' | 'explanation' | 'prediction' | 'warning' | 'framework' | 'definition' | 'other';
export type ClaimType = 'fact' | 'opinion' | 'forecast' | 'causal';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type EntityType = 'person' | 'company' | 'product' | 'concept' | 'ticker' | 'law' | 'other';

export interface TimestampRange {
  start_s: number | null;
  end_s: number | null;
}

export interface CaptureVideo {
  title: string;
  channel: string | null;
  url: string | null;
}

export interface CaptureContext {
  transcript_excerpt: string;
  language: string | null;
}

export interface UserIntent {
  text: string | null;
  provided: boolean;
}

export interface Topic {
  label: string;
  confidence: number;
}

export interface Entity {
  name: string;
  type: EntityType;
}

export interface Claim {
  text: string;
  claim_type: ClaimType;
}

export interface Understanding {
  aha_summary: string;
  aha_type: AhaType;
  key_points: string[];
  topics: Topic[];
  entities: Entity[];
  claims: Claim[];
  confidence: ConfidenceLevel;
  notes_ambiguities: string[];
}

export interface BaselineEnrichment {
  background_context: string[];
  follow_up_explorations: string[];
}

export interface ModeRerunPrompt {
  mode: RunMode;
  prompt: string;
}

export interface Enhancement {
  suggested_next_modes: RunMode[];
  mode_rerun_prompts: ModeRerunPrompt[];
}

export interface AnalysisRun {
  run_mode: RunMode;
  user_intent: UserIntent;
  understanding: Understanding;
  baseline_enrichment: BaselineEnrichment;
  enhancement: Enhancement;
}

export interface StructuredAnalysis {
  schema_version: '1.0';
  summary: string;
  capture: {
    video: CaptureVideo;
    timestamp: TimestampRange;
    context: CaptureContext;
  };
  runs: AnalysisRun[];
}
