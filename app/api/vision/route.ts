import { NextRequest } from 'next/server';
import { createGroqRequest, streamGroqChat } from '@/lib/api/groqClient';
import { parseGroqStream, createChatStream } from '@/lib/api/streaming';

export const runtime = 'edge';
export const maxDuration = 60;

/**
 * Vision analysis endpoint
 * Analyzes images using Groq Llama 4 Scout with vision capabilities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt } = body;

    if (!image || !prompt) {
      return new Response(
        JSON.stringify({ error: 'image and prompt are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate image format (should be base64 with data URI)
    if (!image.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Must be base64 with data URI.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create chat request with vision
    const chatRequest = createGroqRequest(
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: image, // Groq expects base64 data URI
              },
            },
          ] as any[],
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 2048,
      }
    );

    // Stream response
    const stream = createChatStream(async (send) => {
      try {
        const groqResponse = await streamGroqChat(chatRequest);

        await parseGroqStream(groqResponse, (content) => {
          send(content);
        });
      } catch (error) {
        console.error('Vision streaming error:', error);
        const message = error instanceof Error ? error.message : 'Vision analysis failed';
        throw new Error(message);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Vision endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
