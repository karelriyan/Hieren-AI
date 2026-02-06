import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import db, { messages, sessions } from '@/lib/db/client';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/sessions/[id]/messages - Get all messages in a session
 * POST /api/sessions/[id]/messages - Save a message to a session
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const authSession = await getServerSession(authOptions);

    // Check session ownership
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatSession = session[0];
    if (chatSession.userId && chatSession.userId !== authSession?.user?.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt));

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
    const authSession = await getServerSession(authOptions);
    const body = await request.json();
    const { role, content, status = 'sent', tokensUsed } = body;

    // More explicit validation with better error messages
    if (!role) {
      console.error('❌ Missing role:', { body });
      return new Response(
        JSON.stringify({ error: 'role is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (content === undefined || content === null) {
      console.error('❌ Missing content:', { role, body });
      return new Response(
        JSON.stringify({ error: 'content is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Allow empty content for assistant messages during streaming (though we shouldn't save them empty)
    if (content === '' && role === 'assistant') {
      console.warn('⚠️ Saving assistant message with empty content');
    }

    console.log('📥 Saving message:', {
      sessionId,
      role,
      contentLength: content?.length || 0,
      status,
      userId: authSession?.user?.id
    });

    // Check session ownership
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatSession = session[0];
    if (chatSession.userId && chatSession.userId !== authSession?.user?.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
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
