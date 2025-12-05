'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, XCircle, Loader2, ArrowLeft, Settings } from 'lucide-react';

interface Preferences {
  marketing: boolean;
  newsletter: boolean;
  promotions: boolean;
  productUpdates: boolean;
  events: boolean;
}

const PREFERENCE_LABELS: Record<keyof Preferences, { label: string; description: string }> = {
  marketing: {
    label: 'Comunicaciones de marketing',
    description: 'Recibe información sobre nuestros productos y servicios',
  },
  newsletter: {
    label: 'Newsletter',
    description: 'Recibe nuestro boletín con noticias y artículos',
  },
  promotions: {
    label: 'Promociones y ofertas',
    description: 'Recibe ofertas especiales y descuentos exclusivos',
  },
  productUpdates: {
    label: 'Actualizaciones de producto',
    description: 'Recibe notificaciones sobre nuevas funcionalidades',
  },
  events: {
    label: 'Eventos y webinars',
    description: 'Recibe invitaciones a eventos y webinars',
  },
};

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const campaignId = searchParams.get('campaign');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ firstName: string; email: string } | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    marketing: true,
    newsletter: true,
    promotions: true,
    productUpdates: true,
    events: true,
  });
  const [unsubscribeReason, setUnsubscribeReason] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPreferences();
    } else {
      setLoading(false);
      setError('Enlace inválido. Por favor usa el enlace de tu email.');
    }
  }, [token]);

  const fetchPreferences = async () => {
    try {
      const res = await fetch(`/api/public/unsubscribe?token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setContactInfo({ firstName: data.firstName, email: data.email });
      setPreferences(data.preferences);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tus preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'unsubscribe_all',
          reason: unsubscribeReason,
          campaignId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSuccess(data.message);
      setPreferences({
        marketing: false,
        newsletter: false,
        promotions: false,
        productUpdates: false,
        events: false,
      });
    } catch (err: any) {
      setError(err.message || 'Error al procesar tu solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'update_preferences',
          preferences,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSuccess(data.message);
      setShowPreferences(false);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar preferencias');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubscribe = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'resubscribe',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSuccess(data.message);
      setPreferences({
        marketing: true,
        newsletter: true,
        promotions: true,
        productUpdates: true,
        events: true,
      });
    } catch (err: any) {
      setError(err.message || 'Error al procesar tu solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePreference = (key: keyof Preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tus preferencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
            <Mail className="w-12 h-12 text-white mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">Centro de Preferencias</h1>
            {contactInfo && (
              <p className="text-blue-100 mt-2">
                Hola{contactInfo.firstName ? `, ${contactInfo.firstName}` : ''}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {/* Show preferences management */}
            {showPreferences ? (
              <div className="space-y-4">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>

                <h2 className="text-lg font-semibold text-gray-900">
                  Personaliza tus preferencias
                </h2>
                <p className="text-sm text-gray-600">
                  Selecciona qué tipo de comunicaciones deseas recibir.
                </p>

                <div className="space-y-3">
                  {(Object.keys(preferences) as Array<keyof Preferences>).map((key) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={() => togglePreference(key)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {PREFERENCE_LABELS[key].label}
                        </p>
                        <p className="text-sm text-gray-500">
                          {PREFERENCE_LABELS[key].description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleUpdatePreferences}
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Preferencias
                </button>
              </div>
            ) : !success ? (
              <div className="space-y-6">
                {/* Unsubscribe section */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    ¿Deseas darte de baja?
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Lamentamos verte partir. Si cambias de opinión, siempre puedes suscribirte
                    de nuevo.
                  </p>

                  {/* Reason for unsubscribe */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ¿Por qué te das de baja? (opcional)
                    </label>
                    <select
                      value={unsubscribeReason}
                      onChange={(e) => setUnsubscribeReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecciona una razón</option>
                      <option value="too_many_emails">Recibo demasiados emails</option>
                      <option value="not_relevant">El contenido no es relevante</option>
                      <option value="never_subscribed">Nunca me suscribí</option>
                      <option value="other">Otra razón</option>
                    </select>
                  </div>

                  <button
                    onClick={handleUnsubscribeAll}
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Darme de baja de todos los emails
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">o</span>
                  </div>
                </div>

                {/* Manage preferences button */}
                <button
                  onClick={() => setShowPreferences(true)}
                  className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Administrar mis preferencias
                </button>
              </div>
            ) : (
              /* After unsubscribe success */
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">
                  ¿Cambiaste de opinión?
                </p>
                <button
                  onClick={handleResubscribe}
                  disabled={submitting}
                  className="py-2 px-4 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : null}
                  Volver a suscribirme
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t text-center">
            <p className="text-xs text-gray-500">
              Si tienes preguntas, contáctanos respondiendo a cualquiera de nuestros emails.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
