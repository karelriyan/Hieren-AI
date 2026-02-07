/**
 * RAG Health Check Endpoint
 * Monitors the connection between Next.js app and RAG backend
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0; // Disable caching

interface HealthStatus {
  app: 'healthy';
  rag_backend: 'connected' | 'disconnected' | 'error';
  backend_url?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Get RAG backend URL
 */
function getRAGBackendUrl(): string {
  const envUrl = process.env.RAG_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }
  return process.env.RAG_LOCAL_URL || 'http://localhost:8000';
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest): Promise<Response> {
  const status: HealthStatus = {
    app: 'healthy',
    rag_backend: 'disconnected',
    timestamp: new Date().toISOString(),
  };

  const ragBackendUrl = getRAGBackendUrl();

  try {
    const response = await fetch(`${ragBackendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      const healthData = await response.json();
      status.rag_backend = 'connected';
      status.backend_url = ragBackendUrl;
      status.details = {
        rag_status: healthData.status,
        backend_response_time: `${new Date().getTime()}ms`,
      };

      return new Response(JSON.stringify(status), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } else {
      status.rag_backend = 'error';
      status.details = {
        status_code: response.status,
        status_text: response.statusText,
      };

      return new Response(JSON.stringify(status), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    status.rag_backend = 'disconnected';
    status.backend_url = ragBackendUrl;
    status.details = {
      error: errorMessage,
      backend_url: ragBackendUrl,
      note: 'Make sure RAG backend is running',
    };

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
