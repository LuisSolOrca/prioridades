import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WebForm from '@/models/WebForm';
import '@/models/User';

/**
 * GET /api/crm/web-forms
 * Lista todos los formularios web
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'inactive', 'published'
    const search = searchParams.get('search');

    // Construir query
    const query: any = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'published') {
      query.isPublished = true;
      query.isActive = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const forms = await WebForm.find(query)
      .populate('createdBy', 'name email')
      .populate('assignToUserId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(forms);
  } catch (error: any) {
    console.error('Error fetching web forms:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo formularios' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/web-forms
 * Crea un nuevo formulario web
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      fields,
      style,
      logoUrl,
      submitButtonText,
      successMessage,
      redirectUrl,
      showPoweredBy,
      createContact,
      createDeal,
      defaultPipelineId,
      defaultStageId,
      defaultDealValue,
      assignToUserId,
      assignmentType,
      addTags,
      triggerWorkflow,
      notifyOnSubmission,
      notifyEmails,
      allowedDomains,
      rateLimit,
      captchaEnabled,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Crear formulario con campos por defecto si no se proporcionan
    const defaultFields = fields || [
      {
        id: 'field_1',
        name: 'name',
        label: 'Nombre completo',
        type: 'text',
        required: true,
        mapTo: 'contact.firstName',
        order: 0,
        width: 'full',
      },
      {
        id: 'field_2',
        name: 'email',
        label: 'Correo electrónico',
        type: 'email',
        required: true,
        mapTo: 'contact.email',
        order: 1,
        width: 'full',
      },
      {
        id: 'field_3',
        name: 'phone',
        label: 'Teléfono',
        type: 'phone',
        required: false,
        mapTo: 'contact.phone',
        order: 2,
        width: 'full',
      },
      {
        id: 'field_4',
        name: 'message',
        label: 'Mensaje',
        type: 'textarea',
        required: false,
        order: 3,
        width: 'full',
      },
    ];

    const form = await WebForm.create({
      name: name.trim(),
      description: description?.trim(),
      fields: defaultFields,
      style: style || {},
      logoUrl,
      submitButtonText: submitButtonText || 'Enviar',
      successMessage: successMessage || '¡Gracias! Hemos recibido tu información.',
      redirectUrl,
      showPoweredBy: showPoweredBy !== false,
      createContact: createContact !== false,
      createDeal: createDeal || false,
      defaultPipelineId,
      defaultStageId,
      defaultDealValue,
      assignToUserId,
      assignmentType: assignmentType || 'specific',
      addTags: addTags || [],
      triggerWorkflow: triggerWorkflow !== false,
      notifyOnSubmission: notifyOnSubmission !== false,
      notifyEmails: notifyEmails || [],
      allowedDomains: allowedDomains || [],
      rateLimit: rateLimit || 100,
      captchaEnabled: captchaEnabled || false,
      isActive: true,
      isPublished: false,
      createdBy: session.user.id,
    });

    const populatedForm = await WebForm.findById(form._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedForm, { status: 201 });
  } catch (error: any) {
    console.error('Error creating web form:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando formulario' },
      { status: 500 }
    );
  }
}
