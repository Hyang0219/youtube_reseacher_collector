// tests/captureContext.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as youtube from '../src/services/youtube';

describe('fetchTranscript fallbacks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers innertube events when present', async () => {
    const innertubeEvents = [{ tStartMs: 1000 }];
    const innertubeSpy = vi
      .spyOn(youtube.transcriptSources, 'innertube')
      .mockResolvedValue({ events: innertubeEvents, captionTracks: [] });
    const captionSpy = vi.spyOn(youtube.transcriptSources, 'captionTrack').mockResolvedValue([]);
    const domSpy = vi.spyOn(youtube.transcriptSources, 'dom').mockResolvedValue([]);

    const result = await youtube.fetchTranscript('video-1');

    expect(result).toEqual(innertubeEvents);
    expect(innertubeSpy).toHaveBeenCalledOnce();
    expect(captionSpy).not.toHaveBeenCalled();
    expect(domSpy).not.toHaveBeenCalled();
  });

  it('falls back to caption tracks when innertube is empty', async () => {
    const captionEvents = [{ tStartMs: 2500 }];
    const captionTrack = [{ languageCode: 'en', baseUrl: 'https://example.com/captions' }];

    vi.spyOn(youtube.transcriptSources, 'innertube').mockResolvedValue({
      events: [],
      captionTracks: captionTrack
    });
    const captionSpy = vi
      .spyOn(youtube.transcriptSources, 'captionTrack')
      .mockResolvedValue(captionEvents);
    const domSpy = vi.spyOn(youtube.transcriptSources, 'dom').mockResolvedValue([]);

    const result = await youtube.fetchTranscript('video-2');

    expect(result).toEqual(captionEvents);
    expect(captionSpy).toHaveBeenCalledOnce();
    expect(captionSpy.mock.calls[0][0]).toContain('fmt=xml');
    expect(domSpy).not.toHaveBeenCalled();
  });

  it('uses DOM scraping when other sources fail', async () => {
    const domEvents = [{ tStartMs: 3600 }];
    vi.spyOn(youtube.transcriptSources, 'innertube').mockResolvedValue({ events: [], captionTracks: [] });
    vi.spyOn(youtube.transcriptSources, 'captionTrack').mockResolvedValue([]);
    const domSpy = vi.spyOn(youtube.transcriptSources, 'dom').mockResolvedValue(domEvents);

    const result = await youtube.fetchTranscript('video-3');

    expect(result).toEqual(domEvents);
    expect(domSpy).toHaveBeenCalledOnce();
  });
});
