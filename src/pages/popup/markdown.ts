// src/pages/popup/markdown.ts
import { Capture } from '../../services/storage';
import { renderAhaMarkdown } from '../../services/templates';

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
    .map((capture) => renderAhaMarkdown(capture))
    .join('\n\n---\n\n');
};
