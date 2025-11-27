'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, User, Target, Frown, Heart, Activity, Quote } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface PersonaCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  name: string;
  photo: string;
  demographics: {
    age: string;
    occupation: string;
    location: string;
    education: string;
  };
  goals: { id: string; text: string; userId: string; userName: string }[];
  frustrations: { id: string; text: string; userId: string; userName: string }[];
  motivations: { id: string; text: string; userId: string; userName: string }[];
  behaviors: { id: string; text: string; userId: string; userName: string }[];
  quote: string;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PersonaCommand({
  projectId,
  messageId,
  channelId,
  title,
  name: initialName,
  photo: initialPhoto,
  demographics: initialDemographics,
  goals: initialGoals,
  frustrations: initialFrustrations,
  motivations: initialMotivations,
  behaviors: initialBehaviors,
  quote: initialQuote,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: PersonaCommandProps) {
  const { data: session } = useSession();
  const [name, setName] = useState(initialName || '');
  const [photo, setPhoto] = useState(initialPhoto || '');
  const [demographics, setDemographics] = useState(initialDemographics || { age: '', occupation: '', location: '', education: '' });
  const [goals, setGoals] = useState(initialGoals || []);
  const [frustrations, setFrustrations] = useState(initialFrustrations || []);
  const [motivations, setMotivations] = useState(initialMotivations || []);
  const [behaviors, setBehaviors] = useState(initialBehaviors || []);
  const [quote, setQuote] = useState(initialQuote || '');
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState<{ type: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setGoals(initialGoals || []);
    setFrustrations(initialFrustrations || []);
    setMotivations(initialMotivations || []);
    setBehaviors(initialBehaviors || []);
  }, [JSON.stringify(initialGoals), JSON.stringify(initialFrustrations), JSON.stringify(initialMotivations), JSON.stringify(initialBehaviors)]);

  useEffect(() => {
    setName(initialName || '');
    setPhoto(initialPhoto || '');
    setDemographics(initialDemographics || { age: '', occupation: '', location: '', education: '' });
    setQuote(initialQuote || '');
    setClosed(initialClosed);
  }, [initialName, initialPhoto, JSON.stringify(initialDemographics), initialQuote, initialClosed]);

  const handleUpdateField = async (field: string, value: any) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/persona`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateField', field, value })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.commandData.name !== undefined) setName(data.commandData.name);
      if (data.commandData.photo !== undefined) setPhoto(data.commandData.photo);
      if (data.commandData.demographics) setDemographics(data.commandData.demographics);
      if (data.commandData.quote !== undefined) setQuote(data.commandData.quote);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = async () => {
    if (!session?.user || !newItem?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newItem.type, text: newItem.text.trim() })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setGoals(data.commandData.goals || []);
      setFrustrations(data.commandData.frustrations || []);
      setMotivations(data.commandData.motivations || []);
      setBehaviors(data.commandData.behaviors || []);
      setNewItem(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (type: string, itemId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/persona`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteItem', type, itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setGoals(data.commandData.goals || []);
      setFrustrations(data.commandData.frustrations || []);
      setMotivations(data.commandData.motivations || []);
      setBehaviors(data.commandData.behaviors || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePersona = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'persona',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/persona`, {
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

  const sections = [
    { id: 'goals', title: 'Objetivos', icon: Target, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', items: goals },
    { id: 'frustrations', title: 'Frustraciones', icon: Frown, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', items: frustrations },
    { id: 'motivations', title: 'Motivaciones', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', items: motivations },
    { id: 'behaviors', title: 'Comportamientos', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', items: behaviors }
  ];

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-rose-400 dark:border-rose-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Persona / User Profile {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Persona Header */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            {!closed ? (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={(e) => handleUpdateField('name', e.target.value)}
                  placeholder="Nombre de la persona..."
                  className="w-full text-xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 mb-2"
                />
                <input
                  type="text"
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                  onBlur={(e) => handleUpdateField('photo', e.target.value)}
                  placeholder="URL de foto (opcional)..."
                  className="w-full text-xs bg-transparent border-b border-gray-200 dark:border-gray-600 text-gray-500"
                />
              </>
            ) : (
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{name || 'Sin nombre'}</h4>
            )}
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Datos Demográficos</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'age', label: 'Edad', icon: '🎂' },
            { key: 'occupation', label: 'Ocupación', icon: '💼' },
            { key: 'location', label: 'Ubicación', icon: '📍' },
            { key: 'education', label: 'Educación', icon: '🎓' }
          ].map(field => (
            <div key={field.key} className="bg-gray-50 dark:bg-gray-600 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">{field.icon} {field.label}</div>
              {!closed ? (
                <input
                  type="text"
                  value={demographics[field.key as keyof typeof demographics] || ''}
                  onChange={(e) => setDemographics({ ...demographics, [field.key]: e.target.value })}
                  onBlur={() => handleUpdateField('demographics', demographics)}
                  placeholder="..."
                  className="w-full text-sm bg-transparent text-gray-800 dark:text-gray-100"
                />
              ) : (
                <div className="text-sm text-gray-800 dark:text-gray-100">
                  {demographics[field.key as keyof typeof demographics] || '-'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.id} className={`${section.bg} rounded-lg p-4`}>
              <h4 className={`font-semibold ${section.color} mb-2 flex items-center gap-2`}>
                <Icon size={16} /> {section.title}
              </h4>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-700 rounded p-2 text-sm group relative">
                    <p className="text-gray-800 dark:text-gray-100 pr-6">{item.text}</p>
                    <p className="text-xs text-gray-400">— {item.userName}</p>
                    {!closed && item.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDeleteItem(section.id, item.id)}
                        disabled={submitting}
                        className="absolute top-2 right-2 p-1 text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {!closed && (
                  <button
                    onClick={() => setNewItem({ type: section.id, text: '' })}
                    className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded text-gray-500 hover:text-rose-600 hover:border-rose-400 text-sm flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Agregar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quote */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Quote size={16} /> Cita Característica
        </h4>
        {!closed ? (
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            onBlur={(e) => handleUpdateField('quote', e.target.value)}
            placeholder='"Una frase que represente a esta persona..."'
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 italic resize-none"
          />
        ) : (
          <p className="text-gray-700 dark:text-gray-300 italic">"{quote || 'Sin cita'}"</p>
        )}
      </div>

      {/* Add Item Modal */}
      {newItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Agregar {sections.find(s => s.id === newItem.type)?.title}
            </h4>
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
              <button onClick={handleAddItem} disabled={!newItem.text.trim() || submitting} className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-gray-400">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleClosePersona} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Persona
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Persona cerrada
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/persona</code>
      </div>
    </div>
  );
}
