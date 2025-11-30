'use client';

import { STATUS_COLORS } from '@/lib/user-status-constants';

type StatusType = 'online' | 'away' | 'dnd' | 'invisible' | 'offline';

interface UserStatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showBorder?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const BORDER_CLASSES = {
  sm: 'ring-1 ring-offset-1',
  md: 'ring-2 ring-offset-1',
  lg: 'ring-2 ring-offset-2',
};

export default function UserStatusIndicator({
  status,
  size = 'md',
  showBorder = true,
  className = '',
}: UserStatusIndicatorProps) {
  // Map invisible to offline for display
  const displayStatus = status === 'invisible' ? 'offline' : status;
  const color = STATUS_COLORS[displayStatus] || STATUS_COLORS.offline;

  return (
    <span
      className={`
        inline-block rounded-full
        ${SIZE_CLASSES[size]}
        ${showBorder ? `${BORDER_CLASSES[size]} ring-white dark:ring-gray-800` : ''}
        ${className}
      `}
      style={{ backgroundColor: color }}
      title={getStatusLabel(displayStatus)}
    />
  );
}

function getStatusLabel(status: StatusType): string {
  const labels: Record<StatusType, string> = {
    online: 'En línea',
    away: 'Ausente',
    dnd: 'No molestar',
    invisible: 'Invisible',
    offline: 'Desconectado',
  };
  return labels[status] || 'Desconectado';
}

// Animated version with pulse for online status
export function UserStatusIndicatorAnimated({
  status,
  size = 'md',
  showBorder = true,
  className = '',
}: UserStatusIndicatorProps) {
  const displayStatus = status === 'invisible' ? 'offline' : status;
  const color = STATUS_COLORS[displayStatus] || STATUS_COLORS.offline;
  const isOnline = displayStatus === 'online';

  return (
    <span className={`relative inline-flex ${className}`}>
      <span
        className={`
          inline-block rounded-full
          ${SIZE_CLASSES[size]}
          ${showBorder ? `${BORDER_CLASSES[size]} ring-white dark:ring-gray-800` : ''}
        `}
        style={{ backgroundColor: color }}
        title={getStatusLabel(displayStatus)}
      />
      {isOnline && (
        <span
          className={`
            absolute inline-flex rounded-full opacity-75 animate-ping
            ${SIZE_CLASSES[size]}
          `}
          style={{ backgroundColor: color }}
        />
      )}
    </span>
  );
}
