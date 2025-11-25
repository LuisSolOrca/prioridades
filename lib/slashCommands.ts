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
    name: 'fist-of-five',
    description: 'Votación ágil Fist of Five (0-5 dedos) para medir consenso',
    usage: '/fist-of-five "¿Pregunta o decisión?"',
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
  },
  {
    name: 'dot-voting',
    description: 'Cada usuario tiene N puntos para distribuir - Priorización democrática',
    usage: '/dot-voting "Pregunta" 5 "Opción 1" "Opción 2" ...',
    category: 'collaboration'
  },
  {
    name: 'blind-vote',
    description: 'Votos ocultos hasta que todos voten - Evitar sesgo de grupo',
    usage: '/blind-vote "Pregunta" "Opción 1" "Opción 2" ...',
    category: 'collaboration'
  },
  {
    name: 'decision-matrix',
    description: 'Matriz criterios vs opciones con puntajes - Decisiones complejas',
    usage: '/decision-matrix "Decisión" "Criterio 1" "Criterio 2" ...',
    category: 'analysis'
  },
  {
    name: 'swot',
    description: 'Análisis SWOT colaborativo - Análisis estratégico',
    usage: '/swot "Título del análisis"',
    category: 'analysis'
  },
  {
    name: 'soar',
    description: 'Análisis SOAR colaborativo - Framework orientado al futuro',
    usage: '/soar "Título del análisis"',
    category: 'analysis'
  },
  {
    name: 'mind-map',
    description: 'Mapa mental colaborativo - Explorar ideas',
    usage: '/mind-map "Tema central"',
    category: 'collaboration'
  },
  {
    name: 'crazy-8s',
    description: '8 ideas en 8 minutos - Design sprint',
    usage: '/crazy-8s "Problema o reto"',
    category: 'collaboration'
  },
  {
    name: 'affinity-map',
    description: 'Agrupar ideas por categorías - Organizar brainstorm',
    usage: '/affinity-map "Tema"',
    category: 'collaboration'
  },
  {
    name: 'six-hats',
    description: 'Análisis con los 6 sombreros de Bono - Perspectivas múltiples',
    usage: '/six-hats "Tema a analizar"',
    category: 'analysis'
  },
  {
    name: 'rose-bud-thorn',
    description: '🌹 Positivo, 🌱 Potencial, 🌵 Problemas - Feedback estructurado',
    usage: '/rose-bud-thorn "Sprint o período"',
    category: 'collaboration'
  },
  {
    name: 'sailboat',
    description: '⛵ Viento, ancla, rocas, isla - Retrospectiva visual',
    usage: '/sailboat "Sprint o período"',
    category: 'collaboration'
  },
  {
    name: 'start-stop-continue',
    description: 'Qué empezar, parar, continuar - Retrospectiva simple',
    usage: '/start-stop-continue "Sprint o período"',
    category: 'collaboration'
  },
  {
    name: 'nps',
    description: 'Net Promoter Score rápido - Medir satisfacción',
    usage: '/nps "¿Pregunta de satisfacción?"',
    category: 'collaboration'
  },
  {
    name: 'pomodoro',
    description: 'Temporizador pomodoro compartido (25/5 min)',
    usage: '/pomodoro "Título de la sesión"',
    category: 'collaboration'
  },
  {
    name: 'agenda',
    description: 'Agenda de reunión con tiempos por tema',
    usage: '/agenda "Título de reunión"',
    category: 'management'
  },
  {
    name: 'parking-lot',
    description: 'Temas para discutir después',
    usage: '/parking-lot "Título"',
    category: 'collaboration'
  },
  {
    name: 'action-items',
    description: 'Lista de acciones con responsable y fecha',
    usage: '/action-items "Título"',
    category: 'management'
  },
  {
    name: 'icebreaker',
    description: 'Pregunta aleatoria para romper el hielo',
    usage: '/icebreaker',
    category: 'collaboration'
  },
  {
    name: 'kudos-wall',
    description: 'Muro de reconocimientos acumulados',
    usage: '/kudos-wall "Título"',
    category: 'collaboration'
  },
  {
    name: 'team-health',
    description: 'Health check del equipo (Spotify model)',
    usage: '/team-health "Sprint o período"',
    category: 'analysis'
  },
  {
    name: 'confidence-vote',
    description: '¿Qué tan seguros estamos? (1-5)',
    usage: '/confidence-vote "¿Pregunta?"',
    category: 'collaboration'
  },
  {
    name: 'capacity',
    description: 'Capacidad disponible del equipo',
    usage: '/capacity "Sprint o período"',
    category: 'analysis'
  },
  {
    name: 'dependency-map',
    description: 'Visualizar dependencias entre tareas',
    usage: '/dependency-map "Proyecto"',
    category: 'management'
  },
  {
    name: 'okr',
    description: 'Definir y trackear OKRs',
    usage: '/okr "Título del OKR"',
    category: 'management'
  },
  {
    name: 'roadmap',
    description: 'Timeline visual con milestones',
    usage: '/roadmap "Título del roadmap"',
    category: 'management'
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
