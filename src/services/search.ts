// src/services/search.ts
import { ApiSettings } from './storage';

export async function enrichWithSearch(query: string, settings: ApiSettings, currentVideoUrl?: string): Promise<string> {
  if (!settings.aiBuilderToken || !query) {
    return 'No AI Builder token available; skipping enrichment.';
  }

  // Prevent searching for generic fallback questions which lead to garbage results
  const genericQueries = [
      'what should i explore next',
      'describe the idea in one sentence',
      'what is the main topic',
      'captured a thought while watching a youtube video'
  ];
  if (genericQueries.some(g => query.toLowerCase().includes(g))) {
      return 'Enrichment skipped (Generic/Fallback query generated).';
  }

  try {
    const response = await fetch('https://space.ai-builders.com/backend/v1/search/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.aiBuilderToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keywords: [query],
        max_results: 5 // Fetch more to allow filtering
      })
    });
    
    if (!response.ok) {
        console.warn('Search API error:', response.statusText);
        return 'Search enrichment unavailable (API Error).';
    }

    const payload = await response.json();
    const tavilyResponse = payload.queries?.[0]?.response;
    let items = tavilyResponse?.results ?? [];

    // Filter out results that are the video itself (based on URL match)
    if (currentVideoUrl) {
        // Simple normalization: remove query params for comparison
        const cleanCurrent = currentVideoUrl.split('?')[0];
        items = items.filter((item: any) => {
            const itemUrl = item.url || '';
            return !itemUrl.includes(cleanCurrent);
        });
    }

    // Take top 2 valid results
    items = items.slice(0, 2);

    if (items.length === 0) {
      return 'Search returned no relevant external results.';
    }
    return items
      .map((item: any) => `• ${item.title ?? 'Result'}: ${item.content ?? item.snippet ?? 'No snippet.'}`)
      .join('\n');
  } catch (error) {
    console.warn('Search enrichment failed', error);
    return 'Search enrichment unavailable.';
  }
}
