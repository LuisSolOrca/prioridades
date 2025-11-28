'use client';

import { Flame, Thermometer, Snowflake } from 'lucide-react';

interface LeadTemperatureBadgeProps {
  temperature?: 'hot' | 'warm' | 'cold' | null;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showLabel?: boolean;
  className?: string;
}

export default function LeadTemperatureBadge({
  temperature,
  score,
  size = 'md',
  showScore = true,
  showLabel = false,
  className = '',
}: LeadTemperatureBadgeProps) {
  if (!temperature) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const configs = {
    hot: {
      icon: Flame,
      label: 'Hot',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    warm: {
      icon: Thermometer,
      label: 'Warm',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-600 dark:text-yellow-500',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    cold: {
      icon: Snowflake,
      label: 'Cold',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
  };

  const config = configs[temperature];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`Lead ${config.label}${score !== undefined ? ` - Score: ${score}` : ''}`}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
      {showScore && score !== undefined && (
        <span className="font-semibold">{score}</span>
      )}
    </span>
  );
}

// Componente simplificado solo para el icono de temperatura
export function LeadTemperatureIcon({
  temperature,
  size = 16,
  className = '',
}: {
  temperature?: 'hot' | 'warm' | 'cold' | null;
  size?: number;
  className?: string;
}) {
  if (!temperature) return null;

  const configs = {
    hot: {
      icon: Flame,
      color: 'text-red-500',
    },
    warm: {
      icon: Thermometer,
      color: 'text-yellow-500',
    },
    cold: {
      icon: Snowflake,
      color: 'text-blue-500',
    },
  };

  const config = configs[temperature];
  const Icon = config.icon;

  return <Icon size={size} className={`${config.color} ${className}`} />;
}

// Componente de barra de progreso de score
export function LeadScoreBar({
  score,
  hotThreshold = 80,
  warmThreshold = 50,
  className = '',
}: {
  score?: number;
  hotThreshold?: number;
  warmThreshold?: number;
  className?: string;
}) {
  if (score === undefined) return null;

  const getColor = () => {
    if (score >= hotThreshold) return 'bg-red-500';
    if (score >= warmThreshold) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Score</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      {/* Markers for thresholds */}
      <div className="relative h-0">
        <div
          className="absolute bottom-2 w-0.5 h-3 bg-yellow-400"
          style={{ left: `${warmThreshold}%` }}
          title={`Warm threshold: ${warmThreshold}`}
        />
        <div
          className="absolute bottom-2 w-0.5 h-3 bg-red-400"
          style={{ left: `${hotThreshold}%` }}
          title={`Hot threshold: ${hotThreshold}`}
        />
      </div>
    </div>
  );
}

// Componente compacto para listas
export function LeadScoreCompact({
  temperature,
  score,
}: {
  temperature?: 'hot' | 'warm' | 'cold' | null;
  score?: number;
}) {
  if (!temperature || score === undefined) return null;

  const emojis = {
    hot: '🔥',
    warm: '🌡️',
    cold: '❄️',
  };

  return (
    <span className="text-sm" title={`${temperature} lead - Score: ${score}`}>
      {emojis[temperature]} {score}
    </span>
  );
}
