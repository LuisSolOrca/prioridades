'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TreePine, Plus, Trash2, ChevronRight } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface TreeItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
  children?: TreeItem[];
}

interface OpportunityTreeCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  objective: string;
  opportunities: TreeItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function OpportunityTreeCommand({
  projectId,
  messageId,
  channelId,
  title,
  objective,
  opportunities: initialOpportunities,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: OpportunityTreeCommandProps) {
  const { data: session } = useSession();
  const [opportunities, setOpportunities] = useState<TreeItem[]>(initialOpportunities || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newOpportunity, setNewOpportunity] = useState('');
  const [newSolutions, setNewSolutions] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpportunities(initialOpportunities || []);
    setClosed(initialClosed);
  }, [initialOpportunities, initialClosed]);

  const handleAddOpportunity = async () => {
    if (!session?.user || !newOpportunity.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/opportunity-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'opportunity', text: newOpportunity.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setOpportunities(data.commandData.opportunities || []);
      setNewOpportunity('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSolution = async (opportunityId: string) => {
    const text = newSolutions[opportunityId]?.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/opportunity-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'solution', opportunityId, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setOpportunities(data.commandData.opportunities || []);
      setNewSolutions({ ...newSolutions, [opportunityId]: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: 'opportunity' | 'solution', opportunityId: string, solutionId?: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/opportunity-tree`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, opportunityId, solutionId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setOpportunities(data.commandData.opportunities || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'opportunity-tree',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/opportunity-tree`, {
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

  const totalSolutions = opportunities.reduce((sum, o) => sum + (o.children?.length || 0), 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-emerald-400 dark:border-emerald-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <TreePine className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Árbol de Oportunidades {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Objective (Root) */}
      <div className="flex justify-center mb-6">
        <div className="bg-emerald-600 text-white rounded-lg px-6 py-4 shadow-lg max-w-md">
          <p className="text-xs uppercase tracking-wide mb-1 opacity-80">Objetivo</p>
          <p className="font-semibold text-center">{objective || title}</p>
        </div>
      </div>

      {/* Tree Structure */}
      <div className="space-y-4 mb-4">
        {opportunities.map((opportunity) => (
          <div key={opportunity.id} className="ml-8">
            {/* Connection Line */}
            <div className="flex items-center mb-2">
              <div className="w-8 h-0.5 bg-emerald-400"></div>
              <ChevronRight className="text-emerald-500" size={16} />
            </div>

            {/* Opportunity */}
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 border-2 border-blue-300 relative group">
              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Oportunidad</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">{opportunity.text}</p>
              <p className="text-xs text-gray-500 mt-1">— {opportunity.userName}</p>

              {!closed && opportunity.userId === session?.user?.id && (
                <button
                  onClick={() => handleDelete('opportunity', opportunity.id)}
                  disabled={submitting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* Solutions */}
              <div className="mt-3 ml-4 space-y-2">
                {opportunity.children?.map((solution) => (
                  <div key={solution.id} className="flex items-start">
                    <div className="w-4 h-0.5 bg-purple-400 mt-3 mr-2"></div>
                    <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-300 relative group">
                      <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">Solución</p>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{solution.text}</p>
                      <p className="text-xs text-gray-500 mt-1">— {solution.userName}</p>

                      {!closed && solution.userId === session?.user?.id && (
                        <button
                          onClick={() => handleDelete('solution', opportunity.id, solution.id)}
                          disabled={submitting}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Solution */}
                {!closed && (
                  <div className="flex items-center ml-6">
                    <input
                      type="text"
                      value={newSolutions[opportunity.id] || ''}
                      onChange={(e) => setNewSolutions({ ...newSolutions, [opportunity.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSolution(opportunity.id)}
                      placeholder="Agregar solución..."
                      className="flex-1 px-3 py-1.5 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      disabled={submitting}
                    />
                    <button
                      onClick={() => handleAddSolution(opportunity.id)}
                      disabled={!newSolutions[opportunity.id]?.trim() || submitting}
                      className="ml-2 p-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Opportunity */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newOpportunity}
              onChange={(e) => setNewOpportunity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOpportunity()}
              placeholder="Nueva oportunidad..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <button
              onClick={handleAddOpportunity}
              disabled={!newOpportunity.trim() || submitting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {opportunities.length} oportunidades • {totalSolutions} soluciones
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && opportunities.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Árbol
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Árbol cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/opportunity-tree</code>
      </div>
    </div>
  );
}
