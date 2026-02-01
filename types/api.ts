/**
 * Groq API Types
 */

export interface GroqChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | Record<string, unknown>[];
    tool_call_id?: string;
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  tools?: GroqToolDefinition[];
  tool_choice?: string | { type: 'auto' } | { type: 'function'; function: { name: string } };
}

export interface GroqToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface GroqStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}

export interface GroqChatCompletion {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Tavily Search API Types
 */

export interface TavilySearchRequest {
  api_key: string;
  query: string;
  search_depth?: 'basic' | 'advanced';
  include_answer?: boolean;
  max_results?: number;
  topic?: 'general' | 'news';
}

export interface TavilySearchResult {
  query: string;
  follow_up_questions: string[] | null;
  answer: string | null;
  images: string[];
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    raw_content: string | null;
  }>;
  response_time: number;
}

/**
 * Rate Limiting Types
 */

export interface RateLimitHeaders {
  'x-ratelimit-limit-requests'?: string;
  'x-ratelimit-limit-tokens'?: string;
  'x-ratelimit-remaining-requests'?: string;
  'x-ratelimit-remaining-tokens'?: string;
  'x-ratelimit-reset-requests'?: string;
  'x-ratelimit-reset-tokens'?: string;
  'retry-after'?: string;
}

/**
 * Image Processing Types
 */

export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

/**
 * Document Processing Types
 */

export interface DocumentExtractionResult {
  text: string;
  pageCount?: number;
  fileSize: number;
  extractedAt: Date;
}

/**
 * Error Response Types
 */

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}
