import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Endpoint para refrescar la sesión del usuario actual
 *
 * Este endpoint permite a un usuario refrescar sus permisos sin tener que cerrar sesión.
 * Útil después de que un admin actualice los permisos de un usuario.
 *
 * Uso: POST /api/auth/refresh-session
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar sesión actual
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Conectar a la base de datos
    await connectDB();

    // Obtener datos actualizados del usuario
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Usuario inactivo' },
        { status: 403 }
      );
    }

    // Preparar los permisos actualizados
    const updatedPermissions = user.permissions || {
      viewDashboard: true,
      viewAreaDashboard: true,
      viewMyPriorities: true,
      viewReports: true,
      viewAnalytics: true,
      viewLeaderboard: true,
      viewAutomations: true,
      viewHistory: true,
      canReassignPriorities: user.role === 'ADMIN',
      canCreateMilestones: true,
      canEditHistoricalPriorities: user.role === 'ADMIN',
      canManageProjects: user.role === 'ADMIN',
      canManageKPIs: user.role === 'ADMIN',
    };

    // Retornar información para que el cliente actualice su sesión
    return NextResponse.json({
      success: true,
      message: 'Sesión actualizada. Por favor, cierra sesión y vuelve a iniciar sesión para aplicar los cambios.',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        area: user.area,
        isAreaLeader: user.isAreaLeader,
        permissions: updatedPermissions,
      },
      requiresRelogin: true,
    });

  } catch (error) {
    console.error('Error al refrescar sesión:', error);
    return NextResponse.json(
      { error: 'Error al refrescar sesión' },
      { status: 500 }
    );
  }
}
