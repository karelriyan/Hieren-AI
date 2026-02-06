'use client';

import { useState, useRef, useEffect } from 'react';
import { Session } from '@/types/chat';
import { Trash2, Pencil, Check, X } from 'lucide-react';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export default function SessionItem({ session, isActive, onClick, onDelete, onRename }: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== session.title) {
      onRename(trimmedTitle);
    } else {
      setEditedTitle(session.title); // Reset if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(session.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      onClick={!isEditing ? onClick : undefined}
      className={`
        group relative p-3 rounded-lg mb-2
        ${!isEditing ? 'cursor-pointer hover:bg-white/10' : ''}
        transition-all
        ${isActive ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-l-2 border-blue-500' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/10 text-white text-sm px-2 py-1 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={50}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 hover:bg-green-500/20 rounded"
                aria-label="Save"
              >
                <Check className="w-3 h-3 text-green-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 hover:bg-red-500/20 rounded"
                aria-label="Cancel"
              >
                <X className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-medium text-white truncate">
                {session.title}
              </h4>
              <p className="text-xs text-gray-400">
                {formatRelativeTime(session.lastUpdated)}
              </p>
              {session.isTemporary && (
                <span className="text-xs text-yellow-400">• Temporary</span>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-blue-500/20 rounded"
              aria-label="Rename session"
            >
              <Pencil className="w-3 h-3 text-blue-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this conversation?')) {
                  onDelete();
                }
              }}
              className="p-1 hover:bg-red-500/20 rounded"
              aria-label="Delete session"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
