// src/services/templates.ts
import { Capture } from './storage';

const formatList = (items: string[] | undefined): string => {
  const list = items?.length ? items : ['(No items provided)'];
  return list.map((item) => `- ${item}`).join('\n');
};

export function renderAhaMarkdown(capture: Capture): string {
  const data = capture.structuredAnalysis;
  if (!data) {
    return '# Aha Moment\n\n*No structured analysis available.*';
  }

  const title =
    data.capture.video.title || capture.videoTitle || 'Untitled video';
  const channel =
    data.capture.video.channel || capture.channelName || 'Unknown channel';
  const transcript =
    data.capture.context.transcript_excerpt?.trim() || 'Transcript not available';

  const sourceBlock = [
    '**Source**',
    `- Video: ${title}`,
    `- Channel: ${channel}`,
    `- Transcript: ${transcript}`
  ].join('\n');

  const runSections = data.runs
    .map((run, index) => {
      const intent = run.user_intent?.text ?? 'Not Provided';
      return [
        `## Mode ${index + 1}: ${run.run_mode}`,
        `**User intent:** ${intent}`,
        '**Summary**',
        `> ${run.understanding.aha_summary}`,
        '',
        '**Background & Context**',
        formatList(run.baseline_enrichment.background_context),
        '',
        '**Follow-up Explorations**',
        formatList(run.baseline_enrichment.follow_up_explorations)
      ].join('\n');
    })
    .join('\n\n');

  return `# Aha Moment

${sourceBlock}

${runSections}`;
}
