import { NextRequest } from 'next/server';
import { tavilySearch, formatSearchResults } from '@/lib/api/tavilyClient';

export const runtime = 'edge';

/**
 * Web search endpoint
 * Handles search requests using Tavily API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, searchDepth = 'basic' } = body;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'query parameter is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Perform search
    const searchResult = await tavilySearch(query, {
      searchDepth: searchDepth as 'basic' | 'advanced',
      includeAnswer: true,
      maxResults: 5,
    });

    // Format results for LLM
    const formattedResults = formatSearchResults(searchResult);

    return new Response(
      JSON.stringify({
        query,
        results: searchResult.results,
        answer: searchResult.answer,
        formatted: formattedResults,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Search endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
