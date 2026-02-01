'use client';

import { create } from 'zustand';
import { Message, Session } from '@/types/chat';

interface ChatState {
  // Sessions
  sessions: Session[];
  currentSessionId: string | null;

  // Messages
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;

  // UI State
  error: string | null;
  isLoading: boolean;

  // Session Actions
  createSession: (title?: string) => void;
  setCurrentSession: (sessionId: string) => void;
  loadSessions: () => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;

  // Message Actions
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => void;
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
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  error: null,
  isLoading: false,

  // Session Actions
  createSession: (title = 'New Chat') => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date(),
      lastUpdated: new Date(),
      modelUsed: 'meta-llama/llama-4-scout-17b-16e-instruct',
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSessionId: newSession.id,
      messages: [],
      error: null,
    }));
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

  updateSessionTitle: (sessionId: string, title: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    }));
  },

  deleteSession: async (sessionId: string) => {
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
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
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
    const { streamingMessageId } = get();
    if (streamingMessageId) {
      get().updateMessageStatus(streamingMessageId, 'sent');
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
