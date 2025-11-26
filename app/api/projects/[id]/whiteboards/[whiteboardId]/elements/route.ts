import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Whiteboard from '@/models/Whiteboard';
import { triggerPusherEvent } from '@/lib/pusher-server';
import mongoose from 'mongoose';

/**
 * PUT /api/projects/[id]/whiteboards/[whiteboardId]/elements
 * Actualiza los elementos de la pizarra con control de versión
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; whiteboardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { elements, appState, files, version } = body;

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    const whiteboard = await Whiteboard.findOne({
      _id: new mongoose.Types.ObjectId(params.whiteboardId),
      projectId: new mongoose.Types.ObjectId(params.id),
      isActive: true
    });

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Pizarra no encontrada' },
        { status: 404 }
      );
    }

    // Control de concurrencia optimista
    // Si el cliente envía una versión y es menor que la actual, hay conflicto
    if (version !== undefined && version < whiteboard.version) {
      return NextResponse.json(
        {
          error: 'Conflicto de versión',
          currentVersion: whiteboard.version,
          currentElements: whiteboard.elements,
          currentAppState: whiteboard.appState
        },
        { status: 409 }
      );
    }

    // Actualizar elementos
    if (elements !== undefined) {
      whiteboard.elements = elements;
    }

    // Actualizar appState (sin incluir datos sensibles)
    if (appState !== undefined) {
      whiteboard.appState = {
        viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        currentItemFontFamily: appState.currentItemFontFamily || 1,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY
      };
    }

    // Actualizar files (imágenes)
    if (files !== undefined) {
      whiteboard.files = files;
    }

    // Incrementar versión
    whiteboard.version += 1;
    whiteboard.lastModifiedBy = new mongoose.Types.ObjectId(userId);

    // Agregar usuario a colaboradores si no está
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!whiteboard.collaborators.some((c: any) => c.equals(userObjectId))) {
      whiteboard.collaborators.push(userObjectId);
    }

    whiteboard.markModified('elements');
    whiteboard.markModified('appState');
    whiteboard.markModified('files');
    await whiteboard.save();

    // Broadcast via Pusher para sync en tiempo real
    try {
      await triggerPusherEvent(
        `presence-whiteboard-${params.whiteboardId}`,
        'elements-updated',
        {
          whiteboardId: params.whiteboardId,
          elements: whiteboard.elements,
          appState: whiteboard.appState,
          files: whiteboard.files,
          version: whiteboard.version,
          updatedBy: userId,
          updatedByName: userName,
          updatedAt: new Date().toISOString()
        }
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
      // No fallar si Pusher falla
    }

    return NextResponse.json({
      success: true,
      version: whiteboard.version,
      elements: whiteboard.elements,
      appState: whiteboard.appState
    });
  } catch (error: any) {
    console.error('Error updating whiteboard elements:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando elementos' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/whiteboards/[whiteboardId]/elements
 * Obtiene solo los elementos (para sync parcial)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; whiteboardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const whiteboard = await Whiteboard.findOne({
      _id: new mongoose.Types.ObjectId(params.whiteboardId),
      projectId: new mongoose.Types.ObjectId(params.id),
      isActive: true
    })
      .select('elements appState files version')
      .lean();

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Pizarra no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      elements: whiteboard.elements,
      appState: whiteboard.appState,
      files: whiteboard.files,
      version: whiteboard.version
    });
  } catch (error: any) {
    console.error('Error fetching whiteboard elements:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo elementos' },
      { status: 500 }
    );
  }
}
