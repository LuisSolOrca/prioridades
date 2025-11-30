'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getPusherClient } from '@/lib/pusher-client';

type PresenceStatus = 'online' | 'away' | 'dnd' | 'invisible';
type StatusType = PresenceStatus | 'offline';

interface UserStatus {
  status: PresenceStatus;
  customStatus?: string;
  customStatusEmoji?: string;
  customStatusExpiresAt?: Date;
  lastSeenAt?: Date;
  isConnected: boolean;
}

interface UseUserStatusResult {
  status: UserStatus | null;
  loading: boolean;
  error: string | null;
  updateStatus: (newStatus: PresenceStatus) => Promise<void>;
  updateCustomStatus: (text?: string, emoji?: string, expiresAt?: Date) => Promise<void>;
  clearCustomStatus: () => Promise<void>;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useUserStatus(): UseUserStatusResult {
  const { data: session } = useSession();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    if (!session?.user) return;

    try {
      const res = await fetch('/api/user/status');
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus(data.status);
      }
    } catch (err: any) {
      console.error('Error fetching user status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async (action?: 'connect' | 'disconnect' | 'heartbeat') => {
    if (!session?.user) return;

    try {
      await fetch('/api/user/status/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action || 'heartbeat' }),
      });
    } catch (err) {
      console.error('Error sending heartbeat:', err);
    }
  }, [session?.user]);

  // Update presence status
  const updateStatus = useCallback(async (newStatus: PresenceStatus) => {
    if (!session?.user) return;

    try {
      const res = await fetch('/api/user/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus(data.status);
      } else {
        throw new Error(data.error || 'Error al actualizar estado');
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  }, [session?.user]);

  // Update custom status
  const updateCustomStatus = useCallback(async (
    text?: string,
    emoji?: string,
    expiresAt?: Date
  ) => {
    if (!session?.user) return;

    try {
      const res = await fetch('/api/user/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customStatus: text,
          customStatusEmoji: emoji,
          customStatusExpiresAt: expiresAt?.toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus(data.status);
      } else {
        throw new Error(data.error || 'Error al actualizar estado');
      }
    } catch (err: any) {
      console.error('Error updating custom status:', err);
      setError(err.message);
    }
  }, [session?.user]);

  // Clear custom status
  const clearCustomStatus = useCallback(async () => {
    if (!session?.user) return;

    try {
      const res = await fetch('/api/user/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearCustomStatus: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus(data.status);
      } else {
        throw new Error(data.error || 'Error al limpiar estado');
      }
    } catch (err: any) {
      console.error('Error clearing custom status:', err);
      setError(err.message);
    }
  }, [session?.user]);

  // Initial fetch and heartbeat setup
  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetchStatus();

    // Send connect heartbeat
    sendHeartbeat('connect');

    // Start heartbeat interval
    heartbeatInterval.current = setInterval(() => {
      sendHeartbeat('heartbeat');
    }, HEARTBEAT_INTERVAL);

    // Handle visibility change for away detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs - could set to away after some time
      } else {
        // User came back
        sendHeartbeat('heartbeat');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendHeartbeat('disconnect');
    };
  }, [session?.user, fetchStatus, sendHeartbeat]);

  return {
    status,
    loading,
    error,
    updateStatus,
    updateCustomStatus,
    clearCustomStatus,
  };
}

// Hook to get statuses for multiple users
export function useUsersStatus(userIds: string[]) {
  const [statuses, setStatuses] = useState<Record<string, {
    status: StatusType;
    displayStatus: StatusType;
    customStatus?: string;
    customStatusEmoji?: string;
    lastSeenAt?: string;
    isConnected: boolean;
  }>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    if (userIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/status/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatuses(data.statuses);
      }
    } catch (err) {
      console.error('Error fetching user statuses:', err);
    } finally {
      setLoading(false);
    }
  }, [userIds]);

  // Subscribe to real-time status updates
  useEffect(() => {
    fetchStatuses();

    const pusher = getPusherClient();
    const channel = pusher.subscribe('presence-global');

    channel.bind('user-status-changed', (data: {
      userId: string;
      status: PresenceStatus;
      customStatus?: string;
      customStatusEmoji?: string;
    }) => {
      if (userIds.includes(data.userId)) {
        setStatuses(prev => ({
          ...prev,
          [data.userId]: {
            ...prev[data.userId],
            status: data.status,
            displayStatus: data.status,
            customStatus: data.customStatus,
            customStatusEmoji: data.customStatusEmoji,
            isConnected: data.status !== 'invisible',
          },
        }));
      }
    });

    return () => {
      channel.unbind('user-status-changed');
      pusher.unsubscribe('presence-global');
    };
  }, [userIds, fetchStatuses]);

  return { statuses, loading, refetch: fetchStatuses };
}
