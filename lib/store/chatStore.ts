'use client';

import { create } from 'zustand';
import { Message, Session, User } from '@/types/chat';

interface ChatState {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;

  // Sessions (persisted in database - includes anonymous sessions)
  sessions: Session[];
  currentSessionId: string | null;

  // Messages
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;

  // UI State
  error: string | null;
  isLoading: boolean;

  // Auth Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuth: boolean) => void;

  // Session Actions
  createSession: (title?: string) => Promise<Session | null>;
  setCurrentSession: (sessionId: string) => void;
  loadSessions: () => Promise<void>;
  loadUserSessions: (userId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Message Actions
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Message;
  updateMessage: (messageId: string, content: string) => void;
  updateMessageStatus: (
    messageId: string,
    status: 'sending' | 'sent' | 'failed'
  ) => void;
  loadMessages: (sessionId: string) => Promise<void>;
  clearMessages: () => void;

  // Streaming Actions
  startStreaming: (messageId: string) => void;
  appendToStream: (chunk: string) => void;
  stopStreaming: () => void;

  // Error Handling
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  error: null,
  isLoading: false,

  // Auth Actions
  setUser: (user: User | null) => {
    set({ user });
  },

  setAuthenticated: (isAuth: boolean) => {
    set({ isAuthenticated: isAuth });
  },

  // Session Actions
  createSession: async (title = 'New Chat') => {
    // Always save to database (for both authenticated and anonymous users)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('Failed to create session');

      const savedSession = await response.json();

      set((state) => ({
        sessions: [savedSession, ...state.sessions],
        currentSessionId: savedSession.id,
        messages: [],
        error: null,
      }));

      return savedSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      set({ error: 'Failed to create session' });
      return null;
    }
  },

  setCurrentSession: (sessionId: string) => {
    set({
      currentSessionId: sessionId,
      messages: [],
      isStreaming: false,
      streamingMessageId: null,
      error: null,
    });
    get().loadMessages(sessionId);
  },

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to load sessions');
      const sessions = await response.json();
      set({ sessions, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  loadUserSessions: async (_userId: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to load sessions');
      const sessions = await response.json();
      set({ sessions, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSessionTitle: async (sessionId: string, title: string) => {
    // Always update in database (for both authenticated and anonymous users)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('Failed to update session title');

      // Update local state
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, title } : s
        ),
      }));
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  },

  deleteSession: async (sessionId: string) => {
    // Always delete from database (for both authenticated and anonymous users)
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete session');

      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSessionId:
          state.currentSessionId === sessionId ? null : state.currentSessionId,
        messages: state.currentSessionId === sessionId ? [] : state.messages,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  // Message Actions
  addMessage: (message) => {
    const newMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    } as Message;

    const { currentSessionId } = get();

    // Update messages in current view
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));

    // Save to database (for both authenticated and anonymous users)
    // But NOT for assistant messages yet - they'll be saved after streaming
    if (currentSessionId && newMessage.role !== 'assistant') {
      // Save to database asynchronously (don't block UI)
      console.log('💾 Saving user message:', {
        role: newMessage.role,
        contentLength: newMessage.content?.length || 0,
        hasContent: !!newMessage.content,
        sessionId: currentSessionId
      });

      fetch(`/api/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newMessage.role,
          content: newMessage.content,
          status: newMessage.status,
          tokensUsed: newMessage.tokensUsed,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            console.log('✅ User message saved successfully');
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error('❌ Failed to save user message:', {
              status: res.status,
              error: errorData
            });
          }
        })
        .catch((error) => {
          console.error('❌ Network error saving message:', error);
        });
    }

    return newMessage;
  },

  updateMessage: (messageId: string, content: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content } : m
      ),
    }));
  },

  updateMessageStatus: (
    messageId: string,
    status: 'sending' | 'sent' | 'failed'
  ) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, status } : m
      ),
    }));
  },

  loadMessages: async (sessionId: string) => {
    // Load from database (for both authenticated and anonymous users)
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`);
      if (!response.ok) throw new Error('Failed to load messages');
      const messages = await response.json();
      set({ messages, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      isStreaming: false,
      streamingMessageId: null,
    });
  },

  // Streaming Actions
  startStreaming: (messageId: string) => {
    set({
      isStreaming: true,
      streamingMessageId: messageId,
      error: null,
    });
  },

  appendToStream: (chunk: string) => {
    const { streamingMessageId, messages } = get();
    if (!streamingMessageId) return;

    const updatedMessages = messages.map((m) => {
      if (m.id === streamingMessageId) {
        if (typeof m.content === 'string') {
          return { ...m, content: m.content + chunk };
        }
      }
      return m;
    });

    set({ messages: updatedMessages });
  },

  stopStreaming: () => {
    const { streamingMessageId, currentSessionId } = get();
    if (streamingMessageId) {
      get().updateMessageStatus(streamingMessageId, 'sent');

      // Save assistant message to database now that streaming is complete
      // (for both authenticated and anonymous users)
      if (currentSessionId) {
        // Get the latest message state after status update
        const completedMessage = get().messages.find(m => m.id === streamingMessageId);

        if (completedMessage && completedMessage.role === 'assistant') {
          console.log('💾 Saving assistant message to DB:', {
            id: completedMessage.id,
            contentLength: completedMessage.content?.length || 0,
            sessionId: currentSessionId
          });

          fetch(`/api/sessions/${currentSessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: completedMessage.role,
              content: completedMessage.content,
              status: 'sent',
              tokensUsed: completedMessage.tokensUsed,
            }),
          })
            .then(res => {
              if (res.ok) {
                console.log('✅ Assistant message saved successfully');
              } else {
                console.error('❌ Failed to save, status:', res.status);
              }
            })
            .catch((error) => {
              console.error('❌ Failed to save assistant message to database:', error);
            });
        } else {
          console.warn('⚠️ No assistant message found to save:', {
            messageFound: !!completedMessage,
            role: completedMessage?.role,
            streamingMessageId
          });
        }
      } else {
        console.log('ℹ️ Skipping save - no session');
      }
    }
    set({
      isStreaming: false,
      streamingMessageId: null,
    });
  },

  // Error Handling
  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
