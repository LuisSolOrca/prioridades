import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebForm from '@/models/WebForm';
import WebFormSubmission from '@/models/WebFormSubmission';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Deal from '@/models/Deal';
import Notification from '@/models/Notification';
import User from '@/models/User';
import mongoose from 'mongoose';
import { triggerWorkflowsSync } from '@/lib/crmWorkflowEngine';
import { sendEmail, emailTemplates } from '@/lib/email';

// Rate limiting simple (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(formKey: string, limit: number): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  const current = rateLimitMap.get(formKey);

  if (!current || now > current.resetAt) {
    rateLimitMap.set(formKey, { count: 1, resetAt: now + hourInMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

/**
 * POST /api/public/forms/[formKey]/submit
 * Recibe una submission del formulario (sin autenticación)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { formKey: string } }
) {
  try {
    await connectDB();

    const formKey = params.formKey;
    console.log('[WebForm Submit] Looking for formKey:', formKey);

    // Buscar el formulario
    const form = await WebForm.findOne({
      formKey: formKey,
      isActive: true,
      isPublished: true,
    });

    console.log('[WebForm Submit] Form found:', form ? 'yes' : 'no', form ? { id: form._id, isActive: form.isActive, isPublished: form.isPublished } : null);

    if (!form) {
      // Debug: buscar sin filtros para ver el estado real
      const formAny = await WebForm.findOne({ formKey: formKey });
      console.log('[WebForm Submit] Form without filters:', formAny ? { isActive: formAny.isActive, isPublished: formAny.isPublished } : 'NOT FOUND');

      return NextResponse.json(
        { error: 'Formulario no encontrado o no publicado' },
        { status: 404 }
      );
    }

    // Verificar rate limit
    if (!checkRateLimit(params.formKey, form.rateLimit || 100)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429 }
      );
    }

    // Verificar dominio permitido
    const origin = request.headers.get('origin') || request.headers.get('referer');
    if (form.allowedDomains && form.allowedDomains.length > 0 && origin) {
      const originHost = new URL(origin).hostname;
      const isAllowed = form.allowedDomains.some((domain: string) => {
        if (domain.startsWith('*.')) {
          return originHost.endsWith(domain.slice(1));
        }
        return originHost === domain;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Dominio no permitido' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { data, metadata = {} } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Datos del formulario requeridos' },
        { status: 400 }
      );
    }

    // Validar campos requeridos
    const errors: string[] = [];
    for (const field of form.fields) {
      if (field.required && !data[field.name]) {
        errors.push(`El campo "${field.label}" es requerido`);
      }

      // Validar email
      if (field.type === 'email' && data[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data[field.name])) {
          errors.push(`El campo "${field.label}" debe ser un email válido`);
        }
      }

      // Validaciones personalizadas
      if (field.validation && data[field.name]) {
        const value = String(data[field.name]);
        if (field.validation.minLength && value.length < field.validation.minLength) {
          errors.push(`El campo "${field.label}" debe tener al menos ${field.validation.minLength} caracteres`);
        }
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          errors.push(`El campo "${field.label}" debe tener máximo ${field.validation.maxLength} caracteres`);
        }
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`El campo "${field.label}" no tiene el formato correcto`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Errores de validación', details: errors },
        { status: 400 }
      );
    }

    // Extraer IP y user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Crear submission
    const submission = await WebFormSubmission.create({
      formId: form._id,
      formName: form.name,
      data,
      status: 'pending',
      ipAddress,
      userAgent,
      referrer: metadata.referrer || request.headers.get('referer'),
      pageUrl: metadata.pageUrl,
      utmSource: metadata.utmSource,
      utmMedium: metadata.utmMedium,
      utmCampaign: metadata.utmCampaign,
      utmTerm: metadata.utmTerm,
      utmContent: metadata.utmContent,
      submittedAt: new Date(),
    });

    // Procesar en background
    processSubmission(form, submission, data).catch(err => {
      console.error('Error processing submission:', err);
    });

    // Actualizar contador del formulario
    await WebForm.findByIdAndUpdate(form._id, {
      $inc: { submissions: 1 },
      lastSubmissionAt: new Date(),
    });

    // Respuesta con CORS
    const response = NextResponse.json({
      success: true,
      message: form.successMessage,
      redirectUrl: form.redirectUrl,
      submissionId: submission._id,
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error: any) {
    console.error('Error processing form submission:', error);
    return NextResponse.json(
      { error: 'Error procesando formulario' },
      { status: 500 }
    );
  }
}

/**
 * Procesa la submission en background (crea contacto, deal, etc.)
 */
async function processSubmission(
  form: any,
  submission: any,
  data: Record<string, any>
) {
  try {
    let contactId: mongoose.Types.ObjectId | undefined;
    let clientId: mongoose.Types.ObjectId | undefined;
    let dealId: mongoose.Types.ObjectId | undefined;

    // Mapear datos del formulario a campos de contacto, cliente y deal
    const contactData: any = {};
    const clientData: any = {};
    const dealData: any = {};

    for (const field of form.fields) {
      if (field.mapTo && data[field.name]) {
        const [entity, fieldName] = field.mapTo.split('.');
        if (entity === 'contact') {
          contactData[fieldName] = data[field.name];
        } else if (entity === 'client') {
          clientData[fieldName] = data[field.name];
        } else if (entity === 'deal') {
          dealData[fieldName] = data[field.name];
        }
      }
    }

    // Si hay empresa en clientData, usarla también para contactData.company
    if (clientData.name && !contactData.company) {
      contactData.company = clientData.name;
    }

    // Crear o actualizar contacto si está habilitado
    if (form.createContact && contactData.email) {
      // Buscar contacto existente por email
      let contact = await Contact.findOne({ email: contactData.email });

      if (contact) {
        // Actualizar contacto existente
        await Contact.findByIdAndUpdate(contact._id, {
          ...contactData,
          updatedAt: new Date(),
        });
        contactId = contact._id;

        // Obtener clientId del contacto existente
        if (contact.clientId) {
          clientId = contact.clientId;
        }
      } else {
        // Determinar asignación
        let assignToUserId = form.assignToUserId;

        if (form.assignmentType === 'round_robin') {
          // Usar solo los vendedores seleccionados para round robin
          const roundRobinUsers = form.roundRobinUserIds && form.roundRobinUserIds.length > 0
            ? form.roundRobinUserIds
            : null;

          if (roundRobinUsers && roundRobinUsers.length > 0) {
            // Obtener usuario con menos leads recientes entre los seleccionados
            const userCounts = await Contact.aggregate([
              { $match: { createdBy: { $in: roundRobinUsers } } },
              { $group: { _id: '$createdBy', count: { $sum: 1 } } },
              { $sort: { count: 1 } },
            ]);

            // Encontrar usuarios sin leads asignados
            const usersWithLeads = userCounts.map(u => u._id.toString());
            const usersWithoutLeads = roundRobinUsers.filter(
              (id: any) => !usersWithLeads.includes(id.toString())
            );

            if (usersWithoutLeads.length > 0) {
              // Asignar a un usuario sin leads
              assignToUserId = usersWithoutLeads[0];
            } else if (userCounts.length > 0) {
              // Asignar al usuario con menos leads
              assignToUserId = userCounts[0]._id;
            } else {
              // Fallback al primer usuario de la lista
              assignToUserId = roundRobinUsers[0];
            }
          }
        }

        // Crear cliente primero si no existe
        const companyName = clientData.name || contactData.company;
        if (companyName) {
          let client = await Client.findOne({ name: companyName });
          if (!client) {
            client = await Client.create({
              name: companyName,
              industry: clientData.industry,
              website: clientData.website,
              type: 'LEAD',
              status: 'ACTIVO',
              createdBy: assignToUserId || form.createdBy,
            });
          } else if (clientData.industry || clientData.website) {
            // Actualizar cliente existente si hay datos nuevos
            await Client.findByIdAndUpdate(client._id, {
              ...(clientData.industry && { industry: clientData.industry }),
              ...(clientData.website && { website: clientData.website }),
            });
          }
          clientId = client._id;
        }

        // Crear nuevo contacto
        const nameParts = contactData.name?.split(' ') || [];
        const firstName = contactData.firstName || nameParts[0] || 'Sin nombre';
        const lastName = contactData.lastName || nameParts.slice(1).join(' ') || '-';

        contact = await Contact.create({
          firstName,
          lastName,
          email: contactData.email,
          phone: contactData.phone,
          position: contactData.position,
          clientId,
          source: 'webform',
          tags: form.addTags || [],
          createdBy: assignToUserId || form.createdBy,
        });
        contactId = contact._id;
      }
    }

    // Crear deal si está habilitado
    if (form.createDeal && contactId) {
      // Usar título del formulario o generar uno automático
      const companyName = clientData.name || contactData.company;
      const dealTitle = dealData.title ||
        (companyName
          ? `Lead: ${companyName} (${form.name})`
          : `Lead: ${contactData.firstName || 'Nuevo'} ${contactData.lastName || 'Lead'} (${form.name})`
        );

      // Usar valor del formulario o el default
      const dealValue = dealData.value ? parseFloat(dealData.value) : (form.defaultDealValue || 0);

      const deal = await Deal.create({
        title: dealTitle,
        value: dealValue,
        currency: 'MXN',
        pipelineId: form.defaultPipelineId,
        stageId: form.defaultStageId,
        contactId,
        clientId,
        ownerId: form.assignToUserId || form.createdBy,
        source: 'webform',
        notes: dealData.notes,
        tags: form.addTags || [],
        createdBy: form.createdBy,
      });
      dealId = deal._id;
    }

    // Actualizar submission con las entidades creadas
    await WebFormSubmission.findByIdAndUpdate(submission._id, {
      contactId,
      clientId,
      dealId,
      status: 'processed',
      processedAt: new Date(),
    });

    // Enviar notificaciones
    if (form.notifyOnSubmission) {
      const notifyUsers: string[] = [];

      // Notificar al usuario asignado
      if (form.assignToUserId) {
        notifyUsers.push(form.assignToUserId.toString());
      }

      // Notificar al creador del formulario
      if (form.createdBy && !notifyUsers.includes(form.createdBy.toString())) {
        notifyUsers.push(form.createdBy.toString());
      }

      // Crear notificaciones in-app
      for (const userId of notifyUsers) {
        await Notification.create({
          userId,
          type: 'WEBFORM_SUBMISSION',
          title: `Nueva submission: ${form.name}`,
          message: `Se recibió una nueva respuesta del formulario "${form.name}". Email: ${contactData.email || 'No proporcionado'}`,
        });
      }

      // Preparar datos para el email
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const submissionUrl = contactId
        ? `${baseUrl}/crm/contacts/${contactId}`
        : `${baseUrl}/crm/web-forms/${form._id}/submissions`;

      // Formatear datos del formulario para el email
      const formattedData: Record<string, any> = {};
      for (const field of form.fields) {
        if (data[field.name] !== undefined && data[field.name] !== '') {
          formattedData[field.label] = data[field.name];
        }
      }

      const emailParams = {
        formName: form.name,
        submissionData: formattedData,
        contactName: `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || undefined,
        contactEmail: contactData.email,
        companyName: clientData.name || contactData.company,
        source: 'Formulario Web',
        submissionUrl,
      };

      // Enviar emails a usuarios del sistema
      if (notifyUsers.length > 0) {
        const users = await User.find({ _id: { $in: notifyUsers } }).select('email name');
        for (const user of users) {
          if (user.email) {
            const emailContent = emailTemplates.webFormSubmission(emailParams);
            await sendEmail({
              to: user.email,
              subject: emailContent.subject,
              html: emailContent.html,
            });
            console.log(`[WebForm] Email notification sent to user: ${user.email}`);
          }
        }
      }

      // Enviar emails a direcciones externas configuradas
      if (form.notifyEmails && form.notifyEmails.length > 0) {
        const emailContent = emailTemplates.webFormSubmission(emailParams);
        for (const email of form.notifyEmails) {
          if (email && email.includes('@')) {
            await sendEmail({
              to: email,
              subject: emailContent.subject,
              html: emailContent.html,
            });
            console.log(`[WebForm] Email notification sent to external: ${email}`);
          }
        }
      }
    }

    // Trigger workflow si está habilitado
    if (form.triggerWorkflow && contactId) {
      await triggerWorkflowsSync('contact_created', {
        entityType: 'contact',
        entityId: contactId,
        entityName: `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim(),
        newData: {
          ...contactData,
          source: 'webform',
          formId: form._id,
          formName: form.name,
        },
        userId: form.createdBy?.toString(),
      });
    }

    console.log(`[WebForm] Submission ${submission._id} processed successfully`);
  } catch (error: any) {
    console.error('Error processing submission:', error);

    // Marcar como fallida
    await WebFormSubmission.findByIdAndUpdate(submission._id, {
      status: 'failed',
      errorMessage: error.message,
      processedAt: new Date(),
    });
  }
}

/**
 * OPTIONS /api/public/forms/[formKey]/submit
 * CORS preflight
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}
