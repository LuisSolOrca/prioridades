'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ActivityFeed from '@/components/channels/ActivityFeed';
import ChannelChat from '@/components/channels/ChannelChat';
import ChannelLinks from '@/components/channels/ChannelLinks';
import ChannelMetrics from '@/components/channels/ChannelMetrics';
import ProjectFormModal, { ProjectFormData } from '@/components/ProjectFormModal';
import { Hash, Activity, MessageSquare, Link as LinkIcon, ArrowLeft, BarChart3, FileText } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function ChannelPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'links' | 'metrics'>('metrics');
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

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
      const [projectsRes, usersRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/users')
      ]);

      if (!projectsRes.ok) throw new Error('Error al cargar proyecto');

      const projectsData = await projectsRes.json();
      const projects = Array.isArray(projectsData) ? projectsData : projectsData.projects || [];
      const foundProject = projects.find((p: any) => p._id === params.id);

      if (foundProject) {
        setProject(foundProject);
      } else {
        throw new Error('Proyecto no encontrado');
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
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

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
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
              <button
                onClick={() => setShowProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                title="Ver detalles del proyecto"
              >
                <FileText size={18} />
                Breakdown
              </button>
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
              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex items-center px-4 py-2 rounded-t-lg transition ${
                  activeTab === 'metrics'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 size={18} className="mr-2" />
                Métricas
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {activeTab === 'feed' && <ActivityFeed projectId={params.id} />}
            {activeTab === 'chat' && <ChannelChat projectId={params.id} />}
            {activeTab === 'links' && <ChannelLinks projectId={params.id} />}
            {activeTab === 'metrics' && <ChannelMetrics projectId={params.id} />}
          </div>
        </div>
      </div>

      {/* Project Breakdown Modal */}
      {showProjectModal && project && (
        <ProjectFormModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          formData={project}
          setFormData={() => {}} // No-op since it's read-only
          handleSubmit={(e) => e.preventDefault()} // No-op since it's read-only
          isEditing={true}
          users={users}
          projectId={project._id}
          readOnly={true}
          saving={false}
        />
      )}
    </div>
  );
}
