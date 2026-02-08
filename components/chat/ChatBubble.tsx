'use client';

import ReactMarkdown from 'react-markdown';
import GlassCard from '@/components/ui/GlassCard';
import { ContentBlock } from '@/types/chat';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  isStreaming?: boolean;
  timestamp?: Date;
}

/**
 * Chat message bubble component
 * Supports markdown rendering and streaming animations
 */
export default function ChatBubble({
  role,
  content,
  isStreaming = false,
  timestamp,
}: ChatBubbleProps) {
  const isUser = role === 'user';

  // Helper function to render multimodal content
  const renderContent = () => {
    // Handle string content (simple text message)
    if (typeof content === 'string') {
      return isUser ? (
        <p className="text-white whitespace-pre-wrap break-words">{content}</p>
      ) : (
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>
            ),
            p: ({ children }) => <p className="mb-2 text-sm md:text-base">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="text-sm md:text-base">{children}</li>,
            code: ({ children, ...props }: any) => {
              const inline = !props.className;
              return inline ? (
                <code className="bg-black/30 px-2 py-1 rounded text-sm font-mono">
                  {children}
                </code>
              ) : (
                <code className="block bg-black/30 p-3 rounded text-sm font-mono overflow-x-auto">
                  {children}
                </code>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-300 my-2">
                {children}
              </blockquote>
            ),
            hr: () => (
              <hr className="border-t border-white/10 my-3" />
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      );
    }

    // Handle ContentBlock[] (multimodal: text + images)
    return (
      <div className="flex flex-col gap-3">
        {content.map((block, index) => {
          if (block.type === 'text') {
            return isUser ? (
              <p key={index} className="text-white whitespace-pre-wrap break-words">
                {block.text}
              </p>
            ) : (
              <ReactMarkdown
                key={index}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>
                  ),
                  p: ({ children }) => <p className="mb-2 text-sm md:text-base">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => <li className="text-sm md:text-base">{children}</li>,
                  code: ({ children, ...props }: any) => {
                    const inline = !props.className;
                    return inline ? (
                      <code className="bg-black/30 px-2 py-1 rounded text-sm font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-black/30 p-3 rounded text-sm font-mono overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-300 my-2">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="border-t border-white/10 my-3" />
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {block.text}
              </ReactMarkdown>
            );
          }

          if (block.type === 'image_url') {
            return (
              <div key={index} className="relative w-full max-w-md rounded-lg overflow-hidden">
                <img
                  src={block.image_url.url}
                  alt="User uploaded image"
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-[85%] md:max-w-2xl flex flex-col gap-2`}>
        <GlassCard
          variant={isUser ? 'default' : 'elevated'}
          className={`px-4 md:px-6 py-3 md:py-4 ${
            isUser
              ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-400/30'
              : 'bg-glass/50'
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none dark">
            {renderContent()}

            {isStreaming && (
              <span className="inline-block ml-1 animate-pulse font-bold">▊</span>
            )}
          </div>
        </GlassCard>

        {timestamp && (
          <div className="text-xs text-gray-400 px-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
