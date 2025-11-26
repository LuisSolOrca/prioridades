import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import ChannelMessage from '@/models/ChannelMessage';

/**
 * PUT /api/projects/[id]/channels/[channelId]
 * Actualiza un canal
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const channel = await Channel.findOne({
      _id: params.channelId,
      projectId: params.id
    });

    if (!channel) {
      return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, icon, parentId, isPrivate, members } = body;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isCreator = channel.createdBy?.toString() === userId;
    const isAdmin = userRole === 'ADMIN';

    // Validar que no es el canal General
    if (channel.name === 'General' && channel.parentId === null) {
      // Solo permitir editar descripción e icono del canal General
      if (name && name !== 'General') {
        return NextResponse.json(
          { error: 'No se puede cambiar el nombre del canal General' },
          { status: 400 }
        );
      }
      if (parentId !== undefined && parentId !== null) {
        return NextResponse.json(
          { error: 'No se puede mover el canal General' },
          { status: 400 }
        );
      }
    }

    // Validar cambio de parentId (máximo 2 niveles)
    if (parentId !== undefined && parentId !== channel.parentId?.toString()) {
      if (parentId) {
        const newParent = await Channel.findById(parentId);
        if (!newParent) {
          return NextResponse.json(
            { error: 'Canal padre no encontrado' },
            { status: 404 }
          );
        }

        if (newParent.parentId) {
          return NextResponse.json(
            { error: 'No se permiten más de 2 niveles de jerarquía' },
            { status: 400 }
          );
        }
      }
    }

    // Solo el creador o admin puede cambiar isPrivate o members
    if (isPrivate !== undefined || members !== undefined) {
      if (!isCreator && !isAdmin) {
        return NextResponse.json(
          { error: 'Solo el creador del canal puede modificar la privacidad y los miembros' },
          { status: 403 }
        );
      }
    }

    // Actualizar canal
    if (name !== undefined) channel.name = name.trim();
    if (description !== undefined) channel.description = description.trim();
    if (icon !== undefined) channel.icon = icon;
    if (parentId !== undefined) {
      channel.parentId = parentId || null;
    }

    // Actualizar privacidad y miembros (solo si es creador o admin)
    if (isPrivate !== undefined && (isCreator || isAdmin)) {
      channel.isPrivate = isPrivate;
      // Si se hace público, limpiar lista de miembros
      if (!isPrivate) {
        channel.members = [];
      }
    }

    if (members !== undefined && (isCreator || isAdmin) && channel.isPrivate) {
      // Asegurar que el creador siempre esté incluido
      const membersList = Array.isArray(members) ? [...members] : [];
      const creatorId = channel.createdBy?.toString();
      if (creatorId && !membersList.includes(creatorId)) {
        membersList.push(creatorId);
      }
      channel.members = membersList;
    }

    await channel.save();

    const updatedChannel = await Channel.findById(params.channelId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .lean();

    return NextResponse.json(updatedChannel);
  } catch (error: any) {
    console.error('Error updating channel:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando canal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/channels/[channelId]
 * Elimina un canal (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const channel = await Channel.findOne({
      _id: params.channelId,
      projectId: params.id
    });

    if (!channel) {
      return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 });
    }

    // Validar que no es el canal General
    if (channel.name === 'General' && channel.parentId === null) {
      return NextResponse.json(
        { error: 'No se puede eliminar el canal General' },
        { status: 400 }
      );
    }

    // Verificar si tiene subcanales
    const hasChildren = await Channel.countDocuments({
      parentId: params.channelId,
      isActive: true
    });

    if (hasChildren > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un canal con subcanales. Elimina primero los subcanales.' },
        { status: 400 }
      );
    }

    // Verificar si tiene mensajes
    const messageCount = await ChannelMessage.countDocuments({
      channelId: params.channelId,
      isDeleted: false
    });

    if (messageCount > 0) {
      // En lugar de eliminar, mover mensajes al canal General
      const generalChannel = await Channel.findOne({
        projectId: params.id,
        name: 'General',
        parentId: null
      });

      if (generalChannel) {
        await ChannelMessage.updateMany(
          { channelId: params.channelId },
          { channelId: generalChannel._id }
        );
      }
    }

    // Soft delete
    channel.isActive = false;
    await channel.save();

    return NextResponse.json({
      message: 'Canal eliminado correctamente',
      messagesMoved: messageCount
    });
  } catch (error: any) {
    console.error('Error deleting channel:', error);
    return NextResponse.json(
      { error: error.message || 'Error eliminando canal' },
      { status: 500 }
    );
  }
}
