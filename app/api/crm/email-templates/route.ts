import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailTemplate from '@/models/EmailTemplate';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// System templates for CRM
const CRM_SYSTEM_TEMPLATES = [
  {
    _id: 'sys_crm_primer_contacto',
    name: 'Primer Contacto',
    description: 'Email inicial para nuevos prospectos',
    category: 'outreach',
    subject: '{{contact.firstName}}, me gustaría conectar contigo',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Mi nombre es {{user.name}} y me pongo en contacto contigo porque creo que podríamos ayudar a {{client.name}} a alcanzar sus objetivos.</p><p style="margin: 16px 0 0; line-height: 1.6;">Me encantaría agendar una breve llamada de 15 minutos para conocer más sobre sus necesidades actuales y explorar cómo podemos colaborar.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Agendar Llamada', url: '#', backgroundColor: '#10B981', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0;">Saludos cordiales,<br/>{{user.name}}<br/><span style="color: #666; font-size: 14px;">{{user.email}}</span></p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_seguimiento_llamada',
    name: 'Seguimiento Post-Llamada',
    description: 'Email después de una llamada telefónica',
    category: 'follow_up',
    subject: 'Gracias por tu tiempo, {{contact.firstName}}',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Fue un placer hablar contigo hoy. Como comentamos, te comparto un resumen de los puntos que discutimos:</p><ul style="margin: 16px 0; padding-left: 20px; line-height: 1.8;"><li>Punto 1 de la conversación</li><li>Punto 2 de la conversación</li><li>Próximos pasos acordados</li></ul><p style="margin: 16px 0 0; line-height: 1.6;">Quedo atento a cualquier pregunta que puedas tener.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'text',
        content: '<p style="margin: 0;">Saludos,<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_confirmacion_reunion',
    name: 'Confirmación de Reunión',
    description: 'Confirmar una reunión agendada',
    category: 'meeting',
    subject: 'Confirmación: Reunión {{tomorrow}}',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Te escribo para confirmar nuestra reunión programada para mañana.</p><div style="background: #f0fdf4; border-left: 4px solid #10B981; padding: 16px; margin: 16px 0; border-radius: 4px;"><strong>Detalles de la reunión:</strong><br/>📅 Fecha: {{tomorrow}}<br/>⏰ Hora: [HORA]<br/>📍 Lugar/Link: [UBICACIÓN]</div><p style="margin: 16px 0 0; line-height: 1.6;">Por favor confirma tu asistencia respondiendo a este correo.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Confirmar Asistencia', url: '#', backgroundColor: '#10B981', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0;">Saludos,<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_envio_cotizacion',
    name: 'Envío de Cotización',
    description: 'Acompañar el envío de una propuesta comercial',
    category: 'quote',
    subject: 'Propuesta comercial para {{client.name}}',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Adjunto encontrarás la propuesta comercial que preparamos especialmente para {{client.name}}.</p><div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 8px; text-align: center;"><strong style="font-size: 18px;">{{deal.title}}</strong><br/><span style="font-size: 24px; color: #10B981; font-weight: bold;">{{deal.value}}</span></div><p style="margin: 16px 0 0; line-height: 1.6;">Esta propuesta tiene una validez de 15 días. Quedo a tu disposición para resolver cualquier duda.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Ver Propuesta Completa', url: '#', backgroundColor: '#3B82F6', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0;">Saludos cordiales,<br/>{{user.name}}<br/><span style="color: #666; font-size: 14px;">{{user.phone}}</span></p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#3B82F6' },
  },
  {
    _id: 'sys_crm_seguimiento_propuesta',
    name: 'Seguimiento de Propuesta',
    description: 'Seguimiento después de enviar cotización',
    category: 'follow_up',
    subject: '{{contact.firstName}}, ¿revisaste nuestra propuesta?',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Hace unos días te envié una propuesta para {{deal.title}} y quería hacer seguimiento.</p><p style="margin: 16px 0 0; line-height: 1.6;">¿Has tenido oportunidad de revisarla? Me encantaría conocer tus comentarios y resolver cualquier duda que puedas tener.</p><p style="margin: 16px 0 0; line-height: 1.6;">Si prefieres, podemos agendar una llamada rápida para revisarla juntos.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Agendar Llamada', url: '#', backgroundColor: '#10B981', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0;">Quedo atento,<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_agradecimiento_reunion',
    name: 'Agradecimiento Post-Reunión',
    description: 'Agradecer después de una reunión presencial o virtual',
    category: 'meeting',
    subject: 'Gracias por la reunión de hoy',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Muchas gracias por tomarte el tiempo de reunirte conmigo hoy. Fue muy valioso conocer más sobre {{client.name}} y sus objetivos.</p><p style="margin: 16px 0 0; line-height: 1.6;">Como acordamos, los próximos pasos son:</p><ol style="margin: 16px 0; padding-left: 20px; line-height: 1.8;"><li>Primer paso acordado</li><li>Segundo paso acordado</li><li>Tercer paso acordado</li></ol><p style="margin: 16px 0 0; line-height: 1.6;">Estaré enviando [documento/información] durante esta semana.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'text',
        content: '<p style="margin: 0;">¡Gracias nuevamente!<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_recordatorio_pago',
    name: 'Recordatorio de Pago',
    description: 'Recordar un pago pendiente de forma amable',
    category: 'closing',
    subject: 'Recordatorio: Factura pendiente',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Esperamos que todo esté bien. Te escribimos para recordarte que tienes una factura pendiente de pago.</p><div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;"><strong>Detalles:</strong><br/>📄 Concepto: {{deal.title}}<br/>💰 Monto: {{deal.value}}<br/>📅 Vencimiento: [FECHA]</div><p style="margin: 16px 0 0; line-height: 1.6;">Si ya realizaste el pago, por favor ignora este mensaje. De lo contrario, te agradeceríamos regularizar la situación a la brevedad.</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Realizar Pago', url: '#', backgroundColor: '#F59E0B', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0;">Saludos,<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#F59E0B' },
  },
  {
    _id: 'sys_crm_cierre_ganado',
    name: 'Bienvenida Nuevo Cliente',
    description: 'Dar la bienvenida cuando se cierra un deal',
    category: 'closing',
    subject: '¡Bienvenido a bordo, {{contact.firstName}}!',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<h1 style="margin: 0; text-align: center; color: #10B981;">🎉 ¡Bienvenido!</h1>',
        styles: { padding: '30px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Es un placer darte la bienvenida como nuevo cliente. Estamos muy emocionados de comenzar a trabajar juntos.</p><p style="margin: 16px 0 0; line-height: 1.6;">A partir de ahora, seré tu punto de contacto principal. No dudes en escribirme o llamarme para cualquier cosa que necesites.</p><div style="background: #f0fdf4; padding: 16px; margin: 16px 0; border-radius: 8px; text-align: center;"><strong>Tu contacto dedicado:</strong><br/>{{user.name}}<br/>📧 {{user.email}}<br/>📱 {{user.phone}}</div>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0; text-align: center;">¡Gracias por confiar en nosotros!</p>',
        styles: { padding: '10px 20px 30px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_reactivacion',
    name: 'Reactivación de Contacto',
    description: 'Reconectar con contactos inactivos',
    category: 'nurture',
    subject: '{{contact.firstName}}, te extrañamos',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Ha pasado un tiempo desde nuestra última conversación y quería ponerme en contacto para saber cómo van las cosas en {{client.name}}.</p><p style="margin: 16px 0 0; line-height: 1.6;">Desde entonces hemos incorporado nuevas soluciones que podrían ser de tu interés. ¿Te gustaría que agendemos una llamada breve para ponernos al día?</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Sí, agendemos', url: '#', backgroundColor: '#10B981', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0;">Espero saber de ti pronto,<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#10B981' },
  },
  {
    _id: 'sys_crm_encuesta_satisfaccion',
    name: 'Encuesta de Satisfacción',
    description: 'Solicitar feedback del cliente',
    category: 'nurture',
    subject: '{{contact.firstName}}, tu opinión nos importa',
    isSystem: true,
    isShared: true,
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
        styles: { padding: '20px 20px 10px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-2',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">En {{client.name}} nos esforzamos por brindarte el mejor servicio posible, y tu opinión es fundamental para lograrlo.</p><p style="margin: 16px 0 0; line-height: 1.6;">¿Podrías tomarte 2 minutos para responder una breve encuesta sobre tu experiencia con nosotros?</p>',
        styles: { padding: '10px 20px', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-3',
        type: 'button',
        content: { text: 'Responder Encuesta', url: '#', backgroundColor: '#8B5CF6', color: '#ffffff', borderRadius: '8px' },
        styles: { padding: '20px', textAlign: 'center', backgroundColor: '#ffffff' },
      },
      {
        id: 'block-4',
        type: 'text',
        content: '<p style="margin: 0; line-height: 1.6;">Tu feedback nos ayuda a mejorar continuamente. ¡Gracias por tu tiempo!</p><p style="margin: 16px 0 0;">Saludos,<br/>{{user.name}}</p>',
        styles: { padding: '10px 20px 20px', backgroundColor: '#ffffff' },
      },
    ],
    globalStyles: { backgroundColor: '#f5f5f5', contentWidth: 600, fontFamily: 'Arial, sans-serif', textColor: '#333333', linkColor: '#8B5CF6' },
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope'); // 'sequences' | 'workflows' | 'both'
    const includeShared = searchParams.get('includeShared') !== 'false';

    const query: any = {
      isActive: true,
      $or: [
        { createdBy: userId },
        ...(includeShared ? [{ isShared: true }] : []),
      ],
    };

    if (category) {
      query.category = category;
    }

    // Filtrar por scope - incluir plantillas del scope específico o 'both'
    if (scope && scope !== 'both') {
      query.scope = { $in: [scope, 'both'] };
    }

    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { subject: { $regex: search, $options: 'i' } },
          ],
        },
      ];
      delete query.$or;
    }

    const templates = await EmailTemplate.find(query)
      .populate('createdBy', 'name')
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    // Filter system templates based on category and search
    let filteredSystemTemplates = CRM_SYSTEM_TEMPLATES.filter(t => {
      if (category && t.category !== category) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        if (!t.name.toLowerCase().includes(searchLower) &&
            !t.subject.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      return true;
    });

    // Combine system templates first, then user templates
    const allTemplates = [...filteredSystemTemplates, ...templates];

    return NextResponse.json(allTemplates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = (session.user as any).id;

    // Handle action to get a single template
    if (body.action === 'get' && body.templateId) {
      // Check if it's a system template
      const systemTemplate = CRM_SYSTEM_TEMPLATES.find(t => t._id === body.templateId);
      if (systemTemplate) {
        return NextResponse.json(systemTemplate);
      }

      // Otherwise, fetch from database
      const template = await EmailTemplate.findOne({
        _id: body.templateId,
        $or: [
          { createdBy: userId },
          { isShared: true },
        ],
      }).populate('createdBy', 'name').lean();

      if (!template) {
        return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
      }

      return NextResponse.json(template);
    }

    // Create new template - requires manage deals permission
    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para crear templates' }, { status: 403 });
    }

    const template = await EmailTemplate.create({
      ...body,
      createdBy: userId,
    });

    const populated = await EmailTemplate.findById(template._id)
      .populate('createdBy', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
