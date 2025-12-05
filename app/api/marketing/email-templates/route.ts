import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaignTemplate from '@/models/EmailCampaignTemplate';

// Predefined system templates
const SYSTEM_TEMPLATES = [
  {
    id: 'welcome-simple',
    name: 'Bienvenida Simple',
    description: 'Email de bienvenida minimalista y efectivo',
    category: 'welcome',
    thumbnail: '/templates/email/welcome-simple.png',
    subject: 'Bienvenido a {{companyName}}',
    preheader: 'Gracias por unirte a nuestra comunidad',
    blocks: [
      {
        id: 'logo-1',
        type: 'image',
        content: { src: '', alt: 'Logo', width: 150, align: 'center' },
        styles: { padding: '30px 20px' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1 style="margin: 0; font-size: 28px; color: #333;">¡Bienvenido, {{firstName}}!</h1>',
        },
        styles: { padding: '20px', textAlign: 'center' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #666;">Estamos emocionados de tenerte con nosotros. Tu cuenta está lista para que comiences a explorar todo lo que tenemos para ofrecerte.</p>',
        },
        styles: { padding: '0 40px 20px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Comenzar Ahora', url: '{{ctaUrl}}' },
        styles: {
          padding: '20px',
          buttonColor: '#3B82F6',
          textColor: '#ffffff',
          borderRadius: '8px',
          align: 'center',
        },
      },
      {
        id: 'divider-1',
        type: 'divider',
        content: {},
        styles: { padding: '30px 40px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 14px; color: #999; text-align: center;">¿Tienes preguntas? Responde a este email o contáctanos en {{supportEmail}}</p>',
        },
        styles: { padding: '0 20px 30px' },
      },
    ],
    globalStyles: {
      backgroundColor: '#f5f5f5',
      contentWidth: 600,
      fontFamily: 'Arial, sans-serif',
      textColor: '#333333',
      linkColor: '#3B82F6',
    },
  },
  {
    id: 'newsletter-modern',
    name: 'Newsletter Moderno',
    description: 'Diseño limpio para boletines informativos',
    category: 'newsletter',
    thumbnail: '/templates/email/newsletter-modern.png',
    subject: '{{newsletterTitle}} - {{monthYear}}',
    preheader: 'Las últimas novedades de {{companyName}}',
    blocks: [
      {
        id: 'header-1',
        type: 'image',
        content: { src: '', alt: 'Header', width: 600, align: 'center' },
        styles: { padding: '0' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1 style="margin: 0; font-size: 24px; color: #1F2937;">Novedades de {{monthYear}}</h1>',
        },
        styles: { padding: '30px 20px 10px', textAlign: 'center' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; color: #6B7280;">Hola {{firstName}}, aquí están las últimas noticias y actualizaciones.</p>',
        },
        styles: { padding: '0 20px 30px', textAlign: 'center' },
      },
      {
        id: 'divider-1',
        type: 'divider',
        content: {},
        styles: { padding: '0 40px 20px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<h2 style="margin: 0 0 15px; font-size: 20px; color: #1F2937;">📰 Artículo Destacado</h2><p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4B5563;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
        },
        styles: { padding: '20px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Leer Más', url: '#' },
        styles: {
          padding: '10px 20px 30px',
          buttonColor: '#3B82F6',
          textColor: '#ffffff',
          borderRadius: '6px',
          align: 'left',
        },
      },
      {
        id: 'columns-1',
        type: 'columns',
        content: {
          columns: 2,
          children: [
            {
              id: 'col-1',
              blocks: [
                {
                  id: 'img-1',
                  type: 'image',
                  content: { src: '', alt: 'Article 1', width: 280 },
                  styles: { padding: '10px' },
                },
                {
                  id: 'txt-1',
                  type: 'text',
                  content: { html: '<h3 style="margin: 0 0 10px; font-size: 16px;">Título del artículo</h3><p style="margin: 0; font-size: 14px; color: #666;">Breve descripción del contenido...</p>' },
                  styles: { padding: '0 10px' },
                },
              ],
            },
            {
              id: 'col-2',
              blocks: [
                {
                  id: 'img-2',
                  type: 'image',
                  content: { src: '', alt: 'Article 2', width: 280 },
                  styles: { padding: '10px' },
                },
                {
                  id: 'txt-2',
                  type: 'text',
                  content: { html: '<h3 style="margin: 0 0 10px; font-size: 16px;">Título del artículo</h3><p style="margin: 0; font-size: 14px; color: #666;">Breve descripción del contenido...</p>' },
                  styles: { padding: '0 10px' },
                },
              ],
            },
          ],
        },
        styles: { padding: '20px 10px' },
      },
      {
        id: 'social-1',
        type: 'social',
        content: {
          networks: [
            { name: 'facebook', url: '#' },
            { name: 'twitter', url: '#' },
            { name: 'linkedin', url: '#' },
            { name: 'instagram', url: '#' },
          ],
        },
        styles: { padding: '30px 20px', align: 'center' },
      },
    ],
    globalStyles: {
      backgroundColor: '#F3F4F6',
      contentWidth: 600,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      textColor: '#1F2937',
      linkColor: '#3B82F6',
    },
  },
  {
    id: 'promo-sale',
    name: 'Promoción de Venta',
    description: 'Template llamativo para ofertas y descuentos',
    category: 'promotional',
    thumbnail: '/templates/email/promo-sale.png',
    subject: '🔥 {{discount}}% OFF - ¡Solo por tiempo limitado!',
    preheader: 'No te pierdas esta oferta exclusiva',
    blocks: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;"><h1 style="margin: 0; font-size: 48px; color: #fff; font-weight: bold;">{{discount}}% OFF</h1><p style="margin: 15px 0 0; font-size: 18px; color: rgba(255,255,255,0.9);">En toda la tienda</p></div>',
        },
        styles: { padding: '0' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<h2 style="margin: 0; font-size: 24px; color: #1F2937; text-align: center;">¡Hola {{firstName}}!</h2>',
        },
        styles: { padding: '30px 20px 10px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4B5563; text-align: center;">Tenemos una oferta especial esperándote. Usa el código <strong style="color: #7C3AED;">{{promoCode}}</strong> al finalizar tu compra.</p>',
        },
        styles: { padding: '0 30px 20px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'COMPRAR AHORA', url: '{{shopUrl}}' },
        styles: {
          padding: '20px',
          buttonColor: '#7C3AED',
          textColor: '#ffffff',
          borderRadius: '50px',
          align: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'text-4',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 14px; color: #9CA3AF; text-align: center;">⏰ Oferta válida hasta {{expirationDate}}</p>',
        },
        styles: { padding: '10px 20px 30px' },
      },
      {
        id: 'divider-1',
        type: 'divider',
        content: {},
        styles: { padding: '0 40px' },
      },
      {
        id: 'text-5',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">Si no deseas recibir más promociones, puedes <a href="{{unsubscribeUrl}}" style="color: #6B7280;">darte de baja aquí</a>.</p>',
        },
        styles: { padding: '20px' },
      },
    ],
    globalStyles: {
      backgroundColor: '#F9FAFB',
      contentWidth: 600,
      fontFamily: 'Arial, sans-serif',
      textColor: '#1F2937',
      linkColor: '#7C3AED',
    },
  },
  {
    id: 'event-invitation',
    name: 'Invitación a Evento',
    description: 'Invitación elegante para webinars y eventos',
    category: 'event',
    thumbnail: '/templates/email/event-invitation.png',
    subject: '📅 Estás invitado: {{eventName}}',
    preheader: '{{eventDate}} - No te lo pierdas',
    blocks: [
      {
        id: 'image-1',
        type: 'image',
        content: { src: '', alt: 'Event Banner', width: 600, align: 'center' },
        styles: { padding: '0' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 14px; color: #10B981; text-transform: uppercase; letter-spacing: 2px; text-align: center;">Estás Invitado</p>',
        },
        styles: { padding: '30px 20px 10px' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<h1 style="margin: 0; font-size: 32px; color: #1F2937; text-align: center;">{{eventName}}</h1>',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<div style="background: #F3F4F6; border-radius: 12px; padding: 25px; text-align: center;"><p style="margin: 0 0 10px; font-size: 16px; color: #6B7280;">📅 <strong>{{eventDate}}</strong></p><p style="margin: 0 0 10px; font-size: 16px; color: #6B7280;">🕐 <strong>{{eventTime}}</strong></p><p style="margin: 0; font-size: 16px; color: #6B7280;">📍 <strong>{{eventLocation}}</strong></p></div>',
        },
        styles: { padding: '0 30px 20px' },
      },
      {
        id: 'text-4',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4B5563;">Hola {{firstName}},</p><p style="margin: 15px 0 0; font-size: 16px; line-height: 1.6; color: #4B5563;">{{eventDescription}}</p>',
        },
        styles: { padding: '20px 30px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Confirmar Asistencia', url: '{{rsvpUrl}}' },
        styles: {
          padding: '20px 30px',
          buttonColor: '#10B981',
          textColor: '#ffffff',
          borderRadius: '8px',
          align: 'center',
        },
      },
      {
        id: 'text-5',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 14px; color: #9CA3AF; text-align: center;">¿No puedes asistir? <a href="{{declineUrl}}" style="color: #6B7280;">Avísanos aquí</a></p>',
        },
        styles: { padding: '10px 20px 30px' },
      },
    ],
    globalStyles: {
      backgroundColor: '#ffffff',
      contentWidth: 600,
      fontFamily: "'Georgia', serif",
      textColor: '#1F2937',
      linkColor: '#10B981',
    },
  },
  {
    id: 'product-announcement',
    name: 'Lanzamiento de Producto',
    description: 'Anuncio de nuevo producto o característica',
    category: 'announcement',
    thumbnail: '/templates/email/product-announcement.png',
    subject: '🚀 Presentamos: {{productName}}',
    preheader: 'Lo nuevo que estabas esperando',
    blocks: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 14px; color: #F59E0B; text-transform: uppercase; letter-spacing: 2px; text-align: center; font-weight: bold;">Nuevo Lanzamiento</p>',
        },
        styles: { padding: '30px 20px 15px' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<h1 style="margin: 0; font-size: 36px; color: #1F2937; text-align: center;">{{productName}}</h1>',
        },
        styles: { padding: '0 20px 10px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 18px; color: #6B7280; text-align: center;">{{productTagline}}</p>',
        },
        styles: { padding: '0 30px 30px' },
      },
      {
        id: 'image-1',
        type: 'image',
        content: { src: '', alt: 'Product Image', width: 500, align: 'center' },
        styles: { padding: '0 20px 30px' },
      },
      {
        id: 'text-4',
        type: 'text',
        content: {
          html: '<h3 style="margin: 0 0 15px; font-size: 20px; color: #1F2937;">Características principales:</h3><ul style="margin: 0; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4B5563;"><li>{{feature1}}</li><li>{{feature2}}</li><li>{{feature3}}</li></ul>',
        },
        styles: { padding: '0 30px 30px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Descubrir Más', url: '{{productUrl}}' },
        styles: {
          padding: '0 30px 30px',
          buttonColor: '#F59E0B',
          textColor: '#ffffff',
          borderRadius: '8px',
          align: 'center',
        },
      },
    ],
    globalStyles: {
      backgroundColor: '#FFFBEB',
      contentWidth: 600,
      fontFamily: 'Arial, sans-serif',
      textColor: '#1F2937',
      linkColor: '#F59E0B',
    },
  },
  {
    id: 'follow-up-simple',
    name: 'Seguimiento Simple',
    description: 'Email de seguimiento directo y personal',
    category: 'follow_up',
    thumbnail: '/templates/email/follow-up-simple.png',
    subject: 'Re: {{previousSubject}}',
    preheader: 'Solo quería hacer seguimiento...',
    blocks: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; line-height: 1.8; color: #374151;">Hola {{firstName}},</p><p style="margin: 20px 0; font-size: 16px; line-height: 1.8; color: #374151;">Espero que estés bien. Te escribo para dar seguimiento a mi mensaje anterior sobre {{topic}}.</p><p style="margin: 0; font-size: 16px; line-height: 1.8; color: #374151;">¿Tuviste oportunidad de revisarlo? Me encantaría conocer tu opinión o responder cualquier pregunta que tengas.</p>',
        },
        styles: { padding: '30px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Agendar una Llamada', url: '{{meetingUrl}}' },
        styles: {
          padding: '0 30px 20px',
          buttonColor: '#3B82F6',
          textColor: '#ffffff',
          borderRadius: '6px',
          align: 'left',
        },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; line-height: 1.8; color: #374151;">Saludos,</p><p style="margin: 10px 0 0; font-size: 16px; color: #374151;"><strong>{{senderName}}</strong></p><p style="margin: 5px 0 0; font-size: 14px; color: #6B7280;">{{senderTitle}}</p>',
        },
        styles: { padding: '10px 30px 30px' },
      },
    ],
    globalStyles: {
      backgroundColor: '#ffffff',
      contentWidth: 600,
      fontFamily: 'Arial, sans-serif',
      textColor: '#374151',
      linkColor: '#3B82F6',
    },
  },
  {
    id: 'abandoned-cart',
    name: 'Carrito Abandonado',
    description: 'Recupera ventas con recordatorio de carrito',
    category: 'transactional',
    thumbnail: '/templates/email/abandoned-cart.png',
    subject: '¿Olvidaste algo? Tu carrito te espera 🛒',
    preheader: 'Los productos que dejaste están esperándote',
    blocks: [
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1 style="margin: 0; font-size: 28px; color: #1F2937; text-align: center;">¿Olvidaste algo?</h1>',
        },
        styles: { padding: '30px 20px 10px' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; color: #6B7280; text-align: center;">Hola {{firstName}}, notamos que dejaste algunos productos en tu carrito.</p>',
        },
        styles: { padding: '0 30px 30px' },
      },
      {
        id: 'product-1',
        type: 'product',
        content: {
          image: '',
          name: '{{productName}}',
          price: '{{productPrice}}',
          quantity: '{{productQuantity}}',
        },
        styles: { padding: '0 30px 20px' },
      },
      {
        id: 'divider-1',
        type: 'divider',
        content: {},
        styles: { padding: '0 30px 20px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 18px; color: #1F2937; text-align: center;"><strong>Total: {{cartTotal}}</strong></p>',
        },
        styles: { padding: '0 30px 20px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Completar mi Compra', url: '{{cartUrl}}' },
        styles: {
          padding: '10px 30px 20px',
          buttonColor: '#10B981',
          textColor: '#ffffff',
          borderRadius: '8px',
          align: 'center',
        },
      },
      {
        id: 'text-4',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 14px; color: #9CA3AF; text-align: center;">¿Necesitas ayuda? Responde a este email o llámanos al {{supportPhone}}</p>',
        },
        styles: { padding: '20px 30px 30px' },
      },
    ],
    globalStyles: {
      backgroundColor: '#F9FAFB',
      contentWidth: 600,
      fontFamily: 'Arial, sans-serif',
      textColor: '#1F2937',
      linkColor: '#10B981',
    },
  },
  {
    id: 'holiday-greeting',
    name: 'Saludo de Temporada',
    description: 'Felicitaciones para fechas especiales',
    category: 'seasonal',
    thumbnail: '/templates/email/holiday-greeting.png',
    subject: '🎄 ¡Felices Fiestas de parte de {{companyName}}!',
    preheader: 'Nuestros mejores deseos para ti',
    blocks: [
      {
        id: 'image-1',
        type: 'image',
        content: { src: '', alt: 'Holiday Banner', width: 600, align: 'center' },
        styles: { padding: '0' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h1 style="margin: 0; font-size: 32px; color: #DC2626; text-align: center;">¡Felices Fiestas!</h1>',
        },
        styles: { padding: '30px 20px 15px' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 16px; line-height: 1.8; color: #4B5563; text-align: center;">Querido/a {{firstName}},</p><p style="margin: 20px 0; font-size: 16px; line-height: 1.8; color: #4B5563; text-align: center;">En estas fechas especiales, queremos agradecerte por ser parte de nuestra comunidad. Tu confianza nos motiva a seguir mejorando cada día.</p><p style="margin: 0; font-size: 16px; line-height: 1.8; color: #4B5563; text-align: center;">Te deseamos mucha felicidad, salud y éxito en el año que viene.</p>',
        },
        styles: { padding: '0 40px 30px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: {
          html: '<p style="margin: 0; font-size: 18px; color: #1F2937; text-align: center;"><strong>Con cariño,<br>El equipo de {{companyName}}</strong></p>',
        },
        styles: { padding: '0 30px 30px' },
      },
      {
        id: 'social-1',
        type: 'social',
        content: {
          networks: [
            { name: 'facebook', url: '#' },
            { name: 'instagram', url: '#' },
            { name: 'twitter', url: '#' },
          ],
        },
        styles: { padding: '20px', align: 'center', background: '#FEF2F2' },
      },
    ],
    globalStyles: {
      backgroundColor: '#FEF2F2',
      contentWidth: 600,
      fontFamily: "'Georgia', serif",
      textColor: '#1F2937',
      linkColor: '#DC2626',
    },
  },
];

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const includeSystem = searchParams.get('includeSystem') !== 'false';

    await connectDB();

    // Build query for user templates
    const query: Record<string, any> = {
      isActive: true,
      $or: [
        { isPublic: true },
        { createdBy: (session.user as any).id },
      ],
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } },
          ],
        },
      ];
    }

    const userTemplates = await EmailCampaignTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    // Filter system templates
    let systemTemplates = SYSTEM_TEMPLATES;
    if (category && category !== 'all') {
      systemTemplates = systemTemplates.filter((t) => t.category === category);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      systemTemplates = systemTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
      );
    }

    // Format system templates to match user template structure
    const formattedSystemTemplates = includeSystem
      ? systemTemplates.map((t) => ({
          _id: t.id,
          ...t,
          isSystem: true,
          isPublic: true,
          usageCount: 0,
          createdBy: { name: 'Sistema' },
        }))
      : [];

    return NextResponse.json({
      templates: [...formattedSystemTemplates, ...userTemplates],
      categories: [
        { id: 'all', name: 'Todas' },
        { id: 'welcome', name: 'Bienvenida' },
        { id: 'newsletter', name: 'Newsletter' },
        { id: 'promotional', name: 'Promocional' },
        { id: 'announcement', name: 'Anuncio' },
        { id: 'event', name: 'Evento' },
        { id: 'follow_up', name: 'Seguimiento' },
        { id: 'transactional', name: 'Transaccional' },
        { id: 'seasonal', name: 'Temporada' },
        { id: 'other', name: 'Otro' },
      ],
    });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener plantillas' },
      { status: 500 }
    );
  }
}

// POST - Create or get template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, action } = body;

    // If getting a specific template
    if (action === 'get' && templateId) {
      // Check if it's a system template
      const systemTemplate = SYSTEM_TEMPLATES.find((t) => t.id === templateId);
      if (systemTemplate) {
        // Generate unique IDs for blocks
        const blocksWithNewIds = systemTemplate.blocks.map((block) => ({
          ...block,
          id: `${block.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }));

        return NextResponse.json({
          ...systemTemplate,
          blocks: blocksWithNewIds,
          isSystem: true,
        });
      }

      // Otherwise fetch from database
      await connectDB();
      const template = await EmailCampaignTemplate.findById(templateId).lean();

      if (!template) {
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      }

      // Increment usage count
      await EmailCampaignTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: 1 },
      });

      return NextResponse.json(template);
    }

    // Creating a new template
    await connectDB();

    const newTemplate = new EmailCampaignTemplate({
      ...body,
      createdBy: (session.user as any).id,
    });

    await newTemplate.save();

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error: any) {
    console.error('Error with email template:', error);
    return NextResponse.json(
      { error: error.message || 'Error con plantilla' },
      { status: 500 }
    );
  }
}
