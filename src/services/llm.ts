// src/services/llm.ts
import { ApiSettings } from './storage';

type LLMResponse = {
  content: string;
};

export async function inferAhaMoment(transcript: string, title: string, description: string | undefined, settings: ApiSettings): Promise<{ summary: string; analysis: string; question: string }> {
  if (!settings.aiBuilderToken || !transcript) {
    const fallback = transcript ? transcript.slice(0, 160) : 'Captured a thought while watching a YouTube video.';
    return { summary: fallback, analysis: 'No analysis available.', question: title || 'Describe the idea in one sentence.' };
  }

  // Consolidated Model Configuration
  // English -> gemini-2.5-pro
  // Original/Other -> deepseek
  const model = settings.targetLanguage === 'english' ? 'gemini-2.5-pro' : 'deepseek';

  try {
    const languageInstruction = settings.targetLanguage === 'english'
        ? "CRITICAL: You MUST write the Aha! moment and Search Query in ENGLISH, even if the transcript is in another language."
        : "You MUST write the Aha! moment and Search Query in the SAME LANGUAGE as the transcript.";

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are an assistant for a tool called YouTube Aha Moment Capturer.

Input:
A short transcript excerpt (≈30 seconds before capture)
Video metadata (title, channel, optional description)

Your tasks are to:
1. Infer the core “Aha!” moment — the central insight, mental model, or realization implied by the transcript.
2. Summarize the Aha! moment in one brief sentence, preserving the original meaning and intent.
3. Identify the underlying topic or concept (e.g., technology trend, business strategy, scientific idea).
4. Conduct background reasoning to surface relevant:
   - Key concepts or definitions
   - Recent developments, news, or trends
   - Related frameworks, debates, or applications

${languageInstruction}

Return the result in the following structured format (Keep the headers exactly as written below):
**Aha Moment:** [One-sentence summary]
**Core Topic:** [Primary concept or theme]
**Background & Context:** [2–4 bullet points explaining relevant background]
**Follow-up Exploration:** [2–3 suggested angles for further research]

Prioritize clarity, factual grounding, and usefulness for research or content ideation. Avoid fluff.`
        },
        {
          role: 'user',
          content: `Video Title: "${title}"
Video Description: "${description || 'N/A'}"

Transcript:
${transcript}`
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
    
    let summary = '';
    let question = '';
    const analysisLines: string[] = [];
    
    lines.forEach(line => {
        if (line.startsWith('Aha Moment:') || line.startsWith('**Aha Moment:**')) {
            summary = line.replace(/\**Aha Moment:\** ?/, '').trim();
        } else if (line.startsWith('Search Query:') || line.startsWith('**Search Query:**')) {
            question = line.replace(/\**Search Query:\** ?/, '').trim();
        } else {
            // Collect everything else (Core Topic, Background, Follow-up) into analysis
            analysisLines.push(line);
        }
    });

    // Fallbacks
    if (!summary) summary = lines[0] || 'Captured insight.';
    if (!question) question = title || 'Topic search';

    return {
      summary: summary.trim(),
      analysis: analysisLines.join('\n').trim(),
      question: question.trim()
    };
  } catch (error) {
    console.warn('LLM call failed', error);
    return { summary: transcript.slice(0, 160) + '...', analysis: 'Analysis failed.', question: title || 'Key concept from transcript' };
  }
}
