'use client';

import { User } from 'lucide-react';
import UserStatusIndicator from './UserStatusIndicator';

type StatusType = 'online' | 'away' | 'dnd' | 'invisible' | 'offline';

interface UserWithStatusProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  status: StatusType;
  customStatus?: string;
  customStatusEmoji?: string;
  lastSeenAt?: Date | string;
  showLastSeen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIGS = {
  sm: {
    avatar: 'w-6 h-6',
    icon: 'w-3 h-3',
    name: 'text-xs',
    status: 'text-xs',
    indicator: 'sm' as const,
    indicatorPosition: '-bottom-0.5 -right-0.5',
  },
  md: {
    avatar: 'w-8 h-8',
    icon: 'w-4 h-4',
    name: 'text-sm',
    status: 'text-xs',
    indicator: 'sm' as const,
    indicatorPosition: '-bottom-0.5 -right-0.5',
  },
  lg: {
    avatar: 'w-10 h-10',
    icon: 'w-5 h-5',
    name: 'text-base',
    status: 'text-sm',
    indicator: 'md' as const,
    indicatorPosition: '-bottom-1 -right-1',
  },
};

export default function UserWithStatus({
  name,
  email,
  avatarUrl,
  status,
  customStatus,
  customStatusEmoji,
  lastSeenAt,
  showLastSeen = false,
  size = 'md',
  className = '',
}: UserWithStatusProps) {
  const config = SIZE_CONFIGS[size];
  const displayStatus = status === 'invisible' ? 'offline' : status;

  const getLastSeenText = () => {
    if (!lastSeenAt) return null;

    const date = typeof lastSeenAt === 'string' ? new Date(lastSeenAt) : lastSeenAt;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (displayStatus === 'online') return null;
    if (minutes < 1) return 'Visto ahora';
    if (minutes < 60) return `Visto hace ${minutes} min`;
    if (hours < 24) return `Visto hace ${hours}h`;
    if (days < 7) return `Visto hace ${days}d`;

    return `Visto ${date.toLocaleDateString('es-MX')}`;
  };

  const lastSeenText = showLastSeen ? getLastSeenText() : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar with status indicator */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className={`${config.avatar} rounded-full object-cover`}
          />
        ) : (
          <div className={`${config.avatar} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
            <User className={`${config.icon} text-gray-500 dark:text-gray-400`} />
          </div>
        )}
        <div className={`absolute ${config.indicatorPosition}`}>
          <UserStatusIndicator status={displayStatus} size={config.indicator} />
        </div>
      </div>

      {/* Name and status */}
      <div className="min-w-0 flex-1">
        <div className={`font-medium text-gray-900 dark:text-white truncate ${config.name}`}>
          {name}
        </div>
        {(customStatus || lastSeenText) && (
          <div className={`text-gray-500 dark:text-gray-400 truncate ${config.status}`}>
            {customStatus ? (
              <>
                {customStatusEmoji && <span className="mr-1">{customStatusEmoji}</span>}
                {customStatus}
              </>
            ) : (
              lastSeenText
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for lists
export function UserWithStatusCompact({
  name,
  status,
  customStatusEmoji,
  className = '',
}: {
  name: string;
  status: StatusType;
  customStatusEmoji?: string;
  className?: string;
}) {
  const displayStatus = status === 'invisible' ? 'offline' : status;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <UserStatusIndicator status={displayStatus} size="sm" showBorder={false} />
      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
        {customStatusEmoji && <span className="mr-0.5">{customStatusEmoji}</span>}
        {name}
      </span>
    </div>
  );
}
