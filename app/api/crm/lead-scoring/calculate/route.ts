import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  calculateDealScore,
  calculateContactScore,
  updateDealScore,
  updateContactScore,
  recalculateAllScores,
} from '@/lib/leadScoringEngine';

export const dynamic = 'force-dynamic';

// POST - Calcular/actualizar scores
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para usar CRM' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, action } = body;

    // Recalcular todos los scores (solo admins)
    if (action === 'recalculate_all') {
      const user = session.user as any;
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Solo administradores pueden recalcular todos los scores' },
          { status: 403 }
        );
      }

      const result = await recalculateAllScores();
      return NextResponse.json({
        message: `Se actualizaron ${result.updated} deals con ${result.errors} errores`,
        ...result,
      });
    }

    // Calcular score individual
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Se requiere type (deal/contact) e id' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'deal') {
      if (action === 'preview') {
        // Solo calcular sin guardar
        result = await calculateDealScore(id);
      } else {
        // Calcular y actualizar
        await updateDealScore(id);
        result = await calculateDealScore(id);
      }
    } else if (type === 'contact') {
      if (action === 'preview') {
        result = await calculateContactScore(id);
      } else {
        await updateContactScore(id);
        result = await calculateContactScore(id);
      }
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "deal" o "contact"' },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'No se pudo calcular el score. Verifique que existe una configuración activa.' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error calculating lead score:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
