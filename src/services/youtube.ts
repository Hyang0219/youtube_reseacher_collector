// src/services/youtube.ts
export type CapturePayload = {
  videoTitle: string;
  videoUrl: string;
  videoDescription?: string;
  timestamp: number;
  videoId?: string;
  transcript: string;
};

const getVideoId = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('v');
  if (id) return id;
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!canonical) return undefined;
  const match = canonical.match(/[?&]v=([^&]+)/);
  return match ? match[1] : undefined;
};

const getTimestamp = (): number => {
  const video = document.querySelector('video');
  return video ? video.currentTime : 0;
};

const buildTranscriptWindow = (events: any[], currentTime: number): string => {
  if (!events?.length) return '';
  
  const endMs = currentTime * 1000;
  const startMs = Math.max(0, endMs - 30000); // 30 seconds window
  
  const relevantEvents = events.filter((event) => {
    const t = event.t ?? event.tStartMs ?? 0;
    const tNum = Number(t);
    return tNum >= startMs && tNum <= endMs;
  });

  return relevantEvents
    .map((event) =>
      event.segs
        ?.map((seg: any) => seg?.utf8 ?? '')
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' ')
    .trim();
};

const fetchTranscriptViaInnertube = (videoId: string): Promise<{ events: any[], captionTracks?: any[] }> => {
  return new Promise((resolve) => {
    const handler = (event: Event) => {
      window.removeEventListener('YAC_TranscriptResponse', handler);
      const detail = (event as CustomEvent).detail ?? {};
      
      if (detail.success) {
        resolve({ 
            events: detail.data?.events || [], 
            captionTracks: detail.data?.captionTracks 
        });
      } else {
        // Silent failure
        resolve({ events: [] });
      }
    };

    window.addEventListener('YAC_TranscriptResponse', handler);
    window.dispatchEvent(new CustomEvent('YAC_RequestInnertubeTranscript', { detail: { videoId } }));

    setTimeout(() => {
      window.removeEventListener('YAC_TranscriptResponse', handler);
      resolve({ events: [] });
    }, 3000);
  });
};

const fetchCaptionTrack = async (url: string): Promise<any[]> => {
    try {
        // First try direct fetch (avoids proxy overhead, shares origin session)
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                return parseXmlTranscript(text);
            }
        } catch (directError) {
            console.warn('[YAC] Direct caption fetch failed, trying proxy...', directError);
        }

        // Fallback to Background Proxy (avoids CORS if cross-origin)
        const response = await chrome.runtime.sendMessage({ type: 'FETCH_TRANSCRIPT', url });
        if (response.success && response.data) {
             return parseXmlTranscript(response.data);
        }
        return [];
    } catch (e) {
        console.warn('Caption track fetch failed', e);
        return [];
    }
};

const parseXmlTranscript = (xml: string): any[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const texts = Array.from(doc.getElementsByTagName('text'));
  
  return texts.map(node => {
    const start = parseFloat(node.getAttribute('start') || '0');
    // decode HTML entities if needed, but textContent usually handles it
    const text = node.textContent || '';
    return {
        tStartMs: start * 1000,
        dDurationMs: 0,
        segs: [{ utf8: text }] // Clean up text
    };
  });
};


const scrapeTranscriptFromDOM = async (): Promise<any[]> => {
  console.log('[YAC] Attempting DOM Scraping...');
  
  // 1. Try to find button and click if not open
  const openButton = document.querySelector('button[aria-label="Show transcript"]') as HTMLElement;
  const descriptionButtons = Array.from(document.querySelectorAll('ytd-video-description-renderer button, #description button'));
  const descButton = descriptionButtons.find(btn => 
      btn.textContent?.toLowerCase().includes('transcript')
  ) as HTMLElement;

  console.log('[YAC] DOM Buttons found:', { openButton: !!openButton, descButton: !!descButton });

  if (!document.querySelector('ytd-transcript-renderer')) {
      console.log('[YAC] Transcript panel not open. Clicking button...');
      if (descButton) descButton.click();
      else if (openButton) openButton.click();
      else console.warn('[YAC] No transcript button found.');
      
      // Wait for panel to open (Increased to 2.5s)
      await new Promise(r => setTimeout(r, 2500));
  } else {
      console.log('[YAC] Transcript panel already open.');
  }

  const transcriptPanel = document.querySelector('ytd-transcript-renderer');
  if (!transcriptPanel) {
      console.warn('[YAC] Transcript panel failed to open.');
      return [];
  }
  
  console.log('[YAC] Panel found. Parsing segments...');
  const segments = Array.from(transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer'));
  console.log(`[YAC] Found ${segments.length} segments.`);
  
  return segments.map(seg => {
      const timeStr = seg.querySelector('.segment-timestamp')?.textContent?.trim() ?? "0:00";
      const text = seg.querySelector('.segment-text')?.textContent?.trim() ?? "";
      
      const parts = timeStr.split(':').map(Number);
      let ms = 0;
      if (parts.length === 2) ms = (parts[0] * 60 + parts[1]) * 1000;
      if (parts.length === 3) ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      
      return {
          tStartMs: ms,
          dDurationMs: 0,
          segs: [{ utf8: text }]
      };
  });
};

const fetchTranscript = async (videoId?: string): Promise<any[]> => {
  if (!videoId) return [];

  // 1. Try Innertube API
  const { events: innertubeEvents, captionTracks } = await fetchTranscriptViaInnertube(videoId);
  if (innertubeEvents.length > 0) return innertubeEvents;

  // 1b. Try Caption Tracks fallback (Robust XML Fetch)
  if (captionTracks && captionTracks.length > 0) {
      // Find english track: standard > auto > any
      const enTrack = captionTracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr') 
                   || captionTracks.find((t: any) => t.languageCode === 'en')
                   || captionTracks[0];
                   
      if (enTrack && enTrack.baseUrl) {
          // Force XML format
          const baseUrl = enTrack.baseUrl;
          const xmlUrl = baseUrl.includes('fmt=') ? baseUrl : `${baseUrl}&fmt=xml`;
          
          console.log('[YAC] Fallback to Caption Track:', enTrack.name?.simpleText || enTrack.languageCode);
          console.log('[YAC] Caption URL:', xmlUrl);
          const trackEvents = await fetchCaptionTrack(xmlUrl);
          if (trackEvents.length > 0) return trackEvents;
      }
  }

  // 2. Fallback: DOM Automation
  const domEvents = await scrapeTranscriptFromDOM();
  if (domEvents.length > 0) return domEvents;
  
  return [];
};

export async function captureContext(): Promise<CapturePayload> {
  const videoTitle =
    document.querySelector('#container h1.title')?.textContent?.trim() || document.title || 'YouTube Video';
  
  // Try to capture description (meta tag or expanded description)
  let videoDescription = 
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('#description-inline-expander .ytd-text-inline-expander')?.textContent?.trim() ||
    '';
  
  // Truncate description to avoid huge payload
  if (videoDescription.length > 500) {
      videoDescription = videoDescription.slice(0, 500) + '...';
  }

  const videoUrl = window.location.href;
  const timestamp = getTimestamp();
  const videoId = getVideoId();
  let transcript = '';
  
  try {
    const events = await fetchTranscript(videoId);
    transcript = buildTranscriptWindow(events, timestamp);
  } catch (error) {
    console.warn('Transcript capture failed', error);
  }

  return {
    videoTitle,
    videoUrl,
    videoDescription,
    timestamp,
    videoId,
    transcript
  };
}
