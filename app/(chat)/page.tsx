'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import AnimatedBackground from '@/components/background/AnimatedBackground';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import GlassCard from '@/components/ui/GlassCard';
import { useChatStore } from '@/lib/store/chatStore';

/**
 * Main chat page - responsive mobile-first layout
 */
export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const {
    messages,
    isStreaming,
    error,
    currentSessionId,
    setUser,
    setAuthenticated,
    loadUserSessions,
    setError,
  } = useChatStore();

  // Sync auth state to store
  useEffect(() => {
    setUser(user || null);
    setAuthenticated(isAuthenticated);
  }, [user, isAuthenticated, setUser, setAuthenticated]);

  // Load sessions on login and transfer anonymous session if exists
  useEffect(() => {
    if (isAuthenticated && user) {
      // If user has an active session, transfer it from anonymous to their account
      if (currentSessionId && messages.length > 0) {
        // Transfer the current anonymous session to the logged-in user
        fetch(`/api/sessions/${currentSessionId}/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
          .then(res => {
            if (res.ok) {
              console.log('✅ Anonymous session transferred to user account');
            } else {
              console.error('❌ Failed to transfer session');
            }
          })
          .catch(error => {
            console.error('❌ Error transferring session:', error);
          })
          .finally(() => {
            // Load all user sessions (including the transferred one)
            loadUserSessions(user.id);
          });
      } else {
        // No active session, just load user's existing sessions
        loadUserSessions(user.id);
      }
    }
  }, [isAuthenticated, user, loadUserSessions, currentSessionId, messages.length]);

  return (
    <div className="relative h-full flex flex-col">
      <AnimatedBackground />

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 gap-6 h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
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
        <main className="flex-1 flex flex-col chat-scroll overflow-x-hidden pr-1">
          <MessageList messages={messages} isStreaming={isStreaming} />
        </main>

        {/* Input Container */}
        <footer className="flex-shrink-0">
          <ChatInput />
        </footer>
      </div>
    </div>
  );
}
