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

    // Build query conditions
    const queryConditions: any[] = [
      { isPrivate: { $ne: true } }, // Canales públicos
    ];

    // Add private channel access for authenticated users
    if (userId) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      queryConditions.push({ isPrivate: true, members: userObjectId });
      queryConditions.push({ isPrivate: true, createdBy: userObjectId });
    }

    // Admins can see all private channels
    if (userRole === 'ADMIN') {
      queryConditions.push({ isPrivate: true });
    }

    // Obtener todos los canales activos
    const channels = await Channel.find({
      isActive: true,
      $or: queryConditions
    })
      .sort({ projectId: 1, order: 1 })
      .populate('projectId', 'name')
      .lean();

    console.log(`[API /api/channels] Found ${channels.length} channels`);

    // Formatear para que projectId sea string y parentId sea string o null
    const formattedChannels = channels.map((channel: any) => {
      const projectIdStr = channel.projectId?._id?.toString() ||
                          (channel.projectId && typeof channel.projectId === 'object' ? channel.projectId.toString() : null);

      return {
        _id: channel._id.toString(),
        name: channel.name,
        description: channel.description,
        projectId: projectIdStr,
        projectName: channel.projectId?.name || '',
        parentId: channel.parentId?.toString() || null,
        icon: channel.icon,
        isPrivate: channel.isPrivate,
        order: channel.order,
      };
    });

    console.log(`[API /api/channels] Returning ${formattedChannels.length} formatted channels`);

    return NextResponse.json(formattedChannels);
  } catch (error: any) {
    console.error('Error fetching all channels:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo canales' },
      { status: 500 }
    );
  }
}
