'use client';

import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';
import ChatSidebar from '@/components/sidebar/ChatSidebar';
import SidebarToggle from '@/components/sidebar/SidebarToggle';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
        {/* Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>

        {/* Mobile Toggle */}
        <SidebarToggle
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </SessionProvider>
  );
}
