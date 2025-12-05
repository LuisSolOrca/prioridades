import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPageTemplate from '@/models/LandingPageTemplate';
import { v4 as uuidv4 } from 'uuid';

// Predefined system templates
const SYSTEM_TEMPLATES = [
  {
    slug: 'lead-generation-simple',
    name: 'Captura de Leads - Simple',
    description: 'Landing page minimalista para capturar leads con formulario prominente',
    category: 'lead_generation',
    tags: ['leads', 'formulario', 'simple', 'conversión'],
    content: {
      globalStyles: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 8,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'header',
          content: {
            logo: '',
            logoText: 'Tu Empresa',
            menuItems: [],
            ctaButton: { text: 'Comenzar', url: '#form' },
            sticky: true,
          },
        },
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Transforma tu negocio con nuestra solución',
            subheadline: 'Únete a miles de empresas que ya están creciendo con nosotros. Obtén acceso gratuito hoy.',
            ctaText: 'Obtener acceso gratuito',
            ctaUrl: '#form',
            secondaryCtaText: 'Ver demostración',
            secondaryCtaUrl: '#video',
            backgroundImage: '',
            layout: 'centered',
          },
        },
        {
          id: uuidv4(),
          type: 'logos',
          content: {
            title: 'Empresas que confían en nosotros',
            logos: [
              { name: 'Empresa 1', url: '' },
              { name: 'Empresa 2', url: '' },
              { name: 'Empresa 3', url: '' },
              { name: 'Empresa 4', url: '' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'benefits',
          content: {
            title: '¿Por qué elegirnos?',
            subtitle: 'Beneficios que marcan la diferencia',
            items: [
              { icon: 'Zap', title: 'Rápido', description: 'Implementación en minutos, no en semanas' },
              { icon: 'Shield', title: 'Seguro', description: 'Tus datos protegidos con encriptación de grado bancario' },
              { icon: 'TrendingUp', title: 'Escalable', description: 'Crece sin límites a medida que tu negocio crece' },
              { icon: 'HeadphonesIcon', title: 'Soporte 24/7', description: 'Equipo experto disponible cuando lo necesites' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'form',
          content: {
            title: 'Comienza ahora - Es gratis',
            subtitle: 'Completa el formulario y te contactaremos en menos de 24 horas',
            fields: [
              { name: 'name', label: 'Nombre completo', type: 'text', required: true },
              { name: 'email', label: 'Email corporativo', type: 'email', required: true },
              { name: 'company', label: 'Empresa', type: 'text', required: true },
              { name: 'phone', label: 'Teléfono', type: 'tel', required: false },
            ],
            submitText: 'Solicitar acceso',
            privacyText: 'Al enviar, aceptas nuestra política de privacidad',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Tu Empresa',
            copyright: '© 2024 Tu Empresa. Todos los derechos reservados.',
            links: [
              { text: 'Privacidad', url: '/privacidad' },
              { text: 'Términos', url: '/terminos' },
            ],
          },
        },
      ],
    },
  },
  {
    slug: 'product-launch',
    name: 'Lanzamiento de Producto',
    description: 'Landing page para lanzamiento de productos con cuenta regresiva y lista de espera',
    category: 'product_launch',
    tags: ['producto', 'lanzamiento', 'countdown', 'waitlist'],
    content: {
      globalStyles: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
        backgroundColor: '#0F172A',
        textColor: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 12,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Algo increíble está por llegar',
            subheadline: 'Prepárate para revolucionar la forma en que trabajas. Sé el primero en conocerlo.',
            ctaText: 'Unirme a la lista de espera',
            ctaUrl: '#waitlist',
            backgroundImage: '',
            layout: 'centered',
          },
          styles: {
            minHeight: '70vh',
          },
        },
        {
          id: uuidv4(),
          type: 'countdown',
          content: {
            title: 'El lanzamiento comienza en',
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            labels: {
              days: 'Días',
              hours: 'Horas',
              minutes: 'Minutos',
              seconds: 'Segundos',
            },
          },
        },
        {
          id: uuidv4(),
          type: 'features',
          content: {
            title: 'Lo que viene incluido',
            subtitle: 'Un vistazo a las características principales',
            items: [
              { icon: 'Sparkles', title: 'IA Integrada', description: 'Potenciado por inteligencia artificial de última generación' },
              { icon: 'Layers', title: 'Todo en uno', description: 'Una sola plataforma para todas tus necesidades' },
              { icon: 'Smartphone', title: 'Móvil primero', description: 'Diseñado para funcionar perfectamente en cualquier dispositivo' },
              { icon: 'Lock', title: 'Privacidad total', description: 'Tus datos nunca serán compartidos ni vendidos' },
            ],
            layout: 'grid',
          },
        },
        {
          id: uuidv4(),
          type: 'form',
          content: {
            title: 'Únete a la lista de espera',
            subtitle: 'Sé de los primeros en acceder y obtén 50% de descuento',
            fields: [
              { name: 'email', label: 'Tu mejor email', type: 'email', required: true, placeholder: 'nombre@empresa.com' },
            ],
            submitText: 'Reservar mi lugar',
            privacyText: 'No spam. Solo actualizaciones importantes del lanzamiento.',
          },
        },
        {
          id: uuidv4(),
          type: 'stats',
          content: {
            items: [
              { value: '10,000+', label: 'En lista de espera' },
              { value: '50%', label: 'Descuento early bird' },
              { value: '30', label: 'Días para el lanzamiento' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Tu Producto',
            copyright: '© 2024. Todos los derechos reservados.',
            socialLinks: [],
          },
        },
      ],
    },
  },
  {
    slug: 'webinar-event',
    name: 'Webinar / Evento',
    description: 'Landing page para promocionar webinars, conferencias o eventos online',
    category: 'webinar_event',
    tags: ['webinar', 'evento', 'conferencia', 'registro'],
    content: {
      globalStyles: {
        primaryColor: '#0EA5E9',
        secondaryColor: '#F97316',
        backgroundColor: '#ffffff',
        textColor: '#1E293B',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 8,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Webinar Gratuito: Domina el Marketing Digital en 2024',
            subheadline: 'Aprende las estrategias que están usando las empresas más exitosas. Miércoles 15 de Enero, 10:00 AM (CDMX)',
            ctaText: 'Reservar mi lugar gratis',
            ctaUrl: '#registro',
            backgroundImage: '',
            layout: 'split',
            image: '',
          },
        },
        {
          id: uuidv4(),
          type: 'countdown',
          content: {
            title: 'El evento comienza en',
            targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        {
          id: uuidv4(),
          type: 'text',
          content: {
            title: '¿Qué aprenderás?',
            body: 'En este webinar exclusivo de 90 minutos, descubrirás las técnicas más efectivas para aumentar tus conversiones, optimizar tu presupuesto publicitario y escalar tu negocio de forma sostenible.',
          },
        },
        {
          id: uuidv4(),
          type: 'benefits',
          content: {
            title: 'Agenda del evento',
            items: [
              { icon: 'Target', title: 'Estrategias de segmentación', description: 'Cómo llegar a tu audiencia ideal sin desperdiciar presupuesto' },
              { icon: 'TrendingUp', title: 'Optimización de conversiones', description: 'Técnicas probadas para multiplicar tus resultados' },
              { icon: 'DollarSign', title: 'ROI y métricas clave', description: 'Qué medir y cómo interpretar tus datos' },
              { icon: 'Gift', title: 'Bonus: Plantillas gratis', description: 'Templates de campañas que podrás usar inmediatamente' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'team',
          content: {
            title: 'Tu presentador',
            members: [
              {
                name: 'Juan Pérez',
                role: 'Director de Marketing',
                bio: '15+ años de experiencia en marketing digital. Ha trabajado con empresas Fortune 500.',
                image: '',
                social: { linkedin: '#' },
              },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'form',
          content: {
            title: 'Regístrate ahora - Cupos limitados',
            subtitle: 'Solo 100 lugares disponibles. Asegura el tuyo.',
            fields: [
              { name: 'name', label: 'Nombre completo', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'company', label: 'Empresa', type: 'text', required: false },
            ],
            submitText: 'Registrarme gratis',
            privacyText: 'Recibirás el enlace de acceso en tu email.',
          },
        },
        {
          id: uuidv4(),
          type: 'faq',
          content: {
            title: 'Preguntas frecuentes',
            items: [
              { question: '¿El webinar es gratuito?', answer: 'Sí, el webinar es completamente gratuito. Solo necesitas registrarte.' },
              { question: '¿Habrá grabación disponible?', answer: 'Sí, todos los registrados recibirán la grabación por email.' },
              { question: '¿Puedo hacer preguntas durante el evento?', answer: 'Por supuesto, habrá una sesión de Q&A al final del webinar.' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Marketing Academy',
            copyright: '© 2024. Todos los derechos reservados.',
          },
        },
      ],
    },
  },
  {
    slug: 'saas-software',
    name: 'SaaS / Software',
    description: 'Landing page completa para productos de software con pricing y features',
    category: 'saas_software',
    tags: ['saas', 'software', 'pricing', 'features', 'demo'],
    content: {
      globalStyles: {
        primaryColor: '#6366F1',
        secondaryColor: '#22D3EE',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 12,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'header',
          content: {
            logo: '',
            logoText: 'AppName',
            menuItems: [
              { text: 'Características', url: '#features' },
              { text: 'Precios', url: '#pricing' },
              { text: 'Testimonios', url: '#testimonials' },
            ],
            ctaButton: { text: 'Prueba gratis', url: '#signup' },
            sticky: true,
          },
        },
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'La herramienta que tu equipo necesita para ser más productivo',
            subheadline: 'Simplifica tus procesos, automatiza tareas repetitivas y enfócate en lo que realmente importa.',
            ctaText: 'Comenzar prueba gratuita',
            ctaUrl: '#signup',
            secondaryCtaText: 'Ver demo',
            secondaryCtaUrl: '#demo',
            layout: 'split',
            image: '',
          },
        },
        {
          id: uuidv4(),
          type: 'logos',
          content: {
            title: 'Usado por equipos en empresas líderes',
            logos: [],
          },
        },
        {
          id: uuidv4(),
          type: 'video',
          content: {
            title: 'Mira cómo funciona',
            videoUrl: '',
            thumbnail: '',
            autoplay: false,
          },
        },
        {
          id: uuidv4(),
          type: 'features',
          content: {
            title: 'Todo lo que necesitas en un solo lugar',
            subtitle: 'Características diseñadas para equipos modernos',
            items: [
              { icon: 'LayoutDashboard', title: 'Dashboard intuitivo', description: 'Visualiza toda tu información en un panel centralizado' },
              { icon: 'Users', title: 'Colaboración en tiempo real', description: 'Trabaja con tu equipo sin fricciones' },
              { icon: 'Zap', title: 'Automatizaciones', description: 'Crea flujos de trabajo que ahorran horas cada semana' },
              { icon: 'BarChart', title: 'Reportes avanzados', description: 'Toma decisiones basadas en datos precisos' },
              { icon: 'Plug', title: 'Integraciones', description: 'Conecta con las herramientas que ya usas' },
              { icon: 'Shield', title: 'Seguridad empresarial', description: 'SOC 2 Type II, encriptación end-to-end' },
            ],
            layout: 'grid',
          },
        },
        {
          id: uuidv4(),
          type: 'stats',
          content: {
            title: 'Resultados que hablan por sí solos',
            items: [
              { value: '50%', label: 'Ahorro de tiempo' },
              { value: '10,000+', label: 'Equipos activos' },
              { value: '99.9%', label: 'Uptime garantizado' },
              { value: '4.9/5', label: 'Satisfacción' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'testimonials',
          content: {
            title: 'Lo que dicen nuestros clientes',
            items: [
              {
                quote: 'Esta herramienta transformó completamente la forma en que trabajamos. Nuestro equipo es 3x más productivo.',
                author: 'María García',
                role: 'CEO en TechStartup',
                image: '',
                rating: 5,
              },
              {
                quote: 'La mejor inversión que hemos hecho este año. El ROI fue evidente desde el primer mes.',
                author: 'Carlos López',
                role: 'Director de Operaciones',
                image: '',
                rating: 5,
              },
              {
                quote: 'Excelente soporte y actualizaciones constantes. Se nota que escuchan a sus usuarios.',
                author: 'Ana Martínez',
                role: 'Product Manager',
                image: '',
                rating: 5,
              },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'pricing',
          content: {
            title: 'Planes para cada etapa de tu negocio',
            subtitle: 'Comienza gratis, escala cuando lo necesites',
            plans: [
              {
                name: 'Starter',
                price: 'Gratis',
                period: 'siempre',
                description: 'Perfecto para empezar',
                features: ['Hasta 5 usuarios', '1,000 tareas/mes', 'Integraciones básicas', 'Soporte por email'],
                ctaText: 'Comenzar gratis',
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/mes',
                description: 'Para equipos en crecimiento',
                features: ['Usuarios ilimitados', 'Tareas ilimitadas', 'Todas las integraciones', 'Automatizaciones', 'Soporte prioritario', 'Analytics avanzado'],
                ctaText: 'Iniciar prueba',
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'Para grandes organizaciones',
                features: ['Todo en Pro', 'SSO/SAML', 'SLA garantizado', 'Onboarding dedicado', 'Gerente de cuenta', 'API personalizada'],
                ctaText: 'Contactar ventas',
                highlighted: false,
              },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'faq',
          content: {
            title: 'Preguntas frecuentes',
            items: [
              { question: '¿Puedo cancelar en cualquier momento?', answer: 'Sí, puedes cancelar tu suscripción cuando quieras sin penalización.' },
              { question: '¿Ofrecen descuentos para equipos grandes?', answer: 'Sí, contáctanos para obtener precios especiales para organizaciones con más de 50 usuarios.' },
              { question: '¿Mis datos están seguros?', answer: 'Absolutamente. Contamos con certificación SOC 2 Type II y encriptación end-to-end.' },
              { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos todas las tarjetas de crédito principales, PayPal y transferencia bancaria para planes anuales.' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'cta',
          content: {
            title: '¿Listo para comenzar?',
            subtitle: 'Únete a miles de equipos que ya están trabajando de forma más inteligente.',
            ctaText: 'Iniciar prueba gratuita',
            ctaUrl: '#signup',
            secondaryText: '14 días gratis. Sin tarjeta de crédito.',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'AppName',
            copyright: '© 2024 AppName, Inc. Todos los derechos reservados.',
            links: [
              { text: 'Producto', url: '#' },
              { text: 'Precios', url: '#' },
              { text: 'Blog', url: '#' },
              { text: 'Privacidad', url: '#' },
              { text: 'Términos', url: '#' },
            ],
            socialLinks: [
              { platform: 'twitter', url: '#' },
              { platform: 'linkedin', url: '#' },
            ],
          },
        },
      ],
    },
  },
  {
    slug: 'ecommerce-promo',
    name: 'E-commerce / Promoción',
    description: 'Landing page para promociones, ofertas especiales y ventas de productos',
    category: 'ecommerce_promo',
    tags: ['ecommerce', 'promoción', 'venta', 'oferta', 'descuento'],
    content: {
      globalStyles: {
        primaryColor: '#DC2626',
        secondaryColor: '#FBBF24',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 8,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: '🔥 Oferta Especial: Hasta 50% de Descuento',
            subheadline: 'Solo por tiempo limitado. No te quedes sin tu favorito.',
            ctaText: 'Ver productos en oferta',
            ctaUrl: '#productos',
            backgroundImage: '',
            layout: 'centered',
          },
          styles: {
            backgroundColor: '#FEF3C7',
          },
        },
        {
          id: uuidv4(),
          type: 'countdown',
          content: {
            title: 'La oferta termina en',
            targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        {
          id: uuidv4(),
          type: 'comparison',
          content: {
            title: 'Productos destacados',
            items: [
              {
                name: 'Producto Premium',
                image: '',
                originalPrice: '$199',
                salePrice: '$99',
                discount: '50% OFF',
                features: ['Característica 1', 'Característica 2', 'Característica 3'],
                ctaText: 'Comprar ahora',
                ctaUrl: '#',
              },
              {
                name: 'Producto Básico',
                image: '',
                originalPrice: '$79',
                salePrice: '$49',
                discount: '38% OFF',
                features: ['Característica 1', 'Característica 2'],
                ctaText: 'Comprar ahora',
                ctaUrl: '#',
              },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'benefits',
          content: {
            title: '¿Por qué comprar con nosotros?',
            items: [
              { icon: 'Truck', title: 'Envío gratis', description: 'En compras mayores a $500' },
              { icon: 'RefreshCw', title: '30 días de garantía', description: 'Devolución sin preguntas' },
              { icon: 'CreditCard', title: 'Pago seguro', description: 'Encriptación SSL' },
              { icon: 'HeadphonesIcon', title: 'Soporte dedicado', description: 'Ayuda cuando la necesites' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'testimonials',
          content: {
            title: 'Lo que dicen nuestros clientes',
            items: [
              { quote: 'Excelente calidad y el envío fue súper rápido!', author: 'Laura M.', rating: 5 },
              { quote: 'Mejor precio que en otras tiendas. 100% recomendado.', author: 'Roberto G.', rating: 5 },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'cta',
          content: {
            title: '¡No esperes más!',
            subtitle: 'Aprovecha esta oferta antes de que termine.',
            ctaText: 'Comprar ahora con 50% OFF',
            ctaUrl: '#productos',
          },
          styles: {
            backgroundColor: '#DC2626',
            textColor: '#ffffff',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Tu Tienda',
            copyright: '© 2024. Todos los derechos reservados.',
            links: [
              { text: 'Contacto', url: '#' },
              { text: 'Envíos', url: '#' },
              { text: 'Devoluciones', url: '#' },
            ],
          },
        },
      ],
    },
  },
  {
    slug: 'coming-soon',
    name: 'Coming Soon / Próximamente',
    description: 'Página de próximamente para recolectar emails antes del lanzamiento',
    category: 'coming_soon',
    tags: ['coming soon', 'próximamente', 'pre-lanzamiento', 'waitlist'],
    content: {
      globalStyles: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#F472B6',
        backgroundColor: '#1E1B4B',
        textColor: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 800,
        borderRadius: 16,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Algo grande está por venir',
            subheadline: 'Estamos trabajando en algo especial. Sé el primero en enterarte.',
            ctaText: '',
            layout: 'centered',
          },
          styles: {
            minHeight: '50vh',
          },
        },
        {
          id: uuidv4(),
          type: 'countdown',
          content: {
            title: 'Lanzamiento en',
            targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        {
          id: uuidv4(),
          type: 'form',
          content: {
            title: 'Sé el primero en saberlo',
            subtitle: 'Déjanos tu email y te avisaremos cuando lancemos.',
            fields: [
              { name: 'email', label: '', type: 'email', required: true, placeholder: 'Tu email' },
            ],
            submitText: 'Notificarme',
            privacyText: 'Prometemos no enviar spam.',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: '',
            socialLinks: [
              { platform: 'twitter', url: '#' },
              { platform: 'instagram', url: '#' },
            ],
          },
        },
      ],
    },
  },
  {
    slug: 'thank-you',
    name: 'Página de Gracias',
    description: 'Página de confirmación después de un registro o compra',
    category: 'thank_you',
    tags: ['gracias', 'confirmación', 'éxito', 'post-conversión'],
    content: {
      globalStyles: {
        primaryColor: '#10B981',
        secondaryColor: '#3B82F6',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 800,
        borderRadius: 8,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: '¡Gracias por registrarte! 🎉',
            subheadline: 'Hemos recibido tu información. Revisa tu email para los próximos pasos.',
            ctaText: 'Volver al inicio',
            ctaUrl: '/',
            layout: 'centered',
          },
        },
        {
          id: uuidv4(),
          type: 'text',
          content: {
            title: '¿Qué sigue?',
            body: '<ol><li><strong>Revisa tu bandeja de entrada</strong> - Te enviamos un email de confirmación.</li><li><strong>Verifica tu cuenta</strong> - Haz clic en el enlace del email.</li><li><strong>Comienza a explorar</strong> - Accede a todas las funcionalidades.</li></ol>',
          },
        },
        {
          id: uuidv4(),
          type: 'cta',
          content: {
            title: '¿Tienes alguna pregunta?',
            subtitle: 'Nuestro equipo está aquí para ayudarte.',
            ctaText: 'Contactar soporte',
            ctaUrl: '/contacto',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Tu Empresa',
            copyright: '© 2024. Todos los derechos reservados.',
          },
        },
      ],
    },
  },
  {
    slug: 'app-download',
    name: 'Descarga de App',
    description: 'Landing page para promover la descarga de aplicaciones móviles',
    category: 'app_download',
    tags: ['app', 'móvil', 'descarga', 'ios', 'android'],
    content: {
      globalStyles: {
        primaryColor: '#0EA5E9',
        secondaryColor: '#8B5CF6',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 24,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Todo lo que necesitas, en tu bolsillo',
            subheadline: 'Descarga nuestra app y lleva tu experiencia al siguiente nivel. Disponible en iOS y Android.',
            ctaText: 'Descargar ahora',
            ctaUrl: '#download',
            layout: 'split',
            image: '',
          },
        },
        {
          id: uuidv4(),
          type: 'stats',
          content: {
            items: [
              { value: '4.9★', label: 'App Store' },
              { value: '1M+', label: 'Descargas' },
              { value: '4.8★', label: 'Google Play' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'features',
          content: {
            title: 'Funcionalidades que amarás',
            items: [
              { icon: 'Zap', title: 'Ultra rápida', description: 'Carga instantánea y respuesta inmediata' },
              { icon: 'Bell', title: 'Notificaciones inteligentes', description: 'Solo lo que realmente importa' },
              { icon: 'Moon', title: 'Modo oscuro', description: 'Cuida tus ojos en cualquier momento' },
              { icon: 'Wifi', title: 'Funciona offline', description: 'Accede incluso sin conexión' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'gallery',
          content: {
            title: 'Capturas de pantalla',
            images: [],
          },
        },
        {
          id: uuidv4(),
          type: 'testimonials',
          content: {
            title: 'Reseñas de usuarios',
            items: [
              { quote: 'La mejor app de su categoría. La uso todos los días.', author: 'Usuario verificado', rating: 5 },
              { quote: 'Interfaz hermosa y súper intuitiva.', author: 'Usuario verificado', rating: 5 },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'cta',
          content: {
            title: 'Descarga gratis',
            subtitle: 'Disponible en App Store y Google Play',
            ctaText: 'App Store',
            ctaUrl: '#',
            secondaryCtaText: 'Google Play',
            secondaryCtaUrl: '#',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'App Name',
            copyright: '© 2024. Todos los derechos reservados.',
            links: [
              { text: 'Privacidad', url: '#' },
              { text: 'Términos', url: '#' },
            ],
          },
        },
      ],
    },
  },
  {
    slug: 'service-business',
    name: 'Negocio de Servicios',
    description: 'Landing page para negocios de servicios profesionales (consultorías, agencias, etc.)',
    category: 'service_business',
    tags: ['servicios', 'consultoría', 'agencia', 'profesional'],
    content: {
      globalStyles: {
        primaryColor: '#1E40AF',
        secondaryColor: '#059669',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 8,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'header',
          content: {
            logo: '',
            logoText: 'Tu Consultoría',
            menuItems: [
              { text: 'Servicios', url: '#servicios' },
              { text: 'Nosotros', url: '#equipo' },
              { text: 'Casos de éxito', url: '#testimonios' },
            ],
            ctaButton: { text: 'Agendar consulta', url: '#contacto' },
          },
        },
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Llevamos tu negocio al siguiente nivel',
            subheadline: 'Consultoría estratégica personalizada para empresas que buscan crecer de forma sostenible.',
            ctaText: 'Agendar consulta gratuita',
            ctaUrl: '#contacto',
            secondaryCtaText: 'Ver casos de éxito',
            secondaryCtaUrl: '#testimonios',
            layout: 'split',
          },
        },
        {
          id: uuidv4(),
          type: 'logos',
          content: {
            title: 'Clientes que confían en nosotros',
            logos: [],
          },
        },
        {
          id: uuidv4(),
          type: 'features',
          content: {
            title: 'Nuestros servicios',
            items: [
              { icon: 'Target', title: 'Estrategia de negocio', description: 'Definimos juntos el camino hacia tus objetivos' },
              { icon: 'TrendingUp', title: 'Optimización de procesos', description: 'Identificamos y eliminamos ineficiencias' },
              { icon: 'Users', title: 'Desarrollo de equipos', description: 'Capacitación y mentorías para tu equipo' },
              { icon: 'BarChart', title: 'Análisis de datos', description: 'Decisiones basadas en información real' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'stats',
          content: {
            items: [
              { value: '200+', label: 'Proyectos completados' },
              { value: '95%', label: 'Clientes satisfechos' },
              { value: '15+', label: 'Años de experiencia' },
              { value: '50M+', label: 'ROI generado' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'team',
          content: {
            title: 'Conoce a nuestro equipo',
            members: [
              { name: 'Director General', role: 'CEO & Fundador', bio: '20+ años de experiencia en consultoría empresarial.', image: '' },
              { name: 'Directora de Estrategia', role: 'CSO', bio: 'Experta en transformación digital y growth.', image: '' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'testimonials',
          content: {
            title: 'Lo que dicen nuestros clientes',
            items: [
              { quote: 'Gracias a su consultoría, duplicamos nuestros ingresos en 12 meses.', author: 'CEO, Empresa Tech', rating: 5 },
              { quote: 'Profesionalismo excepcional. Altamente recomendados.', author: 'Director, Manufactura', rating: 5 },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'form',
          content: {
            title: 'Agenda tu consulta gratuita',
            subtitle: 'Sin compromiso. Cuéntanos sobre tu proyecto.',
            fields: [
              { name: 'name', label: 'Nombre', type: 'text', required: true },
              { name: 'email', label: 'Email corporativo', type: 'email', required: true },
              { name: 'company', label: 'Empresa', type: 'text', required: true },
              { name: 'message', label: '¿Cómo podemos ayudarte?', type: 'textarea', required: true },
            ],
            submitText: 'Solicitar consulta',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Tu Consultoría',
            copyright: '© 2024. Todos los derechos reservados.',
            links: [
              { text: 'Privacidad', url: '#' },
              { text: 'Términos', url: '#' },
            ],
          },
        },
      ],
    },
  },
  {
    slug: 'portfolio-simple',
    name: 'Portfolio / Portafolio',
    description: 'Landing page para mostrar trabajos, proyectos o portfolio profesional',
    category: 'portfolio',
    tags: ['portfolio', 'trabajos', 'proyectos', 'freelance'],
    content: {
      globalStyles: {
        primaryColor: '#000000',
        secondaryColor: '#6B7280',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        containerWidth: 1200,
        borderRadius: 0,
      },
      sections: [
        {
          id: uuidv4(),
          type: 'hero',
          content: {
            headline: 'Diseñador & Desarrollador',
            subheadline: 'Creo experiencias digitales que conectan marcas con personas.',
            ctaText: 'Ver mi trabajo',
            ctaUrl: '#portfolio',
            layout: 'centered',
          },
          styles: {
            minHeight: '80vh',
          },
        },
        {
          id: uuidv4(),
          type: 'gallery',
          content: {
            title: 'Proyectos destacados',
            images: [],
            layout: 'masonry',
          },
        },
        {
          id: uuidv4(),
          type: 'features',
          content: {
            title: 'Servicios',
            items: [
              { icon: 'Palette', title: 'Diseño UI/UX', description: 'Interfaces intuitivas y atractivas' },
              { icon: 'Code', title: 'Desarrollo web', description: 'Sitios rápidos y responsivos' },
              { icon: 'Smartphone', title: 'Apps móviles', description: 'iOS y Android' },
              { icon: 'Lightbulb', title: 'Consultoría', description: 'Estrategia digital' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'testimonials',
          content: {
            title: 'Testimonios',
            items: [
              { quote: 'Trabajo excepcional. Entregó más de lo esperado.', author: 'Cliente', rating: 5 },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'form',
          content: {
            title: 'Trabajemos juntos',
            subtitle: 'Cuéntame sobre tu proyecto.',
            fields: [
              { name: 'name', label: 'Nombre', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'message', label: 'Mensaje', type: 'textarea', required: true },
            ],
            submitText: 'Enviar mensaje',
          },
        },
        {
          id: uuidv4(),
          type: 'footer',
          content: {
            companyName: 'Tu Nombre',
            socialLinks: [
              { platform: 'linkedin', url: '#' },
              { platform: 'twitter', url: '#' },
              { platform: 'dribbble', url: '#' },
            ],
          },
        },
      ],
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeSystem = searchParams.get('includeSystem') !== 'false';

    // Build query
    const query: any = { isActive: true };
    if (category) {
      query.category = category;
    }

    // Get custom templates from database
    const customTemplates = await LandingPageTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    // Filter system templates by category if needed
    let systemTemplates = SYSTEM_TEMPLATES;
    if (category) {
      systemTemplates = systemTemplates.filter(t => t.category === category);
    }

    // Combine templates
    const allTemplates = includeSystem
      ? [...systemTemplates.map(t => ({ ...t, isSystem: true })), ...customTemplates]
      : customTemplates;

    // Get categories with counts
    const categories = [
      { value: 'lead_generation', label: 'Captura de Leads', count: SYSTEM_TEMPLATES.filter(t => t.category === 'lead_generation').length },
      { value: 'product_launch', label: 'Lanzamiento de Producto', count: SYSTEM_TEMPLATES.filter(t => t.category === 'product_launch').length },
      { value: 'webinar_event', label: 'Webinar / Evento', count: SYSTEM_TEMPLATES.filter(t => t.category === 'webinar_event').length },
      { value: 'saas_software', label: 'SaaS / Software', count: SYSTEM_TEMPLATES.filter(t => t.category === 'saas_software').length },
      { value: 'ecommerce_promo', label: 'E-commerce / Promoción', count: SYSTEM_TEMPLATES.filter(t => t.category === 'ecommerce_promo').length },
      { value: 'coming_soon', label: 'Próximamente', count: SYSTEM_TEMPLATES.filter(t => t.category === 'coming_soon').length },
      { value: 'thank_you', label: 'Página de Gracias', count: SYSTEM_TEMPLATES.filter(t => t.category === 'thank_you').length },
      { value: 'app_download', label: 'Descarga de App', count: SYSTEM_TEMPLATES.filter(t => t.category === 'app_download').length },
      { value: 'service_business', label: 'Servicios Profesionales', count: SYSTEM_TEMPLATES.filter(t => t.category === 'service_business').length },
      { value: 'portfolio', label: 'Portfolio', count: SYSTEM_TEMPLATES.filter(t => t.category === 'portfolio').length },
    ];

    return NextResponse.json({
      templates: allTemplates,
      categories,
      total: allTemplates.length,
    });
  } catch (error: any) {
    console.error('Error fetching landing templates:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener templates' },
      { status: 500 }
    );
  }
}

// POST - Create custom template or get system template by slug
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, action } = body;

    // If getting a system template by slug
    if (action === 'get' && slug) {
      const systemTemplate = SYSTEM_TEMPLATES.find(t => t.slug === slug);
      if (systemTemplate) {
        return NextResponse.json({
          template: { ...systemTemplate, isSystem: true },
        });
      }

      // Check database for custom template
      await connectDB();
      const customTemplate = await LandingPageTemplate.findOne({ slug }).lean();
      if (customTemplate) {
        return NextResponse.json({ template: customTemplate });
      }

      return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
    }

    // Creating a new custom template
    const user = session.user as any;
    if (!user.permissions?.canManageCampaigns && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    await connectDB();

    const { name, description, category, content, tags } = body;

    const newTemplate = new LandingPageTemplate({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description,
      category,
      content,
      tags: tags || [],
      isSystem: false,
      createdBy: user.id,
    });

    await newTemplate.save();

    return NextResponse.json({
      success: true,
      template: newTemplate,
    });
  } catch (error: any) {
    console.error('Error with landing template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar template' },
      { status: 500 }
    );
  }
}
