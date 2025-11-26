'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';
import Portal from '@/components/ui/Portal';

interface Risk {
  id: string;
  title: string;
  description?: string;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  mitigation: string;
  userId: string;
  userName: string;
}

interface RiskMatrixCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  risks: Risk[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const PROBABILITY_LABELS = ['', 'Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
const IMPACT_LABELS = ['', 'Muy Bajo', 'Bajo', 'Medio', 'Alto', 'Muy Alto'];

const getRiskLevel = (probability: number, impact: number): { level: string; color: string; bg: string } => {
  const score = probability * impact;
  if (score >= 16) return { level: 'Crítico', color: 'text-red-700', bg: 'bg-red-500' };
  if (score >= 9) return { level: 'Alto', color: 'text-orange-700', bg: 'bg-orange-500' };
  if (score >= 4) return { level: 'Medio', color: 'text-yellow-700', bg: 'bg-yellow-500' };
  return { level: 'Bajo', color: 'text-green-700', bg: 'bg-green-500' };
};

export default function RiskMatrixCommand({
  projectId,
  messageId,
  channelId,
  title,
  risks: initialRisks,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: RiskMatrixCommandProps) {
  const { data: session } = useSession();
  const [risks, setRisks] = useState<Risk[]>(initialRisks || []);
  const [closed, setClosed] = useState(initialClosed);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRisk, setNewRisk] = useState({ title: '', description: '', probability: 3 as 1|2|3|4|5, impact: 3 as 1|2|3|4|5, mitigation: '' });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRisks(initialRisks || []);
    setClosed(initialClosed);
  }, [initialRisks, initialClosed]);

  const handleAddRisk = async () => {
    if (!session?.user || !newRisk.title.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/risk-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRisk)
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRisks(data.commandData.risks || []);
      setShowAddModal(false);
      setNewRisk({ title: '', description: '', probability: 3, impact: 3, mitigation: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/risk-matrix`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId, action: 'delete' })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRisks(data.commandData.risks || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseMatrix = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'risk-matrix',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/risk-matrix`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Create matrix cells
  const matrixCells: { [key: string]: Risk[] } = {};
  for (let p = 1; p <= 5; p++) {
    for (let i = 1; i <= 5; i++) {
      matrixCells[`${p}-${i}`] = [];
    }
  }
  risks.forEach(risk => {
    const key = `${risk.probability}-${risk.impact}`;
    if (matrixCells[key]) {
      matrixCells[key].push(risk);
    }
  });

  const getCellColor = (prob: number, impact: number) => {
    const score = prob * impact;
    if (score >= 16) return 'bg-red-200 dark:bg-red-900/50';
    if (score >= 9) return 'bg-orange-200 dark:bg-orange-900/50';
    if (score >= 4) return 'bg-yellow-200 dark:bg-yellow-900/50';
    return 'bg-green-200 dark:bg-green-900/50';
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-red-400 dark:border-red-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Matriz de Riesgos {closed ? '• Cerrada' : '• Activa'} • {risks.length} riesgos
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Risk Matrix Grid */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Y-axis label */}
          <div className="flex">
            <div className="w-24 flex items-end justify-center pb-2">
              <span className="text-xs font-semibold text-gray-500 transform -rotate-90 origin-center whitespace-nowrap">
                PROBABILIDAD →
              </span>
            </div>
            <div className="flex-1">
              {/* Matrix */}
              <div className="grid grid-cols-5 gap-1">
                {/* Render from top (5) to bottom (1) for probability */}
                {[5, 4, 3, 2, 1].map(prob => (
                  [1, 2, 3, 4, 5].map(impact => (
                    <div
                      key={`${prob}-${impact}`}
                      className={`${getCellColor(prob, impact)} rounded p-1 min-h-[60px] relative group`}
                    >
                      {matrixCells[`${prob}-${impact}`].map(risk => (
                        <div
                          key={risk.id}
                          className="bg-white dark:bg-gray-600 rounded p-1 text-xs mb-1 shadow-sm cursor-pointer hover:shadow-md transition"
                          title={`${risk.title}${risk.description ? '\n' + risk.description : ''}\nMitigación: ${risk.mitigation || 'Sin definir'}`}
                        >
                          <p className="truncate text-gray-800 dark:text-gray-100">{risk.title}</p>
                          {!closed && risk.userId === session?.user?.id && (
                            <button
                              onClick={() => handleDeleteRisk(risk.id)}
                              className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ))}
              </div>
              {/* X-axis labels */}
              <div className="grid grid-cols-5 gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="text-center text-xs text-gray-500 dark:text-gray-400">
                    {IMPACT_LABELS[i]}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs font-semibold text-gray-500 mt-1">IMPACTO →</p>
            </div>
            {/* Y-axis labels */}
            <div className="w-20 flex flex-col justify-between py-1">
              {[5, 4, 3, 2, 1].map(p => (
                <div key={p} className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {PROBABILITY_LABELS[p]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk List */}
      {risks.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Lista de Riesgos</h4>
          <div className="space-y-2">
            {risks.sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)).map(risk => {
              const riskLevel = getRiskLevel(risk.probability, risk.impact);
              return (
                <div key={risk.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-600 rounded group">
                  <div className={`${riskLevel.bg} text-white text-xs font-bold px-2 py-1 rounded`}>
                    {risk.probability * risk.impact}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{risk.title}</p>
                    {risk.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">{risk.description}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      P: {PROBABILITY_LABELS[risk.probability]} • I: {IMPACT_LABELS[risk.impact]} • {riskLevel.level}
                    </p>
                    {risk.mitigation && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        💡 {risk.mitigation}
                      </p>
                    )}
                  </div>
                  {!closed && risk.userId === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteRisk(risk.id)}
                      className="p-1 text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Risk Button */}
      {!closed && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full mb-4 py-2 border-2 border-dashed border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Agregar Riesgo
        </button>
      )}

      {/* Add Risk Modal */}
      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Agregar Riesgo</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Nombre del riesgo</label>
                  <input
                    type="text"
                    value={newRisk.title}
                    onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                    placeholder="Nombre corto del riesgo"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
                  <input
                    type="text"
                    value={newRisk.description}
                    onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                    placeholder="¿Qué podría salir mal?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Probabilidad</label>
                    <select
                      value={newRisk.probability}
                      onChange={(e) => setNewRisk({ ...newRisk, probability: parseInt(e.target.value) as 1|2|3|4|5 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    >
                      {[1, 2, 3, 4, 5].map(p => (
                        <option key={p} value={p}>{PROBABILITY_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Impacto</label>
                    <select
                      value={newRisk.impact}
                      onChange={(e) => setNewRisk({ ...newRisk, impact: parseInt(e.target.value) as 1|2|3|4|5 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    >
                      {[1, 2, 3, 4, 5].map(i => (
                        <option key={i} value={i}>{IMPACT_LABELS[i]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Plan de mitigación (opcional)</label>
                  <input
                    type="text"
                    value={newRisk.mitigation}
                    onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })}
                    placeholder="¿Cómo podemos reducir este riesgo?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                </div>

                {/* Preview */}
                <div className={`${getRiskLevel(newRisk.probability, newRisk.impact).bg} text-white p-2 rounded-lg text-center`}>
                  <span className="font-bold">Score: {newRisk.probability * newRisk.impact}</span>
                  <span className="ml-2">({getRiskLevel(newRisk.probability, newRisk.impact).level})</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button onClick={handleAddRisk} disabled={!newRisk.title.trim() || submitting} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400">
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && risks.length > 0 && (
        <button onClick={handleCloseMatrix} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Matriz de Riesgos
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Matriz de Riesgos cerrada
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/risk-matrix</code>
      </div>
    </div>
  );
}
