import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import db, { sessions } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

/**
 * POST /api/sessions/[id]/transfer - Transfer anonymous session to authenticated user
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const authSession = await getServerSession(authOptions);

    if (!authSession?.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if session exists and is anonymous (userId is null)
    const existingSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existingSession.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const chatSession = existingSession[0];

    // Only allow transfer if session is anonymous (userId is null)
    if (chatSession.userId !== null) {
      return new Response(
        JSON.stringify({
          error: 'Session already has an owner',
          message: 'Can only transfer anonymous sessions'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Transfer session to authenticated user
    const result = await db
      .update(sessions)
      .set({
        userId: authSession.user.id,
        lastUpdated: new Date()
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    console.log('✅ Session transferred:', {
      sessionId,
      fromAnonymous: true,
      toUserId: authSession.user.id
    });

    return new Response(JSON.stringify(result[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST transfer session error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to transfer session' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
