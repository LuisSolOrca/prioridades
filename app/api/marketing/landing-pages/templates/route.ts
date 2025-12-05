import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Predefined templates
const LANDING_PAGE_TEMPLATES = [
  {
    id: 'blank',
    name: 'Pagina en blanco',
    description: 'Empieza desde cero con un lienzo limpio',
    category: 'basic',
    thumbnail: '/templates/blank.png',
    sections: [],
    globalStyles: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      backgroundColor: '#ffffff',
      textColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      containerWidth: 1200,
      borderRadius: 8,
    },
  },
  {
    id: 'lead-capture',
    name: 'Captura de Leads',
    description: 'Pagina optimizada para capturar leads con formulario destacado',
    category: 'marketing',
    thumbnail: '/templates/lead-capture.png',
    sections: [
      {
        id: 'header-1',
        type: 'header',
        content: {
          logo: '',
          menuItems: [],
          ctaText: 'Contactar',
          ctaUrl: '#form',
          sticky: true,
        },
        styles: { backgroundColor: '#ffffff', padding: '16px 0' },
      },
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          title: 'Tu Titulo Principal Aqui',
          subtitle: 'Una descripcion convincente que explique el valor de tu oferta y por que los visitantes deberian actuar ahora.',
          ctaText: 'Comenzar Ahora',
          ctaUrl: '#form',
          secondaryCtaText: 'Saber Mas',
          secondaryCtaUrl: '#benefits',
          backgroundImage: '',
          alignment: 'center',
        },
        styles: {
          backgroundColor: '#F3F4F6',
          padding: '80px 0',
          minHeight: '500px',
        },
      },
      {
        id: 'logos-1',
        type: 'logos',
        content: {
          title: 'Empresas que confian en nosotros',
          logos: [],
        },
        styles: { backgroundColor: '#ffffff', padding: '40px 0' },
      },
      {
        id: 'benefits-1',
        type: 'benefits',
        content: {
          title: 'Por que elegirnos',
          subtitle: 'Descubre los beneficios de trabajar con nosotros',
          items: [
            { icon: 'check', title: 'Beneficio 1', description: 'Descripcion del primer beneficio' },
            { icon: 'check', title: 'Beneficio 2', description: 'Descripcion del segundo beneficio' },
            { icon: 'check', title: 'Beneficio 3', description: 'Descripcion del tercer beneficio' },
          ],
        },
        styles: { backgroundColor: '#ffffff', padding: '60px 0' },
      },
      {
        id: 'form-1',
        type: 'form',
        content: {
          title: 'Solicita tu demo gratuita',
          subtitle: 'Completa el formulario y te contactaremos en menos de 24 horas',
          formId: null,
        },
        styles: { backgroundColor: '#F3F4F6', padding: '60px 0' },
      },
      {
        id: 'footer-1',
        type: 'footer',
        content: {
          companyName: 'Tu Empresa',
          links: [],
          socialLinks: [],
          copyright: '2024 Tu Empresa. Todos los derechos reservados.',
        },
        styles: { backgroundColor: '#1F2937', padding: '40px 0' },
      },
    ],
    globalStyles: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      backgroundColor: '#ffffff',
      textColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      containerWidth: 1200,
      borderRadius: 8,
    },
  },
  {
    id: 'product-launch',
    name: 'Lanzamiento de Producto',
    description: 'Ideal para presentar un nuevo producto o servicio',
    category: 'marketing',
    thumbnail: '/templates/product-launch.png',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          title: 'Presentamos [Nombre del Producto]',
          subtitle: 'La solucion que estabas esperando. Revoluciona tu manera de trabajar.',
          ctaText: 'Reservar Ahora',
          ctaUrl: '#cta',
          backgroundImage: '',
          alignment: 'center',
        },
        styles: {
          backgroundColor: '#1F2937',
          color: '#ffffff',
          padding: '100px 0',
        },
      },
      {
        id: 'video-1',
        type: 'video',
        content: {
          url: '',
          title: 'Mira como funciona',
          autoplay: false,
        },
        styles: { backgroundColor: '#ffffff', padding: '60px 0' },
      },
      {
        id: 'features-1',
        type: 'features',
        content: {
          title: 'Caracteristicas principales',
          columns: 3,
          items: [
            { icon: 'zap', title: 'Rapido', description: 'Resultados en tiempo real' },
            { icon: 'shield', title: 'Seguro', description: 'Tus datos protegidos' },
            { icon: 'trending-up', title: 'Escalable', description: 'Crece con tu negocio' },
          ],
        },
        styles: { backgroundColor: '#F9FAFB', padding: '60px 0' },
      },
      {
        id: 'testimonials-1',
        type: 'testimonials',
        content: {
          title: 'Lo que dicen nuestros clientes',
          items: [
            { quote: 'Increible producto', author: 'Cliente 1', role: 'CEO', company: 'Empresa 1' },
            { quote: 'Cambio nuestra forma de trabajar', author: 'Cliente 2', role: 'Director', company: 'Empresa 2' },
          ],
        },
        styles: { backgroundColor: '#ffffff', padding: '60px 0' },
      },
      {
        id: 'pricing-1',
        type: 'pricing',
        content: {
          title: 'Planes y precios',
          subtitle: 'Elige el plan que mejor se adapte a tus necesidades',
          plans: [
            { name: 'Basico', price: '$29', period: '/mes', features: ['5 usuarios', '10GB almacenamiento'], ctaText: 'Elegir', highlighted: false },
            { name: 'Pro', price: '$79', period: '/mes', features: ['25 usuarios', '100GB almacenamiento', 'Soporte prioritario'], ctaText: 'Elegir', highlighted: true },
            { name: 'Enterprise', price: 'Contactar', period: '', features: ['Usuarios ilimitados', 'Almacenamiento ilimitado', 'Soporte 24/7'], ctaText: 'Contactar', highlighted: false },
          ],
        },
        styles: { backgroundColor: '#F9FAFB', padding: '60px 0' },
      },
      {
        id: 'cta-1',
        type: 'cta',
        content: {
          title: 'Listo para empezar?',
          subtitle: 'Unete a miles de clientes satisfechos',
          ctaText: 'Comenzar Gratis',
          ctaUrl: '#',
        },
        styles: { backgroundColor: '#3B82F6', padding: '80px 0' },
      },
    ],
    globalStyles: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      backgroundColor: '#ffffff',
      textColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      containerWidth: 1200,
      borderRadius: 8,
    },
  },
  {
    id: 'webinar',
    name: 'Registro de Webinar',
    description: 'Pagina de registro para webinars y eventos online',
    category: 'events',
    thumbnail: '/templates/webinar.png',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          title: 'Webinar Gratuito',
          subtitle: 'Aprende [tema] con expertos de la industria',
          ctaText: 'Reservar mi lugar',
          ctaUrl: '#form',
          alignment: 'left',
        },
        styles: { backgroundColor: '#4F46E5', padding: '80px 0' },
      },
      {
        id: 'countdown-1',
        type: 'countdown',
        content: {
          title: 'El evento comienza en:',
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          expiredMessage: 'El evento ha comenzado',
        },
        styles: { backgroundColor: '#ffffff', padding: '40px 0' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Que aprenderas</h2><ul><li>Punto de aprendizaje 1</li><li>Punto de aprendizaje 2</li><li>Punto de aprendizaje 3</li></ul>',
        },
        styles: { backgroundColor: '#F9FAFB', padding: '60px 0' },
      },
      {
        id: 'team-1',
        type: 'team',
        content: {
          title: 'Conoce a los ponentes',
          members: [
            { name: 'Ponente 1', role: 'Experto en...', image: '', bio: 'Breve bio del ponente' },
          ],
        },
        styles: { backgroundColor: '#ffffff', padding: '60px 0' },
      },
      {
        id: 'form-1',
        type: 'form',
        content: {
          title: 'Registrate ahora',
          subtitle: 'Plazas limitadas - Asegura tu lugar',
          formId: null,
        },
        styles: { backgroundColor: '#4F46E5', padding: '60px 0' },
      },
    ],
    globalStyles: {
      primaryColor: '#4F46E5',
      secondaryColor: '#EC4899',
      backgroundColor: '#ffffff',
      textColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      containerWidth: 1000,
      borderRadius: 12,
    },
  },
  {
    id: 'saas',
    name: 'SaaS / Aplicacion',
    description: 'Ideal para presentar aplicaciones y software',
    category: 'technology',
    thumbnail: '/templates/saas.png',
    sections: [
      {
        id: 'header-1',
        type: 'header',
        content: {
          logo: '',
          menuItems: [
            { label: 'Caracteristicas', url: '#features' },
            { label: 'Precios', url: '#pricing' },
            { label: 'FAQ', url: '#faq' },
          ],
          ctaText: 'Prueba Gratis',
          ctaUrl: '#cta',
          sticky: true,
        },
        styles: { backgroundColor: '#ffffff', padding: '16px 0' },
      },
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          title: 'Simplifica tu trabajo con [App]',
          subtitle: 'La herramienta todo-en-uno que tu equipo necesita para ser mas productivo',
          ctaText: 'Comenzar Gratis',
          ctaUrl: '#',
          secondaryCtaText: 'Ver Demo',
          secondaryCtaUrl: '#video',
          alignment: 'center',
        },
        styles: { backgroundColor: '#F0FDF4', padding: '100px 0' },
      },
      {
        id: 'features-1',
        type: 'features',
        content: {
          title: 'Todo lo que necesitas',
          subtitle: 'Potentes funcionalidades para impulsar tu productividad',
          columns: 3,
          items: [
            { icon: 'layout', title: 'Dashboard intuitivo', description: 'Visualiza todo en un solo lugar' },
            { icon: 'users', title: 'Colaboracion', description: 'Trabaja en equipo sin fricciones' },
            { icon: 'bar-chart', title: 'Reportes', description: 'Datos que impulsan decisiones' },
            { icon: 'clock', title: 'Automatizacion', description: 'Ahorra tiempo en tareas repetitivas' },
            { icon: 'lock', title: 'Seguridad', description: 'Tus datos siempre protegidos' },
            { icon: 'globe', title: 'Integraciones', description: 'Conecta con tus herramientas favoritas' },
          ],
        },
        styles: { backgroundColor: '#ffffff', padding: '80px 0' },
      },
      {
        id: 'stats-1',
        type: 'stats',
        content: {
          items: [
            { value: '10K+', label: 'Usuarios activos' },
            { value: '99.9%', label: 'Uptime garantizado' },
            { value: '50+', label: 'Integraciones' },
            { value: '24/7', label: 'Soporte' },
          ],
        },
        styles: { backgroundColor: '#10B981', padding: '60px 0' },
      },
      {
        id: 'pricing-1',
        type: 'pricing',
        content: {
          title: 'Precios simples y transparentes',
          subtitle: 'Sin sorpresas ni costos ocultos',
          plans: [
            { name: 'Starter', price: 'Gratis', period: '', features: ['3 proyectos', '1 usuario', 'Soporte por email'], ctaText: 'Empezar', highlighted: false },
            { name: 'Team', price: '$15', period: '/usuario/mes', features: ['Proyectos ilimitados', 'Hasta 10 usuarios', 'Soporte prioritario', 'Integraciones'], ctaText: 'Probar gratis', highlighted: true },
            { name: 'Business', price: '$35', period: '/usuario/mes', features: ['Todo de Team', 'SSO', 'API access', 'SLA garantizado'], ctaText: 'Contactar ventas', highlighted: false },
          ],
        },
        styles: { backgroundColor: '#F9FAFB', padding: '80px 0' },
      },
      {
        id: 'faq-1',
        type: 'faq',
        content: {
          title: 'Preguntas frecuentes',
          items: [
            { question: 'Como empiezo?', answer: 'Registrate gratis y tendras acceso inmediato...' },
            { question: 'Puedo cancelar en cualquier momento?', answer: 'Si, puedes cancelar tu suscripcion cuando quieras...' },
            { question: 'Ofrecen soporte en espanol?', answer: 'Si, nuestro equipo de soporte habla espanol...' },
          ],
        },
        styles: { backgroundColor: '#ffffff', padding: '80px 0' },
      },
      {
        id: 'cta-1',
        type: 'cta',
        content: {
          title: 'Listo para transformar tu productividad?',
          subtitle: 'Unete a miles de equipos que ya usan [App]',
          ctaText: 'Comenzar Gratis',
          ctaUrl: '#',
        },
        styles: { backgroundColor: '#10B981', padding: '80px 0' },
      },
      {
        id: 'footer-1',
        type: 'footer',
        content: {
          companyName: '[App]',
          links: [
            { label: 'Producto', url: '#' },
            { label: 'Precios', url: '#pricing' },
            { label: 'Blog', url: '#' },
            { label: 'Contacto', url: '#' },
          ],
          copyright: '2024 [App]. Todos los derechos reservados.',
        },
        styles: { backgroundColor: '#1F2937', padding: '60px 0' },
      },
    ],
    globalStyles: {
      primaryColor: '#10B981',
      secondaryColor: '#3B82F6',
      backgroundColor: '#ffffff',
      textColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      containerWidth: 1200,
      borderRadius: 8,
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

    let templates = LANDING_PAGE_TEMPLATES;

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    // Return templates without full section content for listing
    const templatesForList = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      thumbnail: t.thumbnail,
      sectionCount: t.sections.length,
    }));

    return NextResponse.json({
      templates: templatesForList,
      categories: [
        { id: 'basic', name: 'Basico' },
        { id: 'marketing', name: 'Marketing' },
        { id: 'events', name: 'Eventos' },
        { id: 'technology', name: 'Tecnologia' },
      ],
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener templates' },
      { status: 500 }
    );
  }
}

// POST - Get full template data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId es requerido' },
        { status: 400 }
      );
    }

    const template = LANDING_PAGE_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    // Generate unique IDs for sections
    const sectionsWithNewIds = template.sections.map((section) => ({
      ...section,
      id: `${section.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    return NextResponse.json({
      ...template,
      sections: sectionsWithNewIds,
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener template' },
      { status: 500 }
    );
  }
}
