/**
 * Helper del lado del cliente para trackear uso de funcionalidades
 * Llama al API /api/track-feature para registrar el uso y otorgar badges
 */

type FeatureType =
  | 'aiTextImprovements'
  | 'aiOrgAnalysis'
  | 'powerpointExports'
  | 'analyticsVisits'
  | 'reportsGenerated'
  | 'excelExports'
  | 'kanbanViews';

export async function trackFeature(feature: FeatureType): Promise<void> {
  try {
    const response = await fetch('/api/track-feature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feature }),
    });

    if (!response.ok) {
      console.error('Error tracking feature:', await response.text());
      return;
    }

    const data = await response.json();

    // Si se desbloquearon nuevos badges, mostrar notificación
    if (data.newBadges && data.newBadges.length > 0) {
      console.log('🎉 Nuevos badges desbloqueados:', data.newBadges);

      // Opcional: Aquí podrías disparar una notificación toast si tienes un sistema de notificaciones
      // Por ahora solo lo logueamos en consola
    }
  } catch (error) {
    console.error('Error tracking feature:', error);
    // No lanzar el error para no interrumpir la experiencia del usuario
  }
}
