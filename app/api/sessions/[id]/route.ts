import { NextRequest } from 'next/server';
import db, { sessions, messages } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

/**
 * GET /api/sessions/[id] - Get session details
 * PUT /api/sessions/[id] - Update session
 * DELETE /api/sessions/[id] - Delete session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

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

    return new Response(JSON.stringify(session[0]), {
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

    const result = await db
      .update(sessions)
      .set({ title, lastUpdated: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning();

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Delete associated messages first (cascade)
    await db.delete(messages).where(eq(messages.sessionId, sessionId));

    // Delete session
    const result = await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning();

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
