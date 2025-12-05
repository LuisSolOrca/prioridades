// Tipos de triggers (eventos que disparan el workflow)
export type CRMTriggerType =
  | 'deal_created'
  | 'deal_updated'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'deal_value_changed'
  | 'contact_created'
  | 'contact_updated'
  | 'client_created'
  | 'activity_created'
  | 'task_created'
  | 'task_overdue'
  | 'task_completed'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected';

// Operadores para condiciones
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'in_list'
  | 'not_in_list';

// Tipos de acciones
export type CRMActionType =
  | 'send_email'
  | 'send_notification'
  | 'create_task'
  | 'create_activity'
  | 'update_field'
  | 'move_stage'
  | 'assign_owner'
  | 'add_tag'
  | 'remove_tag'
  | 'webhook'
  | 'delay'
  | 'create_priority'
  | 'send_channel_message'
  | 'condition'
  | 'split';

// Constantes para UI
export const TRIGGER_LABELS: Record<CRMTriggerType, string> = {
  deal_created: 'Deal creado',
  deal_updated: 'Deal actualizado',
  deal_stage_changed: 'Deal cambió de etapa',
  deal_won: 'Deal ganado',
  deal_lost: 'Deal perdido',
  deal_value_changed: 'Valor del deal cambió',
  contact_created: 'Contacto creado',
  contact_updated: 'Contacto actualizado',
  client_created: 'Cliente creado',
  activity_created: 'Actividad creada',
  task_created: 'Tarea creada',
  task_overdue: 'Tarea vencida',
  task_completed: 'Tarea completada',
  quote_sent: 'Cotización enviada',
  quote_accepted: 'Cotización aceptada',
  quote_rejected: 'Cotización rechazada',
};

export const ACTION_LABELS: Record<CRMActionType, string> = {
  send_email: 'Enviar email',
  send_notification: 'Enviar notificación',
  create_task: 'Crear tarea',
  create_activity: 'Crear actividad',
  update_field: 'Actualizar campo',
  move_stage: 'Mover a etapa',
  assign_owner: 'Asignar responsable',
  add_tag: 'Agregar etiqueta',
  remove_tag: 'Quitar etiqueta',
  webhook: 'Llamar webhook',
  delay: 'Esperar',
  create_priority: 'Crear prioridad',
  send_channel_message: 'Enviar mensaje a canal',
  condition: 'Condición (Si/Entonces)',
  split: 'División A/B',
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  greater_than: 'es mayor que',
  less_than: 'es menor que',
  greater_or_equal: 'es mayor o igual a',
  less_or_equal: 'es menor o igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  starts_with: 'comienza con',
  ends_with: 'termina con',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
  in_list: 'está en la lista',
  not_in_list: 'no está en la lista',
};

// Campos disponibles para condiciones por tipo de trigger
// field: nombre del campo en la base de datos
// label: nombre para mostrar en la UI
export const CONDITION_FIELDS: Record<string, { field: string; label: string; type: 'string' | 'number' | 'date' | 'boolean' | 'select'; options?: { value: string; label: string }[] }[]> = {
  deal: [
    { field: 'value', label: 'Valor', type: 'number' },
    { field: 'currency', label: 'Moneda', type: 'select', options: [{ value: 'MXN', label: 'MXN' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }] },
    { field: 'stageId', label: 'Etapa', type: 'select' },
    { field: 'probability', label: 'Probabilidad', type: 'number' },
    { field: 'title', label: 'Título', type: 'string' },
    { field: 'description', label: 'Descripción', type: 'string' },
  ],
  contact: [
    { field: 'email', label: 'Email', type: 'string' },
    { field: 'firstName', label: 'Nombre', type: 'string' },
    { field: 'lastName', label: 'Apellido', type: 'string' },
    { field: 'position', label: 'Cargo', type: 'string' },
    { field: 'isPrimary', label: 'Es principal', type: 'boolean' },
  ],
  activity: [
    { field: 'type', label: 'Tipo', type: 'select', options: [
      { value: 'note', label: 'Nota' },
      { value: 'call', label: 'Llamada' },
      { value: 'email', label: 'Email' },
      { value: 'meeting', label: 'Reunión' },
      { value: 'task', label: 'Tarea' },
    ]},
    { field: 'title', label: 'Título', type: 'string' },
  ],
};
