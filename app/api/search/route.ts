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

    console.log('🔍 Search API called:', { query, searchDepth });
    console.log('🔑 API Key exists?', !!process.env.TAVILY_API_KEY);
    console.log('🔑 API Key length:', process.env.TAVILY_API_KEY?.length || 0);
    console.log('🔑 API Key first 10 chars:', process.env.TAVILY_API_KEY?.substring(0, 10));

    if (!query || typeof query !== 'string') {
      console.error('❌ Invalid query:', query);
      return new Response(
        JSON.stringify({ error: 'query parameter is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Perform search
    console.log('📡 Calling Tavily API...');
    const searchResult = await tavilySearch(query, {
      searchDepth: searchDepth as 'basic' | 'advanced',
      includeAnswer: true,
      maxResults: 5,
    });

    console.log('✅ Tavily API success, results:', searchResult.results.length);

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
