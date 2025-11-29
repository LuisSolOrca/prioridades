'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

// Tipos
type ImportType = 'clients' | 'contacts' | 'deals' | 'products';

interface Header {
  index: number;
  original: string;
}

interface PreviewRow {
  rowNumber: number;
  values: string[];
}

interface AvailableField {
  name: string;
  label: string;
  required: boolean;
}

interface ParseResult {
  success: boolean;
  type: ImportType;
  fileName: string;
  headers: Header[];
  previewRows: PreviewRow[];
  totalRows: number;
  availableFields: AvailableField[];
  suggestedMapping: Record<string, number | null>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  warnings: string[];
  previewData: Record<string, any>[];
}

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

// Configuración de tipos de importación
const IMPORT_TYPES = [
  { value: 'clients', label: 'Clientes', icon: '🏢', description: 'Empresas y organizaciones' },
  { value: 'contacts', label: 'Contactos', icon: '👤', description: 'Personas de contacto' },
  { value: 'deals', label: 'Deals', icon: '💼', description: 'Oportunidades de negocio' },
  { value: 'products', label: 'Productos', icon: '📦', description: 'Catálogo de productos' },
];

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Estados del wizard
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirección si no tiene sesión
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Step 1: Subir archivo
  const handleFileSelect = async (selectedFile: File) => {
    if (!importType) {
      setError('Selecciona un tipo de importación primero');
      return;
    }

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    // También verificar extensión
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(selectedFile.type) && !['csv', 'xlsx', 'xls'].includes(extension || '')) {
      setError('Formato de archivo no válido. Usa CSV o Excel (.xlsx, .xls)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      const response = await fetch('/api/crm/import/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el archivo');
      }

      setParseResult(data);
      setMapping(data.suggestedMapping || {});
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [importType]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Step 2: Mapeo de columnas
  const handleFieldDragStart = (fieldName: string) => {
    setDraggedField(fieldName);
  };

  const handleColumnDrop = (columnIndex: number) => {
    if (draggedField) {
      setMapping((prev) => ({
        ...prev,
        [draggedField]: columnIndex,
      }));
      setDraggedField(null);
    }
  };

  const handleClearMapping = (fieldName: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldName]: null,
    }));
  };

  const handleManualMapping = (fieldName: string, columnIndex: number | null) => {
    setMapping((prev) => ({
      ...prev,
      [fieldName]: columnIndex,
    }));
  };

  // Step 3: Validar datos
  const handleValidate = async () => {
    if (!file || !parseResult) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', parseResult.type);
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/crm/import/validate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al validar datos');
      }

      setValidationResult(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Ejecutar importación
  const handleImport = async () => {
    if (!file || !parseResult) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', parseResult.type);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('updateExisting', String(updateExisting));

      const response = await fetch('/api/crm/import/execute', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar datos');
      }

      setImportResult(data);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setStep(1);
    setImportType(null);
    setFile(null);
    setParseResult(null);
    setMapping({});
    setValidationResult(null);
    setImportResult(null);
    setUpdateExisting(false);
    setError(null);
  };

  // Verificar si el mapeo está completo (campos requeridos)
  const isMappingComplete = () => {
    if (!parseResult) return false;
    const requiredFields = parseResult.availableFields.filter((f) => f.required);
    return requiredFields.every((f) => mapping[f.name] !== null && mapping[f.name] !== undefined);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/crm')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al CRM
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Importar Datos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Importa clientes, contactos, deals o productos desde archivos CSV o Excel
          </p>
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-import-guide"
          title="Guía de importación"
          variant="guide"
          className="mb-6"
          defaultCollapsed={true}
          steps={[
            {
              title: 'Prepara tu archivo',
              description: 'Asegúrate de que la primera fila contenga los encabezados de columna',
            },
            {
              title: 'Selecciona el tipo de datos',
              description: 'Elige si importarás clientes, contactos, deals o productos',
            },
            {
              title: 'Mapea las columnas',
              description: 'Asocia cada columna de tu archivo con un campo del CRM',
            },
            {
              title: 'Revisa y confirma',
              description: 'Valida los datos antes de importar definitivamente',
            },
          ]}
        />

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['Seleccionar Archivo', 'Mapear Columnas', 'Validar Datos', 'Resultados'].map((label, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step > index + 1
                      ? 'bg-green-500 text-white'
                      : step === index + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span
                  className={`ml-2 hidden sm:inline ${
                    step === index + 1
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {label}
                </span>
                {index < 3 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 ${step > index + 1 ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Select Type and Upload File */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
              1. Selecciona el tipo de datos a importar
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {IMPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setImportType(type.value as ImportType)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    importType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-3xl mb-2 block">{type.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white block">{type.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{type.description}</span>
                </button>
              ))}
            </div>

            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              2. Sube tu archivo CSV o Excel
            </h2>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              } ${!importType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => importType && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                disabled={!importType}
              />
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {importType
                  ? 'Arrastra tu archivo aquí o haz clic para seleccionar'
                  : 'Selecciona primero el tipo de importación'}
              </p>
              <p className="text-sm text-gray-500">CSV, Excel (.xlsx, .xls)</p>
            </div>

            {loading && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Procesando archivo...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && parseResult && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mapear Columnas</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Archivo: {parseResult.fileName} ({parseResult.totalRows} filas)
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cambiar archivo
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Fields */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Campos Disponibles</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Arrastra los campos a las columnas del archivo o usa el selector
                </p>
                <div className="space-y-2">
                  {parseResult.availableFields.map((field) => (
                    <div
                      key={field.name}
                      draggable
                      onDragStart={() => handleFieldDragStart(field.name)}
                      className={`p-3 rounded-lg border cursor-move transition-colors ${
                        mapping[field.name] !== null && mapping[field.name] !== undefined
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : field.required
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">⋮⋮</span>
                          <span className="font-medium text-gray-900 dark:text-white">{field.label}</span>
                          {field.required && <span className="text-xs text-orange-600 dark:text-orange-400">*</span>}
                        </div>
                        {mapping[field.name] !== null && mapping[field.name] !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600 dark:text-green-400">
                              → {parseResult.headers[mapping[field.name]!]?.original}
                            </span>
                            <button
                              onClick={() => handleClearMapping(field.name)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                      <select
                        value={mapping[field.name] ?? ''}
                        onChange={(e) =>
                          handleManualMapping(field.name, e.target.value === '' ? null : Number(e.target.value))
                        }
                        className="mt-2 w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                      >
                        <option value="">-- Sin mapear --</option>
                        {parseResult.headers.map((h) => (
                          <option key={h.index} value={h.index}>
                            {h.original}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Preview */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Vista Previa del Archivo</h3>
                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                        {parseResult.headers.map((header) => (
                          <th
                            key={header.index}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleColumnDrop(header.index)}
                            className={`px-3 py-2 text-xs font-medium text-left transition-colors ${
                              Object.values(mapping).includes(header.index)
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {header.original}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {parseResult.previewRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2 text-xs text-gray-400">{row.rowNumber}</td>
                          {row.values.map((value, i) => (
                            <td
                              key={i}
                              className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-[150px] truncate"
                              title={value}
                            >
                              {value || <span className="text-gray-300">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parseResult.totalRows > 10 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Mostrando 10 de {parseResult.totalRows} filas
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    isMappingComplete()
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                  }`}
                >
                  {isMappingComplete() ? '✓ Mapeo completo' : 'Faltan campos requeridos'}
                </span>
              </div>
              <button
                onClick={handleValidate}
                disabled={!isMappingComplete() || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Validando...
                  </>
                ) : (
                  'Validar Datos'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Validation Results */}
        {step === 3 && validationResult && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Validación de Datos</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Filas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{validationResult.totalRows}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-sm text-green-600 dark:text-green-400">Filas Válidas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{validationResult.validRows}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400">Filas con Errores</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{validationResult.invalidRows}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">Advertencias</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {validationResult.warnings.length}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">Advertencias</h4>
                <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                  {validationResult.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {validationResult.warnings.length > 5 && (
                    <li>... y {validationResult.warnings.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Errores de Validación</h4>
                <div className="max-h-48 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-red-600 dark:text-red-400">
                        <th className="pr-4">Fila</th>
                        <th className="pr-4">Campo</th>
                        <th className="pr-4">Error</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody className="text-red-700 dark:text-red-300">
                      {validationResult.errors.slice(0, 20).map((err, i) => (
                        <tr key={i}>
                          <td className="pr-4 py-1">{err.row}</td>
                          <td className="pr-4 py-1">{err.field}</td>
                          <td className="pr-4 py-1">{err.message}</td>
                          <td className="py-1 max-w-[150px] truncate" title={err.value}>
                            {err.value || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validationResult.errors.length > 20 && (
                    <p className="mt-2 text-red-500">... y {validationResult.errors.length - 20} errores más</p>
                  )}
                </div>
              </div>
            )}

            {/* Preview Valid Data */}
            {validationResult.previewData.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Vista Previa de Datos Válidos</h4>
                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {Object.keys(validationResult.previewData[0])
                          .filter((k) => k !== '_rowNumber')
                          .map((key) => (
                            <th
                              key={key}
                              className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-left"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {validationResult.previewData.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {Object.entries(row)
                            .filter(([k]) => k !== '_rowNumber')
                            .map(([k, v], j) => (
                              <td
                                key={j}
                                className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-[150px] truncate"
                                title={String(v)}
                              >
                                {String(v) || '-'}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Actualizar registros existentes</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Si se encuentra un registro existente (por nombre, SKU, etc.), se actualizará con los nuevos datos
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Volver al mapeo
              </button>
              <div className="flex gap-3">
                {validationResult.validRows === 0 ? (
                  <span className="px-4 py-2 text-red-600 dark:text-red-400">
                    No hay datos válidos para importar
                  </span>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Importando...
                      </>
                    ) : (
                      <>
                        Importar {validationResult.validRows} registros
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && importResult && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <div className="mb-6">
              {importResult.created > 0 || importResult.updated > 0 ? (
                <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-20 h-20 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {importResult.created > 0 || importResult.updated > 0
                ? 'Importación Completada'
                : 'Importación Finalizada'}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8 max-w-2xl mx-auto">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Procesados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{importResult.totalProcessed}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-sm text-green-600 dark:text-green-400">Creados</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.created}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">Actualizados</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Omitidos</p>
                <p className="text-2xl font-bold text-gray-500">{importResult.skipped}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-8 max-w-2xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                  Errores durante la importación ({importResult.errors.length})
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>
                      Fila {err.row}: {err.error}
                    </li>
                  ))}
                  {importResult.errors.length > 10 && <li>... y {importResult.errors.length - 10} más</li>}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Nueva Importación
              </button>
              <button
                onClick={() => router.push('/crm')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ir al CRM
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
