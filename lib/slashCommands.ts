/**
 * Sistema de comandos slash para canales
 */

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  category: 'status' | 'collaboration' | 'management' | 'analysis';
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'status',
    description: 'Muestra el estado actual del proyecto con métricas visuales',
    usage: '/status',
    category: 'status'
  },
  {
    name: 'summary',
    description: 'Resumen de actividad del proyecto (24h, semana, mes)',
    usage: '/summary [24h|week|month]',
    category: 'analysis'
  },
  {
    name: 'progress',
    description: 'Progreso detallado con timeline de hitos y roadmap',
    usage: '/progress',
    category: 'status'
  },
  {
    name: 'team-load',
    description: 'Distribución de carga de trabajo por usuario',
    usage: '/team-load',
    category: 'analysis'
  },
  {
    name: 'burndown',
    description: 'Gráfico burndown de la semana actual con proyección',
    usage: '/burndown',
    category: 'analysis'
  },
  {
    name: 'blockers',
    description: 'Muestra todas las prioridades bloqueadas del proyecto',
    usage: '/blockers',
    category: 'analysis'
  },
  {
    name: 'risks',
    description: 'Analiza y muestra las prioridades en riesgo',
    usage: '/risks',
    category: 'analysis'
  },
  {
    name: 'celebrate',
    description: 'Celebra logros del equipo',
    usage: '/celebrate @usuario "descripción del logro"',
    category: 'collaboration'
  },
  {
    name: 'poll',
    description: 'Crea una encuesta para el equipo',
    usage: '/poll "¿Pregunta?" "Opción 1" "Opción 2" "Opción 3"',
    category: 'collaboration'
  },
  {
    name: 'brainstorm',
    description: 'Inicia una sesión de brainstorming colaborativa',
    usage: '/brainstorm "¿Tema o pregunta?"',
    category: 'collaboration'
  },
  {
    name: 'estimation-poker',
    description: 'Planning Poker para estimación colaborativa de tareas',
    usage: '/estimation-poker "¿Tarea o historia?"',
    category: 'collaboration'
  },
  {
    name: 'retrospective',
    description: 'Retrospectiva ágil con 3 columnas (Bien, Mejorar, Acciones)',
    usage: '/retrospective "Sprint o período"',
    category: 'collaboration'
  },
  {
    name: 'incident',
    description: 'Gestión de incidentes con timeline y niveles de severidad',
    usage: '/incident "Título" P0|P1|P2|P3|P4',
    category: 'management'
  },
  {
    name: 'vote-points',
    description: 'Votación por puntos para priorizar opciones',
    usage: '/vote "Pregunta" 10 "Opción 1" "Opción 2" ...',
    category: 'collaboration'
  },
  {
    name: 'checklist',
    description: 'Lista de tareas colaborativa con progreso visual',
    usage: '/checklist "Título" ["Item 1" "Item 2" ...]',
    category: 'collaboration'
  },
  {
    name: 'timer',
    description: 'Temporizador compartido para timeboxing',
    usage: '/timer "Título" 25',
    category: 'collaboration'
  },
  {
    name: 'wheel',
    description: 'Ruleta de decisión aleatoria animada',
    usage: '/wheel "Título" "Opción 1" "Opción 2" ...',
    category: 'collaboration'
  },
  {
    name: 'mood',
    description: 'Check-in de estado de ánimo del equipo',
    usage: '/mood "¿Cómo están hoy?"',
    category: 'collaboration'
  },
  {
    name: 'pros-cons',
    description: 'Tabla de pros y contras colaborativa',
    usage: '/pros-cons "Título"',
    category: 'analysis'
  },
  {
    name: 'ranking',
    description: 'Ranking colaborativo con drag & drop',
    usage: '/ranking "Pregunta" "Opción 1" "Opción 2" ...',
    category: 'collaboration'
  },
  {
    name: 'quick-priority',
    description: 'Crea una prioridad rápidamente sin salir del chat',
    usage: '/quick-priority "Título de la prioridad"',
    category: 'management'
  },
  {
    name: 'search',
    description: 'Búsqueda avanzada de prioridades, mensajes y links',
    usage: '/search [tipo] [término]',
    category: 'analysis'
  },
  {
    name: 'priorities',
    description: 'Lista prioridades con filtros avanzados',
    usage: '/priorities [filtros]',
    category: 'management'
  },
  {
    name: 'recent',
    description: 'Actividad reciente de un usuario',
    usage: '/recent @usuario [días]',
    category: 'analysis'
  },
  {
    name: 'standup',
    description: 'Daily standup virtual del equipo',
    usage: '/standup',
    category: 'collaboration'
  },
  {
    name: 'help',
    description: 'Muestra la lista de comandos disponibles',
    usage: '/help [comando]',
    category: 'status'
  },
  {
    name: 'ai-summary',
    description: 'Genera un resumen inteligente del chat usando IA',
    usage: '/ai-summary [últimos N mensajes]',
    category: 'analysis'
  },
  {
    name: 'my-stats',
    description: 'Muestra tus estadísticas personales y progreso',
    usage: '/my-stats',
    category: 'analysis'
  },
  {
    name: 'decision',
    description: 'Registra una decisión importante del proyecto',
    usage: '/decision "descripción de la decisión"',
    category: 'management'
  },
  {
    name: 'schedule',
    description: 'Calendario de hitos y próximos deadlines del proyecto',
    usage: '/schedule [week|month]',
    category: 'status'
  },
  {
    name: 'mention-stats',
    description: 'Análisis de menciones y patrones de colaboración',
    usage: '/mention-stats',
    category: 'analysis'
  },
  {
    name: 'question',
    description: 'Hacer pregunta importante a un stakeholder o miembro del equipo',
    usage: '/question @usuario "¿Tu pregunta aquí?"',
    category: 'collaboration'
  },
  {
    name: 'export',
    description: 'Exportar datos del proyecto en diferentes formatos',
    usage: '/export [excel|pdf|csv] [filtros]',
    category: 'analysis'
  },
  {
    name: 'velocity',
    description: 'Velocidad del equipo con tendencias y predicciones',
    usage: '/velocity',
    category: 'analysis'
  }
];

export interface ParsedCommand {
  command: string;
  args: string[];
  rawText: string;
}

/**
 * Detecta si un mensaje es un comando slash
 */
export function isSlashCommand(text: string): boolean {
  return text.trim().startsWith('/');
}

/**
 * Parsea un comando slash y extrae sus argumentos
 */
export function parseSlashCommand(text: string): ParsedCommand | null {
  if (!isSlashCommand(text)) {
    return null;
  }

  const trimmed = text.trim();

  // Separar comando de argumentos
  const firstSpace = trimmed.indexOf(' ');

  if (firstSpace === -1) {
    // Solo comando, sin argumentos
    return {
      command: trimmed.substring(1).toLowerCase(),
      args: [],
      rawText: trimmed
    };
  }

  const command = trimmed.substring(1, firstSpace).toLowerCase();
  const argsText = trimmed.substring(firstSpace + 1);

  // Parsear argumentos respetando comillas
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < argsText.length; i++) {
    const char = argsText[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      if (current.trim()) {
        args.push(current.trim());
      }
      current = '';
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        args.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Agregar último argumento si existe
  if (current.trim()) {
    args.push(current.trim());
  }

  return {
    command,
    args,
    rawText: trimmed
  };
}

/**
 * Obtiene información de un comando
 */
export function getCommandInfo(commandName: string): SlashCommand | undefined {
  return SLASH_COMMANDS.find(cmd => cmd.name === commandName);
}

/**
 * Valida si un comando existe
 */
export function isValidCommand(commandName: string): boolean {
  return SLASH_COMMANDS.some(cmd => cmd.name === commandName);
}
