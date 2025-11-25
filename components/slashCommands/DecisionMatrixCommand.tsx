'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Grid3x3, Trophy } from 'lucide-react';

interface MatrixScore {
  userId: string;
  userName: string;
  score: number; // 1-5
}

interface MatrixCell {
  optionIndex: number;
  criteriaIndex: number;
  scores: MatrixScore[];
}

interface DecisionMatrixCommandProps {
  projectId: string;
  messageId: string;
  title: string;
  options: string[];
  criteria: string[];
  cells: MatrixCell[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function DecisionMatrixCommand({
  projectId,
  messageId,
  title,
  options,
  criteria,
  cells: initialCells,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: DecisionMatrixCommandProps) {
  const { data: session } = useSession();
  const [cells, setCells] = useState(initialCells);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);

  const handleScore = async (optionIndex: number, criteriaIndex: number, score: number) => {
    if (!session?.user || closed || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/decision-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex, criteriaIndex, score })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al puntuar');
        return;
      }

      const data = await response.json();
      setCells(data.commandData.cells);
      onUpdate?.();
    } catch (error) {
      console.error('Error scoring:', error);
      alert('Error al puntuar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/decision-matrix`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al cerrar');
        return;
      }

      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error closing:', error);
      alert('Error al cerrar');
    }
  };

  const getCell = (optionIdx: number, criteriaIdx: number) => {
    return cells.find(c => c.optionIndex === optionIdx && c.criteriaIndex === criteriaIdx);
  };

  const getCellAverage = (optionIdx: number, criteriaIdx: number) => {
    const cell = getCell(optionIdx, criteriaIdx);
    if (!cell || cell.scores.length === 0) return 0;
    const sum = cell.scores.reduce((acc, s) => acc + s.score, 0);
    return sum / cell.scores.length;
  };

  const getUserScore = (optionIdx: number, criteriaIdx: number) => {
    const cell = getCell(optionIdx, criteriaIdx);
    if (!cell) return null;
    return cell.scores.find(s => s.userId === session?.user?.id);
  };

  const getOptionTotal = (optionIdx: number) => {
    let total = 0;
    for (let i = 0; i < criteria.length; i++) {
      total += getCellAverage(optionIdx, i);
    }
    return total;
  };

  const winningOption = options.reduce((max, opt, idx) => {
    const currentTotal = getOptionTotal(idx);
    const maxTotal = getOptionTotal(max);
    return currentTotal > maxTotal ? idx : max;
  }, 0);

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-violet-400 dark:border-violet-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Grid3x3 className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Matriz de Decisión • {closed ? 'Cerrada' : 'Activa'}
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

      {/* Matriz */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-violet-200 dark:bg-violet-900/50">
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-gray-100">
                Opción / Criterio
              </th>
              {criteria.map((criterion, idx) => (
                <th key={idx} className="p-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                  {criterion}
                </th>
              ))}
              <th className="p-3 text-center font-semibold text-gray-900 dark:text-gray-100 bg-violet-300 dark:bg-violet-800">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((option, optIdx) => (
              <tr key={optIdx} className="border-t border-gray-200 dark:border-gray-600">
                <td className="p-3 font-medium text-gray-800 dark:text-gray-100 bg-violet-50 dark:bg-violet-900/20">
                  {optIdx === winningOption && (
                    <Trophy className="inline mr-1 text-yellow-500" size={16} />
                  )}
                  {option}
                </td>
                {criteria.map((_, critIdx) => {
                  const avg = getCellAverage(optIdx, critIdx);
                  const userScore = getUserScore(optIdx, critIdx);

                  return (
                    <td key={critIdx} className="p-2 text-center">
                      {!closed && (
                        <div className="flex justify-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => handleScore(optIdx, critIdx, score)}
                              disabled={submitting || !!userScore}
                              className={`w-7 h-7 text-xs rounded transition ${
                                userScore?.score === score
                                  ? 'bg-violet-600 text-white ring-2 ring-violet-400'
                                  : 'bg-gray-200 dark:bg-gray-600 hover:bg-violet-300 dark:hover:bg-violet-700 text-gray-700 dark:text-gray-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                        {avg > 0 ? avg.toFixed(1) : '-'}
                      </div>
                    </td>
                  );
                })}
                <td className="p-3 text-center bg-violet-100 dark:bg-violet-900/30">
                  <span className="text-lg font-bold text-violet-700 dark:text-violet-300">
                    {getOptionTotal(optIdx).toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="bg-violet-100 dark:bg-violet-900/30 rounded-lg p-3 mb-3 text-sm text-violet-800 dark:text-violet-200">
        <p className="font-medium mb-1">Escala de puntuación: 1 (Muy bajo) - 5 (Muy alto)</p>
        <p className="text-xs">Cada celda muestra el promedio de todas las puntuaciones</p>
      </div>

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Matriz cerrada. Ganadora: <strong>{options[winningOption]}</strong> con {getOptionTotal(winningOption).toFixed(1)} puntos
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Matriz
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/decision-matrix</code>
      </div>
    </div>
  );
}
