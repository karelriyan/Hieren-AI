'use client';

import { User } from '@/types/chat';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  user: User;
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors">
      <img
        src={user.image || '/images/default-profile.jpg'}
        alt={user.name || 'User'}
        className="w-10 h-10 rounded-full border-2 border-white/20"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {user.name}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {user.email}
        </p>
      </div>
      <button
        onClick={onSignOut}
        className="p-2 hover:bg-red-500/20 rounded transition-colors"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
