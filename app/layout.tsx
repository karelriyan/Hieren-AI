import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hieren AI - Advanced AI Chat Assistant',
  description: 'Hieren AI: Multimodal AI assistant with streaming responses, image vision, document processing, and real-time web search.',
  keywords: ['AI', 'Chat', 'LLM', 'Groq', 'Assistant'],
  openGraph: {
    title: 'Hieren AI - Advanced AI Chat Assistant',
    description: 'Multimodal AI assistant powered by Groq Llama 4 Scout',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
