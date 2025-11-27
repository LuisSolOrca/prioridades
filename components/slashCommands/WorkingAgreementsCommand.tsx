'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Users, Check, ThumbsUp } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Agreement {
  id: string;
  text: string;
  userId: string;
  userName: string;
  approvals: { oderId: string; oderName: string }[];
}

interface AgreementCategory {
  id: string;
  title: string;
  icon: string;
  agreements: Agreement[];
}

interface WorkingAgreementsCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  categories: AgreementCategory[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function WorkingAgreementsCommand({
  projectId,
  messageId,
  channelId,
  title,
  categories: initialCategories,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: WorkingAgreementsCommandProps) {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<AgreementCategory[]>(initialCategories || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newAgreement, setNewAgreement] = useState<{ categoryId: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setCategories(initialCategories || []);
  }, [JSON.stringify(initialCategories)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddAgreement = async () => {
    if (!session?.user || !newAgreement?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/working-agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newAgreement.categoryId, text: newAgreement.text.trim() })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setCategories(data.commandData.categories || []);
      setNewAgreement(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (categoryId: string, agreementId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/working-agreements`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', categoryId, agreementId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setCategories(data.commandData.categories || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgreement = async (categoryId: string, agreementId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/working-agreements`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', categoryId, agreementId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setCategories(data.commandData.categories || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAgreements = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'working-agreements',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/working-agreements`, {
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

  const totalAgreements = categories.reduce((sum, cat) => sum + cat.agreements.length, 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Working Agreements {closed ? '• Cerrado' : '• Activo'} • {totalAgreements} acuerdos
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Info Box */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-sm text-gray-600 dark:text-gray-300">
        <p>💡 Los Working Agreements son compromisos del equipo sobre cómo trabajarán juntos.
        Cada miembro puede aprobar los acuerdos con los que está de acuerdo.</p>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {categories.map(category => (
          <div key={category.id} className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-xl">{category.icon}</span>
              {category.title}
            </h4>

            <div className="space-y-2">
              {category.agreements.map(agreement => {
                const hasApproved = agreement.approvals.some(a => a.oderId === session?.user?.id);
                return (
                  <div key={agreement.id} className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 group relative">
                    <p className="text-sm text-gray-800 dark:text-gray-100 pr-16 mb-2">{agreement.text}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {agreement.approvals.length > 0 && (
                          <div className="flex -space-x-1">
                            {agreement.approvals.slice(0, 5).map(approval => (
                              <div
                                key={approval.oderId}
                                className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border border-white"
                                title={approval.oderName}
                              >
                                {approval.oderName.charAt(0)}
                              </div>
                            ))}
                            {agreement.approvals.length > 5 && (
                              <span className="text-xs text-gray-500 ml-1">+{agreement.approvals.length - 5}</span>
                            )}
                          </div>
                        )}
                        <span className="text-xs text-gray-500 ml-1">{agreement.approvals.length} aprobación(es)</span>
                      </div>

                      {!closed && (
                        <button
                          onClick={() => handleApprove(category.id, agreement.id)}
                          disabled={submitting}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                            hasApproved
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-200 hover:bg-green-100'
                          }`}
                        >
                          {hasApproved ? <Check size={12} /> : <ThumbsUp size={12} />}
                          {hasApproved ? 'Aprobado' : 'Aprobar'}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-1">— {agreement.userName}</p>

                    {!closed && agreement.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDeleteAgreement(category.id, agreement.id)}
                        disabled={submitting}
                        className="absolute top-2 right-2 p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {!closed && (
                <button
                  onClick={() => setNewAgreement({ categoryId: category.id, text: '' })}
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-400 flex items-center justify-center gap-1 text-sm"
                >
                  <Plus size={14} />
                  Nuevo acuerdo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Agreement Modal */}
      {newAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Nuevo Acuerdo - {categories.find(c => c.id === newAgreement.categoryId)?.title}
            </h4>
            <textarea
              value={newAgreement.text}
              onChange={(e) => setNewAgreement({ ...newAgreement, text: e.target.value })}
              placeholder="Describe el acuerdo del equipo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-none"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 mb-3">
              Ejemplo: "Respondemos mensajes en Slack dentro de las 2 horas laborales"
            </p>
            <div className="flex gap-2">
              <button onClick={() => setNewAgreement(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                Cancelar
              </button>
              <button onClick={handleAddAgreement} disabled={!newAgreement.text.trim() || submitting} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-400">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && totalAgreements > 0 && (
        <button onClick={handleCloseAgreements} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Working Agreements
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Working Agreements cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/working-agreements</code>
      </div>
    </div>
  );
}
