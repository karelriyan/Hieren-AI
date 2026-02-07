/**
 * RAG Chat Proxy Endpoint
 * Forwards requests to the RAG backend while maintaining Next.js structure
 * Handles both direct RAG queries and fallback to Groq
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RAGRequest {
  text: string;
  user_id?: string;
}

/**
 * Get RAG backend URL
 */
function getRAGBackendUrl(): string {
  const envUrl = process.env.RAG_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default to local development RAG server
  return process.env.RAG_LOCAL_URL || 'http://localhost:8000';
}

/**
 * Proxy chat requests to RAG backend
 */
export async function POST(request: NextRequest) {
  try {
    const body: RAGRequest = await request.json();

    if (!body.text) {
      return new Response(
        JSON.stringify({ error: 'Text field is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const ragBackendUrl = getRAGBackendUrl();
    const ragUrl = `${ragBackendUrl}/chat`;

    console.log(`[RAG Proxy] Forwarding request to: ${ragUrl}`);

    const response = await fetch(ragUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: body.text,
        user_id: body.user_id || 'web_user',
      }),
    });

    if (!response.ok) {
      console.error(
        `[RAG Proxy] Backend error: ${response.status} ${response.statusText}`
      );

      // Return partial response instead of failing completely
      return new Response(
        JSON.stringify({
          response:
            'RAG system is temporarily unavailable. Please try again in a moment.',
          status: 'error',
          code: response.status,
        }),
        {
          status: 200, // Return 200 to avoid breaking the frontend
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const responseData = await response.json();

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[RAG Proxy] Error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to reach RAG backend';

    return new Response(
      JSON.stringify({
        response: `Error connecting to RAG system: ${message}`,
        status: 'error',
        fallback: true,
      }),
      {
        status: 200, // Return 200 to avoid breaking the frontend
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    const ragBackendUrl = getRAGBackendUrl();
    const healthUrl = `${ragBackendUrl}/health`;

    const response = await fetch(healthUrl, {
      method: 'GET',
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          rag_backend: 'connected',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          rag_backend: 'error',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        rag_backend: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
