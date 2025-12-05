'use client';

import { useState } from 'react';

export type ABTestType = 'subject' | 'content' | 'sender' | 'send_time';
export type WinnerCriteria = 'open_rate' | 'click_rate' | 'manual';

export interface ABVariant {
  id: string;
  name: string;
  subject?: string;
  content?: any;
  fromName?: string;
  fromEmail?: string;
  sendTime?: Date;
  percentage: number;
}

export interface ABTestSettings {
  enabled: boolean;
  testType: ABTestType;
  variants: ABVariant[];
  testSize: number;
  winnerCriteria: WinnerCriteria;
  testDuration: number;
}

interface ABTestConfigProps {
  value: ABTestSettings;
  onChange: (value: ABTestSettings) => void;
  baseSubject: string;
  baseFromName: string;
  baseFromEmail: string;
}

export default function ABTestConfig({
  value,
  onChange,
  baseSubject,
  baseFromName,
  baseFromEmail,
}: ABTestConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggle = () => {
    if (!value.enabled) {
      // Enable with default settings
      onChange({
        enabled: true,
        testType: 'subject',
        variants: [
          { id: 'A', name: 'Variante A', subject: baseSubject, percentage: 50 },
          { id: 'B', name: 'Variante B', subject: '', percentage: 50 },
        ],
        testSize: 20,
        winnerCriteria: 'open_rate',
        testDuration: 4,
      });
    } else {
      onChange({
        ...value,
        enabled: false,
      });
    }
  };

  const handleTestTypeChange = (testType: ABTestType) => {
    const newVariants = value.variants.map((v) => {
      const variant: ABVariant = { id: v.id, name: v.name, percentage: v.percentage };

      switch (testType) {
        case 'subject':
          variant.subject = v.id === 'A' ? baseSubject : '';
          break;
        case 'sender':
          variant.fromName = v.id === 'A' ? baseFromName : '';
          variant.fromEmail = v.id === 'A' ? baseFromEmail : '';
          break;
        case 'content':
          variant.content = null;
          break;
        case 'send_time':
          variant.sendTime = new Date();
          break;
      }

      return variant;
    });

    onChange({
      ...value,
      testType,
      variants: newVariants,
    });
  };

  const handleVariantChange = (variantId: string, field: string, fieldValue: any) => {
    const newVariants = value.variants.map((v) =>
      v.id === variantId ? { ...v, [field]: fieldValue } : v
    );
    onChange({ ...value, variants: newVariants });
  };

  const addVariant = () => {
    if (value.variants.length >= 4) return;

    const letters = ['A', 'B', 'C', 'D'];
    const newId = letters[value.variants.length];
    const newPercentage = Math.floor(100 / (value.variants.length + 1));

    const newVariants = value.variants.map((v) => ({
      ...v,
      percentage: newPercentage,
    }));

    const newVariant: ABVariant = {
      id: newId,
      name: `Variante ${newId}`,
      percentage: newPercentage,
    };

    // Add appropriate field based on test type
    switch (value.testType) {
      case 'subject':
        newVariant.subject = '';
        break;
      case 'sender':
        newVariant.fromName = '';
        newVariant.fromEmail = '';
        break;
    }

    onChange({ ...value, variants: [...newVariants, newVariant] });
  };

  const removeVariant = (variantId: string) => {
    if (value.variants.length <= 2) return;

    const newVariants = value.variants.filter((v) => v.id !== variantId);
    const newPercentage = Math.floor(100 / newVariants.length);

    onChange({
      ...value,
      variants: newVariants.map((v) => ({ ...v, percentage: newPercentage })),
    });
  };

  const testTypeOptions = [
    {
      value: 'subject' as ABTestType,
      label: 'Linea de asunto',
      description: 'Prueba diferentes lineas de asunto',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      value: 'content' as ABTestType,
      label: 'Contenido',
      description: 'Prueba diferentes contenidos de email',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      value: 'sender' as ABTestType,
      label: 'Remitente',
      description: 'Prueba diferentes nombres de remitente',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      value: 'send_time' as ABTestType,
      label: 'Hora de envio',
      description: 'Prueba diferentes horarios de envio',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Prueba A/B</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Optimiza tu campaña probando diferentes variantes
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value.enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {value.enabled && (
        <>
          {/* Test Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              ¿Qué deseas probar?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {testTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTestTypeChange(option.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    value.testType === option.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      value.testType === option.value ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {option.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Variants Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Variantes
              </label>
              {value.variants.length < 4 && (
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                  + Agregar variante
                </button>
              )}
            </div>
            <div className="space-y-4">
              {value.variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' :
                        index === 1 ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' :
                        index === 2 ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300' :
                        'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300'
                      }`}>
                        {variant.id}
                      </span>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => handleVariantChange(variant.id, 'name', e.target.value)}
                        className="text-sm font-medium text-gray-900 dark:text-white border-none bg-transparent focus:ring-0 p-0"
                      />
                    </div>
                    {value.variants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Subject Test */}
                  {value.testType === 'subject' && (
                    <input
                      type="text"
                      value={variant.subject || ''}
                      onChange={(e) => handleVariantChange(variant.id, 'subject', e.target.value)}
                      placeholder="Escribe la línea de asunto..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    />
                  )}

                  {/* Sender Test */}
                  {value.testType === 'sender' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={variant.fromName || ''}
                        onChange={(e) => handleVariantChange(variant.id, 'fromName', e.target.value)}
                        placeholder="Nombre del remitente"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                      />
                      <input
                        type="email"
                        value={variant.fromEmail || ''}
                        onChange={(e) => handleVariantChange(variant.id, 'fromEmail', e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Send Time Test */}
                  {value.testType === 'send_time' && (
                    <input
                      type="datetime-local"
                      value={variant.sendTime ? new Date(variant.sendTime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleVariantChange(variant.id, 'sendTime', new Date(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    />
                  )}

                  {/* Content Test - Note */}
                  {value.testType === 'content' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configura el contenido de esta variante en el editor de email
                    </p>
                  )}

                  {/* Distribution */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Distribución:</span>
                    <input
                      type="number"
                      value={variant.percentage}
                      onChange={(e) => handleVariantChange(variant.id, 'percentage', parseInt(e.target.value) || 0)}
                      min={10}
                      max={90}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Configuración avanzada
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {/* Test Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tamaño de la prueba
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      value={value.testSize}
                      onChange={(e) => onChange({ ...value, testSize: parseInt(e.target.value) })}
                      min={10}
                      max={50}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                      {value.testSize}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Porcentaje de destinatarios que recibirán las variantes de prueba
                  </p>
                </div>

                {/* Winner Criteria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Criterio para elegir ganador
                  </label>
                  <select
                    value={value.winnerCriteria}
                    onChange={(e) => onChange({ ...value, winnerCriteria: e.target.value as WinnerCriteria })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  >
                    <option value="open_rate">Mayor tasa de apertura</option>
                    <option value="click_rate">Mayor tasa de clics</option>
                    <option value="manual">Selección manual</option>
                  </select>
                </div>

                {/* Test Duration */}
                {value.winnerCriteria !== 'manual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duración de la prueba
                    </label>
                    <select
                      value={value.testDuration}
                      onChange={(e) => onChange({ ...value, testDuration: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    >
                      <option value={1}>1 hora</option>
                      <option value={2}>2 horas</option>
                      <option value={4}>4 horas</option>
                      <option value={8}>8 horas</option>
                      <option value={24}>24 horas</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tiempo para recopilar datos antes de enviar la variante ganadora al resto
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Summary */}
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">Resumen de la prueba</h4>
            <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
              <li>
                Se probarán {value.variants.length} variantes de{' '}
                {value.testType === 'subject' ? 'línea de asunto' :
                 value.testType === 'content' ? 'contenido' :
                 value.testType === 'sender' ? 'remitente' : 'hora de envío'}
              </li>
              <li>
                El {value.testSize}% de destinatarios recibirán las variantes de prueba
              </li>
              {value.winnerCriteria !== 'manual' && (
                <li>
                  Después de {value.testDuration} hora(s), se enviará la variante con mejor{' '}
                  {value.winnerCriteria === 'open_rate' ? 'tasa de apertura' : 'tasa de clics'}
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
