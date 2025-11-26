import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import Project from '@/models/Project';
import { trackChannelUsage } from '@/lib/gamification';
import mongoose from 'mongoose';

/**
 * GET /api/projects/[id]/channels
 * Obtiene todos los canales de un proyecto en estructura jerárquica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Verificar que el proyecto existe
    const project = await Project.findById(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Obtener todos los canales del proyecto
    // Filtrar: canales públicos O canales privados donde el usuario es miembro o creador
    const channels = await Channel.find({
      projectId: params.id,
      isActive: true,
      $or: [
        { isPrivate: { $ne: true } }, // Canales públicos (isPrivate false o undefined)
        { isPrivate: true, members: userObjectId }, // Canales privados donde es miembro
        { isPrivate: true, createdBy: userObjectId }, // Canales privados que creó
        ...(userRole === 'ADMIN' ? [{ isPrivate: true }] : []) // Admins ven todos
      ]
    })
      .sort({ order: 1 })
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .lean();

    // Organizar en estructura jerárquica
    const channelMap = new Map();
    const rootChannels: any[] = [];

    // Crear mapa de canales
    channels.forEach((channel: any) => {
      channelMap.set(channel._id.toString(), {
        ...channel,
        children: []
      });
    });

    // Organizar jerarquía
    channels.forEach((channel: any) => {
      const channelData = channelMap.get(channel._id.toString());

      if (channel.parentId) {
        const parent = channelMap.get(channel.parentId.toString());
        if (parent) {
          parent.children.push(channelData);
        } else {
          // Si no se encuentra el padre, tratar como raíz
          rootChannels.push(channelData);
        }
      } else {
        rootChannels.push(channelData);
      }
    });

    return NextResponse.json({
      channels: rootChannels,
      total: channels.length
    });
  } catch (error: any) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo canales' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/channels
 * Crea un nuevo canal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Verificar que el proyecto existe
    const project = await Project.findById(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, parentId, icon, isPrivate, members } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre del canal es requerido' },
        { status: 400 }
      );
    }

    // Validar máximo 2 niveles de profundidad
    if (parentId) {
      const parent = await Channel.findById(parentId);
      if (!parent) {
        return NextResponse.json(
          { error: 'Canal padre no encontrado' },
          { status: 404 }
        );
      }

      if (parent.parentId) {
        return NextResponse.json(
          { error: 'No se permiten más de 2 niveles de jerarquía' },
          { status: 400 }
        );
      }
    }

    // Obtener el siguiente orden
    const maxOrderChannel = await Channel.findOne({
      projectId: params.id,
      parentId: parentId || null
    }).sort({ order: -1 });

    const order = maxOrderChannel ? maxOrderChannel.order + 1 : 0;

    // Preparar lista de miembros (el creador siempre es miembro si es privado)
    let channelMembers: string[] = [];
    if (isPrivate) {
      channelMembers = members && Array.isArray(members) ? [...members] : [];
      // Asegurar que el creador esté incluido
      if (!channelMembers.includes(session.user.id)) {
        channelMembers.push(session.user.id);
      }
    }

    // Crear canal
    const channel = await Channel.create({
      projectId: params.id,
      name: name.trim(),
      description: description?.trim() || '',
      parentId: parentId || null,
      order,
      icon: icon || (isPrivate ? 'Lock' : 'Hash'),
      isActive: true,
      isPrivate: isPrivate || false,
      members: channelMembers,
      createdBy: session.user.id
    });

    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .lean();

    // Trackear creación de canal para gamificación
    await trackChannelUsage(session.user.id, 'channelCreated');

    return NextResponse.json(populatedChannel, { status: 201 });
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando canal' },
      { status: 500 }
    );
  }
}
