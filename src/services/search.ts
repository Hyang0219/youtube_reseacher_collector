// src/services/search.ts
import { ApiSettings } from './storage';

export async function enrichWithSearch(query: string, settings: ApiSettings): Promise<string> {
  if (!settings.aiBuilderToken || !query) {
    return 'No AI Builder token available; skipping enrichment.';
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
        max_results: 2
      })
    });
    
    if (!response.ok) {
        console.warn('Search API error:', response.statusText);
        return 'Search enrichment unavailable (API Error).';
    }

    const payload = await response.json();
    // AI Builder Search API returns { queries: [{ keyword: string, response: { results: [...] } }] }
    // We only sent one keyword, so we check queries[0]
    const tavilyResponse = payload.queries?.[0]?.response;
    const items = tavilyResponse?.results ?? [];

    if (items.length === 0) {
      return 'Search returned no results.';
    }
    return items
      .map((item: any) => `• ${item.title ?? 'Result'}: ${item.content ?? item.snippet ?? 'No snippet.'}`)
      .join('\n');
  } catch (error) {
    console.warn('Search enrichment failed', error);
    return 'Search enrichment unavailable.';
  }
}
