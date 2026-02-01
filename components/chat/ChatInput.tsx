'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import FileUpload from '@/components/ui/FileUpload';
import { useChatStore } from '@/lib/store/chatStore';
import { parseGroqStream } from '@/lib/api/streaming';

/**
 * Chat input component with message submission and file upload
 */
export default function ChatInput() {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentSessionId, addMessage, startStreaming, appendToStream, stopStreaming, isStreaming } =
    useChatStore();

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleAttachments = (files: File[]) => {
    setAttachments((prev) => [...prev, ...files]);
    setShowFileUpload(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !currentSessionId || isStreaming) return;

    // Add user message
    const userMessage = {
      role: 'user' as const,
      content: message,
      status: 'sent' as const,
      sessionId: currentSessionId,
    };

    addMessage(userMessage);

    // Create assistant message for streaming
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage = {
      role: 'assistant' as const,
      content: '',
      status: 'sending' as const,
      sessionId: currentSessionId,
      id: assistantMessageId,
      createdAt: new Date(),
    };

    startStreaming(assistantMessageId);

    try {
      // Call streaming chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          messages: [userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Parse streaming response
      await parseGroqStream(response, (content) => {
        appendToStream(content);
      });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      stopStreaming();
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* File Upload */}
      {showFileUpload && (
        <FileUpload
          onFilesSelected={handleAttachments}
          onClose={() => setShowFileUpload(false)}
        />
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map((file, index) => (
            <GlassCard
              key={index}
              className="px-3 py-2 text-sm flex items-center gap-2"
            >
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-red-400 hover:text-red-300 font-bold ml-2"
              >
                ✕
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Input Area */}
      <GlassCard className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          placeholder="Ask Hieren anything..."
          className="flex-1 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-white placeholder-gray-400 min-h-12"
          rows={1}
          disabled={isStreaming}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <div className="flex gap-2 items-end pb-2">
          <button
            type="button"
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Attach file"
            disabled={isStreaming}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6-4m6 4l6-4"
              />
            </svg>
          </button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!message.trim() || isStreaming}
            isLoading={isStreaming}
          >
            Send
          </Button>
        </div>
      </GlassCard>

      {/* Helper Text */}
      <p className="text-xs text-gray-400 text-center">
        Press Shift + Enter for new line • Powered by Groq Llama 4 Scout
      </p>
    </form>
  );
}
