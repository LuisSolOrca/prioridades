/**
 * Utilidad compartida para reemplazo de variables en plantillas
 * Usada por: Secuencias de email, Workflows CRM, Plantillas de email
 */

export type TemplateScope = 'sequences' | 'workflows' | 'both';

export interface TemplateContext {
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    position?: string;
    [key: string]: any;
  };
  client?: {
    name?: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  deal?: {
    title?: string;
    value?: number;
    currency?: string;
    stageId?: { name?: string } | string;
    stage?: string;
    [key: string]: any;
  };
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    signature?: string;
    [key: string]: any;
  };
  // Variables específicas de workflows de prioridades
  priority?: {
    title?: string;
    status?: string;
    completionPercentage?: number;
    weekStart?: Date;
    weekEnd?: Date;
    [key: string]: any;
  };
  // Contexto adicional dinámico
  [key: string]: any;
}

/**
 * Variables disponibles organizadas por categoría y scope
 */
export const TEMPLATE_VARIABLES = {
  contact: {
    scope: 'both' as TemplateScope,
    variables: [
      { key: '{{contact.firstName}}', label: 'Nombre', description: 'Nombre del contacto' },
      { key: '{{contact.lastName}}', label: 'Apellido', description: 'Apellido del contacto' },
      { key: '{{contact.fullName}}', label: 'Nombre completo', description: 'Nombre y apellido' },
      { key: '{{contact.email}}', label: 'Email', description: 'Correo electrónico' },
      { key: '{{contact.phone}}', label: 'Teléfono', description: 'Número de teléfono' },
      { key: '{{contact.position}}', label: 'Cargo', description: 'Puesto/cargo del contacto' },
    ],
  },
  client: {
    scope: 'both' as TemplateScope,
    variables: [
      { key: '{{client.name}}', label: 'Empresa', description: 'Nombre de la empresa/cliente' },
      { key: '{{client.industry}}', label: 'Industria', description: 'Sector o industria' },
      { key: '{{client.website}}', label: 'Sitio web', description: 'URL del sitio web' },
      { key: '{{client.email}}', label: 'Email empresa', description: 'Email corporativo' },
      { key: '{{client.phone}}', label: 'Teléfono empresa', description: 'Teléfono corporativo' },
    ],
  },
  deal: {
    scope: 'both' as TemplateScope,
    variables: [
      { key: '{{deal.title}}', label: 'Título del negocio', description: 'Nombre del deal/oportunidad' },
      { key: '{{deal.value}}', label: 'Valor', description: 'Monto del negocio (formateado)' },
      { key: '{{deal.stage}}', label: 'Etapa', description: 'Etapa actual del pipeline' },
    ],
  },
  user: {
    scope: 'both' as TemplateScope,
    variables: [
      { key: '{{user.name}}', label: 'Tu nombre', description: 'Nombre del usuario que envía' },
      { key: '{{user.email}}', label: 'Tu email', description: 'Email del usuario' },
      { key: '{{user.phone}}', label: 'Tu teléfono', description: 'Teléfono del usuario' },
      { key: '{{user.signature}}', label: 'Firma', description: 'Firma personalizada del usuario' },
    ],
  },
  dates: {
    scope: 'both' as TemplateScope,
    variables: [
      { key: '{{today}}', label: 'Hoy', description: 'Fecha actual' },
      { key: '{{tomorrow}}', label: 'Mañana', description: 'Fecha de mañana' },
      { key: '{{nextWeek}}', label: 'Próxima semana', description: 'Fecha en 7 días' },
    ],
  },
  priority: {
    scope: 'workflows' as TemplateScope,
    variables: [
      { key: '{{priority.title}}', label: 'Título prioridad', description: 'Nombre de la prioridad' },
      { key: '{{priority.status}}', label: 'Estado', description: 'Estado actual (EN_TIEMPO, EN_RIESGO, etc.)' },
      { key: '{{priority.completion}}', label: '% Completado', description: 'Porcentaje de avance' },
      { key: '{{priority.owner}}', label: 'Responsable', description: 'Nombre del responsable' },
    ],
  },
};

/**
 * Obtiene valor anidado de un objeto usando notación de punto
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Formatea un valor monetario
 */
function formatCurrency(value: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Formatea una fecha
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date);
}

/**
 * Reemplaza todas las variables en un texto con los valores del contexto
 */
export function replaceTemplateVariables(
  text: string,
  context: TemplateContext
): string {
  if (!text) return text;

  let result = text;

  // Contact variables
  if (context.contact) {
    result = result.replace(/\{\{contact\.firstName\}\}/g, context.contact.firstName || '');
    result = result.replace(/\{\{contact\.lastName\}\}/g, context.contact.lastName || '');
    result = result.replace(/\{\{contact\.fullName\}\}/g,
      `${context.contact.firstName || ''} ${context.contact.lastName || ''}`.trim() || '');
    result = result.replace(/\{\{contact\.email\}\}/g, context.contact.email || '');
    result = result.replace(/\{\{contact\.phone\}\}/g, context.contact.phone || '');
    result = result.replace(/\{\{contact\.position\}\}/g, context.contact.position || '');
  }

  // Client variables
  if (context.client) {
    result = result.replace(/\{\{client\.name\}\}/g, context.client.name || '');
    result = result.replace(/\{\{client\.industry\}\}/g, context.client.industry || '');
    result = result.replace(/\{\{client\.website\}\}/g, context.client.website || '');
    result = result.replace(/\{\{client\.email\}\}/g, context.client.email || '');
    result = result.replace(/\{\{client\.phone\}\}/g, context.client.phone || '');
  }

  // Deal variables
  if (context.deal) {
    result = result.replace(/\{\{deal\.title\}\}/g, context.deal.title || '');

    // Formatear valor como moneda
    if (context.deal.value !== undefined) {
      result = result.replace(/\{\{deal\.value\}\}/g,
        formatCurrency(context.deal.value, context.deal.currency || 'MXN'));
    } else {
      result = result.replace(/\{\{deal\.value\}\}/g, '');
    }

    // Stage puede ser un objeto populado o un string
    const stageName = typeof context.deal.stageId === 'object'
      ? context.deal.stageId?.name
      : context.deal.stage;
    result = result.replace(/\{\{deal\.stage\}\}/g, stageName || '');
  }

  // User variables
  if (context.user) {
    result = result.replace(/\{\{user\.name\}\}/g, context.user.name || '');
    result = result.replace(/\{\{user\.email\}\}/g, context.user.email || '');
    result = result.replace(/\{\{user\.phone\}\}/g, context.user.phone || '');
    result = result.replace(/\{\{user\.signature\}\}/g, context.user.signature || '');
  }

  // Priority variables (for priority workflows)
  if (context.priority) {
    result = result.replace(/\{\{priority\.title\}\}/g, context.priority.title || '');
    result = result.replace(/\{\{priority\.status\}\}/g, context.priority.status || '');
    result = result.replace(/\{\{priority\.completion\}\}/g,
      String(context.priority.completionPercentage || 0));

    // Owner de la prioridad
    const ownerName = context.priority.userId?.name || context.priority.owner || '';
    result = result.replace(/\{\{priority\.owner\}\}/g, ownerName);

    // Alias para compatibilidad con workflows existentes
    result = result.replace(/\{\{title\}\}/g, context.priority.title || '');
    result = result.replace(/\{\{status\}\}/g, context.priority.status || '');
    result = result.replace(/\{\{completion\}\}/g, String(context.priority.completionPercentage || 0));
    result = result.replace(/\{\{owner\}\}/g, ownerName);
  }

  // Date variables
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  result = result.replace(/\{\{today\}\}/g, formatDate(today));
  result = result.replace(/\{\{tomorrow\}\}/g, formatDate(tomorrow));
  result = result.replace(/\{\{nextWeek\}\}/g, formatDate(nextWeek));

  // Fechas de semana de prioridad
  if (context.priority?.weekStart) {
    result = result.replace(/\{\{weekStart\}\}/g, formatDate(new Date(context.priority.weekStart)));
  }
  if (context.priority?.weekEnd) {
    result = result.replace(/\{\{weekEnd\}\}/g, formatDate(new Date(context.priority.weekEnd)));
  }

  // Fallback: reemplazar cualquier variable restante con acceso dinámico
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined && value !== null ? String(value) : '';
  });

  return result;
}

/**
 * Obtiene las variables disponibles para un scope específico
 */
export function getAvailableVariables(scope: TemplateScope): typeof TEMPLATE_VARIABLES {
  if (scope === 'both') {
    return TEMPLATE_VARIABLES;
  }

  const filtered: any = {};
  for (const [category, data] of Object.entries(TEMPLATE_VARIABLES)) {
    if (data.scope === 'both' || data.scope === scope) {
      filtered[category] = data;
    }
  }
  return filtered;
}

/**
 * Valida que una plantilla solo use variables válidas para su scope
 */
export function validateTemplateVariables(
  text: string,
  scope: TemplateScope
): { valid: boolean; invalidVariables: string[] } {
  const availableVars = getAvailableVariables(scope);
  const allValidKeys = new Set<string>();

  for (const category of Object.values(availableVars)) {
    for (const variable of category.variables) {
      allValidKeys.add(variable.key);
    }
  }

  // Extraer variables usadas en el texto
  const usedVariables = text.match(/\{\{[^}]+\}\}/g) || [];
  const invalidVariables: string[] = [];

  for (const variable of usedVariables) {
    // Normalizar la variable (quitar espacios extras)
    const normalized = variable.replace(/\s+/g, '');
    if (!allValidKeys.has(normalized)) {
      // Verificar si es una variable dinámica válida (como {{contact.customField}})
      const isValidDynamic = /^\{\{(contact|client|deal|user|priority)\.[a-zA-Z_]+\}\}$/.test(normalized);
      if (!isValidDynamic) {
        invalidVariables.push(variable);
      }
    }
  }

  return {
    valid: invalidVariables.length === 0,
    invalidVariables,
  };
}
