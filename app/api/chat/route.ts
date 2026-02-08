import { NextRequest } from 'next/server';
import { createGroqRequest, streamGroqChat, formatMessagesForGroq } from '@/lib/api/groqClient';
import { parseGroqStream, createChatStream } from '@/lib/api/streaming';

export const runtime = 'edge';
export const maxDuration = 60;

interface RAGCitation {
  document: string;
  page?: string;
  relevance?: number;
  url?: string;
}

/**
 * System prompt for Hieren AI - Renewable Energy Specialist
 */
const HIEREN_SYSTEM_PROMPT = `Anda adalah Hieren AI, asisten kecerdasan buatan yang dikembangkan oleh tim pengembang AI Hieren.

IDENTITAS & SPESIALISASI:
- Nama: Hieren AI
- Dikembangkan oleh: Tim AI Hieren
- Spesialisasi: Renewable Energy (Energi Terbarukan)
- Bahasa: Indonesia dan Inggris
- Enhanced dengan RAG (Retrieval-Augmented Generation) untuk akurasi teknis

AREA KEAHLIAN ANDA:
1. Solar Energy (Energi Surya) - panel surya, PLTS, solar cell
2. Wind Energy (Energi Angin) - turbin angin, PLTB
3. Hydropower (Energi Air) - PLTA, micro hydro
4. Geothermal (Energi Panas Bumi) - PLTP
5. Biomass & Biofuel (Biomassa & Biofuel)
6. Ocean Energy (Energi Laut) - wave energy, tidal energy
7. Teknologi penyimpanan energi (battery storage, grid systems)
8. Kebijakan dan regulasi energi terbarukan
9. Perhitungan ROI dan feasibility study proyek renewable energy
10. Smart grid dan integrasi renewable energy

ATURAN PENTING:
✅ JAWAB jika pertanyaan tentang:
- Renewable energy dan teknologinya
- Energi bersih dan berkelanjutan
- Proyek instalasi energi terbarukan
- Efisiensi energi dan konservasi
- Transisi energi hijau
- Perhitungan teknis dan ekonomi renewable energy

❌ JANGAN JAWAB jika pertanyaan tentang:
- Topik di luar renewable energy
- Politik, hiburan, olahraga (kecuali terkait renewable energy)
- Medis, hukum, atau konsultasi pribadi
- Topik umum yang tidak relevan dengan energi terbarukan

Jika ditanya topik di luar keahlian Anda, jawab dengan sopan:
"Maaf, saya adalah Hieren AI yang dikhususkan untuk menjawab pertanyaan seputar renewable energy (energi terbarukan). Pertanyaan Anda berada di luar kapasitas saya sebagai AI spesialis energi terbarukan. Apakah ada yang ingin Anda tanyakan tentang solar panel, wind turbine, atau teknologi energi terbarukan lainnya?"

GAYA KOMUNIKASI:
- Profesional namun ramah
- Berikan jawaban teknis yang akurat
- Sertakan data dan angka jika relevan
- Gunakan istilah teknis dengan penjelasan yang mudah dipahami
- Responsive terhadap kebutuhan user (teknis atau umum)

Selalu ingat: Anda adalah spesialis renewable energy dari Hieren, bukan general-purpose AI.`;

/**
 * Detect if query should use RAG
 */
function shouldUseRAG(text: string): boolean {
  const technicalKeywords = [
    'spesifikasi', 'specification', 'error', 'fault', 'install', 'setup',
    'troubleshoot', 'tegangan', 'voltage', 'amp', 'watt', 'power', 'panel',
    'inverter', 'battery', 'manual', 'handbook', 'technical', 'teknis',
    'cara', 'how to', 'perhitungan', 'calculation', 'solar', 'turbin',
    'turbine', 'wind', 'hydro', 'energi', 'energy', 'plts', 'pltb',
  ];
  const lowerText = text.toLowerCase();
  return technicalKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Query RAG backend and return response with citations
 */
async function queryRAGBackend(text: string, sessionId?: string): Promise<{
  response: string | null;
  citations: RAGCitation[];
}> {
  try {
    const ragUrl = process.env.RAG_BACKEND_URL || 'http://localhost:8000';
    const res = await fetch(`${ragUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, user_id: sessionId || 'web_user' }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          response: data.response,
          citations: data.citations || [],
        };
      }
    }
  } catch (error) {
    console.warn('RAG backend query failed:', error);
  }
  return { response: null, citations: [] };
}

/**
 * Format citations as markdown for appending to streamed response
 */
function formatCitationsMarkdown(citations: RAGCitation[]): string {
  if (!citations || citations.length === 0) return '';

  let md = '\n\n---\n**Referensi:**\n';
  for (const c of citations) {
    const name = c.document.replace(/\.pdf$/i, '');
    const page = c.page ? ` (hal. ${c.page})` : '';
    const score = c.relevance ? ` — relevansi ${Math.round(c.relevance * 100)}%` : '';
    if (c.url) {
      md += `- [${name}](${c.url})${page}${score}\n`;
    } else {
      md += `- ${name}${page}${score}\n`;
    }
  }
  return md;
}

/**
 * Chat streaming endpoint with RAG integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, sessionId: _sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get last user message for RAG check
    const lastUserMessage = [...messages].reverse()
      .find((m: { role: string }) => m.role === 'user');
    const userText = typeof lastUserMessage?.content === 'string'
      ? lastUserMessage.content
      : '';

    // Try RAG if query is technical
    let ragContext = '';
    let citations: RAGCitation[] = [];
    const useRAG = userText && shouldUseRAG(userText) &&
      process.env.RAG_BACKEND_URL !== 'disabled';

    if (useRAG) {
      const ragResult = await queryRAGBackend(userText, _sessionId);
      if (ragResult.response) {
        ragContext = `\n\n[Dari Knowledge Base - Informasi Teknis]\n${ragResult.response}\n\nGunakan informasi dari knowledge base di atas sebagai referensi utama untuk menjawab. Jawab dengan lengkap dan akurat.`;
        citations = ragResult.citations;
      }
    }

    // Add system prompt with optional RAG context
    const messagesWithSystem = [
      {
        role: 'system' as const,
        content: HIEREN_SYSTEM_PROMPT + ragContext,
      },
      ...messages,
    ];

    // Format messages for Groq API
    const formattedMessages = formatMessagesForGroq(messagesWithSystem);

    // Create chat completion request
    const chatRequest = createGroqRequest(formattedMessages, {
      includeTools: true,
    });

    // Stream chat response to client
    const stream = createChatStream(async (send) => {
      try {
        const groqResponse = await streamGroqChat(chatRequest);
        const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

        // Parse response and collect tool calls
        await parseGroqStream(
          groqResponse,
          (content) => {
            send(content);
          },
          (toolCall) => {
            toolCalls.push(toolCall);
          }
        );

        // If there are tool calls, execute them and continue the conversation
        if (toolCalls.length > 0) {
          send('\n\n🔍 Searching the web...\n\n');

          for (const toolCall of toolCalls) {
            if (toolCall.name === 'tavily_search') {
              try {
                const args = JSON.parse(toolCall.arguments);
                const searchQuery = args.query;

                // Execute Tavily search
                const searchResponse = await fetch(
                  `${request.nextUrl.origin}/api/search`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: searchQuery,
                      searchDepth: args.search_depth || 'basic',
                    }),
                  }
                );

                if (!searchResponse.ok) {
                  throw new Error('Search failed');
                }

                const searchResults = await searchResponse.json();

                // Create follow-up messages with tool results
                const followUpMessages = [
                  ...formattedMessages,
                  {
                    role: 'assistant' as const,
                    content: '',
                    tool_calls: [
                      {
                        id: toolCall.id,
                        type: 'function' as const,
                        function: {
                          name: toolCall.name,
                          arguments: toolCall.arguments,
                        },
                      },
                    ],
                  },
                  {
                    role: 'tool' as const,
                    content: searchResults.formatted || JSON.stringify(searchResults.results),
                    tool_call_id: toolCall.id,
                  },
                ];

                // Get AI's final response with search results
                const followUpRequest = createGroqRequest(followUpMessages, {
                  includeTools: false, // Don't allow recursive tool calls
                });

                const followUpResponse = await streamGroqChat(followUpRequest);

                // Stream the final response
                await parseGroqStream(followUpResponse, (content) => {
                  send(content);
                });
              } catch (searchError) {
                console.error('Tool execution error:', searchError);
                send('\n\n❌ Failed to execute search. Continuing without search results...\n\n');
              }
            }
          }
        }

        // Append citations at the end of the response
        if (citations.length > 0) {
          send(formatCitationsMarkdown(citations));
        }
      } catch (error) {
        console.error('Streaming error:', error);
        const message = error instanceof Error ? error.message : 'Streaming failed';
        throw new Error(message);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Vercel buffering
      },
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
