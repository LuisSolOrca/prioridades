'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function MarkdownHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const markdownExamples = [
    {
      category: 'Formato de Texto',
      items: [
        { syntax: '**negrita**', result: 'negrita', description: 'Texto en negrita' },
        { syntax: '*cursiva*', result: 'cursiva', description: 'Texto en cursiva' },
        { syntax: '~~tachado~~', result: 'tachado', description: 'Texto tachado' },
        { syntax: '`código`', result: 'código', description: 'Código inline' },
      ]
    },
    {
      category: 'Enlaces y Bloques',
      items: [
        { syntax: '[texto](url)', result: 'link', description: 'Link clickeable' },
        { syntax: '> cita', result: 'Cita', description: 'Bloque de cita' },
      ]
    },
    {
      category: 'Listas',
      items: [
        { syntax: '- item', result: '• item', description: 'Lista con viñetas' },
        { syntax: '1. item', result: '1. item', description: 'Lista numerada' },
      ]
    },
    {
      category: 'Código',
      items: [
        { syntax: '```js\ncode\n```', result: 'Bloque de código', description: 'Con syntax highlighting' },
      ]
    },
    {
      category: 'Encabezados',
      items: [
        { syntax: '### Título', result: 'Título', description: 'Encabezado nivel 3' },
        { syntax: '#### Subtítulo', result: 'Subtítulo', description: 'Encabezado nivel 4' },
      ]
    },
  ];

  return (
    <>
      {/* Botón de ayuda */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Guía de Markdown"
      >
        <HelpCircle size={20} />
      </button>

      {/* Modal de ayuda */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Guía de Markdown
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Usa Markdown para dar formato a tus mensajes. Aquí está la sintaxis disponible:
              </p>

              {markdownExamples.map((category, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <code className="text-sm font-mono text-blue-600 dark:text-blue-400 block mb-1">
                              {item.syntax}
                            </code>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {item.description}
                            </p>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                            {item.result}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Ejemplos adicionales */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 Consejos
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Combina múltiples formatos: **_negrita y cursiva_**</li>
                  <li>Los bloques de código soportan syntax highlighting para: js, python, java, html, css, etc.</li>
                  <li>Las menciones de prioridades (#P-xxx) funcionan dentro del markdown</li>
                  <li>Los enlaces se abren en una nueva pestaña automáticamente</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
