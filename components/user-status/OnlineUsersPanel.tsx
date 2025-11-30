'use client';

import { useState, useEffect } from 'react';
import { Users, X, ChevronRight } from 'lucide-react';
import UserWithStatus from './UserWithStatus';
import { useUsersStatus } from '@/hooks/useUserStatus';

interface OnlineUser {
  id: string;
  info: {
    name: string;
    email: string;
  };
}

interface OnlineUsersPanelProps {
  onlineUsers: OnlineUser[];
  typingUsers: string[];
  className?: string;
}

export default function OnlineUsersPanel({
  onlineUsers,
  typingUsers,
  className = '',
}: OnlineUsersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userIds = onlineUsers.map(u => u.id);
  const { statuses, loading } = useUsersStatus(userIds);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Compact indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={onlineUsers.map(u => u.info.name).join(', ')}
      >
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75" />
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {onlineUsers.length} en línea
        </span>
        <ChevronRight
          className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Usuarios en línea
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {/* Typing users */}
            {typingUsers.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Escribiendo...
                </div>
                {typingUsers.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-blue-500">✍️</span>
                    {name}
                  </div>
                ))}
              </div>
            )}

            {/* Online users list */}
            {onlineUsers.map((user) => {
              const userStatus = statuses[user.id];
              const status = userStatus?.displayStatus || 'online';
              const customStatus = userStatus?.customStatus;
              const customStatusEmoji = userStatus?.customStatusEmoji;
              const lastSeenAt = userStatus?.lastSeenAt;

              return (
                <div
                  key={user.id}
                  className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <UserWithStatus
                    name={user.info.name}
                    email={user.info.email}
                    status={status as any}
                    customStatus={customStatus}
                    customStatusEmoji={customStatusEmoji}
                    lastSeenAt={lastSeenAt}
                    showLastSeen
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Typing indicator component
export function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} está escribiendo`
      : users.length === 2
      ? `${users[0]} y ${users[1]} están escribiendo`
      : `${users[0]} y ${users.length - 1} más están escribiendo`;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}
