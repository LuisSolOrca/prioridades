'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  GitBranch,
  ArrowLeft,
  Layers,
  DollarSign,
  Loader2,
  Edit,
  ArrowRight,
} from 'lucide-react';

interface PipelineStage {
  _id: string;
  name: string;
  color: string;
  order: number;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
}

interface Pipeline {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export default function PipelineDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const pipelineId = params.id as string;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadPipeline();
    }
  }, [status, router, pipelineId]);

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/pipelines/${pipelineId}`);
      if (!res.ok) {
        router.push('/crm');
        return;
      }
      const data = await res.json();
      setPipeline(data);
    } catch (error) {
      console.error('Error loading pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !pipeline) return null;

  const sortedStages = [...(pipeline.stages || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-5xl mx-auto">
        <Link
          href="/crm"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver al CRM
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                <GitBranch size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{pipeline.name}</h1>
                  {pipeline.isDefault && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                      Por defecto
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    pipeline.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {pipeline.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {pipeline.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{pipeline.description}</p>
                )}
              </div>
            </div>
            <Link
              href="/crm"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>
        </div>

        {/* Stages Visualization */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Layers size={20} className="text-purple-500" />
              Etapas del Pipeline ({sortedStages.length})
            </h2>
          </div>

          {/* Flow View */}
          <div className="p-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {sortedStages.map((stage, idx) => (
                <div key={stage._id} className="flex items-center">
                  <div
                    className="px-4 py-3 rounded-lg text-white min-w-[120px] text-center"
                    style={{ backgroundColor: stage.color }}
                  >
                    <div className="font-medium">{stage.name}</div>
                    <div className="text-xs opacity-80">{stage.probability}%</div>
                  </div>
                  {idx < sortedStages.length - 1 && (
                    <ArrowRight size={20} className="text-gray-400 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stages List */}
          <div className="divide-y dark:divide-gray-700">
            {sortedStages.map((stage) => (
              <div key={stage._id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-100">{stage.name}</h4>
                    <div className="flex gap-2 mt-1">
                      {stage.isClosed && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          stage.isWon
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {stage.isWon ? 'Ganado' : 'Perdido'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{stage.probability}%</div>
                  <div className="text-xs text-gray-500">Probabilidad</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total de etapas</span>
              <span className="text-gray-800 dark:text-gray-200">{sortedStages.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Creado</span>
              <span className="text-gray-800 dark:text-gray-200">
                {new Date(pipeline.createdAt).toLocaleDateString('es-MX')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Actualizado</span>
              <span className="text-gray-800 dark:text-gray-200">
                {new Date(pipeline.updatedAt).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
