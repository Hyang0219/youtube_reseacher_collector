// src/services/llm.ts
import { ApiSettings } from './storage';

type LLMResponse = {
  content: string;
};

export async function inferAhaMoment(transcript: string, settings: ApiSettings): Promise<{ summary: string; question: string }> {
  if (!settings.aiBuilderToken || !transcript) {
    const fallback = transcript ? transcript.slice(0, 160) : 'Captured a thought while watching a YouTube video.';
    return { summary: fallback, question: 'Describe the idea in one sentence.' };
  }

  try {
    const response = await fetch('https://space.ai-builders.com/backend/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.aiBuilderToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek',
        messages: [
          {
            role: 'system',
            content: `You are an expert at capturing and summarizing ideas.
1. Analyze the provided Transcript.
2. Summarize the core "Aha!" moment or idea in ONE sentence.
3. Generate a relevant follow-up question/search query to learn more.
CRITICAL INSTRUCTION: You MUST write the summary and the question in the SAME LANGUAGE as the Transcript.
Format your response as exactly two lines:
Line 1: The Summary
Line 2: The Question`
          },
          {
            role: 'user',
            content: `Transcript:\n${transcript}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });
    
    const payload = await response.json();
    console.log('[YAC] LLM Raw Response:', JSON.stringify(payload));

    const content = payload.choices?.[0]?.message?.content ?? '';
    const lines = content.split('\n').filter((l: string) => l.trim().length > 0);
    
    // Improved parsing: handle cases where lines are missing or empty
    const summary = lines[0] ?? content ?? 'Captured insight.';
    const question = lines[1] ?? 'What should I explore next?';

    return {
      summary: summary.trim(),
      question: question.trim()
    };
  } catch (error) {
    console.warn('LLM call failed', error);
    return { summary: transcript.slice(0, 160), question: 'What should I explore about this topic?' };
  }
}
