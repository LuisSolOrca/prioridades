import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import mongoose from 'mongoose';

/**
 * GET /api/channels
 * Obtiene todos los canales de todos los proyectos (para selects y workflows)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Obtener todos los canales activos
    // Filtrar: canales públicos O canales privados donde el usuario es miembro o creador
    const channels = await Channel.find({
      isActive: true,
      $or: [
        { isPrivate: { $ne: true } }, // Canales públicos
        { isPrivate: true, members: userObjectId }, // Canales privados donde es miembro
        { isPrivate: true, createdBy: userObjectId }, // Canales privados que creó
        ...(userRole === 'ADMIN' ? [{ isPrivate: true }] : []) // Admins ven todos
      ]
    })
      .sort({ projectId: 1, order: 1 })
      .populate('projectId', 'name')
      .lean();

    // Formatear para que projectId sea string y parentId sea string o null
    const formattedChannels = channels.map((channel: any) => ({
      _id: channel._id.toString(),
      name: channel.name,
      description: channel.description,
      projectId: channel.projectId?._id?.toString() || channel.projectId?.toString(),
      projectName: channel.projectId?.name || '',
      parentId: channel.parentId?.toString() || null,
      icon: channel.icon,
      isPrivate: channel.isPrivate,
      order: channel.order,
    }));

    return NextResponse.json(formattedChannels);
  } catch (error: any) {
    console.error('Error fetching all channels:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo canales' },
      { status: 500 }
    );
  }
}
