import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Templates predefinidos de workflows
const WORKFLOW_TEMPLATES = [
  {
    id: 'deal_won_notification',
    name: 'Notificación de Deal Ganado',
    description: 'Envía notificación y email cuando un deal es marcado como ganado',
    category: 'deals',
    trigger: {
      type: 'deal_won',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'admin',
          message: '🎉 ¡Deal ganado! {{deal.title}} por ${{deal.value}}',
          priority: 'high',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'send_email',
        config: {
          to: 'owner',
          subject: '¡Felicitaciones! Deal ganado: {{deal.title}}',
          body: 'Felicitaciones por cerrar el deal "{{deal.title}}" por un valor de ${{deal.value}}.',
        },
        order: 1,
      },
      {
        id: 'action_3',
        type: 'create_task',
        config: {
          taskTitle: 'Seguimiento post-venta: {{deal.title}}',
          taskDescription: 'Realizar seguimiento post-venta para asegurar satisfacción del cliente.',
          taskDueDate: '+7 days',
          taskAssignTo: 'owner',
        },
        order: 2,
      },
    ],
  },
  {
    id: 'deal_lost_followup',
    name: 'Seguimiento de Deal Perdido',
    description: 'Crea tarea de análisis y notifica cuando se pierde un deal',
    category: 'deals',
    trigger: {
      type: 'deal_lost',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'owner',
          message: 'Deal perdido: {{deal.title}}. Registra la razón de pérdida.',
          priority: 'medium',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'create_task',
        config: {
          taskTitle: 'Análisis de deal perdido: {{deal.title}}',
          taskDescription: 'Analizar razones de pérdida y documentar aprendizajes.',
          taskDueDate: '+3 days',
          taskAssignTo: 'owner',
        },
        order: 1,
      },
    ],
  },
  {
    id: 'high_value_deal_alert',
    name: 'Alerta de Deal de Alto Valor',
    description: 'Notifica a administradores cuando se crea un deal de alto valor',
    category: 'deals',
    trigger: {
      type: 'deal_created',
      conditions: [
        {
          id: 'cond_1',
          field: 'deal.value',
          operator: 'greater_than',
          value: 100000,
          logicalOperator: 'AND',
        },
      ],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'admin',
          message: '💰 Nuevo deal de alto valor: {{deal.title}} - ${{deal.value}}',
          priority: 'high',
        },
        order: 0,
      },
    ],
  },
  {
    id: 'deal_stage_changed',
    name: 'Seguimiento de Cambio de Etapa',
    description: 'Registra actividad cuando un deal cambia de etapa',
    category: 'deals',
    trigger: {
      type: 'deal_stage_changed',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'create_activity',
        config: {
          activityType: 'note',
          activityTitle: 'Cambio de etapa',
          activityDescription: 'El deal avanzó de {{previousStage}} a {{newStage}}',
        },
        order: 0,
      },
    ],
  },
  {
    id: 'new_contact_welcome',
    name: 'Bienvenida a Nuevo Contacto',
    description: 'Envía email de bienvenida y crea tarea de seguimiento para nuevos contactos',
    category: 'contacts',
    trigger: {
      type: 'contact_created',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_email',
        config: {
          to: 'contact',
          subject: 'Bienvenido a nuestra empresa',
          body: 'Estimado/a {{contact.firstName}},\n\nGracias por conectar con nosotros. Estaremos en contacto pronto.\n\nSaludos cordiales.',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'create_task',
        config: {
          taskTitle: 'Llamada de presentación: {{contact.firstName}} {{contact.lastName}}',
          taskDescription: 'Realizar llamada de presentación con el nuevo contacto.',
          taskDueDate: '+2 days',
          taskAssignTo: 'owner',
        },
        order: 1,
      },
    ],
  },
  {
    id: 'task_overdue_reminder',
    name: 'Recordatorio de Tarea Vencida',
    description: 'Envía notificación cuando una tarea está vencida',
    category: 'tasks',
    trigger: {
      type: 'task_overdue',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'owner',
          message: '⚠️ Tarea vencida: {{task.title}}',
          priority: 'high',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'send_email',
        config: {
          to: 'owner',
          subject: 'Recordatorio: Tarea vencida',
          body: 'La tarea "{{task.title}}" está vencida. Por favor actualiza su estado.',
        },
        order: 1,
      },
    ],
  },
  {
    id: 'quote_accepted',
    name: 'Cotización Aceptada',
    description: 'Cuando se acepta una cotización, actualiza el deal y notifica',
    category: 'quotes',
    trigger: {
      type: 'quote_accepted',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'owner',
          message: '✅ Cotización aceptada: {{quote.quoteNumber}}',
          priority: 'high',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'create_task',
        config: {
          taskTitle: 'Procesar pedido: {{quote.quoteNumber}}',
          taskDescription: 'La cotización fue aceptada. Proceder con el pedido.',
          taskDueDate: '+1 days',
          taskAssignTo: 'owner',
        },
        order: 1,
      },
    ],
  },
  {
    id: 'quote_rejected_followup',
    name: 'Seguimiento de Cotización Rechazada',
    description: 'Crea tarea de análisis cuando se rechaza una cotización',
    category: 'quotes',
    trigger: {
      type: 'quote_rejected',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'owner',
          message: '❌ Cotización rechazada: {{quote.quoteNumber}}',
          priority: 'medium',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'create_task',
        config: {
          taskTitle: 'Analizar rechazo: {{quote.quoteNumber}}',
          taskDescription: 'Contactar al cliente para entender razones del rechazo.',
          taskDueDate: '+2 days',
          taskAssignTo: 'owner',
        },
        order: 1,
      },
    ],
  },
  {
    id: 'webhook_integration',
    name: 'Integración con Sistema Externo',
    description: 'Envía datos a webhook cuando se gana un deal',
    category: 'integrations',
    trigger: {
      type: 'deal_won',
      conditions: [],
    },
    actions: [
      {
        id: 'action_1',
        type: 'webhook',
        config: {
          url: 'https://tu-sistema.com/api/webhook',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {{apiKey}}',
          },
          payload: {
            event: 'deal_won',
            dealId: '{{deal.id}}',
            dealTitle: '{{deal.title}}',
            dealValue: '{{deal.value}}',
            clientId: '{{deal.clientId}}',
          },
        },
        order: 0,
      },
    ],
  },
  {
    id: 'stale_deal_alert',
    name: 'Alerta de Deal Sin Actividad',
    description: 'Notifica cuando un deal lleva tiempo sin actualizarse',
    category: 'deals',
    trigger: {
      type: 'deal_updated',
      conditions: [
        {
          id: 'cond_1',
          field: 'deal.daysSinceLastActivity',
          operator: 'greater_than',
          value: 7,
          logicalOperator: 'AND',
        },
      ],
    },
    actions: [
      {
        id: 'action_1',
        type: 'send_notification',
        config: {
          recipientType: 'owner',
          message: '⏰ Deal sin actividad: {{deal.title}} lleva más de 7 días sin actualizarse',
          priority: 'medium',
        },
        order: 0,
      },
      {
        id: 'action_2',
        type: 'create_task',
        config: {
          taskTitle: 'Seguimiento: {{deal.title}}',
          taskDescription: 'El deal lleva tiempo sin actividad. Contactar al cliente.',
          taskDueDate: '+1 days',
          taskAssignTo: 'owner',
        },
        order: 1,
      },
    ],
  },
];

// GET - Obtener templates predefinidos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let templates = WORKFLOW_TEMPLATES;

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Agrupar por categoría
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = [];
      }
      acc[t.category].push(t);
      return acc;
    }, {} as Record<string, typeof templates>);

    const categories = [
      { id: 'deals', label: 'Deals' },
      { id: 'contacts', label: 'Contactos' },
      { id: 'tasks', label: 'Tareas' },
      { id: 'quotes', label: 'Cotizaciones' },
      { id: 'integrations', label: 'Integraciones' },
    ];

    return NextResponse.json({
      templates,
      grouped,
      categories,
    });
  } catch (error: any) {
    console.error('Error fetching workflow templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
