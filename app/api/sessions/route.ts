import { NextRequest } from 'next/server';
import db, { sessions } from '@/lib/db/client';
import { desc } from 'drizzle-orm';

/**
 * GET /api/sessions - List all sessions
 * POST /api/sessions - Create new session
 */
export async function GET() {
  try {
    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt));

    return new Response(JSON.stringify(allSessions), {
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
    const body = await request.json();
    const { title = 'New Chat' } = body;

    const newSession = {
      title,
      createdAt: new Date(),
      lastUpdated: new Date(),
      modelUsed: 'meta-llama/llama-4-scout-17b-16e-instruct',
    };

    const result = await db.insert(sessions).values(newSession).returning();

    return new Response(JSON.stringify(result[0]), {
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
