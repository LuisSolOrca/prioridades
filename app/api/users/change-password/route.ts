import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validaciones
    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        error: 'Debes proporcionar la contraseña actual y la nueva contraseña'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      }, { status: 400 });
    }

    // Buscar el usuario
    const user = await User.findById((session.user as any).id);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar la contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return NextResponse.json({
        error: 'La contraseña actual es incorrecta'
      }, { status: 400 });
    }

    // Actualizar la contraseña
    user.password = newPassword;
    await user.save(); // El pre-save hook de User se encarga de hashear la contraseña

    return NextResponse.json({
      message: 'Contraseña actualizada exitosamente'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json({
      error: 'Error al cambiar la contraseña'
    }, { status: 500 });
  }
}
