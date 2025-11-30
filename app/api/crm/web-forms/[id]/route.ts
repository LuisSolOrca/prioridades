import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WebForm from '@/models/WebForm';
import WebFormSubmission from '@/models/WebFormSubmission';
import mongoose from 'mongoose';
import '@/models/User';
import '@/models/Pipeline';

/**
 * GET /api/crm/web-forms/[id]
 * Obtiene un formulario específico
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const form = await WebForm.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('assignToUserId', 'name email')
      .populate('defaultPipelineId', 'name')
      .populate('defaultStageId', 'name')
      .lean();

    if (!form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error: any) {
    console.error('Error fetching web form:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo formulario' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/web-forms/[id]
 * Actualiza un formulario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Campos permitidos para actualizar
    const allowedFields = [
      'name',
      'description',
      'fields',
      'style',
      'logoUrl',
      'submitButtonText',
      'successMessage',
      'redirectUrl',
      'showPoweredBy',
      'createContact',
      'createDeal',
      'defaultPipelineId',
      'defaultStageId',
      'defaultDealValue',
      'assignToUserId',
      'assignmentType',
      'addTags',
      'triggerWorkflow',
      'notifyOnSubmission',
      'notifyEmails',
      'allowedDomains',
      'rateLimit',
      'captchaEnabled',
      'isActive',
      'isPublished',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const form = await WebForm.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignToUserId', 'name email')
      .lean();

    if (!form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error: any) {
    console.error('Error updating web form:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando formulario' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/web-forms/[id]
 * Elimina un formulario
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden eliminar
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar si tiene submissions
    const submissionsCount = await WebFormSubmission.countDocuments({ formId: params.id });

    if (submissionsCount > 0) {
      // En lugar de eliminar, marcar como inactivo
      await WebForm.findByIdAndUpdate(params.id, {
        isActive: false,
        isPublished: false,
      });

      return NextResponse.json({
        message: 'Formulario desactivado (tiene submissions asociadas)',
        deactivated: true,
      });
    }

    const form = await WebForm.findByIdAndDelete(params.id);

    if (!form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Formulario eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting web form:', error);
    return NextResponse.json(
      { error: error.message || 'Error eliminando formulario' },
      { status: 500 }
    );
  }
}
