import { GroqStreamChunk } from '@/types/api';

/**
 * Parse Server-Sent Events stream from Groq API
 * Handles the streaming response format and extracts content chunks
 */
export async function parseGroqStream(
  response: Response,
  onChunk: (content: string) => void,
  onToolCall?: (toolCall: {
    id: string;
    name: string;
    arguments: string;
  }) => void
): Promise<void> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();

        // Skip empty lines and "data: " prefix
        if (!line || line === ':') continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);

        // Handle end of stream
        if (data === '[DONE]') {
          continue;
        }

        try {
          const parsed: GroqStreamChunk = JSON.parse(data);

          // Handle text content
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }

          // Handle tool calls
          const toolCalls = parsed.choices[0]?.delta?.tool_calls;
          if (toolCalls && onToolCall) {
            for (const call of toolCalls) {
              onToolCall({
                id: call.id,
                name: call.function.name,
                arguments: call.function.arguments,
              });
            }
          }
        } catch (e) {
          // Log but continue on malformed JSON
          console.error('Failed to parse Groq stream chunk:', e);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed: GroqStreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.error('Failed to parse final Groq stream chunk:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream chat response to client using ReadableStream
 */
export function createChatStream(onGenerate: (send: (data: string) => void) => Promise<void>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        await onGenerate((data) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`));
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMessage })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

/**
 * Exponential backoff retry utility for rate-limited requests
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;

      const response = error instanceof Response ? error : null;
      if (response?.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : initialDelayMs * Math.pow(2, attempt);

        console.log(`Rate limited. Retrying after ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retry attempts exceeded');
}
