import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hieren AI Chat',
  description: 'Chat with Hieren AI - Advanced multimodal AI assistant',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {children}
    </div>
  );
}
