/**
 * Calcula el período actual basado en la periodicidad del KPI
 */
export function calculateCurrentPeriod(periodicity: string): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (periodicity) {
    case 'DIARIA':
      // Día actual
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;

    case 'SEMANAL':
      // Semana actual (lunes a domingo)
      const currentDay = now.getDay(); // 0 = domingo, 1 = lunes, etc.
      const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Ajustar para comenzar en lunes
      start = new Date(now);
      start.setDate(now.getDate() + daysToMonday);
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6); // Domingo
      end.setHours(23, 59, 59, 999);
      break;

    case 'MENSUAL':
      // Mes actual
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;

    case 'TRIMESTRAL':
      // Trimestre actual
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startMonth = currentQuarter * 3;
      start = new Date(now.getFullYear(), startMonth, 1);
      end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59);
      break;

    case 'ANUAL':
      // Año actual
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;

    default:
      // Por defecto, mes actual
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  // Formatear como YYYY-MM-DD para input type="date"
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * Obtiene el nombre del período actual
 */
export function getPeriodName(periodicity: string): string {
  const now = new Date();

  switch (periodicity) {
    case 'DIARIA':
      return now.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

    case 'SEMANAL':
      const currentDay = now.getDay();
      const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + daysToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return `Semana del ${monday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} al ${sunday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    case 'MENSUAL':
      return now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    case 'TRIMESTRAL':
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return `Q${quarter} ${now.getFullYear()}`;

    case 'ANUAL':
      return `Año ${now.getFullYear()}`;

    default:
      return now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
}
