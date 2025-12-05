'use client';

import { useState, useEffect } from 'react';

export type AudienceType = 'segment' | 'list' | 'all_contacts';

export interface AudienceSelection {
  type: AudienceType;
  segmentId?: string;
  listId?: string;
  filters?: any;
  estimatedRecipients: number;
}

interface Segment {
  _id: string;
  name: string;
  description?: string;
  contactCount: number;
}

interface ContactList {
  _id: string;
  name: string;
  contactCount: number;
}

interface AudienceSelectorProps {
  value: AudienceSelection | null;
  onChange: (value: AudienceSelection) => void;
}

export default function AudienceSelector({ value, onChange }: AudienceSelectorProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [audienceType, setAudienceType] = useState<AudienceType>(value?.type || 'segment');

  useEffect(() => {
    fetchAudienceData();
  }, []);

  const fetchAudienceData = async () => {
    try {
      setLoading(true);
      const [segmentsRes, listsRes, contactsRes] = await Promise.all([
        fetch('/api/crm/segments'),
        fetch('/api/crm/lists'),
        fetch('/api/crm/contacts?limit=1'),
      ]);

      if (segmentsRes.ok) {
        const data = await segmentsRes.json();
        setSegments(data.segments || []);
      }

      if (listsRes.ok) {
        const data = await listsRes.json();
        setLists(data.lists || []);
      }

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setTotalContacts(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching audience data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: AudienceType) => {
    setAudienceType(type);

    if (type === 'all_contacts') {
      onChange({
        type: 'all_contacts',
        estimatedRecipients: totalContacts,
      });
    } else {
      onChange({
        type,
        estimatedRecipients: 0,
      });
    }
  };

  const handleSegmentSelect = (segmentId: string) => {
    const segment = segments.find(s => s._id === segmentId);
    onChange({
      type: 'segment',
      segmentId,
      estimatedRecipients: segment?.contactCount || 0,
    });
  };

  const handleListSelect = (listId: string) => {
    const list = lists.find(l => l._id === listId);
    onChange({
      type: 'list',
      listId,
      estimatedRecipients: list?.contactCount || 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audience Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Tipo de audiencia
        </label>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => handleTypeChange('segment')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              audienceType === 'segment'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                audienceType === 'segment' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Segmento</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{segments.length} disponibles</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('list')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              audienceType === 'list'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                audienceType === 'list' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Lista</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{lists.length} disponibles</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('all_contacts')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              audienceType === 'all_contacts'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                audienceType === 'all_contacts' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Todos</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{totalContacts.toLocaleString()} contactos</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Segment Selection */}
      {audienceType === 'segment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleccionar segmento
          </label>
          {segments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay segmentos</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Crea un segmento primero en la sección de CRM.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {segments.map((segment) => (
                <button
                  key={segment._id}
                  type="button"
                  onClick={() => handleSegmentSelect(segment._id)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    value?.segmentId === segment._id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{segment.name}</p>
                      {segment.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{segment.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {segment.contactCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">contactos</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List Selection */}
      {audienceType === 'list' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleccionar lista
          </label>
          {lists.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay listas</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Crea una lista primero en la sección de CRM.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lists.map((list) => (
                <button
                  key={list._id}
                  type="button"
                  onClick={() => handleListSelect(list._id)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    value?.listId === list._id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-white">{list.name}</p>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {list.contactCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">contactos</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Contacts Confirmation */}
      {audienceType === 'all_contacts' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Enviar a todos los contactos
              </h3>
              <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                Esta campaña se enviará a <strong>{totalContacts.toLocaleString()}</strong> contactos.
                Asegúrate de que el contenido sea relevante para toda tu base de datos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Audience Summary */}
      {value && value.estimatedRecipients > 0 && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Audiencia seleccionada
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                <strong>{value.estimatedRecipients.toLocaleString()}</strong> destinatarios estimados
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
