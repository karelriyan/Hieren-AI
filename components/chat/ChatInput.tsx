'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import FileUpload from '@/components/ui/FileUpload';
import { useChatStore } from '@/lib/store/chatStore';
import { parseChatStream } from '@/lib/api/streaming';
import { compressImage, validateImage } from '@/lib/utils/imageCompression';
import { convertPDFToImages, validatePDF } from '@/lib/utils/pdfProcessor';
import {
  extractTextFromDocx,
  extractTextFromExcel,
  extractTextFromCSV,
  extractTextFromPlainText,
  validateDocument,
  getDocumentType
} from '@/lib/utils/documentProcessor';
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
      // Process attachments (images, PDFs, and documents)
      const processedAttachments: Array<{
        file: File;
        base64?: string;
        text?: string;
        images?: string[]; // For PDF pages as images
        type: 'image' | 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'other'
      }> = [];

      for (const file of attachments) {
        if (file.type.startsWith('image/')) {
          // Process images
          const validation = validateImage(file);
          if (!validation.valid) {
            console.error('Invalid image:', validation.error);
            continue;
          }

          try {
            const base64 = await compressImage(file, {
              maxSizeMB: 4,
              maxWidthOrHeight: 2048,
              quality: 0.8,
            });
            processedAttachments.push({ file, base64, type: 'image' });
          } catch (error) {
            console.error('Failed to compress image:', error);
          }
        } else if (file.type === 'application/pdf') {
          // Process PDF - Convert pages to images for vision
          const validation = validatePDF(file);
          if (!validation.valid) {
            console.error('Invalid PDF:', validation.error);
            continue;
          }

          try {
            const pageImages = await convertPDFToImages(file);
            processedAttachments.push({ file, images: pageImages, type: 'pdf' });
          } catch (error) {
            console.error('Failed to convert PDF to images:', error);
          }
        } else {
          // Process other documents (DOCX, XLSX, CSV, TXT)
          const validation = validateDocument(file);
          if (!validation.valid) {
            console.error('Invalid document:', validation.error);
            continue;
          }

          try {
            const docType = getDocumentType(file);
            let text = '';

            switch (docType) {
              case 'docx':
                text = await extractTextFromDocx(file);
                processedAttachments.push({ file, text, type: 'docx' });
                break;
              case 'xlsx':
                text = await extractTextFromExcel(file);
                processedAttachments.push({ file, text, type: 'xlsx' });
                break;
              case 'csv':
                text = await extractTextFromCSV(file);
                processedAttachments.push({ file, text, type: 'csv' });
                break;
              case 'txt':
                text = await extractTextFromPlainText(file);
                processedAttachments.push({ file, text, type: 'txt' });
                break;
              default:
                console.warn('Unsupported document type:', file.type);
            }
          } catch (error) {
            console.error('Failed to process document:', error);
          }
        }
      }

      // Build multimodal content if we have attachments
      let userContent: string | ContentBlock[];

      if (processedAttachments.length > 0) {
        // Multimodal: text + images + documents
        const contentBlocks: ContentBlock[] = [];

        // Add user message text first
        if (message.trim()) {
          contentBlocks.push({
            type: 'text',
            text: message.trim(),
          });
        }

        // Add attachments
        for (const attachment of processedAttachments) {
          if (attachment.type === 'image' && attachment.base64) {
            // Add regular image
            contentBlocks.push({
              type: 'image_url',
              image_url: {
                url: attachment.base64,
              },
            });
          } else if (attachment.type === 'pdf' && attachment.images) {
            // Add PDF pages as images (vision mode)
            contentBlocks.push({
              type: 'text',
              text: `\n\n[PDF Document: ${attachment.file.name} - ${attachment.images.length} page(s)]\n`,
            });

            // Add each page as an image
            attachment.images.forEach((imageUrl) => {
              contentBlocks.push({
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              });
            });
          } else if (attachment.text) {
            // Add document text content (DOCX, XLSX, CSV, TXT)
            const docTypeLabels: Record<string, string> = {
              docx: 'Word Document',
              xlsx: 'Excel Spreadsheet',
              csv: 'CSV Data',
              txt: 'Text File'
            };
            const docTypeLabel = docTypeLabels[attachment.type] || 'Document';

            contentBlocks.push({
              type: 'text',
              text: `\n\n[${docTypeLabel}: ${attachment.file.name}]\n${attachment.text}`,
            });
          }
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

      // Save attachments metadata to database
      if (processedAttachments.length > 0 && addedUserMessage.id) {
        try {
          await fetch('/api/attachments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: addedUserMessage.id,
              attachments: processedAttachments.map(att => {
                // Build metadata based on attachment type
                let metadata = null;
                if (att.text) {
                  // Documents with extracted text (DOCX, XLSX, CSV, TXT)
                  metadata = { extractedText: att.text, fileSize: att.file.size };
                } else if (att.images && att.images.length > 0) {
                  // PDF converted to images
                  metadata = {
                    pageCount: att.images.length,
                    fileSize: att.file.size,
                    processingMethod: 'vision'
                  };
                }

                return {
                  fileName: att.file.name,
                  fileType: att.type === 'image' ? 'image' : 'document',
                  base64Data: att.base64 || null,
                  metadata,
                };
              }),
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
          {attachments.map((file, index) => {
            // Get appropriate icon for file type
            const getFileIcon = () => {
              if (file.type.startsWith('image/')) return '🖼️';
              if (file.type === 'application/pdf') return '📄';
              if (file.name.match(/\.(docx?|doc)$/i)) return '📝';
              if (file.name.match(/\.(xlsx?|xls)$/i)) return '📊';
              if (file.name.match(/\.csv$/i)) return '📈';
              if (file.name.match(/\.(txt|md)$/i)) return '📃';
              return '📎';
            };

            return (
              <GlassCard
                key={index}
                className="px-3 py-2 text-sm flex items-center gap-2"
              >
                {getFileIcon()}
                <span className="max-w-[200px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-400 hover:text-red-300 font-bold ml-2"
                >
                  ✕
                </button>
              </GlassCard>
            );
          })}
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
