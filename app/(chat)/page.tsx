'use client';

import { useEffect } from 'react';
import AnimatedBackground from '@/components/background/AnimatedBackground';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { useChatStore } from '@/lib/store/chatStore';

/**
 * Main chat page - responsive mobile-first layout
 */
export default function ChatPage() {
  const {
    messages,
    isStreaming,
    error,
    currentSessionId,
    createSession,
    loadSessions,
    setError,
  } = useChatStore();

  useEffect(() => {
    // Initialize: create first session if none exists
    loadSessions().then(() => {
      if (!currentSessionId) {
        createSession();
      }
    });
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground />

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 gap-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Hieren AI</h1>
              <p className="text-xs sm:text-sm text-gray-400">Powered by Groq Llama 4 Scout</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              createSession();
              setError(null);
            }}
            className="hidden sm:flex"
          >
            New Chat
          </Button>
        </header>

        {/* Error Display */}
        {error && (
          <GlassCard className="bg-red-500/10 border-red-500/30 px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-red-300">Error</h4>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 ml-4"
              >
                ✕
              </button>
            </div>
          </GlassCard>
        )}

        {/* Messages Container */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <MessageList messages={messages} isStreaming={isStreaming} />
        </main>

        {/* Input Container */}
        <footer className="flex-shrink-0">
          {!currentSessionId ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Initializing...</p>
            </div>
          ) : (
            <ChatInput />
          )}
        </footer>
      </div>
    </div>
  );
}
