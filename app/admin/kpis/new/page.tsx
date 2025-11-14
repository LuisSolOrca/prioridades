'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FormulaEditor from '@/components/kpis/FormulaEditor';

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Tag {
  category: string;
  value: string;
}

export default function NewKPIPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategicObjective, setStrategicObjective] = useState('');
  const [initiativeId, setInitiativeId] = useState('');
  const [unit, setUnit] = useState('');
  const [periodicity, setPeriodicity] = useState('MENSUAL');
  const [responsible, setResponsible] = useState('');
  const [formula, setFormula] = useState('');
  const [target, setTarget] = useState('');
  const [minTolerance, setMinTolerance] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [kpiType, setKpiType] = useState('EFICIENCIA');
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagCategory, setNewTagCategory] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if ((session.user as any).role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, session, router]);

  const loadData = async () => {
    try {
      const [initiativesRes, usersRes] = await Promise.all([
        fetch('/api/initiatives?activeOnly=true'),
        fetch('/api/users'),
      ]);

      const initiativesData = await initiativesRes.json();
      const usersData = await usersRes.json();

      setInitiatives(initiativesData);
      setUsers(usersData.filter((u: any) => u.isActive));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagCategory.trim() || !newTagValue.trim()) {
      alert('Completa categoría y valor de la etiqueta');
      return;
    }

    setTags([...tags, { category: newTagCategory, value: newTagValue }]);
    setNewTagCategory('');
    setNewTagValue('');
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !strategicObjective.trim() || !initiativeId || !unit.trim() ||
        !responsible || !formula.trim() || !target || !minTolerance || !warningThreshold) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const targetNum = parseFloat(target);
    const minToleranceNum = parseFloat(minTolerance);
    const warningThresholdNum = parseFloat(warningThreshold);

    if (isNaN(targetNum) || isNaN(minToleranceNum) || isNaN(warningThresholdNum)) {
      alert('Los valores numéricos deben ser válidos');
      return;
    }

    if (minToleranceNum > warningThresholdNum) {
      alert('El mínimo aceptable debe ser menor o igual al umbral de alerta');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          strategicObjective,
          initiativeId,
          unit,
          periodicity,
          responsible,
          formula,
          dataSource: 'MANUAL',
          target: targetNum,
          tolerance: {
            minimum: minToleranceNum,
            warningThreshold: warningThresholdNum,
          },
          kpiType,
          tags,
        }),
      });

      if (res.ok) {
        alert('KPI creado exitosamente');
        router.push('/admin/kpis');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear KPI');
      }
    } catch (error) {
      console.error('Error creating KPI:', error);
      alert('Error al crear KPI');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Nuevo KPI</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Crea un nuevo indicador clave de rendimiento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          {/* Información básica */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Información Básica</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del KPI *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: Tasa de conversión de ventas"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                  placeholder="Descripción detallada del KPI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objetivo estratégico al que contribuye *
                </label>
                <textarea
                  value={strategicObjective}
                  onChange={(e) => setStrategicObjective(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={2}
                  placeholder="Ej: Incrementar ingresos en un 20%"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Iniciativa Estratégica *
                </label>
                <select
                  value={initiativeId}
                  onChange={(e) => setInitiativeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Selecciona una iniciativa</option>
                  {initiatives.map((init) => (
                    <option key={init._id} value={init._id}>
                      {init.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Configuración</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unidad de medida *
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: %, $, unidades"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Periodicidad *
                </label>
                <select
                  value={periodicity}
                  onChange={(e) => setPeriodicity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="DIARIA">Diaria</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="MENSUAL">Mensual</option>
                  <option value="TRIMESTRAL">Trimestral</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Responsable (Owner) *
                </label>
                <select
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Selecciona un responsable</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de KPI *
                </label>
                <select
                  value={kpiType}
                  onChange={(e) => setKpiType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="EFICIENCIA">Eficiencia</option>
                  <option value="EFICACIA">Eficacia</option>
                  <option value="CALIDAD">Calidad</option>
                  <option value="RIESGO">Riesgo</option>
                  <option value="FINANCIERO">Financiero</option>
                  <option value="OPERATIVO">Operativo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fórmula */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Fórmula de Cálculo</h2>
            <FormulaEditor value={formula} onChange={setFormula} />
          </div>

          {/* Metas y Tolerancias */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Metas y Tolerancias</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta (Target) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: 95"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mínimo aceptable *
                </label>
                <input
                  type="number"
                  step="any"
                  value={minTolerance}
                  onChange={(e) => setMinTolerance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: 80"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Umbral de alerta *
                </label>
                <input
                  type="number"
                  step="any"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: 85"
                  required
                />
              </div>
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Etiquetas / Categorías</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Categoría (Ej: OKR, Área)"
                />
                <input
                  type="text"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Valor"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                >
                  Agregar etiqueta
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                    >
                      <span className="text-sm">
                        <strong>{tag.category}:</strong> {tag.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.push('/admin/kpis')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Crear KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
