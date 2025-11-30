// User status constants - shared between client and server

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'invisible';

// Status display labels
export const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'En línea',
  away: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Invisible',
};

// Status colors for UI
export const STATUS_COLORS: Record<PresenceStatus | 'offline', string> = {
  online: '#22c55e',    // green-500
  away: '#f59e0b',      // amber-500
  dnd: '#ef4444',       // red-500
  invisible: '#6b7280', // gray-500
  offline: '#6b7280',   // gray-500
};

// Default custom status presets
export const STATUS_PRESETS = [
  { emoji: '📅', text: 'En reunión' },
  { emoji: '🏖️', text: 'De vacaciones' },
  { emoji: '🏠', text: 'Trabajando desde casa' },
  { emoji: '🍽️', text: 'Almorzando' },
  { emoji: '🚗', text: 'En tránsito' },
  { emoji: '🎯', text: 'Enfocado' },
  { emoji: '🤒', text: 'Enfermo' },
  { emoji: '📵', text: 'Desconectado' },
];
