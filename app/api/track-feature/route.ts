import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { trackFeatureUsage } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/track-feature
 * Endpoint para trackear el uso de funcionalidades del sistema
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { feature } = body;

    // Validar que la funcionalidad es válida
    const validFeatures = [
      'aiTextImprovements',
      'aiOrgAnalysis',
      'powerpointExports',
      'analyticsVisits',
      'reportsGenerated',
      'excelExports',
      'kanbanViews'
    ];

    if (!feature || !validFeatures.includes(feature)) {
      return NextResponse.json({
        error: 'Funcionalidad inválida. Debe ser una de: ' + validFeatures.join(', ')
      }, { status: 400 });
    }

    // Trackear el uso y otorgar badges
    const result = await trackFeatureUsage(session.user.id, feature);

    if (!result) {
      return NextResponse.json({
        error: 'Error al trackear funcionalidad'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newBadges: result.newBadges || [],
      message: result.newBadges && result.newBadges.length > 0
        ? `¡Nuevo${result.newBadges.length > 1 ? 's' : ''} badge${result.newBadges.length > 1 ? 's' : ''} desbloqueado${result.newBadges.length > 1 ? 's' : ''}!`
        : 'Uso registrado'
    });

  } catch (error: any) {
    console.error('Error tracking feature usage:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
