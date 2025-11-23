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
