'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Users, Smile, Meh, Frown } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface JourneyItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

interface JourneyStage {
  id: string;
  name: string;
  touchpoints: JourneyItem[];
  emotions: { id: string; type: 'positive' | 'neutral' | 'negative'; text: string; userId: string; userName: string }[];
  painPoints: JourneyItem[];
  opportunities: JourneyItem[];
}

interface CustomerJourneyCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  persona: string;
  stages: JourneyStage[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const EMOTION_ICONS = {
  positive: { icon: Smile, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  neutral: { icon: Meh, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  negative: { icon: Frown, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' }
};

export default function CustomerJourneyCommand({
  projectId,
  messageId,
  channelId,
  title,
  persona: initialPersona,
  stages: initialStages,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: CustomerJourneyCommandProps) {
  const { data: session } = useSession();
  const [persona, setPersona] = useState(initialPersona || '');
  const [stages, setStages] = useState<JourneyStage[]>(initialStages || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState<{ stageId: string; type: 'touchpoint' | 'emotion' | 'painPoint' | 'opportunity'; text: string; emotionType?: 'positive' | 'neutral' | 'negative' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setStages(initialStages || []);
  }, [JSON.stringify(initialStages)]);

  useEffect(() => {
    setPersona(initialPersona || '');
    setClosed(initialClosed);
  }, [initialPersona, initialClosed]);

  const handleAddItem = async () => {
    if (!session?.user || !newItem?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/customer-journey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: newItem.stageId,
          type: newItem.type,
          text: newItem.text.trim(),
          emotionType: newItem.emotionType
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setStages(data.commandData.stages || []);
      setNewItem(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (stageId: string, type: string, itemId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/customer-journey`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteItem', stageId, type, itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setStages(data.commandData.stages || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePersona = async (newPersona: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/customer-journey`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePersona', persona: newPersona })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setPersona(data.commandData.persona || '');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseJourney = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'customer-journey',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/customer-journey`, {
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

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-400 dark:border-teal-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Customer Journey Map {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Persona */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
          <span>👤</span> Persona / Cliente
        </h4>
        {!closed ? (
          <input
            type="text"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            onBlur={(e) => handleUpdatePersona(e.target.value)}
            placeholder="Describe tu persona objetivo..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
        ) : (
          <p className="text-gray-700 dark:text-gray-300">{persona || 'Sin persona definida'}</p>
        )}
      </div>

      {/* Journey Stages */}
      <div className="overflow-x-auto mb-4">
        <div className="flex gap-3 min-w-max">
          {stages.map((stage, index) => (
            <div key={stage.id} className="w-64 flex-shrink-0">
              {/* Stage Header */}
              <div className="bg-teal-500 text-white rounded-t-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-bold">{index + 1}</span>
                  <span className="font-semibold">{stage.name}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-700 rounded-b-lg p-3 space-y-3">
                {/* Touchpoints */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    📍 Puntos de Contacto
                  </h5>
                  <div className="space-y-1">
                    {stage.touchpoints.map(item => (
                      <div key={item.id} className="bg-gray-50 dark:bg-gray-600 rounded p-1.5 text-xs group relative">
                        <p className="text-gray-800 dark:text-gray-100 pr-4">{item.text}</p>
                        {!closed && item.userId === session?.user?.id && (
                          <button onClick={() => handleDeleteItem(stage.id, 'touchpoints', item.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                    {!closed && (
                      <button onClick={() => setNewItem({ stageId: stage.id, type: 'touchpoint', text: '' })} className="w-full text-xs text-gray-400 hover:text-teal-500 py-1 border border-dashed border-gray-300 rounded">
                        <Plus size={10} className="inline" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Emotions */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">😊 Emociones</h5>
                  <div className="flex flex-wrap gap-1">
                    {stage.emotions.map(emotion => {
                      const config = EMOTION_ICONS[emotion.type];
                      const Icon = config.icon;
                      return (
                        <div key={emotion.id} className={`${config.bg} rounded px-2 py-1 text-xs flex items-center gap-1 group relative`}>
                          <Icon size={12} className={config.color} />
                          <span className="text-gray-700 dark:text-gray-200">{emotion.text}</span>
                          {!closed && emotion.userId === session?.user?.id && (
                            <button onClick={() => handleDeleteItem(stage.id, 'emotions', emotion.id)} className="opacity-0 group-hover:opacity-100 text-red-500 ml-1">
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {!closed && (
                      <button onClick={() => setNewItem({ stageId: stage.id, type: 'emotion', text: '', emotionType: 'positive' })} className="text-xs text-gray-400 hover:text-teal-500 px-2 py-1 border border-dashed border-gray-300 rounded">
                        <Plus size={10} className="inline" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pain Points */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">😣 Pain Points</h5>
                  <div className="space-y-1">
                    {stage.painPoints.map(item => (
                      <div key={item.id} className="bg-red-50 dark:bg-red-900/20 rounded p-1.5 text-xs group relative">
                        <p className="text-gray-800 dark:text-gray-100 pr-4">{item.text}</p>
                        {!closed && item.userId === session?.user?.id && (
                          <button onClick={() => handleDeleteItem(stage.id, 'painPoints', item.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                    {!closed && (
                      <button onClick={() => setNewItem({ stageId: stage.id, type: 'painPoint', text: '' })} className="w-full text-xs text-gray-400 hover:text-red-500 py-1 border border-dashed border-gray-300 rounded">
                        <Plus size={10} className="inline" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Opportunities */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">💡 Oportunidades</h5>
                  <div className="space-y-1">
                    {stage.opportunities.map(item => (
                      <div key={item.id} className="bg-green-50 dark:bg-green-900/20 rounded p-1.5 text-xs group relative">
                        <p className="text-gray-800 dark:text-gray-100 pr-4">{item.text}</p>
                        {!closed && item.userId === session?.user?.id && (
                          <button onClick={() => handleDeleteItem(stage.id, 'opportunities', item.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                    {!closed && (
                      <button onClick={() => setNewItem({ stageId: stage.id, type: 'opportunity', text: '' })} className="w-full text-xs text-gray-400 hover:text-green-500 py-1 border border-dashed border-gray-300 rounded">
                        <Plus size={10} className="inline" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Item Modal */}
      {newItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {newItem.type === 'touchpoint' && '📍 Nuevo Punto de Contacto'}
              {newItem.type === 'emotion' && '😊 Nueva Emoción'}
              {newItem.type === 'painPoint' && '😣 Nuevo Pain Point'}
              {newItem.type === 'opportunity' && '💡 Nueva Oportunidad'}
            </h4>
            {newItem.type === 'emotion' && (
              <div className="flex gap-2 mb-3">
                {(['positive', 'neutral', 'negative'] as const).map(type => {
                  const config = EMOTION_ICONS[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setNewItem({ ...newItem, emotionType: type })}
                      className={`flex-1 p-2 rounded-lg border-2 ${newItem.emotionType === type ? 'border-teal-500' : 'border-gray-200'} ${config.bg}`}
                    >
                      <Icon className={`mx-auto ${config.color}`} size={24} />
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              value={newItem.text}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              placeholder="Describe..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setNewItem(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                Cancelar
              </button>
              <button onClick={handleAddItem} disabled={!newItem.text.trim() || submitting} className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-400">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleCloseJourney} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Journey Map
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Customer Journey Map cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/customer-journey</code>
      </div>
    </div>
  );
}
