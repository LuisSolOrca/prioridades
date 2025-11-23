'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  userId?: {
    _id: string;
    name: string;
  };
}

interface MessageContentProps {
  content: string;
  priorityMentions?: Priority[];
}

export default function MessageContent({ content, priorityMentions = [] }: MessageContentProps) {
  const [hoveredPriority, setHoveredPriority] = useState<Priority | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Función para renderizar el contenido con las menciones de prioridades como links
  const renderContent = () => {
    if (!priorityMentions || priorityMentions.length === 0) {
      return <span className="whitespace-pre-wrap break-words">{content}</span>;
    }

    // Crear un mapa de IDs para búsqueda rápida
    const priorityMap = new Map<string, Priority>();
    priorityMentions.forEach(p => {
      priorityMap.set(p._id, p);
      // También mapear por título normalizado para el patrón #titulo
      const normalizedTitle = p.title.toLowerCase().replace(/\s+/g, '-');
      priorityMap.set(normalizedTitle, p);
    });

    // Patrón combinado para detectar #P-{id} o #titulo-de-prioridad
    const pattern = /#P-([a-f0-9]{24})|#([\w\-áéíóúñÁÉÍÓÚÑ]+(?:-[\w\-áéíóúñÁÉÍÓÚÑ]+)*)/gi;

    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      // Agregar texto antes del match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }

      const matchText = match[0];
      let priority: Priority | undefined;

      if (match[1]) {
        // Es un #P-{id}
        priority = priorityMap.get(match[1]);
      } else if (match[2]) {
        // Es un #titulo
        const titleKey = match[2].toLowerCase();
        priority = priorityMap.get(titleKey);
      }

      if (priority) {
        parts.push(
          <span
            key={`priority-${match.index}`}
            onMouseEnter={(e) => {
              setHoveredPriority(priority!);
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverPosition({ x: rect.left, y: rect.bottom + 5 });
            }}
            onMouseLeave={() => setHoveredPriority(null)}
            className="relative"
          >
            <Link
              href={`/priorities?id=${priority._id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {matchText}
            </Link>
          </span>
        );
      } else {
        // No se encontró la prioridad, mostrar como texto normal
        parts.push(<span key={`nomatch-${match.index}`}>{matchText}</span>);
      }

      lastIndex = pattern.lastIndex;
    }

    // Agregar texto restante
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-end`}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return <span className="whitespace-pre-wrap break-words">{parts}</span>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EN_TIEMPO':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'EN_RIESGO':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'BLOQUEADO':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      case 'COMPLETADO':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EN_TIEMPO':
        return 'En Tiempo';
      case 'EN_RIESGO':
        return 'En Riesgo';
      case 'BLOQUEADO':
        return 'Bloqueado';
      case 'COMPLETADO':
        return 'Completado';
      default:
        return status;
    }
  };

  return (
    <>
      {renderContent()}

      {/* Preview Tooltip */}
      {hoveredPriority && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-sm"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
          }}
        >
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {hoveredPriority.title}
            </h4>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(hoveredPriority.status)}`}>
                {getStatusLabel(hoveredPriority.status)}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {hoveredPriority.completionPercentage}% completado
              </span>
            </div>

            {hoveredPriority.userId && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Responsable: {hoveredPriority.userId.name}
              </p>
            )}

            <p className="text-xs text-blue-600 dark:text-blue-400">
              Click para ver detalles →
            </p>
          </div>
        </div>
      )}
    </>
  );
}
