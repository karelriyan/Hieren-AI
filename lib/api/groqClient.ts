import { GroqChatCompletionRequest, GroqToolDefinition } from '@/types/api';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set');
}

/**
 * Tool schema for web search via Tavily
 */
export const TAVILY_TOOL_SCHEMA: GroqToolDefinition = {
  type: 'function',
  function: {
    name: 'tavily_search',
    description:
      'Search the web for real-time information, current facts, or news that occurred after the model training cutoff. Use this when you need up-to-date information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The search query optimized for search engines. Be specific and clear.',
        },
        search_depth: {
          type: 'string',
          enum: ['basic', 'advanced'],
          default: 'basic',
          description:
            'Search depth. Use "advanced" for deep research and comprehensive results.',
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Create Groq chat completion request
 */
export function createGroqRequest(
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | Record<string, unknown>[];
    tool_call_id?: string;
  }>,
  options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    includeTools?: boolean;
  } = {}
): GroqChatCompletionRequest {
  return {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages,
    stream: true,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxTokens ?? 4096,
    top_p: options.topP ?? 1.0,
    ...(options.includeTools && {
      tools: [TAVILY_TOOL_SCHEMA],
      tool_choice: 'auto',
    }),
  };
}

/**
 * Stream chat completion from Groq API
 */
export async function streamGroqChat(
  request: GroqChatCompletionRequest
): Promise<Response> {
  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
    );
  }

  return response;
}

/**
 * Create headers for Groq API requests
 */
export function createGroqHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Format messages for Groq API including multimodal content
 */
export function formatMessagesForGroq(
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | Record<string, unknown>[];
    tool_call_id?: string;
  }>
) {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
  }));
}

/**
 * Validate Groq API key format (basic check)
 */
export function isValidGroqApiKey(key: string): boolean {
  return key.startsWith('gsk_') && key.length > 20;
}
