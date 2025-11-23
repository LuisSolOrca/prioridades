'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Hash, Users, Calendar, ExternalLink } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description?: string;
  slackChannelName?: string;
  createdAt: string;
}

export default function ChannelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadProjects();
    }
  }, [status, router]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');

      if (!response.ok) {
        throw new Error('Error al cargar proyectos');
      }

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando canales...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
            <Hash className="mr-2" size={32} />
            Canales de Proyecto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Colabora con tu equipo en tiempo real. Ve actualizaciones, chatea y comparte recursos.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project._id}
              onClick={() => router.push(`/channels/${project._id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition p-6 text-left border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                    <Hash className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                      {project.name}
                    </h3>
                    {project.slackChannelName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        #{project.slackChannelName}
                      </p>
                    )}
                  </div>
                </div>
                <ExternalLink className="text-gray-400" size={18} />
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Calendar size={14} className="mr-1" />
                Creado {new Date(project.createdAt).toLocaleDateString('es-MX')}
              </div>
            </button>
          ))}
        </div>

        {projects.length === 0 && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              No hay proyectos disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Los proyectos se crean automáticamente cuando se asignan prioridades o hitos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
