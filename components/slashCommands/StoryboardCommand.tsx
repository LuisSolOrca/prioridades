'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Film, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface StoryboardFrame {
  id: string;
  number: number;
  title: string;
  description: string;
  userId: string;
  userName: string;
  sketch?: string; // Simple text description of the sketch
}

interface StoryboardCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  frames: StoryboardFrame[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function StoryboardCommand({
  projectId,
  messageId,
  channelId,
  title,
  frames: initialFrames,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: StoryboardCommandProps) {
  const { data: session } = useSession();
  const [frames, setFrames] = useState<StoryboardFrame[]>(initialFrames || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newFrame, setNewFrame] = useState({ title: '', description: '', sketch: '' });
  const [submitting, setSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState<'grid' | 'strip'>('grid');
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setFrames(initialFrames || []);
  }, [JSON.stringify(initialFrames)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddFrame = async () => {
    if (!session?.user || !newFrame.title.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFrame.title.trim(),
          description: newFrame.description.trim(),
          sketch: newFrame.sketch.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setFrames(data.commandData.frames || []);
      setNewFrame({ title: '', description: '', sketch: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (frameId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/storyboard`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setFrames(data.commandData.frames || []);
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
        commandType: 'storyboard',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/storyboard`, {
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
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Film className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Storyboard {closed ? '• Cerrado' : '• Activo'} • {frames.length} frames
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView(currentView === 'grid' ? 'strip' : 'grid')}
            className="text-xs px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded hover:bg-amber-300 dark:hover:bg-amber-700"
          >
            {currentView === 'grid' ? 'Vista Tira' : 'Vista Grid'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>

      {/* Frames Display */}
      <div className={`mb-4 ${
        currentView === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'flex overflow-x-auto gap-4 pb-4'
      }`}>
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className={`bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden relative group ${
              currentView === 'strip' ? 'flex-shrink-0 w-64' : ''
            }`}
          >
            {/* Frame Number */}
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
              {index + 1}
            </div>

            {/* Sketch Area */}
            <div className="bg-gray-100 dark:bg-gray-600 h-32 flex items-center justify-center border-b border-gray-200 dark:border-gray-500 p-2">
              {frame.sketch ? (
                <p className="text-xs text-gray-600 dark:text-gray-300 text-center italic">[{frame.sketch}]</p>
              ) : (
                <p className="text-xs text-gray-400 text-center">Sin sketch</p>
              )}
            </div>

            {/* Frame Info */}
            <div className="p-3">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-1">{frame.title}</h4>
              {frame.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{frame.description}</p>
              )}
              <p className="text-xs text-gray-500">— {frame.userName}</p>
            </div>

            {/* Delete Button */}
            {!closed && frame.userId === session?.user?.id && (
              <button
                onClick={() => handleDelete(frame.id)}
                disabled={submitting}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Frame Form */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Agregar Frame</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newFrame.title}
              onChange={(e) => setNewFrame({ ...newFrame, title: e.target.value })}
              placeholder="Título del frame"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <input
              type="text"
              value={newFrame.description}
              onChange={(e) => setNewFrame({ ...newFrame, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <input
              type="text"
              value={newFrame.sketch}
              onChange={(e) => setNewFrame({ ...newFrame, sketch: e.target.value })}
              placeholder="Descripción del sketch (opcional)"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
          </div>
          <button
            onClick={handleAddFrame}
            disabled={!newFrame.title.trim() || submitting}
            className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            Agregar Frame
          </button>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && frames.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Storyboard
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Storyboard cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/storyboard</code>
      </div>
    </div>
  );
}
