import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import db, { sessions } from '@/lib/db/client';
import { desc, eq } from 'drizzle-orm';

/**
 * GET /api/sessions - List all sessions for authenticated user
 * POST /api/sessions - Create new session
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      // Return empty array for logged-out users
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Filter sessions by userId
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, session.user.id))
      .orderBy(desc(sessions.lastUpdated));

    return new Response(JSON.stringify(userSessions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET sessions error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch sessions' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { title = 'New Chat', messages = [] } = body;

    // Save to database for both authenticated and anonymous users
    // Anonymous users have userId = null
    const newSession = {
      title,
      userId: session?.user?.id || null,
      createdAt: new Date(),
      lastUpdated: new Date(),
      modelUsed: 'meta-llama/llama-4-scout-17b-16e-instruct',
    };

    const result = await db.insert(sessions).values(newSession).returning();
    const savedSession = result[0];

    // Save messages if provided (for migration)
    if (messages.length > 0) {
      const { messages: messagesTable } = await import('@/lib/db/client');
      await db.insert(messagesTable).values(
        messages.map((msg: any) => ({
          sessionId: savedSession.id,
          role: msg.role,
          content: msg.content,
          status: msg.status || 'sent',
          createdAt: new Date(),
        }))
      );
    }

    return new Response(JSON.stringify(savedSession), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST sessions error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create session' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
