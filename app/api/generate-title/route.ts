import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate a short chat session title from the first message
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Call Groq to generate a concise title
    const completion = await groq.chat.completions.create({
      model: 'llama-4-scout',
      messages: [
        {
          role: 'system',
          content: 'You are a title generator. Generate a very short, concise title (3-5 words max) that captures the main topic of the user\'s message. Return ONLY the title, nothing else. Do not use quotes or punctuation at the end.',
        },
        {
          role: 'user',
          content: `Generate a title for this message: "${message}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'New Chat';

    return new Response(
      JSON.stringify({ title }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Generate title error:', error);
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
