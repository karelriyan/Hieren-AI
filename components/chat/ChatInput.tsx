'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import FileUpload from '@/components/ui/FileUpload';
import { useChatStore } from '@/lib/store/chatStore';
import { parseChatStream } from '@/lib/api/streaming';
import { compressImage, validateImage } from '@/lib/utils/imageCompression';
import { ContentBlock } from '@/types/chat';

/**
 * Chat input component with message submission and file upload
 */
export default function ChatInput() {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    currentSessionId,
    messages,
    addMessage,
    startStreaming,
    appendToStream,
    stopStreaming,
    isStreaming,
    sessions,
    updateSessionTitle,
    createSession,
  } = useChatStore();

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

    // Need either text message or attachments
    if ((!message.trim() && attachments.length === 0) || isStreaming || isProcessingAttachments) {
      return;
    }

    // Create session if none exists (user's first message)
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createSession('New Chat');
      sessionId = newSession?.id || currentSessionId;
      if (!sessionId) {
        console.error('Failed to create session');
        return;
      }
    }

    setIsProcessingAttachments(true);

    try {
      // Process attachments (compress images to base64)
      const processedAttachments: Array<{ file: File; base64: string }> = [];

      for (const file of attachments) {
        if (file.type.startsWith('image/')) {
          // Validate image
          const validation = validateImage(file);
          if (!validation.valid) {
            console.error('Invalid image:', validation.error);
            continue;
          }

          // Compress image to base64
          try {
            const base64 = await compressImage(file, {
              maxSizeMB: 4,
              maxWidthOrHeight: 2048,
              quality: 0.8,
            });
            processedAttachments.push({ file, base64 });
          } catch (error) {
            console.error('Failed to compress image:', error);
          }
        }
      }

      // Build multimodal content if we have images
      let userContent: string | ContentBlock[];

      if (processedAttachments.length > 0) {
        // Multimodal: text + images
        const contentBlocks: ContentBlock[] = [];

        if (message.trim()) {
          contentBlocks.push({
            type: 'text',
            text: message.trim(),
          });
        }

        for (const attachment of processedAttachments) {
          contentBlocks.push({
            type: 'image_url',
            image_url: {
              url: attachment.base64,
            },
          });
        }

        userContent = contentBlocks;
      } else {
        // Text only
        userContent = message;
      }

      // Add user message
      const userMessage = {
        role: 'user' as const,
        content: userContent,
        status: 'sent' as const,
        sessionId: sessionId,
      };

      const addedUserMessage = addMessage(userMessage);

      // Save attachments metadata to database if authenticated
      if (processedAttachments.length > 0 && addedUserMessage.id) {
        try {
          await fetch('/api/attachments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: addedUserMessage.id,
              attachments: processedAttachments.map(att => ({
                fileName: att.file.name,
                fileType: 'image',
                base64Data: att.base64,
              })),
            }),
          });
        } catch (error) {
          console.error('Failed to save attachments:', error);
        }
      }

      // Create assistant message for streaming
      const assistantMessage = addMessage({
        role: 'assistant' as const,
        content: '',
        status: 'sending' as const,
        sessionId: sessionId,
      });

      startStreaming(assistantMessage.id);

      // Build conversation history (all previous messages + new user message)
      const conversationHistory = [
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: userMessage.role,
          content: userContent,
        }
      ];

      // Call streaming chat endpoint with full conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Parse streaming response
      await parseChatStream(response, (content) => {
        appendToStream(content);
      });

      // Auto-generate title from first message
      const currentSession = sessions.find(s => s.id === sessionId);

      if (currentSession &&
          currentSession.title === 'New Chat' &&
          messages.length === 0) { // First exchange (before adding messages)

        try {
          // Extract text from user content for title generation
          let userText = '';
          if (typeof userContent === 'string') {
            userText = userContent;
          } else {
            const textBlock = userContent.find(block => block.type === 'text');
            if (textBlock && textBlock.type === 'text') {
              userText = textBlock.text;
            }
          }

          if (userText) {
            // Call Groq API to generate a short title
            const titleResponse = await fetch('/api/generate-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: userText }),
            });

            if (titleResponse.ok) {
              const { title } = await titleResponse.json();
              if (title && sessionId) {
                updateSessionTitle(sessionId, title);
              }
            }
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
          // Silent fail - not critical
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessingAttachments(false);
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
            disabled={(!message.trim() && attachments.length === 0) || isStreaming || isProcessingAttachments}
            isLoading={isStreaming || isProcessingAttachments}
          >
            {isProcessingAttachments ? 'Processing...' : 'Send'}
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
