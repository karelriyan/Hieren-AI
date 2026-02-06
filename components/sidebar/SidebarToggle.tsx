'use client';

import { Menu, X } from 'lucide-react';

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-lg glass-card border border-white/10"
      aria-label="Toggle sidebar"
    >
      {isOpen ? (
        <X className="w-5 h-5 text-white" />
      ) : (
        <Menu className="w-5 h-5 text-white" />
      )}
    </button>
  );
}
