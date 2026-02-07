/**
 * RAG Client for Hieren AI
 * Provides integration between Next.js frontend and RAG backend
 * Supports both local development and production deployment
 */

interface RAGChatRequest {
  text: string;
  user_id?: string;
}

interface RAGChatResponse {
  response: string;
  status: string;
  error?: string;
}

interface RAGHealthResponse {
  status: string;
}

/**
 * Get RAG backend URL based on environment
 */
function getRAGBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path
    return '/api/rag';
  }

  // Server-side
  if (process.env.RAG_URL) {
    return process.env.RAG_URL;
  }

  // Default local development
  if (process.env.NODE_ENV === 'development') {
    return process.env.RAG_LOCAL_URL || 'http://localhost:8000';
  }

  // Production with external RAG service
  return process.env.RAG_PRODUCTION_URL || 'http://localhost:8000';
}

/**
 * Check if RAG system is available
 */
export async function checkRAGHealth(): Promise<boolean> {
  try {
    const baseUrl = getRAGBaseUrl();
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.warn('RAG health check failed:', error);
    return false;
  }
}

/**
 * Send query to RAG system
 * Falls back to direct Groq if RAG is unavailable
 */
export async function queryRAG(
  request: RAGChatRequest,
  fallbackToGroq: boolean = true
): Promise<RAGChatResponse> {
  try {
    const baseUrl = getRAGBaseUrl();
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.statusText}`);
    }

    const data: RAGChatResponse = await response.json();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('RAG query failed:', errorMessage);

    if (fallbackToGroq) {
      console.log('Falling back to direct Groq...');
      return {
        response: '',
        status: 'fallback_to_groq',
        error: errorMessage,
      };
    }

    return {
      response: `Error: ${errorMessage}`,
      status: 'error',
      error: errorMessage,
    };
  }
}

/**
 * Query RAG with streaming support (for server-side use)
 */
export async function queryRAGStream(
  request: RAGChatRequest,
  onChunk: (chunk: string) => void
): Promise<string> {
  try {
    const baseUrl = getRAGBaseUrl();
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.statusText}`);
    }

    const data: RAGChatResponse = await response.json();

    if (data.status === 'success') {
      onChunk(data.response);
      return data.response;
    } else {
      throw new Error(data.error || 'RAG query failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('RAG stream query failed:', errorMessage);
    throw error;
  }
}

/**
 * Detect query type and route appropriately
 */
export function detectQueryType(
  text: string
): 'technical' | 'market' | 'action' | 'general' {
  const lowerText = text.toLowerCase();

  // Check for action queries (device control)
  if (/turn\s+(on|off|up|down)|set\s+(limit|mode)|stop|start|activate|deactivate/i.test(
    lowerText
  )) {
    return 'action';
  }

  // Check for market queries (prices, news, regulations)
  if (/price|harga|cost|biaya|news|berita|regulation|regulasi|weather|cuaca|market|pasar/i.test(
    lowerText
  )) {
    return 'market';
  }

  // Check for technical queries (specs, troubleshooting, installation)
  if (/specification|spesifikasi|error|fault|install|setup|troubleshoot|tegangan|voltage|amp|watt/i.test(
    lowerText
  )) {
    return 'technical';
  }

  return 'general';
}

/**
 * Parse RAG response and extract relevant information
 */
export function parseRAGResponse(response: string): {
  answer: string;
  citations?: string[];
  confidence?: number;
} {
  // Remove markdown formatting
  let answer = response
    .replace(/\*\*/g, '')
    .replace(/\n\n/g, '\n')
    .trim();

  // Extract citations if present
  const citationRegex = /\[Citation: (.+?)\]/g;
  const citations: string[] = [];
  let match;

  while ((match = citationRegex.exec(response)) !== null) {
    citations.push(match[1]);
    answer = answer.replace(match[0], '');
  }

  return {
    answer: answer.trim(),
    citations: citations.length > 0 ? citations : undefined,
    confidence: 0.9, // Default confidence from RAG
  };
}

/**
 * Hybrid query: Try RAG first, fall back to direct Groq
 */
export async function hybridQuery(
  text: string,
  userId?: string
): Promise<{
  response: string;
  source: 'rag' | 'groq' | 'error';
  fallback: boolean;
}> {
  const queryType = detectQueryType(text);

  // Try RAG first for technical queries
  if (queryType === 'technical') {
    try {
      const ragResponse = await queryRAG({
        text,
        user_id: userId,
      }, false);

      if (ragResponse.status === 'success') {
        return {
          response: ragResponse.response,
          source: 'rag',
          fallback: false,
        };
      }
    } catch (error) {
      console.warn('RAG query failed, falling back to Groq');
    }
  }

  // Fall back to direct Groq for non-technical or if RAG fails
  return {
    response: '',
    source: 'groq',
    fallback: true,
  };
}
