import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { decryptToken } from '@/lib/marketing/tokenEncryption';

// System templates - Common marketing templates ready to use
const SYSTEM_TEMPLATES = [
  {
    id: 'sys_bienvenida_lead',
    name: 'bienvenida_lead',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Mensaje de bienvenida para nuevos leads',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '¡Bienvenido a {{1}}! 🎉',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}}, gracias por tu interés en nuestros productos/servicios.\n\nEstamos aquí para ayudarte. ¿En qué podemos asistirte hoy?\n\n✅ Conocer nuestros productos\n✅ Solicitar una cotización\n✅ Hablar con un asesor',
      },
      {
        type: 'FOOTER',
        text: 'Responde con el número de tu elección',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: '1. Ver productos' },
          { type: 'QUICK_REPLY', text: '2. Cotización' },
          { type: 'QUICK_REPLY', text: '3. Asesor' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_promocion_general',
    name: 'promocion_general',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Promoción o descuento especial',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '🔥 ¡Oferta Especial!',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTenemos una promoción exclusiva para ti:\n\n🏷️ *{{2}}% de descuento*\n📅 Válido hasta: {{3}}\n🎁 Código: {{4}}\n\n¡No dejes pasar esta oportunidad!',
      },
      {
        type: 'FOOTER',
        text: 'Términos y condiciones aplican',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Ver ofertas', url: 'https://{{1}}' },
          { type: 'QUICK_REPLY', text: 'No me interesa' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_confirmacion_pedido',
    name: 'confirmacion_pedido',
    language: 'es_MX',
    category: 'UTILITY',
    status: 'APPROVED',
    isSystem: true,
    description: 'Confirmación de pedido realizado',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '✅ Pedido Confirmado #{{1}}',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTu pedido ha sido confirmado exitosamente.\n\n📦 *Detalles del pedido:*\n{{2}}\n\n💰 Total: ${{3}}\n🚚 Entrega estimada: {{4}}\n\nTe notificaremos cuando tu pedido esté en camino.',
      },
      {
        type: 'FOOTER',
        text: 'Gracias por tu compra',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Rastrear pedido', url: 'https://{{1}}/tracking/{{2}}' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_recordatorio_cita',
    name: 'recordatorio_cita',
    language: 'es_MX',
    category: 'UTILITY',
    status: 'APPROVED',
    isSystem: true,
    description: 'Recordatorio de cita o reunión',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📅 Recordatorio de Cita',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTe recordamos tu cita programada:\n\n📍 *Lugar:* {{2}}\n📅 *Fecha:* {{3}}\n🕐 *Hora:* {{4}}\n\n¿Podrás asistir?',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmo asistencia' },
          { type: 'QUICK_REPLY', text: 'Necesito reagendar' },
          { type: 'QUICK_REPLY', text: 'Cancelar cita' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_carrito_abandonado',
    name: 'carrito_abandonado',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Recuperación de carrito abandonado',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '🛒 ¿Olvidaste algo?',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nNotamos que dejaste productos en tu carrito:\n\n{{2}}\n\n💰 Total: ${{3}}\n\n¡Completa tu compra ahora y obtén envío gratis con el código VUELVE10!',
      },
      {
        type: 'FOOTER',
        text: 'Oferta válida por 24 horas',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Completar compra', url: 'https://{{1}}/cart' },
          { type: 'QUICK_REPLY', text: 'Necesito ayuda' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_seguimiento_lead',
    name: 'seguimiento_lead',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Seguimiento a lead después de contacto inicial',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nSoy {{2}} de {{3}}. Te escribo para dar seguimiento a tu interés en {{4}}.\n\n¿Tienes alguna duda o pregunta que pueda resolver?\n\nEstoy aquí para ayudarte a tomar la mejor decisión. 💪',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Sí, tengo dudas' },
          { type: 'QUICK_REPLY', text: 'Quiero cotización' },
          { type: 'QUICK_REPLY', text: 'Ahora no, gracias' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_encuesta_satisfaccion',
    name: 'encuesta_satisfaccion',
    language: 'es_MX',
    category: 'UTILITY',
    status: 'APPROVED',
    isSystem: true,
    description: 'Encuesta de satisfacción del cliente',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '⭐ Tu opinión es importante',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nQueremos conocer tu experiencia con {{2}}.\n\nEn una escala del 1 al 5, ¿qué tan satisfecho estás con nuestro servicio?\n\n1️⃣ Muy insatisfecho\n2️⃣ Insatisfecho\n3️⃣ Neutral\n4️⃣ Satisfecho\n5️⃣ Muy satisfecho',
      },
      {
        type: 'FOOTER',
        text: 'Responde con un número del 1 al 5',
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_invitacion_evento',
    name: 'invitacion_evento',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Invitación a evento o webinar',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '🎯 Estás Invitado',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTe invitamos a nuestro evento exclusivo:\n\n📌 *{{2}}*\n📅 Fecha: {{3}}\n🕐 Hora: {{4}}\n📍 Lugar: {{5}}\n\n¡No te lo pierdas! Cupo limitado.',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: '✅ Confirmo asistencia' },
          { type: 'QUICK_REPLY', text: '❌ No podré asistir' },
          { type: 'QUICK_REPLY', text: 'Más información' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_reactivacion_cliente',
    name: 'reactivacion_cliente',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Reactivación de clientes inactivos',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '👋 ¡Te extrañamos!',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nHa pasado un tiempo desde tu última visita y queremos que sepas que te extrañamos.\n\n🎁 *Tenemos algo especial para ti:*\n{{2}}% de descuento en tu próxima compra\n\nCódigo: VUELVE{{3}}\n\n¡Esperamos verte pronto!',
      },
      {
        type: 'FOOTER',
        text: 'Válido por tiempo limitado',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Usar descuento', url: 'https://{{1}}' },
          { type: 'QUICK_REPLY', text: 'No me interesa' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_actualizacion_envio',
    name: 'actualizacion_envio',
    language: 'es_MX',
    category: 'UTILITY',
    status: 'APPROVED',
    isSystem: true,
    description: 'Actualización de estado de envío',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📦 Actualización de Envío',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTu pedido #{{2}} tiene una actualización:\n\n🚚 *Estado:* {{3}}\n📍 *Ubicación:* {{4}}\n📅 *Entrega estimada:* {{5}}\n\nPuedes rastrear tu pedido en tiempo real.',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Rastrear envío', url: 'https://{{1}}/tracking/{{2}}' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_codigo_verificacion',
    name: 'codigo_verificacion',
    language: 'es_MX',
    category: 'AUTHENTICATION',
    status: 'APPROVED',
    isSystem: true,
    description: 'Código de verificación/OTP',
    components: [
      {
        type: 'BODY',
        text: 'Tu código de verificación es: *{{1}}*\n\nEste código expira en {{2}} minutos.\n\n⚠️ No compartas este código con nadie.',
      },
      {
        type: 'FOOTER',
        text: 'Si no solicitaste este código, ignora este mensaje',
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
  {
    id: 'sys_newsletter_suscripcion',
    name: 'newsletter_bienvenida',
    language: 'es_MX',
    category: 'MARKETING',
    status: 'APPROVED',
    isSystem: true,
    description: 'Bienvenida a suscripción de newsletter',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '📬 ¡Bienvenido al Newsletter!',
      },
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nGracias por suscribirte a nuestro newsletter de {{2}}.\n\nA partir de ahora recibirás:\n✨ Ofertas exclusivas\n📰 Últimas novedades\n💡 Tips y contenido de valor\n\n¿Qué tipo de contenido te interesa más?',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Ofertas y descuentos' },
          { type: 'QUICK_REPLY', text: 'Novedades' },
          { type: 'QUICK_REPLY', text: 'Todo' },
        ],
      },
    ],
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
  },
];

// GET - List all WhatsApp templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const includeSystem = searchParams.get('includeSystem') !== 'false';

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const userTemplates = await WhatsAppTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Filter system templates based on query params
    let systemTemplates = includeSystem ? SYSTEM_TEMPLATES : [];
    if (status && includeSystem) {
      systemTemplates = systemTemplates.filter(t => t.status === status);
    }
    if (category && includeSystem) {
      systemTemplates = systemTemplates.filter(t => t.category === category);
    }

    // Format system templates to match user template structure
    const formattedSystemTemplates = systemTemplates.map(t => ({
      _id: t.id,
      ...t,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Combine: system templates first, then user templates
    const allTemplates = [...formattedSystemTemplates, ...userTemplates];

    return NextResponse.json({
      templates: allTemplates,
      total: allTemplates.length,
      systemCount: formattedSystemTemplates.length,
      userCount: userTemplates.length,
    });
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    return NextResponse.json(
      { error: 'Error al obtener templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new WhatsApp template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, language, category, components } = body;

    // Validate required fields
    if (!name || !language || !category || !components) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, language, category, components' },
        { status: 400 }
      );
    }

    // Check if template name already exists
    const existingTemplate = await WhatsAppTemplate.findOne({ name });
    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Ya existe un template con ese nombre' },
        { status: 400 }
      );
    }

    // Get WhatsApp config to submit to Meta
    const config = await MarketingPlatformConfig.findOne({
      platform: 'WHATSAPP',
      isActive: true,
    });

    let externalTemplateId: string | undefined;

    // If connected to Meta, create template via API
    if (config?.accessToken) {
      try {
        const accessToken = decryptToken(config.accessToken);
        const wabaId = config.platformData?.wabaId;

        if (wabaId && accessToken) {
          // Create template in Meta
          const metaResponse = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name,
                language,
                category,
                components: components.map((comp: any) => ({
                  type: comp.type,
                  format: comp.format,
                  text: comp.text,
                  buttons: comp.buttons,
                })),
              }),
            }
          );

          if (metaResponse.ok) {
            const metaData = await metaResponse.json();
            externalTemplateId = metaData.id;
          } else {
            const errorData = await metaResponse.json();
            console.error('Meta API error:', errorData);
            // Continue creating locally even if Meta API fails
          }
        }
      } catch (metaError) {
        console.error('Error creating template in Meta:', metaError);
        // Continue creating locally
      }
    }

    // Create template in database
    const template = await WhatsAppTemplate.create({
      name,
      language,
      category,
      components,
      status: externalTemplateId ? 'PENDING' : 'DRAFT',
      externalTemplateId,
      createdBy: (session.user as any).id,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    return NextResponse.json(
      { error: 'Error al crear template' },
      { status: 500 }
    );
  }
}
