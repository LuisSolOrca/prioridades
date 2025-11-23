'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Hash, Activity, MessageSquare, Link as LinkIcon, ArrowLeft } from 'lucide-react';

export default function ChannelPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'links'>('feed');
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadProject();
    }
  }, [status, router, params.id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Error al cargar proyecto');

      const data = await response.json();
      const projects = Array.isArray(data) ? data : data.projects || [];
      const foundProject = projects.find((p: any) => p._id === params.id);

      if (foundProject) {
        setProject(foundProject);
      } else {
        throw new Error('Proyecto no encontrado');
      }
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando canal...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content container mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <p className="text-red-700 dark:text-red-200">Proyecto no encontrado</p>
            <button
              onClick={() => router.push('/channels')}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Volver a Canales
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => router.push('/channels')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-3 transition"
            >
              <ArrowLeft size={18} className="mr-1" />
              Volver a Canales
            </button>

            <div className="flex items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                <Hash className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex items-center px-4 py-2 rounded-t-lg transition ${
                  activeTab === 'feed'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Activity size={18} className="mr-2" />
                Feed
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center px-4 py-2 rounded-t-lg transition ${
                  activeTab === 'chat'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <MessageSquare size={18} className="mr-2" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('links')}
                className={`flex items-center px-4 py-2 rounded-t-lg transition ${
                  activeTab === 'links'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <LinkIcon size={18} className="mr-2" />
                Links
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === 'feed' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <Activity size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Feed de Actividades
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Aquí verás todas las actualizaciones del proyecto: prioridades creadas, tareas completadas, comentarios, etc.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                Componente en desarrollo
              </p>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Chat del Proyecto
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Chatea con tu equipo, menciona usuarios con @nombre y reacciona con emojis.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                Componente en desarrollo
              </p>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <LinkIcon size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Enlaces Compartidos
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comparte y organiza enlaces importantes: documentación, repositorios, diseños, etc.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                Componente en desarrollo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
