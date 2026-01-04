// src/services/llm.ts
import { ApiSettings } from './storage';

type LLMResponse = {
  content: string;
};

export async function inferAhaMoment(transcript: string, title: string, settings: ApiSettings): Promise<{ summary: string; question: string }> {
  if (!settings.aiBuilderToken || !transcript) {
    const fallback = transcript ? transcript.slice(0, 160) : 'Captured a thought while watching a YouTube video.';
    return { summary: fallback, question: title || 'Describe the idea in one sentence.' };
  }

  try {
    const requestBody = {
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `The AI must intelligently infer the core Aha! moment and formulate a query for a relevant background search.
The result should be a concise note containing the original thought and the research query.
Format exactly:
Line 1: The Aha! moment
Line 2: The Search Query`
        },
        {
          role: 'user',
          content: `Transcript from "${title}":\n${transcript}`
        }
      ]
    };

    console.log('[YAC] LLM Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://space.ai-builders.com/backend/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.aiBuilderToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const payload = await response.json();
    console.log('[YAC] LLM Raw Response:', JSON.stringify(payload));

    const content = payload.choices?.[0]?.message?.content;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Empty or invalid content from LLM');
    }

    const lines = content.split('\n').filter((l: string) => l.trim().length > 0);
    
    // Improved parsing: handle cases where lines are missing or empty
    const summary = lines[0] ?? 'Captured insight.';
    const question = lines[1] ?? title ?? 'What is the main topic?';

    return {
      summary: summary.trim(),
      question: question.trim()
    };
  } catch (error) {
    console.warn('LLM call failed', error);
    return { summary: transcript.slice(0, 160) + '...', question: title || 'Key concept from transcript' };
  }
}
