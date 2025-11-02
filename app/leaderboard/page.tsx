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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-xl shadow-lg p-8 text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2 flex items-center justify-center">
                <span className="mr-3">🏆</span>
                Leaderboard Mensual
                <span className="ml-3">🏆</span>
              </h1>
              <p className="text-lg opacity-90">
                Los mejores colaboradores del mes según su desempeño
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="text-3xl mr-3">✅</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Completa Prioridades</h3>
                  <p className="text-sm text-gray-600">+4 puntos por cada prioridad completada</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-start">
                <div className="text-3xl mr-3">⚠️</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Evita Riesgos</h3>
                  <p className="text-sm text-gray-600">-6 puntos por prioridad en riesgo/bloqueada por semana</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-start">
                <div className="text-3xl mr-3">🔄</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Rescata a Tiempo</h3>
                  <p className="text-sm text-gray-600">-2 puntos si rescatas en la semana actual</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Leaderboard Component */}
          <MonthlyLeaderboard />

          {/* How to Win Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              ¿Cómo ganar el Leaderboard?
            </h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start">
                <span className="text-xl mr-3 flex-shrink-0">1️⃣</span>
                <div>
                  <strong>Completa tus prioridades semanales:</strong> Cada prioridad completada suma 4 puntos a tu marcador mensual.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-xl mr-3 flex-shrink-0">2️⃣</span>
                <div>
                  <strong>Mantén tus prioridades EN_TIEMPO:</strong> Las prioridades en riesgo o bloqueadas te cuestan -6 puntos por cada semana que permanezcan en ese estado.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-xl mr-3 flex-shrink-0">3️⃣</span>
                <div>
                  <strong>Rescata rápido si algo sale mal:</strong> Si una prioridad cae en riesgo pero la rescatas en la misma semana, solo pierdes -2 puntos.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-xl mr-3 flex-shrink-0">4️⃣</span>
                <div>
                  <strong>Construye rachas:</strong> Completa 5 semanas consecutivas al 100% para obtener el badge especial de racha 🔥
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-purple-900 mb-3 flex items-center">
              <span className="mr-2">🎁</span>
              Reconocimiento para el Ganador
            </h2>
            <p className="text-purple-800 mb-3">
              Al finalizar el mes, el colaborador con más puntos recibe:
            </p>
            <ul className="space-y-2 text-purple-700">
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
