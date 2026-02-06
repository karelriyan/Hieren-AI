'use client';

import { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import StreamingIndicator from './StreamingIndicator';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

/**
 * Message list component with auto-scroll to bottom
 * Renders all messages with proper formatting and animations
 */
export default function MessageList({ messages, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4 pb-4 px-4 md:px-0"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 gradient-text">Welcome to Hieren AI</h2>
            <p className="text-gray-300">
              Start a conversation by typing a message below or upload an image/document.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              role={message.role as 'user' | 'assistant'}
              content={message.content}
              timestamp={message.createdAt}
            />
          ))}

          {isStreaming && <StreamingIndicator />}

          <div ref={endOfMessagesRef} />
        </>
      )}
    </div>
  );
}
