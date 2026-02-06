import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import db, { sessions, messages } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

/**
 * GET /api/sessions/[id] - Get session details
 * PUT /api/sessions/[id] - Update session
 * DELETE /api/sessions/[id] - Delete session
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const authSession = await getServerSession(authOptions);

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

    // Check ownership (allow if userId is null for backward compatibility)
    if (chatSession.userId && chatSession.userId !== authSession?.user?.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(chatSession), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET session error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch session' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const authSession = await getServerSession(authOptions);
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check ownership first
    const existingSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existingSession.length === 0) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatSession = existingSession[0];
    if (chatSession.userId && chatSession.userId !== authSession?.user?.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update session
    const result = await db
      .update(sessions)
      .set({ title, lastUpdated: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning();

    return new Response(JSON.stringify(result[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('PUT session error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update session' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const authSession = await getServerSession(authOptions);

    // Check ownership first
    const existingSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existingSession.length === 0) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatSession = existingSession[0];
    if (chatSession.userId && chatSession.userId !== authSession?.user?.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete associated messages first (cascade)
    await db.delete(messages).where(eq(messages.sessionId, sessionId));

    // Delete session
    await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('DELETE session error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete session' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
