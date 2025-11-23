'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, MessageCircle, Award, X, ArrowRight, UserPlus } from 'lucide-react';

interface Message {
  _id: string;
  userId: {
    _id: string;
    name: string;
  };
  content: string;
  createdAt: string;
}

interface MentionRelation {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  count: number;
}

interface UserStats {
  userId: string;
  userName: string;
  mentionsSent: number;
  mentionsReceived: number;
  totalInteractions: number;
}

interface MentionStatsCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function MentionStatsCommand({ projectId, onClose }: MentionStatsCommandProps) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mentionRelations, setMentionRelations] = useState<MentionRelation[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [users, setUsers] = useState<Array<{ _id: string; name: string }>>([]);

  useEffect(() => {
    loadMentionStats();
  }, [projectId]);

  const loadMentionStats = async () => {
    try {
      setLoading(true);

      // Cargar todos los mensajes del proyecto
      const messagesResponse = await fetch(`/api/projects/${projectId}/messages?limit=1000`);
      if (!messagesResponse.ok) throw new Error('Error loading messages');
      const messagesData = await messagesResponse.json();
      const allMessages = messagesData.messages || [];
      setMessages(allMessages);

      // Cargar usuarios
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error('Error loading users');
      const usersData = await usersResponse.json();
      const allUsers = usersData.users || usersData || [];
      setUsers(allUsers);

      // Analizar menciones
      analyzeMentions(allMessages, allUsers);
    } catch (err) {
      console.error('Error loading mention stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeMentions = (msgs: Message[], usrs: Array<{ _id: string; name: string }>) => {
    const relations: Map<string, MentionRelation> = new Map();
    const stats: Map<string, UserStats> = new Map();

    // Inicializar stats para cada usuario
    usrs.forEach(user => {
      stats.set(user._id, {
        userId: user._id,
        userName: user.name,
        mentionsSent: 0,
        mentionsReceived: 0,
        totalInteractions: 0
      });
    });

    // Analizar cada mensaje
    msgs.forEach(msg => {
      const mentionRegex = /@([\w\s]+?)(?=\s|$|[^\w\s])/g;
      const mentions = msg.content.match(mentionRegex);

      if (mentions && mentions.length > 0) {
        const uniqueMentions = [...new Set(mentions.map(m => m.substring(1).trim()))];

        uniqueMentions.forEach(mentionedName => {
          // Buscar usuario mencionado
          const mentionedUser = usrs.find(u =>
            u.name.toLowerCase() === mentionedName.toLowerCase()
          );

          if (mentionedUser && mentionedUser._id !== msg.userId._id) {
            // Clave única para la relación
            const relationKey = `${msg.userId._id}->${mentionedUser._id}`;

            // Actualizar o crear relación
            if (relations.has(relationKey)) {
              const rel = relations.get(relationKey)!;
              rel.count++;
            } else {
              relations.set(relationKey, {
                from: msg.userId.name,
                fromId: msg.userId._id,
                to: mentionedUser.name,
                toId: mentionedUser._id,
                count: 1
              });
            }

            // Actualizar stats del que menciona
            const senderStats = stats.get(msg.userId._id);
            if (senderStats) {
              senderStats.mentionsSent++;
              senderStats.totalInteractions++;
            }

            // Actualizar stats del mencionado
            const receiverStats = stats.get(mentionedUser._id);
            if (receiverStats) {
              receiverStats.mentionsReceived++;
              receiverStats.totalInteractions++;
            }
          }
        });
      }
    });

    // Convertir a arrays y ordenar
    const relationsArray = Array.from(relations.values()).sort((a, b) => b.count - a.count);
    const statsArray = Array.from(stats.values())
      .filter(s => s.totalInteractions > 0)
      .sort((a, b) => b.totalInteractions - a.totalInteractions);

    setMentionRelations(relationsArray);
    setUserStats(statsArray);
  };

  const topMentioned = [...userStats].sort((a, b) => b.mentionsReceived - a.mentionsReceived).slice(0, 5);
  const topMentioners = [...userStats].sort((a, b) => b.mentionsSent - a.mentionsSent).slice(0, 5);
  const topRelations = mentionRelations.slice(0, 10);

  const totalMentions = mentionRelations.reduce((sum, rel) => sum + rel.count, 0);
  const activeUsers = userStats.length;

  return (
    <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-pink-300 dark:border-pink-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
              Análisis de Menciones
              <MessageCircle className="text-pink-600 dark:text-pink-400" size={16} />
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Patrones de colaboración y comunicación
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
          <Users className="animate-pulse mx-auto mb-3 text-pink-600" size={48} />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Analizando patrones de comunicación...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen General */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <MessageCircle className="mx-auto mb-2 text-pink-600 dark:text-pink-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMentions}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Menciones</div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <Users className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeUsers}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Usuarios Activos</div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <TrendingUp className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {activeUsers > 0 ? Math.round(totalMentions / activeUsers) : 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Promedio por Usuario</div>
            </div>
          </div>

          {/* Top Mencionados */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Award size={18} className="text-pink-600 dark:text-pink-400" />
              Top Usuarios Más Mencionados
            </h4>
            {topMentioned.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay menciones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {topMentioned.map((user, index) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {user.userName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.mentionsSent} enviadas
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-pink-600 dark:text-pink-400">
                        {user.mentionsReceived}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">menciones</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Mencionadores */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <UserPlus size={18} className="text-purple-600 dark:text-purple-400" />
              Top Usuarios Que Más Mencionan
            </h4>
            {topMentioners.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay menciones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {topMentioners.map((user, index) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {user.userName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.mentionsReceived} recibidas
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {user.mentionsSent}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">menciones</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Relaciones */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <ArrowRight size={18} className="text-blue-600 dark:text-blue-400" />
              Principales Interacciones
            </h4>
            {topRelations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay interacciones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {topRelations.map((relation, index) => (
                  <div
                    key={`${relation.fromId}-${relation.toId}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {relation.from}
                      </span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {relation.to}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-full">
                      <span className="text-sm font-bold text-pink-700 dark:text-pink-300">
                        {relation.count}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">veces</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insights */}
          {userStats.length > 0 && (
            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
              <p className="text-sm text-pink-800 dark:text-pink-200">
                {topMentioned.length > 0 && topMentioners.length > 0 ? (
                  <>
                    💡 <strong>Insight:</strong> {topMentioned[0].userName} es el usuario más mencionado ({topMentioned[0].mentionsReceived} veces), mientras que {topMentioners[0].userName} lidera las menciones a otros ({topMentioners[0].mentionsSent} menciones enviadas). {totalMentions > 50 ? '¡El equipo tiene una comunicación muy activa!' : 'Fomenta más menciones para mejorar la colaboración.'}
                  </>
                ) : (
                  <>📊 <strong>Consejo:</strong> Usa @ para mencionar a tus compañeros en el chat y mejorar la colaboración del equipo.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/mention-stats</code>
      </div>
    </div>
  );
}
