import { NextRequest } from 'next/server';
import { createGroqRequest, streamGroqChat, formatMessagesForGroq } from '@/lib/api/groqClient';
import { parseGroqStream, createChatStream } from '@/lib/api/streaming';
import db from '@/lib/db/client';
import { messages as messagesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'edge';
export const maxDuration = 60;

/**
 * Chat streaming endpoint
 * Handles incoming chat messages and streams AI responses
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Format messages for Groq API
    const formattedMessages = formatMessagesForGroq(messages);

    // Create chat completion request
    const chatRequest = createGroqRequest(formattedMessages, {
      includeTools: true,
    });

    // Stream chat response to client
    const stream = createChatStream(async (send) => {
      try {
        const groqResponse = await streamGroqChat(chatRequest);

        await parseGroqStream(groqResponse, (content) => {
          send(content);
        });
      } catch (error) {
        console.error('Streaming error:', error);
        const message = error instanceof Error ? error.message : 'Streaming failed';
        throw new Error(message);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Vercel buffering
      },
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
