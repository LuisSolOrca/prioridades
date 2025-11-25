'use client';

import { Coffee } from 'lucide-react';

interface IcebreakerCommandProps {
  question: string;
  onClose: () => void;
}

export default function IcebreakerCommand({
  question,
  onClose
}: IcebreakerCommandProps) {
  return (
    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Coffee className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Icebreaker</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pregunta para romper el hielo
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 mb-4 border-l-4 border-cyan-500">
        <div className="text-center">
          <p className="text-2xl mb-3">💬</p>
          <p className="text-lg text-gray-800 dark:text-gray-100 font-medium">
            {question}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-cyan-100 dark:bg-cyan-900/30 rounded-lg p-3 text-sm text-cyan-800 dark:text-cyan-200">
        <p className="font-medium mb-1">💡 Cómo usar:</p>
        <p className="text-xs">
          Tómense 1-2 minutos para que cada persona comparta su respuesta. Esto ayuda a conocerse mejor y crear un ambiente más relajado.
        </p>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/icebreaker</code>
      </div>
    </div>
  );
}
