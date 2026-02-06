'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { useChatStore } from '@/lib/store/chatStore';
import SessionItem from './SessionItem';
import UserMenu from './UserMenu';
import AuthModal from '@/components/auth/AuthModal';
import { PlusCircle } from 'lucide-react';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {
    sessions,
    currentSessionId,
    createSession,
    setCurrentSession,
    deleteSession,
    updateSessionTitle,
  } = useChatStore();

  // For anonymous users, sessions array will be empty on page load
  // and will only populate when they create/chat
  const allSessions = sessions;

  return (
    <aside
      className={`
        fixed lg:relative
        top-0 left-0 h-full
        w-80 z-50
        flex flex-col
        glass-card border-r border-white/10
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* New Chat Button */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={() => {
            createSession('New Chat');
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          New Chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 chat-scroll overflow-x-hidden p-2">
        {allSessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === currentSessionId}
            onClick={() => {
              setCurrentSession(session.id);
              onClose();
            }}
            onDelete={() => deleteSession(session.id)}
            onRename={(newTitle) => updateSessionTitle(session.id, newTitle)}
          />
        ))}

        {allSessions.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">
            No conversations yet
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        {isAuthenticated && user ? (
          <UserMenu user={user} onSignOut={signOut} />
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full px-4 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-all"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </aside>
  );
}
