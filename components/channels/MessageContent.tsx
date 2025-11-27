'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import LinkPreview from './LinkPreview';

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
  onTagClick?: (tag: string) => void; // Callback para filtrar por hashtag
}

export default function MessageContent({ content, priorityMentions = [], onTagClick }: MessageContentProps) {
  const [hoveredPriority, setHoveredPriority] = useState<Priority | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Crear un mapa de prioridades para búsqueda rápida
  const priorityMap = new Map<string, Priority>();
  priorityMentions.forEach(p => {
    priorityMap.set(p._id, p);
    const normalizedTitle = p.title.toLowerCase().replace(/\s+/g, '-');
    priorityMap.set(normalizedTitle, p);
  });

  // Función para procesar menciones de prioridades y hashtags en texto
  const processContentWithMentions = (text: string): React.ReactNode => {
    // Patrón para detectar #P-{id} (prioridad), #palabra (hashtag o prioridad)
    const pattern = /#P-([a-f0-9]{24})|#([\wáéíóúñÁÉÍÓÚÑ][\w\-áéíóúñÁÉÍÓÚÑ]*)/gi;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const matchText = match[0];
      let priority: Priority | undefined;

      if (match[1]) {
        // Es #P-{objectId}
        priority = priorityMap.get(match[1]);
      } else if (match[2]) {
        // Es #palabra - verificar si es una prioridad o un hashtag genérico
        const titleKey = match[2].toLowerCase();
        priority = priorityMap.get(titleKey);
      }

      if (priority) {
        // Es una mención de prioridad
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
      } else if (match[2] && match[2].length >= 2) {
        // Es un hashtag genérico (no es prioridad)
        const tag = match[2].toLowerCase();
        parts.push(
          <span
            key={`tag-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onTagClick) onTagClick(tag);
            }}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors
              bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300
              hover:bg-purple-200 dark:hover:bg-purple-800/50 ${onTagClick ? 'cursor-pointer' : ''}`}
            title={`Filtrar por #${tag}`}
          >
            #{tag}
          </span>
        );
      } else {
        // Fallback - mostrar como texto normal
        parts.push(matchText);
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
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

  // Detectar URLs en el contenido para mostrar previews
  const detectedUrls = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const matches = content.match(urlRegex);
    if (!matches) return [];

    // Deduplicar URLs
    return [...new Set(matches)];
  }, [content]);

  return (
    <>
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Personalizar componentes para mantener estilos consistentes
            p: ({ children }) => {
              // Convertir children a string solo si es texto plano
              const textContent = typeof children === 'string'
                ? children
                : Array.isArray(children)
                ? children.map(child => typeof child === 'string' ? child : '').join('')
                : '';

              return (
                <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">
                  {textContent ? processContentWithMentions(textContent) : children}
                </p>
              );
            },
            strong: ({ children }) => (
              <strong className="font-bold text-gray-900 dark:text-gray-100">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-800 dark:text-gray-200">
                {children}
              </em>
            ),
            code: ({ className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;

              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded text-sm font-mono">
                    {children}
                  </code>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-2 p-3 bg-gray-900 dark:bg-gray-950 rounded-lg overflow-x-auto">
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {children}
              </a>
            ),
            del: ({ children }) => (
              <del className="line-through text-gray-500 dark:text-gray-400">
                {children}
              </del>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2 space-y-1 text-gray-800 dark:text-gray-200">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside my-2 space-y-1 text-gray-800 dark:text-gray-200">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="ml-2">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-700 dark:text-gray-300">
                {children}
              </blockquote>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mt-3 mb-2 text-gray-900 dark:text-gray-100">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mt-2 mb-1 text-gray-900 dark:text-gray-100">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-bold mt-2 mb-1 text-gray-900 dark:text-gray-100">
                {children}
              </h4>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full border border-gray-300 dark:border-gray-600">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100 dark:bg-gray-800">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Link Previews */}
      {detectedUrls.length > 0 && (
        <div className="mt-2">
          {detectedUrls.map((url, index) => (
            <LinkPreview key={`${url}-${index}`} url={url} />
          ))}
        </div>
      )}

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
