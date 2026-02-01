/**
 * Content Block Types for multimodal messages
 */

export interface TextContentBlock {
  type: 'text';
  text: string;
}

export interface ImageUrlContentBlock {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export type ContentBlock = TextContentBlock | ImageUrlContentBlock;

/**
 * Message Types
 */

export interface BaseMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  status: 'sending' | 'sent' | 'failed';
  createdAt: Date;
  tokensUsed?: number;
}

export interface TextMessage extends BaseMessage {
  content: string;
}

export interface MultimodalMessage extends BaseMessage {
  content: ContentBlock[];
}

export type Message = TextMessage | MultimodalMessage;

/**
 * Session Type
 */

export interface Session {
  id: string;
  title: string;
  createdAt: Date;
  lastUpdated: Date;
  modelUsed: string;
}

/**
 * Attachment Types
 */

export interface ImageAttachment {
  id: string;
  messageId: string;
  fileType: 'image';
  fileName: string;
  base64Data: string;
  createdAt: Date;
}

export interface DocumentAttachment {
  id: string;
  messageId: string;
  fileType: 'document';
  fileName: string;
  metadata?: {
    pageCount?: number;
    fileSize?: number;
    extractedText?: string;
  };
  createdAt: Date;
}

export type Attachment = ImageAttachment | DocumentAttachment;

/**
 * API Request/Response Types
 */

export interface ChatRequest {
  sessionId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | ContentBlock[];
  }>;
}

export interface ChatStreamChunk {
  content: string;
  tokensUsed?: number;
}

export interface VisionRequest {
  image: string; // base64 encoded image
  prompt: string;
}

export interface SearchRequest {
  query: string;
  searchDepth?: 'basic' | 'advanced';
}

export interface SearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  answer?: string;
}

/**
 * Error Types
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ChatError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChatError';
  }
}
