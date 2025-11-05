'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MonthlyLeaderboard from '@/components/MonthlyLeaderboard';

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-xl shadow-lg p-8 text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2 flex items-center justify-center">
                <span className="mr-3">🏆</span>
                Leaderboard Mensual
                <span className="ml-3">🏆</span>
              </h1>
              <p className="text-lg opacity-90 mb-2">
                Los mejores colaboradores del mes según su desempeño
              </p>
              <p className="text-sm opacity-80">
                Gana puntos completando prioridades, manteniendo todo bajo control y usando la plataforma
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="text-3xl mr-3">✅</div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Completa Prioridades</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">+4 puntos por cada prioridad completada</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-start">
                <div className="text-3xl mr-3">⚠️</div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Evita Riesgos</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">-6 puntos por prioridad en riesgo/bloqueada/reprogramada por semana</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-start">
                <div className="text-3xl mr-3">🔄</div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Rescata a Tiempo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">-2 puntos si rescatas en la semana actual</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Leaderboard Component */}
          <MonthlyLeaderboard />

          {/* How to Win Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              ¿Cómo ganar puntos y badges?
            </h2>

            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">🎯 Gestiona tus Prioridades</h3>
              <div className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">✅</span>
                  <div><strong>Completa prioridades:</strong> +4 puntos por cada una</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">⚠️</span>
                  <div><strong>Evita riesgos, bloqueos y reprogramaciones:</strong> -6 puntos por semana en ese estado</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">🔄</span>
                  <div><strong>Reacciona rápido:</strong> Si rescatas en la misma semana, solo -2 puntos</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">🔥</span>
                  <div><strong>Construye rachas:</strong> 5 semanas al 100% = badge especial</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2">🤖 Usa la Plataforma</h3>
              <div className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">✨</span>
                  <div><strong>IA:</strong> Mejora textos y genera análisis organizacionales</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">📊</span>
                  <div><strong>Exporta:</strong> PowerPoint, Excel, PDF - cada export cuenta</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">📈</span>
                  <div><strong>Analiza:</strong> Visita Analytics para insights de tu equipo</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">🗂️</span>
                  <div><strong>Organiza:</strong> Usa el tablero Kanban para visualización</div>
                </div>
                <div className="flex items-start">
                  <span className="mr-2 flex-shrink-0">💬</span>
                  <div><strong>Colabora:</strong> Comenta y menciona a tu equipo</div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
              <p className="text-sm text-gray-800 dark:text-gray-200 text-center">
                <strong>🌟 ¡24 badges disponibles!</strong> Desde "Primera Victoria" hasta "Power User" - explora todas las funcionalidades
              </p>
            </div>
          </div>

          {/* Rewards Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-purple-900 dark:text-purple-200 mb-3 flex items-center">
              <span className="mr-2">🎁</span>
              Reconocimiento para el Ganador
            </h2>
            <p className="text-purple-800 dark:text-purple-200 mb-3">
              Al finalizar el mes, el colaborador con más puntos recibe:
            </p>
            <ul className="space-y-2 text-purple-700 dark:text-purple-300">
              <li className="flex items-center">
                <span className="mr-2">📧</span>
                Correo de felicitación personalizado
              </li>
              <li className="flex items-center">
                <span className="mr-2">👥</span>
                Reconocimiento con copia a todos los administradores
              </li>
              <li className="flex items-center">
                <span className="mr-2">⭐</span>
                Tu nombre destacado como el mejor del mes
              </li>
            </ul>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-blue-600 text-white rounded-lg p-6 shadow-lg">
            <h3 className="text-2xl font-bold mb-2">¡Sigue sumando puntos!</h3>
            <p className="mb-4">
              Cada prioridad completada te acerca más a la cima del leaderboard
            </p>
            <button
              onClick={() => router.push('/priorities')}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition"
            >
              📋 Ir a Mis Prioridades
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
