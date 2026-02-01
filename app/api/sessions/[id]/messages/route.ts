import { NextRequest } from 'next/server';
import db, { messages } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

/**
 * GET /api/sessions/[id]/messages - Get all messages in a session
 * POST /api/sessions/[id]/messages - Save a message to a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId));

    return new Response(JSON.stringify(sessionMessages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET messages error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch messages' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const { role, content, status = 'sent', tokensUsed } = body;

    if (!role || !content) {
      return new Response(
        JSON.stringify({ error: 'role and content are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const newMessage = {
      sessionId,
      role: role as 'user' | 'assistant' | 'system' | 'tool',
      content,
      status: status as 'sending' | 'sent' | 'failed',
      tokensUsed,
      createdAt: new Date(),
    };

    const result = await db
      .insert(messages)
      .values(newMessage)
      .returning();

    return new Response(JSON.stringify(result[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST message error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save message' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
