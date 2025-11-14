'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  extractVariablesWithTypes,
  calculateFormulaWithTypes,
  convertVariableValue,
  usesSystemFunctions,
  type VariableInfo
} from '@/lib/kpi-utils/formula-parser';
import { calculateCurrentPeriod, getPeriodName } from '@/lib/kpi-utils/period-calculator';

interface KPI {
  _id: string;
  name: string;
  description?: string;
  unit: string;
  periodicity: string;
  formula: string;
  target: number;
  tolerance: {
    minimum: number;
    warningThreshold: number;
  };
  initiativeId: {
    _id: string;
    name: string;
    color: string;
  };
  responsible: string | { _id: string; name: string; email: string };
  currentVersion: number;
}

interface KPIValue {
  _id: string;
  kpiId: any;
  value: number;
  calculatedValue?: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  notes?: string;
  registeredAt: string;
}

const PERIODICITY_LABELS: { [key: string]: string } = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
};

export default function KPITrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [values, setValues] = useState<KPIValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValueForm, setShowValueForm] = useState(false);

  // Form data
  const [value, setValue] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
  const [detectedVariables, setDetectedVariables] = useState<VariableInfo[]>([]);
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadKPIs();
    }
  }, [status, router]);

  const loadKPIs = async () => {
    try {
      const res = await fetch('/api/kpis?status=ACTIVO&activeOnly=true');
      const data = await res.json();

      // Filtrar KPIs: mostrar solo los que el usuario es responsable (o todos si es admin)
      const userId = (session?.user as any)?.id;
      const userRole = (session?.user as any)?.role;

      const filteredKpis = userRole === 'ADMIN'
        ? data
        : data.filter((kpi: KPI) => {
            const responsibleId = typeof kpi.responsible === 'string'
              ? kpi.responsible
              : kpi.responsible._id;
            return responsibleId === userId;
          });

      setKpis(filteredKpis);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadValues = async (kpiId: string) => {
    try {
      const res = await fetch(`/api/kpi-values?kpiId=${kpiId}`);
      const data = await res.json();
      setValues(data);
    } catch (error) {
      console.error('Error loading values:', error);
    }
  };

  const handleSelectKPI = (kpi: KPI) => {
    setSelectedKpi(kpi);
    loadValues(kpi._id);
    setShowValueForm(false);

    // Extraer variables de la fórmula con tipos
    const vars = extractVariablesWithTypes(kpi.formula);
    setDetectedVariables(vars);
  };

  const handleNewValue = async () => {
    setValue('');
    setNotes('');
    setVariableValues({});
    setCalculatedValue(null);
    setIsAutoCalculated(false);

    // Calcular período automáticamente basado en la periodicidad del KPI
    if (selectedKpi) {
      const period = calculateCurrentPeriod(selectedKpi.periodicity);
      setPeriodStart(period.start);
      setPeriodEnd(period.end);

      // Detectar si la fórmula no tiene variables o usa funciones del sistema
      const vars = extractVariablesWithTypes(selectedKpi.formula);
      const hasSystemFunctions = usesSystemFunctions(selectedKpi.formula);

      if (vars.length === 0 || hasSystemFunctions) {
        // Auto-calcular la fórmula
        setIsCalculating(true);
        try {
          const res = await fetch('/api/kpis/evaluate-formula', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formula: selectedKpi.formula,
              variables: {}
            })
          });

          const data = await res.json();

          if (data.success && data.result !== undefined) {
            setCalculatedValue(data.result);
            setValue(data.result.toString());
            setIsAutoCalculated(true);
          } else {
            alert(`Error al calcular la fórmula: ${data.error || 'Desconocido'}`);
          }
        } catch (error) {
          console.error('Error calculating formula:', error);
          alert('Error al calcular la fórmula automáticamente');
        } finally {
          setIsCalculating(false);
        }
      }
    }

    setShowValueForm(true);
  };

  // Calcular valor cuando cambian las variables
  useEffect(() => {
    if (!selectedKpi || detectedVariables.length === 0) {
      setCalculatedValue(null);
      return;
    }

    // Verificar que todas las variables tengan valor
    const allVariablesFilled = detectedVariables.every(
      varInfo => variableValues[varInfo.name] && variableValues[varInfo.name].trim() !== ''
    );

    if (!allVariablesFilled) {
      setCalculatedValue(null);
      return;
    }

    // Convertir valores string al tipo apropiado
    const convertedValues: { [key: string]: any } = {};
    for (const varInfo of detectedVariables) {
      const rawValue = variableValues[varInfo.name];
      const converted = convertVariableValue(rawValue, varInfo.type);

      if (converted === null) {
        setCalculatedValue(null);
        return;
      }
      convertedValues[varInfo.name] = converted;
    }

    // Calcular el resultado
    const result = calculateFormulaWithTypes(selectedKpi.formula, convertedValues);
    if (result.success && result.result !== undefined) {
      setCalculatedValue(result.result);
      setValue(result.result.toString());
    } else {
      setCalculatedValue(null);
    }
  }, [variableValues, selectedKpi, detectedVariables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedKpi || !value || !periodStart || !periodEnd) {
      alert('Completa todos los campos requeridos');
      return;
    }

    const valueNum = parseFloat(value);
    if (isNaN(valueNum)) {
      alert('El valor debe ser numérico');
      return;
    }

    // Convertir variables a sus tipos apropiados
    const convertedVariables: { [key: string]: any } = {};
    for (const varInfo of detectedVariables) {
      if (variableValues[varInfo.name]) {
        const converted = convertVariableValue(variableValues[varInfo.name], varInfo.type);
        if (converted !== null) {
          convertedVariables[varInfo.name] = converted;
        }
      }
    }

    setSaving(true);

    try {
      const res = await fetch('/api/kpi-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiId: selectedKpi._id,
          value: valueNum,
          variables: Object.keys(convertedVariables).length > 0 ? convertedVariables : undefined,
          periodStart,
          periodEnd,
          notes,
        }),
      });

      if (res.ok) {
        alert('Valor registrado exitosamente');
        setShowValueForm(false);
        loadValues(selectedKpi._id);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al registrar valor');
      }
    } catch (error) {
      console.error('Error creating value:', error);
      alert('Error al registrar valor');
    } finally {
      setSaving(false);
    }
  };

  const getValueStatus = (val: number, kpi: KPI) => {
    if (val >= kpi.target) {
      return { label: 'En meta', color: 'bg-green-100 text-green-800' };
    } else if (val >= kpi.tolerance.warningThreshold) {
      return { label: 'En alerta', color: 'bg-yellow-100 text-yellow-800' };
    } else if (val >= kpi.tolerance.minimum) {
      return { label: 'Por debajo', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'Crítico', color: 'bg-red-100 text-red-800' };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Seguimiento de KPIs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Registra y consulta valores de los KPIs donde eres responsable
          </p>
          {(session?.user as any)?.role === 'ADMIN' && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Como administrador, puedes ver y registrar valores en todos los KPIs
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de KPIs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">KPIs Activos</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                {kpis.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {(session?.user as any)?.role === 'ADMIN'
                      ? 'No hay KPIs activos'
                      : 'No tienes KPIs asignados como responsable'}
                  </div>
                ) : (
                  kpis.map((kpi) => (
                    <button
                      key={kpi._id}
                      onClick={() => handleSelectKPI(kpi)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        selectedKpi?._id === kpi._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">{kpi.name}</div>
                      <div
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2"
                        style={{
                          backgroundColor: `${kpi.initiativeId.color}20`,
                          color: kpi.initiativeId.color,
                        }}
                      >
                        {kpi.initiativeId.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {PERIODICITY_LABELS[kpi.periodicity]} • Meta: {kpi.target} {kpi.unit}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Detalle y valores */}
          <div className="lg:col-span-2">
            {!selectedKpi ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
                Selecciona un KPI para ver su detalle y registrar valores
              </div>
            ) : (
              <div className="space-y-6">
                {/* Detalle del KPI */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedKpi.name}
                  </h2>
                  {selectedKpi.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedKpi.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Periodicidad</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {PERIODICITY_LABELS[selectedKpi.periodicity]}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Unidad</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{selectedKpi.unit}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Meta</div>
                      <div className="font-semibold text-green-600">
                        {selectedKpi.target} {selectedKpi.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Mínimo aceptable</div>
                      <div className="font-semibold text-orange-600">
                        {selectedKpi.tolerance.minimum} {selectedKpi.unit}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fórmula</div>
                    <code className="text-sm font-mono text-gray-900 dark:text-gray-100">{selectedKpi.formula}</code>
                  </div>

                  <button
                    onClick={handleNewValue}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    + Registrar nuevo valor
                  </button>
                </div>

                {/* Formulario de nuevo valor */}
                {showValueForm && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Registrar valor</h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Variables de la fórmula */}
                      {detectedVariables.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
                            Variables de la fórmula
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {detectedVariables.map((varInfo) => (
                              <div key={varInfo.name}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {varInfo.name} *
                                  {varInfo.type === 'date' && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Fecha)</span>
                                  )}
                                  {varInfo.type === 'array' && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Lista separada por comas)</span>
                                  )}
                                </label>
                                {varInfo.type === 'date' ? (
                                  <input
                                    type="date"
                                    value={variableValues[varInfo.name] || ''}
                                    onChange={(e) =>
                                      setVariableValues({
                                        ...variableValues,
                                        [varInfo.name]: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    required
                                  />
                                ) : varInfo.type === 'array' ? (
                                  <input
                                    type="text"
                                    value={variableValues[varInfo.name] || ''}
                                    onChange={(e) =>
                                      setVariableValues({
                                        ...variableValues,
                                        [varInfo.name]: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="Ej: 10, 20, 30, 40"
                                    required
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    step="any"
                                    value={variableValues[varInfo.name] || ''}
                                    onChange={(e) =>
                                      setVariableValues({
                                        ...variableValues,
                                        [varInfo.name]: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder={`Valor de ${varInfo.name}`}
                                    required
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          {calculatedValue !== null && (
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                              <div className="text-sm font-medium text-green-900 dark:text-green-300">
                                Resultado calculado: <span className="text-lg font-bold">{calculatedValue.toFixed(2)} {selectedKpi.unit}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {detectedVariables.length > 0 || isAutoCalculated ? 'Valor calculado *' : 'Valor *'}
                        </label>
                        <div className="flex">
                          <input
                            type="number"
                            step="any"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder={isCalculating ? "Calculando..." : "Ej: 92.5"}
                            required
                            readOnly={detectedVariables.length > 0 || isAutoCalculated}
                            disabled={isCalculating}
                          />
                          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-900 dark:text-gray-100">
                            {selectedKpi.unit}
                          </div>
                        </div>
                        {detectedVariables.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Este valor se calcula automáticamente usando las variables de la fórmula
                          </p>
                        )}
                        {isAutoCalculated && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                            ✓ Este valor se calculó automáticamente usando funciones del sistema
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Período
                        </label>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                {selectedKpi && getPeriodName(selectedKpi.periodicity)}
                              </div>
                              <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                {periodStart && periodEnd && (
                                  <>
                                    {new Date(periodStart).toLocaleDateString('es-ES')} - {new Date(periodEnd).toLocaleDateString('es-ES')}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Calculado automáticamente
                            </div>
                          </div>
                        </div>

                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                            Ajustar período manualmente
                          </summary>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Fecha inicio *
                              </label>
                              <input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Fecha fin *
                              </label>
                              <input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                required
                              />
                            </div>
                          </div>
                        </details>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notas
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          rows={3}
                          placeholder="Observaciones o comentarios"
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowValueForm(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          disabled={saving}
                        >
                          {saving ? 'Guardando...' : 'Registrar'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Historial de valores */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historial de valores</h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {values.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No hay valores registrados
                      </div>
                    ) : (
                      values.map((val) => {
                        const status = getValueStatus(val.value, selectedKpi);
                        return (
                          <div key={val._id} className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {val.value} {selectedKpi.unit}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(val.periodStart).toLocaleDateString()} -{' '}
                                  {new Date(val.periodEnd).toLocaleDateString()}
                                </div>
                                {val.notes && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {val.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
