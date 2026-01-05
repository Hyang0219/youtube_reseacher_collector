// src/pages/popup/markdown.ts
import { Capture } from '../../services/storage';

export const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const buildCaptureMarkdown = (captures: Capture[], selectedIds: Set<string>): string => {
  if (captures.length === 0) {
    return '*No captures yet.*';
  }

  const targetCaptures =
    selectedIds.size > 0 ? captures.filter((capture) => selectedIds.has(capture.id)) : captures;

  if (targetCaptures.length === 0) {
    return '*No captures yet.*';
  }

  return targetCaptures
    .map((capture) => {
      return `## [${formatTimestamp(capture.timestamp)}] ${capture.videoTitle}
**URL:** ${capture.url}

**Transcript:**
> ${capture.transcript || '(No transcript available)'}

**Summary:**
${capture.summary}

**Enrichment/Intelligence:**
${capture.enrichment || 'N/A'}

---`;
    })
    .join('\n\n');
};
