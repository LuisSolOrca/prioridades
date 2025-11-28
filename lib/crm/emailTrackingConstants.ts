// Tipos de estado de tracking de email
export type EmailTrackingStatus =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced';

// Etiquetas para estados
export const EMAIL_STATUS_LABELS: Record<EmailTrackingStatus, string> = {
  sent: 'Enviado',
  delivered: 'Entregado',
  opened: 'Abierto',
  clicked: 'Clic',
  replied: 'Respondido',
  bounced: 'Rebotado',
};

// Colores para estados
export const EMAIL_STATUS_COLORS: Record<EmailTrackingStatus, string> = {
  sent: 'gray',
  delivered: 'blue',
  opened: 'green',
  clicked: 'purple',
  replied: 'teal',
  bounced: 'red',
};
