'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Circle,
  Clock,
  MinusCircle,
  EyeOff,
  ChevronDown,
  Smile,
  X,
  Check,
} from 'lucide-react';
import { STATUS_COLORS, STATUS_PRESETS } from '@/models/UserStatus';
import UserStatusIndicator from './UserStatusIndicator';
import { useUserStatus } from '@/hooks/useUserStatus';

type PresenceStatus = 'online' | 'away' | 'dnd' | 'invisible';

interface UserStatusSelectorProps {
  currentStatus?: PresenceStatus;
  customStatus?: string;
  customStatusEmoji?: string;
  onStatusChange?: (status: PresenceStatus) => void;
  onCustomStatusChange?: (text?: string, emoji?: string, expiresAt?: Date) => void;
  onClearCustomStatus?: () => void;
  compact?: boolean;
  className?: string;
}

const STATUS_OPTIONS: Array<{
  value: PresenceStatus;
  label: string;
  icon: typeof Circle;
  description: string;
}> = [
  {
    value: 'online',
    label: 'En línea',
    icon: Circle,
    description: 'Disponible para todos',
  },
  {
    value: 'away',
    label: 'Ausente',
    icon: Clock,
    description: 'Temporalmente no disponible',
  },
  {
    value: 'dnd',
    label: 'No molestar',
    icon: MinusCircle,
    description: 'Sin notificaciones',
  },
  {
    value: 'invisible',
    label: 'Invisible',
    icon: EyeOff,
    description: 'Aparecer desconectado',
  },
];

export default function UserStatusSelector({
  currentStatus: propCurrentStatus,
  customStatus: propCustomStatus,
  customStatusEmoji: propCustomStatusEmoji,
  onStatusChange: propOnStatusChange,
  onCustomStatusChange: propOnCustomStatusChange,
  onClearCustomStatus: propOnClearCustomStatus,
  compact = false,
  className = '',
}: UserStatusSelectorProps) {
  // Use hook for self-managed mode (when no props provided)
  const hookResult = useUserStatus();

  // Determine if we're in controlled or self-managed mode
  const isControlled = propOnStatusChange !== undefined;

  // Use prop values if provided, otherwise use hook values
  const currentStatus = propCurrentStatus ?? (hookResult.status?.status || 'online');
  const customStatus = propCustomStatus ?? hookResult.status?.customStatus;
  const customStatusEmoji = propCustomStatusEmoji ?? hookResult.status?.customStatusEmoji;
  const onStatusChange = propOnStatusChange ?? hookResult.updateStatus;
  const onCustomStatusChange = propOnCustomStatusChange ?? hookResult.updateCustomStatus;
  const onClearCustomStatus = propOnClearCustomStatus ?? hookResult.clearCustomStatus;

  const [isOpen, setIsOpen] = useState(false);
  const [showCustomStatusInput, setShowCustomStatusInput] = useState(false);
  const [customText, setCustomText] = useState(customStatus || '');
  const [customEmoji, setCustomEmoji] = useState(customStatusEmoji || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync customText/customEmoji when status changes
  useEffect(() => {
    setCustomText(customStatus || '');
    setCustomEmoji(customStatusEmoji || '');
  }, [customStatus, customStatusEmoji]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomStatusInput(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = STATUS_OPTIONS.find(o => o.value === currentStatus) || STATUS_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  const handleStatusSelect = (status: PresenceStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: { emoji: string; text: string }) => {
    onCustomStatusChange(preset.text, preset.emoji);
    setIsOpen(false);
  };

  const handleCustomStatusSubmit = () => {
    if (customText.trim()) {
      onCustomStatusChange(customText.trim(), customEmoji || undefined);
    }
    setShowCustomStatusInput(false);
    setIsOpen(false);
  };

  const handleClearCustomStatus = () => {
    setCustomText('');
    setCustomEmoji('');
    onClearCustomStatus();
  };

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <UserStatusIndicator status={currentStatus} size="sm" />
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {isOpen && (
          <StatusDropdown
            currentStatus={currentStatus}
            customStatus={customStatus}
            customStatusEmoji={customStatusEmoji}
            showCustomStatusInput={showCustomStatusInput}
            setShowCustomStatusInput={setShowCustomStatusInput}
            customText={customText}
            setCustomText={setCustomText}
            customEmoji={customEmoji}
            setCustomEmoji={setCustomEmoji}
            onStatusSelect={handleStatusSelect}
            onPresetSelect={handlePresetSelect}
            onCustomStatusSubmit={handleCustomStatusSubmit}
            onClearCustomStatus={handleClearCustomStatus}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
      >
        <UserStatusIndicator status={currentStatus} size="md" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {currentOption.label}
          </div>
          {customStatus && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {customStatusEmoji} {customStatus}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <StatusDropdown
          currentStatus={currentStatus}
          customStatus={customStatus}
          customStatusEmoji={customStatusEmoji}
          showCustomStatusInput={showCustomStatusInput}
          setShowCustomStatusInput={setShowCustomStatusInput}
          customText={customText}
          setCustomText={setCustomText}
          customEmoji={customEmoji}
          setCustomEmoji={setCustomEmoji}
          onStatusSelect={handleStatusSelect}
          onPresetSelect={handlePresetSelect}
          onCustomStatusSubmit={handleCustomStatusSubmit}
          onClearCustomStatus={handleClearCustomStatus}
        />
      )}
    </div>
  );
}

function StatusDropdown({
  currentStatus,
  customStatus,
  customStatusEmoji,
  showCustomStatusInput,
  setShowCustomStatusInput,
  customText,
  setCustomText,
  customEmoji,
  setCustomEmoji,
  onStatusSelect,
  onPresetSelect,
  onCustomStatusSubmit,
  onClearCustomStatus,
}: {
  currentStatus: PresenceStatus;
  customStatus?: string;
  customStatusEmoji?: string;
  showCustomStatusInput: boolean;
  setShowCustomStatusInput: (show: boolean) => void;
  customText: string;
  setCustomText: (text: string) => void;
  customEmoji: string;
  setCustomEmoji: (emoji: string) => void;
  onStatusSelect: (status: PresenceStatus) => void;
  onPresetSelect: (preset: { emoji: string; text: string }) => void;
  onCustomStatusSubmit: () => void;
  onClearCustomStatus: () => void;
}) {
  return (
    <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* Current custom status */}
      {customStatus && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>{customStatusEmoji}</span>
              <span className="text-gray-700 dark:text-gray-300">{customStatus}</span>
            </div>
            <button
              onClick={onClearCustomStatus}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status options */}
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
          Estado
        </div>
        {STATUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === currentStatus;

          return (
            <button
              key={option.value}
              onClick={() => onStatusSelect(option.value)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[option.value] }}
              />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-blue-500" />}
            </button>
          );
        })}
      </div>

      {/* Custom status section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
          Estado personalizado
        </div>

        {showCustomStatusInput ? (
          <div className="p-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="😊"
                className="w-12 px-2 py-1.5 text-center border rounded-md dark:bg-gray-700 dark:border-gray-600"
                maxLength={4}
              />
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="¿Qué estás haciendo?"
                className="flex-1 px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                maxLength={100}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomStatusInput(false)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={onCustomStatusSubmit}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowCustomStatusInput(true)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
            >
              <Smile className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Establecer estado personalizado
              </span>
            </button>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-1 mt-1">
              {STATUS_PRESETS.slice(0, 6).map((preset, index) => (
                <button
                  key={index}
                  onClick={() => onPresetSelect(preset)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <span>{preset.emoji}</span>
                  <span className="text-gray-600 dark:text-gray-400 truncate">
                    {preset.text}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
