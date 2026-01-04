// src/pages/content/mainWorld.ts

interface YtCfg {
  INNERTUBE_API_KEY: string;
  INNERTUBE_CONTEXT: any;
}

declare global {
  interface Window {
    ytcfg: {
      get: (key: string) => any;
    };
  }
}

window.addEventListener('YAC_RequestInnertubeTranscript', async (e: Event) => {
  const detail = (e as CustomEvent).detail;
  const videoId = detail?.videoId;
  
  if (!videoId) return;

  console.log(`[YAC] Innertube API request for video: ${videoId}`);

  try {
    if (!window.ytcfg) throw new Error('ytcfg not found on page');
    const apiKey = window.ytcfg.get('INNERTUBE_API_KEY');
    let context = window.ytcfg.get('INNERTUBE_CONTEXT');

    if (!apiKey || !context) throw new Error('Missing Innertube API key or context');

    // Ensure context has client info (required for 400 fix)
    if (!context.client) {
        context = {
            ...context,
            client: {
                hl: 'en',
                gl: 'US',
                clientName: 'WEB',
                clientVersion: '2.20240101.00.00', // Fallback version
                ...context.client
            }
        };
    }

    const getPlayerResponse = () => {
        const player = document.getElementById('movie_player') as any;
        if (player?.getPlayerResponse) return player.getPlayerResponse();
        return (window as any).ytInitialPlayerResponse;
    };

    const playerResponse = getPlayerResponse();
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    // Strategy 1: Try Innertube API (get_transcript)
    const findKey = (obj: any, key: string): any => {
        if (!obj) return null;
        if (obj[key]) return obj[key];
        if (typeof obj !== 'object') return null;
        for (const k in obj) {
            const res = findKey(obj[k], key);
            if (res) return res;
        }
        return null;
    };

    const initialData = (window as any).ytInitialData;
    const transcriptEndpoint = findKey(initialData, 'getTranscriptEndpoint');
    
    if (!transcriptEndpoint || !transcriptEndpoint.params) {
        throw new Error('Could not find getTranscriptEndpoint params in ytInitialData');
    }

    const params = transcriptEndpoint.params;

    const response = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, params })
    });

    if (!response.ok) {
        throw new Error(`Innertube API status: ${response.status}`);
    }

    const data = await response.json();
    const segments = findKey(data, 'initialSegments');
    
    if (segments) {
        const events = segments.map((seg: any) => {
            const renderer = seg.transcriptSegmentRenderer;
            return {
                tStartMs: parseInt(renderer.startMs),
                dDurationMs: parseInt(renderer.endMs) - parseInt(renderer.startMs),
                segs: [{ utf8: renderer.snippet.runs[0].text }]
            };
        });
        
        console.log(`[YAC] Innertube API success: ${events.length} segments`);
        window.dispatchEvent(new CustomEvent('YAC_TranscriptResponse', {
            detail: { success: true, data: { events, captionTracks } }
        }));
    } else {
        // If no segments from API, but we have captionTracks, return those
        if (captionTracks && captionTracks.length > 0) {
             console.log(`[YAC] Innertube API no segments, but found ${captionTracks.length} caption tracks`);
             window.dispatchEvent(new CustomEvent('YAC_TranscriptResponse', {
                detail: { success: true, data: { events: [], captionTracks } }
             }));
             return;
        }
        throw new Error('No segments found in Innertube response');
    }

  } catch (error) {
    // If API failed, but we have captionTracks from player response, return those!
    const playerResponse = (document.getElementById('movie_player') as any)?.getPlayerResponse?.() || (window as any).ytInitialPlayerResponse;
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (captionTracks && captionTracks.length > 0) {
        console.log(`[YAC] Innertube API failed, but found ${captionTracks.length} caption tracks. Returning tracks.`);
        window.dispatchEvent(new CustomEvent('YAC_TranscriptResponse', {
            detail: { success: true, data: { events: [], captionTracks } }
        }));
        return;
    }

    console.warn('[YAC] Innertube API failed (will try DOM fallback):', error);
    window.dispatchEvent(new CustomEvent('YAC_TranscriptResponse', {
      detail: { success: false, error: String(error) }
    }));
  }
});

console.debug('[YAC] Main World script loaded (Innertube Ready)');
