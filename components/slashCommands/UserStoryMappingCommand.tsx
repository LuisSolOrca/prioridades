'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Map, Plus, Trash2, GripVertical } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Story {
  id: string;
  text: string;
  userId: string;
  userName: string;
  releaseId: string;
}

interface Activity {
  id: string;
  title: string;
  userId: string;
  userName: string;
  stories: Story[];
}

interface Release {
  id: string;
  title: string;
  color: string;
}

interface UserStoryMappingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  activities: Activity[];
  releases: Release[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const RELEASE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function UserStoryMappingCommand({
  projectId,
  messageId,
  channelId,
  title,
  activities: initialActivities,
  releases: initialReleases,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: UserStoryMappingCommandProps) {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<Activity[]>(initialActivities || []);
  const [releases, setReleases] = useState<Release[]>(initialReleases || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newActivity, setNewActivity] = useState('');
  const [newStory, setNewStory] = useState<{ activityId: string; text: string; releaseId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActivities(initialActivities || []);
    setReleases(initialReleases || []);
    setClosed(initialClosed);
  }, [initialActivities, initialReleases, initialClosed]);

  const handleAddActivity = async () => {
    if (!session?.user || !newActivity.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/user-story-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addActivity', title: newActivity.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setActivities(data.commandData.activities || []);
      setNewActivity('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStory = async () => {
    if (!session?.user || !newStory?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/user-story-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addStory',
          activityId: newStory.activityId,
          text: newStory.text.trim(),
          releaseId: newStory.releaseId
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setActivities(data.commandData.activities || []);
      setNewStory(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRelease = async () => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const newReleaseTitle = `Release ${releases.length + 1}`;
      const newColor = RELEASE_COLORS[releases.length % RELEASE_COLORS.length];

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/user-story-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addRelease', title: newReleaseTitle, color: newColor })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setReleases(data.commandData.releases || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/user-story-mapping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteActivity', activityId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setActivities(data.commandData.activities || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStory = async (activityId: string, storyId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/user-story-mapping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteStory', activityId, storyId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setActivities(data.commandData.activities || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseMapping = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'user-story-mapping',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/user-story-mapping`, {
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

  const getStoriesByRelease = (activityId: string, releaseId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.stories.filter(s => s.releaseId === releaseId) || [];
  };

  const totalStories = activities.reduce((acc, a) => acc + a.stories.length, 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-400 dark:border-teal-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
            <Map className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              User Story Mapping {closed ? '• Cerrado' : '• Activo'} • {activities.length} actividades • {totalStories} historias
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Story Map Grid */}
      <div className="overflow-x-auto mb-4">
        <div className="min-w-max">
          {/* Activities Header */}
          <div className="flex gap-2 mb-2">
            <div className="w-24 flex-shrink-0"></div>
            {activities.map(activity => (
              <div
                key={activity.id}
                className="w-48 flex-shrink-0 bg-teal-500 text-white rounded-lg p-2 group relative"
              >
                <div className="flex items-center gap-1">
                  <GripVertical size={14} className="opacity-50" />
                  <span className="font-semibold text-sm truncate">{activity.title}</span>
                </div>
                <p className="text-xs opacity-75">— {activity.userName}</p>
                {!closed && activity.userId === session?.user?.id && (
                  <button
                    onClick={() => handleDeleteActivity(activity.id)}
                    disabled={submitting}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
            {!closed && (
              <div className="w-48 flex-shrink-0">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="Nueva actividad..."
                    className="flex-1 px-2 py-1 text-sm border border-teal-300 rounded-lg bg-white dark:bg-gray-800"
                    disabled={submitting}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                  />
                  <button
                    onClick={handleAddActivity}
                    disabled={!newActivity.trim() || submitting}
                    className="p-1 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:bg-gray-400"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Releases Rows */}
          {releases.map(release => (
            <div key={release.id} className="flex gap-2 mb-2">
              <div
                className="w-24 flex-shrink-0 rounded-lg p-2 text-white text-xs font-semibold flex items-center justify-center"
                style={{ backgroundColor: release.color }}
              >
                {release.title}
              </div>
              {activities.map(activity => {
                const stories = getStoriesByRelease(activity.id, release.id);
                return (
                  <div
                    key={`${activity.id}-${release.id}`}
                    className="w-48 flex-shrink-0 bg-white dark:bg-gray-700 rounded-lg p-2 min-h-[80px] border-2 border-gray-200 dark:border-gray-600"
                  >
                    <div className="space-y-1">
                      {stories.map(story => (
                        <div
                          key={story.id}
                          className="bg-yellow-100 dark:bg-yellow-900/30 rounded p-1.5 text-xs group relative"
                          style={{ borderLeft: `3px solid ${release.color}` }}
                        >
                          <p className="text-gray-800 dark:text-gray-100 pr-4">{story.text}</p>
                          <p className="text-gray-500 text-[10px]">— {story.userName}</p>
                          {!closed && story.userId === session?.user?.id && (
                            <button
                              onClick={() => handleDeleteStory(activity.id, story.id)}
                              disabled={submitting}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {!closed && (
                      <button
                        onClick={() => setNewStory({ activityId: activity.id, text: '', releaseId: release.id })}
                        className="w-full mt-1 text-xs text-gray-500 hover:text-teal-600 flex items-center justify-center gap-1 py-1 border border-dashed border-gray-300 rounded hover:border-teal-400"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Add Release */}
          {!closed && (
            <div className="flex gap-2">
              <button
                onClick={handleAddRelease}
                disabled={submitting}
                className="w-24 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 text-xs hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                Release
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Story Modal */}
      {newStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Nueva Historia de Usuario</h4>
            <textarea
              value={newStory.text}
              onChange={(e) => setNewStory({ ...newStory, text: e.target.value })}
              placeholder="Como [usuario], quiero [acción] para [beneficio]..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setNewStory(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddStory}
                disabled={!newStory.text.trim() || submitting}
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-400"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && activities.length > 0 && (
        <button
          onClick={handleCloseMapping}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Story Map
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Story Map cerrado • {activities.length} actividades • {totalStories} historias
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/user-story-mapping</code>
      </div>
    </div>
  );
}
