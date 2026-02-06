import { TavilySearchRequest, TavilySearchResult } from '@/types/api';

// Trim API key to remove any whitespace/newlines from environment variable
const TAVILY_API_KEY = process.env.TAVILY_API_KEY?.trim();
const TAVILY_API_URL = 'https://api.tavily.com/search';

if (!TAVILY_API_KEY) {
  console.warn('TAVILY_API_KEY environment variable is not set');
} else {
  console.log('✅ Tavily API key loaded, length:', TAVILY_API_KEY.length, 'first 15:', TAVILY_API_KEY.substring(0, 15));
}

/**
 * Search the web using Tavily API
 */
export async function tavilySearch(query: string, options: {
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  includeAnswer?: boolean;
} = {}): Promise<TavilySearchResult> {
  if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured');
  }

  const {
    searchDepth = 'basic',
    maxResults = 5,
    includeAnswer = true,
  } = options;

  const request: TavilySearchRequest = {
    api_key: TAVILY_API_KEY,
    query,
    search_depth: searchDepth,
    include_answer: includeAnswer,
    max_results: maxResults,
    topic: 'general',
  };

  try {
    console.log('🌐 Sending to Tavily:', {
      url: TAVILY_API_URL,
      query,
      apiKeyLength: TAVILY_API_KEY.length,
      apiKeyFirst10: TAVILY_API_KEY.substring(0, 10)
    });

    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('📥 Tavily response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ Tavily error response:', error);
      throw new Error(
        `Tavily API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
      );
    }

    const result: TavilySearchResult = await response.json();
    return result;
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

/**
 * Format search results for LLM context
 */
export function formatSearchResults(result: TavilySearchResult): string {
  const parts: string[] = [];

  if (result.answer) {
    parts.push(`**Direct Answer**: ${result.answer}`);
  }

  if (result.results.length > 0) {
    parts.push('\n**Search Results**:');
    result.results.forEach((item, index) => {
      parts.push(`\n${index + 1}. **${item.title}**`);
      parts.push(`   Source: ${item.url}`);
      parts.push(`   ${item.content}`);
    });
  }

  return parts.join('\n');
}

/**
 * Check if a query should trigger web search
 */
export function shouldTriggerWebSearch(query: string): boolean {
  const indicators = [
    'today',
    'current',
    'latest',
    'recent',
    'now',
    'weather',
    'news',
    'stock',
    'price',
    'time',
    'what is',
    'who is',
    'how do',
  ];

  const lowerQuery = query.toLowerCase();
  return indicators.some(indicator => lowerQuery.includes(indicator));
}

/**
 * Parse tool call arguments from JSON string
 */
export function parseToolCallArguments(
  jsonStr: string
): { query: string; search_depth?: 'basic' | 'advanced' } {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse tool call arguments:', error);
    throw new Error('Invalid tool call arguments');
  }
}
