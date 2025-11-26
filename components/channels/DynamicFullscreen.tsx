'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  X,
  Minimize2,
  Users,
  Vote,
  Lightbulb,
  RotateCcw,
  Target,
  Heart,
  Lock,
  Loader2,
  Timer,
  Play,
  Pause,
  RotateCw,
  Layers,
  HelpCircle,
  BookOpen
} from 'lucide-react';

// Import all collaborative widgets
import PollCommand from '../slashCommands/PollCommand';
import BrainstormCommand from '../slashCommands/BrainstormCommand';
import DotVotingCommand from '../slashCommands/DotVotingCommand';
import BlindVoteCommand from '../slashCommands/BlindVoteCommand';
import RetroCommand from '../slashCommands/RetroCommand';
import NPSCommand from '../slashCommands/NPSCommand';
import DecisionMatrixCommand from '../slashCommands/DecisionMatrixCommand';
import MindMapCommand from '../slashCommands/MindMapCommand';
import ActionItemsCommand from '../slashCommands/ActionItemsCommand';
import TeamHealthCommand from '../slashCommands/TeamHealthCommand';
import ConfidenceVoteCommand from '../slashCommands/ConfidenceVoteCommand';
import AgendaCommand from '../slashCommands/AgendaCommand';
import ParkingLotCommand from '../slashCommands/ParkingLotCommand';
import KudosWallCommand from '../slashCommands/KudosWallCommand';
import PomodoroCommand from '../slashCommands/PomodoroCommand';
import FistOfFiveCommand from '../slashCommands/FistOfFiveCommand';
import MoodCommand from '../slashCommands/MoodCommand';
import ProsConsCommand from '../slashCommands/ProsConsCommand';
import RankingCommand from '../slashCommands/RankingCommand';
import ChecklistCommand from '../slashCommands/ChecklistCommand';
import EstimationPokerCommand from '../slashCommands/EstimationPokerCommand';
import RetrospectiveCommand from '../slashCommands/RetrospectiveCommand';
import IcebreakerCommand from '../slashCommands/IcebreakerCommand';
import InceptionDeckCommand from '../slashCommands/InceptionDeckCommand';
import DelegationPokerCommand from '../slashCommands/DelegationPokerCommand';
import MovingMotivatorsCommand from '../slashCommands/MovingMotivatorsCommand';
import StandupCommand from '../slashCommands/StandupCommand';
import FiveWhysCommand from '../slashCommands/FiveWhysCommand';
import ImpactEffortCommand from '../slashCommands/ImpactEffortCommand';
import LotusBlossomCommand from '../slashCommands/LotusBlossomCommand';
import OpportunityTreeCommand from '../slashCommands/OpportunityTreeCommand';
import LeanCoffeeCommand from '../slashCommands/LeanCoffeeCommand';
import UserStoryMappingCommand from '../slashCommands/UserStoryMappingCommand';
import FishboneCommand from '../slashCommands/FishboneCommand';
import RACICommand from '../slashCommands/RACICommand';
import RomanVotingCommand from '../slashCommands/RomanVotingCommand';
import LeanCanvasCommand from '../slashCommands/LeanCanvasCommand';
import CustomerJourneyCommand from '../slashCommands/CustomerJourneyCommand';
import RiskMatrixCommand from '../slashCommands/RiskMatrixCommand';
import RICECommand from '../slashCommands/RICECommand';
import WorkingAgreementsCommand from '../slashCommands/WorkingAgreementsCommand';
import BrainwritingCommand from '../slashCommands/BrainwritingCommand';
import ErrorBoundary from '../ErrorBoundary';

interface DynamicMessage {
  _id: string;
  projectId: string;
  channelId: string;
  commandType: string;
  commandData: any;
  userId: {
    _id: string;
    name: string;
  };
}

interface OnlineUser {
  id: string;
  info: {
    name: string;
    email: string;
  };
}

interface DynamicFullscreenProps {
  dynamic: DynamicMessage;
  projectId: string;
  channelId: string;
  onlineUsers: OnlineUser[];
  onClose: () => void;
  onMinimize: () => void;
  onUpdate: () => void;
}

const DYNAMIC_ICONS: Record<string, { icon: typeof Vote; color: string }> = {
  'poll': { icon: Vote, color: 'text-blue-600' },
  'dot-voting': { icon: Vote, color: 'text-blue-600' },
  'blind-vote': { icon: Vote, color: 'text-blue-600' },
  'fist-of-five': { icon: Vote, color: 'text-blue-600' },
  'confidence-vote': { icon: Vote, color: 'text-blue-600' },
  'nps': { icon: Vote, color: 'text-blue-600' },
  'brainstorm': { icon: Lightbulb, color: 'text-yellow-600' },
  'mind-map': { icon: Lightbulb, color: 'text-yellow-600' },
  'pros-cons': { icon: Lightbulb, color: 'text-yellow-600' },
  'decision-matrix': { icon: Lightbulb, color: 'text-yellow-600' },
  'ranking': { icon: Lightbulb, color: 'text-yellow-600' },
  'retrospective': { icon: RotateCcw, color: 'text-purple-600' },
  'retro': { icon: RotateCcw, color: 'text-purple-600' },
  'team-health': { icon: RotateCcw, color: 'text-purple-600' },
  'mood': { icon: RotateCcw, color: 'text-purple-600' },
  'action-items': { icon: Target, color: 'text-green-600' },
  'checklist': { icon: Target, color: 'text-green-600' },
  'agenda': { icon: Target, color: 'text-green-600' },
  'parking-lot': { icon: Target, color: 'text-green-600' },
  'pomodoro': { icon: Target, color: 'text-green-600' },
  'estimation-poker': { icon: Target, color: 'text-green-600' },
  'kudos-wall': { icon: Heart, color: 'text-pink-600' },
  'icebreaker': { icon: Heart, color: 'text-pink-600' },
  'inception-deck': { icon: Layers, color: 'text-indigo-600' },
  'delegation-poker': { icon: Users, color: 'text-violet-600' },
  'moving-motivators': { icon: Heart, color: 'text-rose-600' },
  // Análisis estratégico
  'swot': { icon: Target, color: 'text-emerald-600' },
  'soar': { icon: Target, color: 'text-teal-600' },
  'six-hats': { icon: Lightbulb, color: 'text-slate-600' },
  'crazy-8s': { icon: Lightbulb, color: 'text-fuchsia-600' },
  'affinity-map': { icon: Layers, color: 'text-amber-600' },
  // Retros adicionales
  'rose-bud-thorn': { icon: RotateCcw, color: 'text-pink-600' },
  'sailboat': { icon: RotateCcw, color: 'text-cyan-600' },
  'start-stop-continue': { icon: RotateCcw, color: 'text-green-600' },
  // Standup
  'standup': { icon: Users, color: 'text-orange-600' },
  // Nuevos widgets de ideación
  'scamper': { icon: Lightbulb, color: 'text-amber-600' },
  'starbursting': { icon: Lightbulb, color: 'text-cyan-600' },
  'reverse-brainstorm': { icon: Lightbulb, color: 'text-red-600' },
  'worst-idea': { icon: Lightbulb, color: 'text-orange-600' },
  'lotus-blossom': { icon: Lightbulb, color: 'text-pink-600' },
  // Nuevos widgets de análisis
  'five-whys': { icon: Target, color: 'text-purple-600' },
  'impact-effort': { icon: Target, color: 'text-indigo-600' },
  'opportunity-tree': { icon: Target, color: 'text-emerald-600' },
  // Nuevos widgets batch 2
  'empathy-map': { icon: Heart, color: 'text-rose-600' },
  'moscow': { icon: Target, color: 'text-blue-600' },
  '4ls': { icon: RotateCcw, color: 'text-violet-600' },
  'pre-mortem': { icon: Target, color: 'text-red-600' },
  'lean-coffee': { icon: Users, color: 'text-amber-600' },
  'user-story-mapping': { icon: Layers, color: 'text-teal-600' },
  // Nuevos widgets batch 3
  'starfish': { icon: RotateCcw, color: 'text-orange-600' },
  'mad-sad-glad': { icon: Heart, color: 'text-pink-600' },
  'how-might-we': { icon: Lightbulb, color: 'text-yellow-600' },
  'fishbone': { icon: Target, color: 'text-cyan-600' },
  'raci': { icon: Users, color: 'text-indigo-600' },
  'roman-voting': { icon: Vote, color: 'text-purple-600' },
  // Nuevos widgets batch 4
  'lean-canvas': { icon: Layers, color: 'text-indigo-600' },
  'customer-journey': { icon: Users, color: 'text-teal-600' },
  'risk-matrix': { icon: Target, color: 'text-red-600' },
  'rice': { icon: Target, color: 'text-blue-600' },
  'working-agreements': { icon: Users, color: 'text-indigo-600' },
  'brainwriting': { icon: Lightbulb, color: 'text-amber-600' },
};

// Metodologías y guías de uso para cada tipo de dinámica
const METHODOLOGY_GUIDE: Record<string, { title: string; description: string; steps: string[]; tips: string[] }> = {
  'poll': {
    title: 'Encuesta / Votación',
    description: 'Herramienta para tomar decisiones democráticas mediante votación simple. Cada participante puede votar por una opción.',
    steps: [
      'El facilitador crea la encuesta con una pregunta clara',
      'Se definen las opciones disponibles',
      'Los participantes votan por su opción preferida',
      'Los resultados se muestran en tiempo real'
    ],
    tips: [
      'Usa preguntas claras y concisas',
      'Limita las opciones a 3-5 para evitar dispersión',
      'Establece un tiempo límite para votar'
    ]
  },
  'dot-voting': {
    title: 'Dot Voting (Votación por Puntos)',
    description: 'Técnica de priorización donde cada participante distribuye un número fijo de puntos entre las opciones según su preferencia.',
    steps: [
      'Presenta las opciones a evaluar',
      'Cada participante tiene N puntos para distribuir',
      'Los puntos pueden asignarse a una o varias opciones',
      'Las opciones con más puntos son las prioritarias'
    ],
    tips: [
      'Usa 3-5 puntos por persona',
      'Permite asignar múltiples puntos a una misma opción',
      'Ideal para priorizar después de un brainstorm'
    ]
  },
  'blind-vote': {
    title: 'Voto Oculto',
    description: 'Votación donde los resultados permanecen ocultos hasta que el facilitador los revela, evitando sesgos.',
    steps: [
      'Se presenta la pregunta y opciones',
      'Los participantes votan sin ver los resultados',
      'El facilitador revela los resultados cuando todos votaron',
      'Se discuten los resultados'
    ],
    tips: [
      'Ideal para temas sensibles',
      'Evita el "efecto manada"',
      'Útil para estimaciones y evaluaciones honestas'
    ]
  },
  'brainstorm': {
    title: 'Lluvia de Ideas (Brainstorming)',
    description: 'Técnica creativa para generar muchas ideas en poco tiempo. Se enfoca en cantidad sobre calidad inicialmente.',
    steps: [
      'Define claramente el tema o problema',
      'Los participantes agregan ideas libremente',
      'No se critica ni juzga durante la generación',
      'Se pueden votar las mejores ideas al final'
    ],
    tips: [
      'Fomenta ideas "locas" - pueden inspirar soluciones',
      'Construye sobre las ideas de otros',
      'Usa timeboxing (5-10 min de generación)'
    ]
  },
  'mind-map': {
    title: 'Mapa Mental',
    description: 'Representación visual de ideas conectadas alrededor de un concepto central. Facilita la organización y exploración de temas.',
    steps: [
      'Define el tema central',
      'Agrega ramas principales (categorías)',
      'Expande con sub-ramas (detalles)',
      'Conecta ideas relacionadas'
    ],
    tips: [
      'Usa palabras clave, no oraciones largas',
      'Añade colores para diferenciar categorías',
      'Mantén la jerarquía clara (máx 3-4 niveles)'
    ]
  },
  'pros-cons': {
    title: 'Pros y Contras',
    description: 'Análisis estructurado de ventajas y desventajas de una decisión o propuesta.',
    steps: [
      'Define claramente la decisión a evaluar',
      'Lista todos los aspectos positivos (Pros)',
      'Lista todos los aspectos negativos (Contras)',
      'Evalúa el balance y toma la decisión'
    ],
    tips: [
      'Sé específico en cada punto',
      'Considera pros/contras a corto y largo plazo',
      'Involucra diferentes perspectivas del equipo'
    ]
  },
  'decision-matrix': {
    title: 'Matriz de Decisión',
    description: 'Herramienta para evaluar opciones contra múltiples criterios ponderados, facilitando decisiones objetivas.',
    steps: [
      'Define las opciones a evaluar',
      'Establece los criterios de evaluación',
      'Puntúa cada opción en cada criterio',
      'La opción con mayor puntaje es la recomendada'
    ],
    tips: [
      'Usa 3-5 criterios relevantes',
      'Pondera los criterios si no son igual de importantes',
      'Involucra a stakeholders en la puntuación'
    ]
  },
  'ranking': {
    title: 'Ranking / Priorización',
    description: 'Ordena elementos según preferencia o importancia. Cada participante crea su ranking y se calcula el consenso.',
    steps: [
      'Presenta los elementos a ordenar',
      'Cada participante ordena de mayor a menor preferencia',
      'Se calcula el ranking promedio',
      'Se identifica el consenso del grupo'
    ],
    tips: [
      'Limita a 5-7 elementos para facilitar la decisión',
      'Discute las diferencias significativas entre rankings',
      'Usa criterios claros para ordenar'
    ]
  },
  'retrospective': {
    title: 'Retrospectiva Ágil',
    description: 'Reunión de mejora continua donde el equipo reflexiona sobre qué funcionó bien, qué mejorar y qué acciones tomar.',
    steps: [
      'Revisa el período/sprint anterior',
      'Identifica qué salió bien',
      'Identifica qué puede mejorar',
      'Define acciones concretas de mejora'
    ],
    tips: [
      'Crea un ambiente seguro para feedback honesto',
      'Enfócate en procesos, no personas',
      'Limita las acciones a 2-3 por retro'
    ]
  },
  'rose-bud-thorn': {
    title: 'Rose, Bud, Thorn (Rosa, Brote, Espina)',
    description: 'Técnica de retrospectiva que identifica éxitos (rosas), potenciales (brotes) y problemas (espinas).',
    steps: [
      '🌹 Rosas: ¿Qué funcionó bien? ¿Qué celebramos?',
      '🌱 Brotes: ¿Qué tiene potencial? ¿Qué ideas nuevas?',
      '🌵 Espinas: ¿Qué nos causó problemas? ¿Qué eliminar?',
      'Prioriza y define acciones'
    ],
    tips: [
      'Empieza con las rosas para crear ambiente positivo',
      'Los brotes son oportunidades de mejora',
      'Transforma espinas en acciones concretas'
    ]
  },
  'sailboat': {
    title: 'Velero (Sailboat)',
    description: 'Metáfora de retrospectiva: el equipo es un velero navegando hacia una meta, con vientos que impulsan y anclas que frenan.',
    steps: [
      '🏝️ Isla: Define la meta/visión del equipo',
      '💨 Viento: ¿Qué nos impulsa hacia adelante?',
      '⚓ Ancla: ¿Qué nos frena o detiene?',
      '🪨 Rocas: ¿Qué riesgos vemos adelante?'
    ],
    tips: [
      'Visualiza el velero en el centro',
      'Los vientos son fortalezas a mantener',
      'Las anclas son problemas a resolver'
    ]
  },
  'start-stop-continue': {
    title: 'Start, Stop, Continue',
    description: 'Framework simple de retrospectiva que identifica qué comenzar, qué dejar de hacer y qué continuar.',
    steps: [
      '🟢 Start: ¿Qué deberíamos empezar a hacer?',
      '🔴 Stop: ¿Qué deberíamos dejar de hacer?',
      '🟡 Continue: ¿Qué debemos seguir haciendo?',
      'Prioriza y asigna responsables'
    ],
    tips: [
      'Sé específico en cada categoría',
      'Los "stops" requieren valentía - crea espacio seguro',
      'Celebra los "continues" - reconoce lo bueno'
    ]
  },
  'swot': {
    title: 'Análisis SWOT/FODA',
    description: 'Framework estratégico que analiza Fortalezas, Oportunidades, Debilidades y Amenazas de un proyecto u organización.',
    steps: [
      '💪 Fortalezas: Ventajas internas actuales',
      '⚠️ Debilidades: Limitaciones internas actuales',
      '🎯 Oportunidades: Factores externos favorables',
      '⚡ Amenazas: Factores externos desfavorables'
    ],
    tips: [
      'Fortalezas/Debilidades = factores internos (controlables)',
      'Oportunidades/Amenazas = factores externos',
      'Usa SWOT para planificación estratégica'
    ]
  },
  'soar': {
    title: 'Análisis SOAR',
    description: 'Alternativa positiva al SWOT que se enfoca en Fortalezas, Oportunidades, Aspiraciones y Resultados.',
    steps: [
      '💪 Fortalezas: ¿En qué somos buenos?',
      '🎯 Oportunidades: ¿Qué posibilidades tenemos?',
      '✨ Aspiraciones: ¿Qué queremos lograr?',
      '🏆 Resultados: ¿Cómo mediremos el éxito?'
    ],
    tips: [
      'Enfoque apreciativo - construye desde lo positivo',
      'Ideal para planificación y visión',
      'Más motivador que SWOT tradicional'
    ]
  },
  'six-hats': {
    title: '6 Sombreros de Bono',
    description: 'Técnica de pensamiento paralelo donde cada "sombrero" representa una perspectiva diferente para analizar un tema.',
    steps: [
      '⚪ Blanco: Hechos y datos objetivos',
      '🔴 Rojo: Emociones e intuiciones',
      '⚫ Negro: Crítica y riesgos',
      '🟡 Amarillo: Beneficios y optimismo',
      '🟢 Verde: Creatividad y alternativas',
      '🔵 Azul: Control del proceso'
    ],
    tips: [
      'Todos usan el mismo sombrero a la vez',
      'El sombrero azul modera la sesión',
      'Evita que las discusiones se mezclen'
    ]
  },
  'crazy-8s': {
    title: 'Crazy 8s',
    description: 'Técnica de Design Sprint para generar 8 ideas en 8 minutos, forzando pensamiento rápido y creativo.',
    steps: [
      'Dobla una hoja en 8 secciones',
      'Tienes 1 minuto por sección',
      'Dibuja/escribe una idea por sección',
      'No borres ni juzgues - solo genera'
    ],
    tips: [
      'La presión de tiempo libera creatividad',
      'Bocetos rápidos, no arte perfecto',
      'Ideal antes de votar por la mejor idea'
    ]
  },
  'affinity-map': {
    title: 'Mapa de Afinidad',
    description: 'Técnica para organizar grandes cantidades de ideas agrupándolas por temas o categorías similares.',
    steps: [
      'Genera todas las ideas (post-its virtuales)',
      'Agrupa ideas similares',
      'Nombra cada grupo/categoría',
      'Identifica patrones y prioridades'
    ],
    tips: [
      'Trabaja en silencio durante el agrupamiento',
      'Los grupos emergen naturalmente',
      'Ideal después de brainstorming o investigación'
    ]
  },
  'fist-of-five': {
    title: 'Puño de Cinco',
    description: 'Técnica de consenso rápido donde cada persona muestra 0-5 dedos para indicar su nivel de acuerdo.',
    steps: [
      'El facilitador hace una propuesta',
      'Todos muestran dedos simultáneamente',
      '5 = totalmente de acuerdo',
      '0-2 = necesita discusión adicional'
    ],
    tips: [
      '0-2: Veto - requiere discusión',
      '3: Apoyo con reservas',
      '4-5: Apoyo total'
    ]
  },
  'confidence-vote': {
    title: 'Voto de Confianza',
    description: 'Mide el nivel de confianza del equipo en una decisión, estimación o plan.',
    steps: [
      'Presenta la propuesta/plan',
      'Cada persona vota su nivel de confianza (1-5)',
      'Discute los votos bajos',
      'Ajusta el plan si es necesario'
    ],
    tips: [
      'Votos bajos no son críticas personales',
      'Explora las razones de baja confianza',
      'Busca un mínimo de 3/5 promedio'
    ]
  },
  'nps': {
    title: 'Net Promoter Score (NPS)',
    description: 'Métrica que mide la probabilidad de recomendación en una escala de 0-10.',
    steps: [
      'Pregunta: "¿Qué tan probable es que recomiendes...?"',
      'Los participantes votan de 0 a 10',
      'Se calculan: Promotores (9-10), Pasivos (7-8), Detractores (0-6)',
      'NPS = % Promotores - % Detractores'
    ],
    tips: [
      'NPS > 0 es positivo, > 50 es excelente',
      'Pregunta "¿Por qué?" para entender los votos',
      'Útil para feedback de clientes o equipo'
    ]
  },
  'action-items': {
    title: 'Lista de Acciones',
    description: 'Registro de tareas con responsable, fecha límite y seguimiento de estado.',
    steps: [
      'Define la acción específica',
      'Asigna un responsable',
      'Establece fecha límite',
      'Haz seguimiento del progreso'
    ],
    tips: [
      'Acciones deben ser específicas y medibles',
      'Un solo responsable por acción',
      'Revisa el avance regularmente'
    ]
  },
  'checklist': {
    title: 'Checklist',
    description: 'Lista de verificación para asegurar que se completen todos los pasos o requisitos.',
    steps: [
      'Lista todos los items a verificar',
      'Ordena por prioridad o secuencia',
      'Marca cada item al completarlo',
      'Revisa que todo esté completo'
    ],
    tips: [
      'Ideal para procesos repetitivos',
      'Reduce errores por olvido',
      'Mantén las listas actualizadas'
    ]
  },
  'agenda': {
    title: 'Agenda de Reunión',
    description: 'Estructura los temas a tratar en una reunión con tiempos asignados.',
    steps: [
      'Lista los temas a discutir',
      'Asigna tiempo a cada tema',
      'Designa presentador si aplica',
      'Sigue el orden durante la reunión'
    ],
    tips: [
      'Comparte la agenda antes de la reunión',
      'Respeta los tiempos asignados',
      'Deja tiempo para preguntas'
    ]
  },
  'parking-lot': {
    title: 'Parking Lot (Estacionamiento)',
    description: 'Espacio para "estacionar" temas importantes que surgen pero no corresponden al momento actual.',
    steps: [
      'Cuando surge un tema fuera de agenda, anótalo',
      'Continúa con el tema actual',
      'Al final, revisa los temas estacionados',
      'Programa tiempo para abordarlos'
    ],
    tips: [
      'Evita desviaciones en reuniones',
      'Valida que los temas son importantes',
      'No dejes temas abandonados'
    ]
  },
  'estimation-poker': {
    title: 'Planning Poker',
    description: 'Técnica ágil para estimar esfuerzo usando cartas con valores de Fibonacci, promoviendo discusión.',
    steps: [
      'Presenta la historia/tarea a estimar',
      'Cada persona elige una carta en secreto',
      'Todos revelan simultáneamente',
      'Discute las diferencias y re-estima si es necesario'
    ],
    tips: [
      'Usa Fibonacci: 1, 2, 3, 5, 8, 13, 21...',
      'Las diferencias grandes indican falta de entendimiento',
      'El debate es más valioso que el número final'
    ]
  },
  'kudos-wall': {
    title: 'Muro de Kudos',
    description: 'Espacio para reconocer públicamente los logros y contribuciones de los miembros del equipo.',
    steps: [
      'Escribe un reconocimiento específico',
      'Menciona a quién va dirigido',
      'Explica por qué lo merece',
      'Comparte con el equipo'
    ],
    tips: [
      'Sé específico sobre la contribución',
      'Reconoce comportamientos, no solo resultados',
      'Fomenta que todos participen'
    ]
  },
  'icebreaker': {
    title: 'Icebreaker (Rompe-hielo)',
    description: 'Pregunta o actividad para crear conexión y energía positiva al inicio de una sesión.',
    steps: [
      'El facilitador lanza una pregunta',
      'Cada participante responde brevemente',
      'Se crea un ambiente relajado',
      'Se procede con la agenda principal'
    ],
    tips: [
      'Preguntas ligeras y divertidas',
      'Respuestas cortas (30 seg - 1 min)',
      'Ideal para equipos remotos o nuevos'
    ]
  },
  'team-health': {
    title: 'Team Health Check (Spotify)',
    description: 'Metodología de Spotify para evaluar la salud del equipo en diferentes dimensiones.',
    steps: [
      'Evalúa cada área de 1-5',
      'Verde = bien, Amarillo = ok, Rojo = problema',
      'Discute las áreas en rojo',
      'Define acciones de mejora'
    ],
    tips: [
      'Hazlo regularmente (mensual)',
      'Compara tendencias en el tiempo',
      'Enfócate en 1-2 áreas a mejorar'
    ]
  },
  'mood': {
    title: 'Check-in de Estado de Ánimo',
    description: 'Captura rápida del estado emocional del equipo al inicio de una sesión.',
    steps: [
      'Cada persona comparte su estado',
      'Usa emojis o escala simple',
      'No se juzga ni se profundiza',
      'Ayuda a calibrar la energía del equipo'
    ],
    tips: [
      'Rápido: 1-2 minutos total',
      'Opcional: agregar una palabra',
      'Ajusta la sesión según el ánimo general'
    ]
  },
  'standup': {
    title: 'Daily Standup',
    description: 'Reunión diaria corta donde cada miembro comparte su progreso, plan y bloqueos.',
    steps: [
      '¿Qué hice ayer?',
      '¿Qué haré hoy?',
      '¿Tengo algún bloqueo?',
      'Máximo 15 minutos total'
    ],
    tips: [
      'De pie para mantenerlo corto',
      'Respuestas de 1-2 minutos por persona',
      'Los bloqueos se resuelven después'
    ]
  },
  'scamper': {
    title: 'SCAMPER',
    description: 'Técnica de creatividad con 7 preguntas para generar ideas innovadoras sobre un producto o servicio existente.',
    steps: [
      'S - Sustituir: ¿Qué puedo reemplazar?',
      'C - Combinar: ¿Qué puedo unir o mezclar?',
      'A - Adaptar: ¿Qué puedo ajustar o copiar de otro contexto?',
      'M - Modificar: ¿Qué puedo cambiar (tamaño, forma, color)?',
      'P - Propósito: ¿Para qué más puede servir?',
      'E - Eliminar: ¿Qué puedo quitar o simplificar?',
      'R - Reorganizar: ¿Qué puedo invertir o reordenar?'
    ],
    tips: [
      'Aplica cada letra al producto/servicio',
      'No todas las preguntas aplican siempre',
      'Genera múltiples ideas por categoría'
    ]
  },
  'starbursting': {
    title: 'Starbursting (Estrella de Preguntas)',
    description: 'Técnica que genera preguntas en 6 dimensiones (Qué, Quién, Dónde, Cuándo, Por qué, Cómo) para explorar un tema.',
    steps: [
      '❓ Qué: ¿Qué es? ¿Qué incluye? ¿Qué necesita?',
      '👤 Quién: ¿Quién lo usará? ¿Quién lo hará?',
      '📍 Dónde: ¿Dónde se usará? ¿Dónde se implementará?',
      '📅 Cuándo: ¿Cuándo estará listo? ¿Cuándo se necesita?',
      '💡 Por qué: ¿Por qué es necesario? ¿Por qué ahora?',
      '⚙️ Cómo: ¿Cómo funcionará? ¿Cómo lo haremos?'
    ],
    tips: [
      'Genera muchas preguntas antes de responder',
      'Las preguntas revelan lo que no sabemos',
      'Ideal para nuevos proyectos o productos'
    ]
  },
  'reverse-brainstorm': {
    title: 'Brainstorming Inverso',
    description: 'Técnica creativa que pregunta "¿Cómo causaríamos el problema?" para luego invertir las respuestas en soluciones.',
    steps: [
      'Define el problema a resolver',
      'Pregunta: "¿Cómo podríamos CAUSAR este problema?"',
      'Genera ideas de cómo empeorar las cosas',
      'Invierte cada idea en una solución positiva'
    ],
    tips: [
      'Es más fácil pensar en cómo causar problemas',
      'Libera creatividad sin autocensura',
      'Las soluciones invertidas son sorprendentemente útiles'
    ]
  },
  'worst-idea': {
    title: 'Peores Ideas',
    description: 'Técnica donde se generan intencionalmente las peores ideas posibles, para luego transformarlas en buenas.',
    steps: [
      'Define el desafío o pregunta',
      'Genera las peores ideas posibles',
      'Analiza qué hace "mala" a cada idea',
      'Transforma cada mala idea en una buena'
    ],
    tips: [
      'Elimina el miedo a proponer ideas',
      'Las malas ideas a menudo contienen semillas de buenas',
      'Muy divertido y energizante'
    ]
  },
  'lotus-blossom': {
    title: 'Lotus Blossom (Flor de Loto)',
    description: 'Técnica de expansión de ideas: una idea central se rodea de 8 pétalos, cada uno con sub-ideas.',
    steps: [
      'Escribe la idea central en el centro',
      'Genera 8 temas/aspectos relacionados (pétalos)',
      'Para cada pétalo, genera más sub-ideas',
      'Explora las conexiones entre pétalos'
    ],
    tips: [
      'Ideal para explorar un concepto en profundidad',
      'Los pétalos pueden ser categorías o perspectivas',
      'Combina con dot-voting para priorizar'
    ]
  },
  'five-whys': {
    title: '5 Porqués (5 Whys)',
    description: 'Técnica de análisis de causa raíz que pregunta "¿Por qué?" repetidamente hasta llegar a la causa fundamental.',
    steps: [
      'Define el problema claramente',
      'Pregunta "¿Por qué ocurre?" - primera respuesta',
      'Pregunta "¿Por qué?" sobre esa respuesta',
      'Repite hasta llegar a la causa raíz (generalmente 5 veces)',
      'Define acciones para la causa raíz'
    ],
    tips: [
      'No siempre son exactamente 5 porqués',
      'Evita culpar personas - enfócate en procesos',
      'Puede haber múltiples ramas de causas'
    ]
  },
  'impact-effort': {
    title: 'Matriz Impacto/Esfuerzo',
    description: 'Framework de priorización 2x2 que clasifica ideas según su impacto potencial y esfuerzo requerido.',
    steps: [
      'Lista las ideas/tareas a priorizar',
      'Evalúa el impacto de cada una (alto/bajo)',
      'Evalúa el esfuerzo requerido (alto/bajo)',
      'Clasifica en los 4 cuadrantes'
    ],
    tips: [
      '🚀 Quick Wins (alto impacto, bajo esfuerzo): Hacer primero',
      '🎯 Big Bets (alto impacto, alto esfuerzo): Planificar bien',
      '📝 Fill-ins (bajo impacto, bajo esfuerzo): Si hay tiempo',
      '⚠️ Time Sinks (bajo impacto, alto esfuerzo): Evitar'
    ]
  },
  'opportunity-tree': {
    title: 'Árbol de Oportunidades',
    description: 'Framework visual que conecta un objetivo con oportunidades y las soluciones propuestas para cada una.',
    steps: [
      'Define el objetivo/outcome deseado (raíz)',
      'Identifica oportunidades que llevan al objetivo',
      'Para cada oportunidad, genera posibles soluciones',
      'Prioriza las soluciones a implementar'
    ],
    tips: [
      'Un objetivo puede tener múltiples oportunidades',
      'Las oportunidades son necesidades del usuario',
      'Las soluciones son ideas a experimentar'
    ]
  },
  'inception-deck': {
    title: 'Inception Deck (Mazo de Incepción)',
    description: 'Conjunto de 10 ejercicios para alinear al equipo al inicio de un proyecto sobre visión, alcance y expectativas.',
    steps: [
      'Completa las 10 cartas con el equipo',
      'Incluye: Why, Elevator Pitch, NOT list, Neighbors...',
      'Discute cada carta hasta lograr consenso',
      'Documenta y comparte con stakeholders'
    ],
    tips: [
      'Ideal al inicio de proyectos nuevos',
      'Involucra a todos los stakeholders clave',
      'Revisa si hay cambios significativos'
    ]
  },
  'delegation-poker': {
    title: 'Delegation Poker (Management 3.0)',
    description: 'Técnica para clarificar niveles de delegación entre manager y equipo en diferentes decisiones.',
    steps: [
      'Lista las decisiones a discutir',
      'Cada persona vota el nivel de delegación (1-7)',
      'Se revelan y discuten las diferencias',
      'Se acuerda el nivel para cada decisión'
    ],
    tips: [
      'Niveles: 1=Tell, 2=Sell, 3=Consult, 4=Agree, 5=Advise, 6=Inquire, 7=Delegate',
      'Clarifica expectativas de autonomía',
      'Revisa periódicamente si cambia el contexto'
    ]
  },
  'moving-motivators': {
    title: 'Moving Motivators (Management 3.0)',
    description: 'Ejercicio para descubrir qué motiva a cada persona del equipo ordenando 10 motivadores.',
    steps: [
      'Ordena los 10 motivadores de más a menos importante',
      'Comparte tu orden con el equipo',
      'Marca cuáles suben o bajan con un cambio',
      'Discute insights y diferencias'
    ],
    tips: [
      'Los 10: Curiosidad, Honor, Aceptación, Maestría, Poder, Libertad, Relación, Orden, Meta, Estatus',
      'No hay respuestas correctas o incorrectas',
      'Útil para entender qué motiva al equipo'
    ]
  },
  // Nuevos widgets batch 2
  'lean-coffee': {
    title: 'Lean Coffee',
    description: 'Formato de reunión estructurada donde los participantes proponen, votan y discuten temas en timeboxes.',
    steps: [
      'Cada participante propone temas para discutir',
      'Todos votan los temas que les interesan',
      'Se discuten en orden de votos',
      'Cada tema tiene un tiempo límite (5 min)',
      'Al finalizar, se puede extender o pasar al siguiente'
    ],
    tips: [
      'Ideal para reuniones sin agenda predefinida',
      'Respetar el timebox mantiene el enfoque',
      'Los temas con más votos reflejan el interés real del grupo',
      'Puedes mover temas no discutidos a la próxima sesión'
    ]
  },
  'empathy-map': {
    title: 'Mapa de Empatía',
    description: 'Herramienta de Design Thinking para entender profundamente a usuarios o clientes desde 4 perspectivas.',
    steps: [
      'Define la persona/usuario a analizar',
      'Completa Dice: ¿Qué dice el usuario literalmente?',
      'Completa Piensa: ¿Qué pensamientos tiene?',
      'Completa Hace: ¿Qué acciones realiza?',
      'Completa Siente: ¿Qué emociones experimenta?'
    ],
    tips: [
      'Basarse en observaciones e investigación real',
      'Identificar contradicciones entre dice y piensa',
      'Usar para generar insights de necesidades',
      'Complementar con entrevistas y observación'
    ]
  },
  'moscow': {
    title: 'MoSCoW',
    description: 'Técnica clásica de priorización que categoriza requisitos en Must, Should, Could y Won\'t have.',
    steps: [
      'Lista todos los requisitos o features',
      'Must Have: Crítico, sin esto no funciona',
      'Should Have: Importante pero no crítico',
      'Could Have: Deseable si hay tiempo/recursos',
      'Won\'t Have: Fuera de alcance (por ahora)'
    ],
    tips: [
      'Must no debe ser más del 60% del esfuerzo',
      'Won\'t no significa nunca, sino no ahora',
      'Involucrar stakeholders en la priorización',
      'Revisar cuando cambie el contexto'
    ]
  },
  '4ls': {
    title: '4Ls Retrospective',
    description: 'Retrospectiva que explora 4 dimensiones: Liked, Learned, Lacked y Longed for.',
    steps: [
      'Liked: ¿Qué te gustó del sprint/período?',
      'Learned: ¿Qué aprendiste?',
      'Lacked: ¿Qué faltó o te hizo falta?',
      'Longed for: ¿Qué desearías tener/hacer?',
      'Discute patrones y define acciones'
    ],
    tips: [
      'Formato positivo y orientado al futuro',
      'Lacked y Longed for revelan oportunidades',
      'Bueno para equipos que necesitan variedad en retros',
      'Conectar Longed con acciones concretas'
    ]
  },
  'pre-mortem': {
    title: 'Pre-mortem',
    description: 'Técnica de gestión de riesgos: imaginar que el proyecto fracasó y analizar por qué.',
    steps: [
      'Imagina que el proyecto ya fracasó',
      'Lista todas las razones posibles del fracaso',
      'Identifica las causas raíz de cada fallo',
      'Define acciones preventivas (mitigaciones)',
      'Prioriza las mitigaciones más críticas'
    ],
    tips: [
      'Más efectivo que solo listar riesgos',
      'Libera el "pesimismo productivo"',
      'Hacer al inicio del proyecto',
      'Revisar periódicamente las mitigaciones'
    ]
  },
  'user-story-mapping': {
    title: 'User Story Mapping',
    description: 'Técnica para planificar releases visualizando el flujo de usuario y priorizando historias.',
    steps: [
      'Identifica las actividades principales del usuario (backbone)',
      'Debajo de cada actividad, agrega historias de usuario',
      'Organiza las historias verticalmente por prioridad',
      'Dibuja líneas horizontales para definir releases',
      'El primer release = MVP (walking skeleton)'
    ],
    tips: [
      'Lee de izquierda a derecha = flujo del usuario',
      'Lee de arriba a abajo = prioridad',
      'Involucra a todo el equipo en el mapeo',
      'Actualiza el mapa conforme avanza el producto'
    ]
  },
  // Nuevos widgets batch 3
  'starfish': {
    title: 'Starfish Retrospective',
    description: 'Retrospectiva en forma de estrella con 5 dimensiones: Keep Doing, Less Of, More Of, Stop Doing y Start Doing. Más completa que Start-Stop-Continue.',
    steps: [
      '✅ Keep Doing: ¿Qué está funcionando y debe continuar?',
      '📉 Less Of: ¿Qué deberíamos hacer menos?',
      '📈 More Of: ¿Qué deberíamos hacer más?',
      '🛑 Stop Doing: ¿Qué debemos dejar de hacer completamente?',
      '🚀 Start Doing: ¿Qué deberíamos empezar a hacer?'
    ],
    tips: [
      'Más matizada que Start-Stop-Continue',
      '"Less Of" y "More Of" permiten ajustes graduales',
      'Ideal para equipos maduros que buscan mejora continua',
      'Prioriza las acciones más impactantes'
    ]
  },
  'mad-sad-glad': {
    title: 'Mad Sad Glad',
    description: 'Retrospectiva emocional rápida que captura cómo se sintió el equipo. Ideal para verificar el pulso emocional.',
    steps: [
      '😠 Mad: ¿Qué te enojó o frustró?',
      '😢 Sad: ¿Qué te entristeció o decepcionó?',
      '😊 Glad: ¿Qué te alegró o satisfizo?',
      'Agrupa temas similares y discute',
      'Define acciones para mejorar el ánimo'
    ],
    tips: [
      'Muy rápida - ideal para equipos con poco tiempo',
      'Crea espacio seguro para expresar emociones',
      'No juzgar las emociones de otros',
      'Útil para detectar problemas de moral del equipo'
    ]
  },
  'how-might-we': {
    title: 'How Might We (¿Cómo podríamos...?)',
    description: 'Técnica de Design Thinking que transforma problemas en oportunidades de innovación mediante preguntas "¿Cómo podríamos...?"',
    steps: [
      '❓ Identifica los problemas o desafíos',
      '💡 Reformula cada problema como "¿Cómo podríamos...?"',
      '✨ Genera ideas y soluciones para cada HMW',
      'Prioriza las preguntas más prometedoras',
      'Desarrolla las mejores ideas'
    ],
    tips: [
      'Ni muy amplio (poco enfocado) ni muy estrecho (limita creatividad)',
      'Ejemplo: "Los usuarios olvidan sus contraseñas" → "¿Cómo podríamos hacer el login más memorable?"',
      'Puente perfecto entre investigación e ideación',
      'Genera múltiples HMW por cada problema'
    ]
  },
  'fishbone': {
    title: 'Diagrama de Ishikawa / Fishbone',
    description: 'Diagrama de causa-efecto en forma de espina de pescado para análisis de causa raíz. Clasifica las causas en 6 categorías.',
    steps: [
      'Define el problema (cabeza del pescado)',
      'Identifica causas en 6 categorías:',
      '👥 Personas: Factor humano, habilidades, capacitación',
      '⚙️ Procesos: Procedimientos, metodologías, flujos',
      '💻 Tecnología: Herramientas, sistemas, infraestructura',
      '📦 Materiales: Recursos, insumos, datos',
      '🌍 Entorno: Ambiente, cultura, factores externos',
      '📊 Medición: Métricas, KPIs, feedback'
    ],
    tips: [
      'También conocido como diagrama de Ishikawa o 6M',
      'Pregunta "¿Por qué?" para cada causa para profundizar',
      'Involucra a personas de diferentes áreas',
      'Ideal para problemas complejos con múltiples causas'
    ]
  },
  'raci': {
    title: 'Matriz RACI',
    description: 'Matriz de asignación de responsabilidades que clarifica quién hace qué en cada tarea del proyecto.',
    steps: [
      'Lista las tareas o entregables del proyecto',
      'Identifica los roles o personas involucradas',
      'Para cada combinación tarea-rol, asigna:',
      'R - Responsible: Ejecuta la tarea',
      'A - Accountable: Aprueba y responde (solo 1 por tarea)',
      'C - Consulted: Se consulta antes (comunicación bidireccional)',
      'I - Informed: Se informa después (comunicación unidireccional)'
    ],
    tips: [
      'Cada tarea debe tener exactamente 1 "A" (Accountable)',
      'Puede haber múltiples R, C, I',
      'Evita confusiones de "¿Quién decide esto?"',
      'Revisa cuando el equipo o alcance cambie'
    ]
  },
  'roman-voting': {
    title: 'Roman Voting (Votación Romana)',
    description: 'Técnica de consenso rápido con tres opciones: pulgar arriba (a favor), pulgar de lado (neutral), pulgar abajo (en contra). Más rápida que Puño de Cinco.',
    steps: [
      'El facilitador presenta la propuesta o pregunta',
      'Todos votan simultáneamente (oculto hasta revelar)',
      '👍 Pulgar arriba: A favor, apruebo',
      '👎 Pulgar abajo: En contra, tengo objeciones',
      '✊ Pulgar de lado: Neutral, me da igual',
      'Discute los votos en contra si los hay'
    ],
    tips: [
      'Más rápido que Puño de Cinco (3 vs 6 opciones)',
      'Ideal para decisiones binarias rápidas',
      'Los votos en contra deben explicarse',
      'Útil para validar consenso antes de continuar'
    ]
  },
  'lean-canvas': {
    title: 'Lean Canvas',
    description: 'Framework de 9 bloques para validar y comunicar modelos de negocio. Basado en Business Model Canvas, optimizado para startups y productos nuevos.',
    steps: [
      'Identifica los segmentos de clientes objetivo',
      'Define el problema que resuelves (top 3)',
      'Articula tu propuesta de valor única',
      'Describe la solución (features principales)',
      'Lista canales para llegar a clientes',
      'Define métricas clave de éxito',
      'Identifica estructura de costos',
      'Define flujos de ingresos',
      'Describe tu ventaja competitiva injusta'
    ],
    tips: [
      'Empieza por Problema y Segmento de Clientes',
      'La propuesta de valor debe ser clara y diferenciadora',
      'La ventaja injusta es algo difícil de copiar o comprar',
      'Itera el canvas a medida que aprendes del mercado'
    ]
  },
  'customer-journey': {
    title: 'Customer Journey Map',
    description: 'Visualización de la experiencia completa del cliente a través de todas las etapas de interacción con el producto o servicio.',
    steps: [
      'Define la persona/cliente objetivo',
      'Mapea las 5 etapas: Descubrimiento, Consideración, Compra, Retención, Recomendación',
      'Identifica touchpoints en cada etapa',
      'Registra emociones del cliente (positivas, neutrales, negativas)',
      'Documenta pain points y frustraciones',
      'Descubre oportunidades de mejora'
    ],
    tips: [
      'Basa el journey en datos reales, no suposiciones',
      'Incluye touchpoints digitales y físicos',
      'Los pain points son oro para encontrar oportunidades',
      'Usa el mapa para alinear al equipo en la experiencia'
    ]
  },
  'risk-matrix': {
    title: 'Matriz de Riesgos',
    description: 'Herramienta para identificar, evaluar y priorizar riesgos basándose en su probabilidad de ocurrencia e impacto potencial.',
    steps: [
      'Identifica posibles riesgos del proyecto',
      'Evalúa la probabilidad (1-5) de cada riesgo',
      'Evalúa el impacto (1-5) si ocurre',
      'El score = Probabilidad × Impacto',
      'Prioriza mitigación de riesgos con mayor score',
      'Define estrategias de mitigación'
    ],
    tips: [
      'Complementa bien con Pre-mortem',
      'Score 15-25: Riesgo crítico, actuar inmediato',
      'Score 8-14: Riesgo medio, monitorear',
      'Score 1-7: Riesgo bajo, aceptable',
      'Revisa la matriz periódicamente'
    ]
  },
  'rice': {
    title: 'RICE Scoring',
    description: 'Framework de priorización que evalúa iniciativas basándose en Reach (Alcance), Impact (Impacto), Confidence (Confianza) y Effort (Esfuerzo).',
    steps: [
      'Lista las iniciativas o features a priorizar',
      'Reach: ¿Cuántos usuarios impacta en un período?',
      'Impact: ¿Cuánto mejora la métrica clave? (0.25-3)',
      'Confidence: ¿Qué tan seguro estás? (0-100%)',
      'Effort: ¿Cuánto esfuerzo requiere? (persona-semanas)',
      'Score = (Reach × Impact × Confidence) ÷ Effort',
      'Prioriza las iniciativas con mayor score'
    ],
    tips: [
      'Impact: 3=masivo, 2=alto, 1=medio, 0.5=bajo, 0.25=mínimo',
      'Confidence: 100%=datos sólidos, 80%=evidencia, 50%=intuición',
      'Más robusto que Impacto/Esfuerzo simple',
      'Ideal para roadmap de producto'
    ]
  },
  'working-agreements': {
    title: 'Working Agreements',
    description: 'Acuerdos de trabajo del equipo que definen cómo colaboran, se comunican y operan juntos. Fundacional para equipos nuevos.',
    steps: [
      'Cada categoría representa un área de trabajo',
      'Comunicación: cómo nos comunicamos',
      'Reuniones: reglas de reuniones',
      'Código: estándares de desarrollo',
      'Colaboración: cómo trabajamos juntos',
      'Feedback: cómo damos y recibimos feedback',
      'Los miembros aprueban los acuerdos con los que están de acuerdo'
    ],
    tips: [
      'Revisa los acuerdos cada sprint o mes',
      'Los acuerdos deben ser accionables',
      'Menos es más: 3-5 acuerdos por categoría',
      'Todos deben tener voz en los acuerdos'
    ]
  },
  'brainwriting': {
    title: 'Brainwriting 6-3-5',
    description: 'Técnica de ideación donde 6 personas escriben 3 ideas en 5 minutos, luego pasan su "hoja" para construir sobre las ideas de otros. Mejor que brainstorm para introvertidos.',
    steps: [
      '6 participantes se unen a la sesión',
      'Ronda 1: Cada uno escribe 3 ideas en 5 minutos',
      'Ronda 2: Reciben ideas de otro y construyen sobre ellas',
      'Repetir hasta 6 rondas',
      'Resultado: Hasta 108 ideas (6×3×6)',
      'Revisar y agrupar las mejores ideas'
    ],
    tips: [
      'Sin críticas durante la generación',
      'Construir sobre ideas existentes es clave',
      'El timer ayuda a mantener el ritmo',
      'Funciona mejor que brainstorm verbal para equipos diversos'
    ]
  }
};

export default function DynamicFullscreen({
  dynamic,
  projectId,
  channelId,
  onlineUsers,
  onClose,
  onMinimize,
  onUpdate
}: DynamicFullscreenProps) {
  const { data: session } = useSession();
  const [closing, setClosing] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(5 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const iconConfig = DYNAMIC_ICONS[dynamic.commandType] || { icon: Target, color: 'text-gray-600' };
  const Icon = iconConfig.icon;

  const isClosed = dynamic.commandData?.closed ?? false;
  const isCreator = dynamic.commandData?.createdBy === session?.user?.id ||
                    dynamic.userId?._id === session?.user?.id;

  // Timer functionality
  useEffect(() => {
    if (timerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev === 0) {
            setTimerMinutes(m => {
              if (m === 0) {
                // Timer finished
                setTimerRunning(false);
                // Play sound
                if (audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
                return 0;
              }
              return m - 1;
            });
            return 59;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning, timerMinutes, timerSeconds]);

  const startTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    setTimerSeconds(0);
    setTimerInitialSeconds(minutes * 60);
    setTimerRunning(true);
    setShowTimer(true);
  };

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    const mins = Math.floor(timerInitialSeconds / 60);
    setTimerMinutes(mins);
    setTimerSeconds(0);
  };

  const timerProgress = timerInitialSeconds > 0
    ? ((timerMinutes * 60 + timerSeconds) / timerInitialSeconds) * 100
    : 0;

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Close/finalize the dynamic
  const handleCloseDynamic = async () => {
    if (!confirm('¿Estás seguro de que quieres finalizar esta dinámica? No se podrán hacer más cambios.')) {
      return;
    }

    setClosing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${dynamic._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandData: {
            ...dynamic.commandData,
            closed: true
          }
        })
      });

      if (response.ok) {
        // First close the fullscreen view, then update the list
        onClose();
        // Small delay to ensure state is updated before reload
        setTimeout(() => {
          onUpdate();
        }, 100);
      } else {
        alert('Error al cerrar la dinámica');
      }
    } catch (error) {
      console.error('Error closing dynamic:', error);
      alert('Error al cerrar la dinámica');
    } finally {
      setClosing(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMinimize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMinimize]);

  const renderDynamicComponent = () => {
    // Safety check for invalid dynamic data
    if (!dynamic || !dynamic.commandType) {
      return (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Error: Datos de dinámica inválidos</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
          >
            Volver
          </button>
        </div>
      );
    }

    // Ensure commandData exists with safe defaults
    const data = dynamic.commandData || {};

    // Safe getters for common fields
    const getTitle = () => data.title || data.question || data.topic || 'Sin título';
    const getQuestion = () => data.question || data.title || 'Sin pregunta';
    const getCreatedBy = () => data.createdBy || '';
    const isClosed = () => data.closed ?? false;

    const commonProps = {
      projectId,
      messageId: dynamic._id,
      channelId,
      onClose: onClose,
      onUpdate: onUpdate
    };

    switch (dynamic.commandType) {
      case 'poll':
        return (
          <PollCommand
            {...commonProps}
            question={getQuestion()}
            options={data.options || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'brainstorm':
        return (
          <BrainstormCommand
            {...commonProps}
            topic={getTitle()}
            ideas={data.ideas || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'dot-voting':
        return (
          <DotVotingCommand
            {...commonProps}
            question={getQuestion()}
            options={data.options || []}
            totalDotsPerUser={data.totalDotsPerUser || 5}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'blind-vote':
        return (
          <BlindVoteCommand
            {...commonProps}
            question={getQuestion()}
            options={data.options || []}
            createdBy={getCreatedBy()}
            revealed={data.revealed || false}
            closed={isClosed()}
          />
        );
      case 'nps':
        return (
          <NPSCommand
            {...commonProps}
            question={getQuestion()}
            votes={data.votes || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'mind-map':
        return (
          <MindMapCommand
            {...commonProps}
            title={getTitle()}
            nodes={data.nodes || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'decision-matrix':
        return (
          <DecisionMatrixCommand
            {...commonProps}
            title={getTitle()}
            options={data.options || []}
            criteria={data.criteria || []}
            cells={data.cells || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'action-items':
        return (
          <ActionItemsCommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'team-health':
        return (
          <TeamHealthCommand
            {...commonProps}
            title={getTitle()}
            areas={data.areas || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'confidence-vote':
        return (
          <ConfidenceVoteCommand
            {...commonProps}
            question={getQuestion()}
            votes={data.votes || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'agenda':
        return (
          <AgendaCommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'parking-lot':
        return (
          <ParkingLotCommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'kudos-wall':
        return (
          <KudosWallCommand
            {...commonProps}
            title={getTitle()}
            kudos={data.kudos || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'pomodoro':
        return (
          <PomodoroCommand
            {...commonProps}
            title={getTitle()}
            workMinutes={data.workMinutes || 25}
            breakMinutes={data.breakMinutes || 5}
            isRunning={data.isRunning || false}
            isPaused={data.isPaused || false}
            timeRemaining={data.timeRemaining || 25 * 60}
            isBreak={data.isBreak || false}
            sessionsCompleted={data.sessionsCompleted || 0}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'fist-of-five':
        return (
          <FistOfFiveCommand
            {...commonProps}
            question={getQuestion()}
            votes={data.votes || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'mood':
        return (
          <MoodCommand
            {...commonProps}
            question={getQuestion()}
            moods={data.moods || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'pros-cons':
        return (
          <ProsConsCommand
            {...commonProps}
            title={getTitle()}
            pros={data.pros || []}
            cons={data.cons || []}
            createdBy={getCreatedBy()}
          />
        );
      case 'ranking':
        return (
          <RankingCommand
            {...commonProps}
            question={getQuestion()}
            options={data.options || []}
            rankings={data.rankings || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'checklist':
        return (
          <ChecklistCommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
          />
        );
      case 'estimation-poker':
        return (
          <EstimationPokerCommand
            {...commonProps}
            topic={data.story || getTitle()}
            estimates={data.estimates || []}
            revealed={data.revealed || false}
            finalEstimate={data.finalEstimate}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'retrospective':
        return (
          <RetrospectiveCommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'retro':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type={data.type || 'rose-bud-thorn'}
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<RotateCcw className="text-white" size={20} />}
            gradient="from-pink-50 to-green-50"
            border="border-pink-400"
          />
        );
      case 'icebreaker':
        return (
          <IcebreakerCommand
            {...commonProps}
            question={getQuestion()}
            responses={data.responses || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'inception-deck':
        return (
          <InceptionDeckCommand
            {...commonProps}
            title={getTitle()}
            cards={data.cards || []}
            currentCardIndex={data.currentCardIndex || 0}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'delegation-poker':
        return (
          <DelegationPokerCommand
            {...commonProps}
            title={getTitle()}
            topics={data.topics || []}
            currentTopicIndex={data.currentTopicIndex || 0}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'moving-motivators':
        return (
          <MovingMotivatorsCommand
            {...commonProps}
            title={getTitle()}
            context={data.context || ''}
            rankings={data.rankings || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'swot':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="swot"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<Target className="text-white" size={20} />}
            gradient="from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900"
            border="border-emerald-400 dark:border-emerald-600"
          />
        );
      case 'soar':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="soar"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🚀</span>}
            gradient="from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900"
            border="border-teal-400 dark:border-teal-600"
          />
        );
      case 'six-hats':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="six-hats"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🎩</span>}
            gradient="from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900"
            border="border-slate-400 dark:border-slate-600"
          />
        );
      case 'crazy-8s':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="crazy-8s"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🎨</span>}
            gradient="from-fuchsia-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"
            border="border-fuchsia-400 dark:border-fuchsia-600"
          />
        );
      case 'affinity-map':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="affinity-map"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">📌</span>}
            gradient="from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900"
            border="border-amber-400 dark:border-amber-600"
          />
        );
      case 'rose-bud-thorn':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="rose-bud-thorn"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🌹</span>}
            gradient="from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900"
            border="border-pink-400 dark:border-pink-600"
          />
        );
      case 'sailboat':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="sailboat"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">⛵</span>}
            gradient="from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900"
            border="border-blue-400 dark:border-blue-600"
          />
        );
      case 'start-stop-continue':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="start-stop-continue"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🚦</span>}
            gradient="from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900"
            border="border-green-400 dark:border-green-600"
          />
        );
      case 'standup':
        return (
          <StandupCommand
            projectId={projectId}
            onClose={onClose}
          />
        );
      // Nuevos widgets de ideación basados en secciones
      case 'scamper':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="scamper"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🔧</span>}
            gradient="from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900"
            border="border-amber-400 dark:border-amber-600"
          />
        );
      case 'starbursting':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="starbursting"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">⭐</span>}
            gradient="from-cyan-50 to-sky-50 dark:from-gray-800 dark:to-gray-900"
            border="border-cyan-400 dark:border-cyan-600"
          />
        );
      case 'reverse-brainstorm':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="reverse-brainstorm"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🔄</span>}
            gradient="from-red-50 to-rose-50 dark:from-gray-800 dark:to-gray-900"
            border="border-red-400 dark:border-red-600"
          />
        );
      case 'worst-idea':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="worst-idea"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">💡</span>}
            gradient="from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900"
            border="border-orange-400 dark:border-orange-600"
          />
        );
      case 'lotus-blossom':
        return (
          <LotusBlossomCommand
            {...commonProps}
            title={getTitle()}
            centerIdea={data.centerIdea || getTitle()}
            petals={data.petals || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      // Nuevos widgets de análisis
      case 'five-whys':
        return (
          <FiveWhysCommand
            {...commonProps}
            title={getTitle()}
            problem={data.problem || ''}
            whys={data.whys || []}
            rootCause={data.rootCause || ''}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'impact-effort':
        return (
          <ImpactEffortCommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'opportunity-tree':
        return (
          <OpportunityTreeCommand
            {...commonProps}
            title={getTitle()}
            objective={data.objective || getTitle()}
            opportunities={data.opportunities || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      // Nuevos widgets batch 2
      case 'empathy-map':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="empathy-map"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">❤️</span>}
            gradient="from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"
            border="border-rose-400 dark:border-rose-600"
          />
        );
      case 'moscow':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="moscow"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">🎯</span>}
            gradient="from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900"
            border="border-blue-400 dark:border-blue-600"
          />
        );
      case '4ls':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="4ls"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">4️⃣</span>}
            gradient="from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900"
            border="border-violet-400 dark:border-violet-600"
          />
        );
      case 'pre-mortem':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="pre-mortem"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">💀</span>}
            gradient="from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900"
            border="border-red-400 dark:border-red-600"
          />
        );
      case 'lean-coffee':
        return (
          <LeanCoffeeCommand
            {...commonProps}
            title={getTitle()}
            topics={data.topics || []}
            currentTopic={data.currentTopic}
            timePerTopic={data.timePerTopic || 5}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'user-story-mapping':
        return (
          <UserStoryMappingCommand
            {...commonProps}
            title={getTitle()}
            activities={data.activities || []}
            releases={data.releases || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      // Nuevos widgets batch 3
      case 'starfish':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="starfish"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">⭐</span>}
            gradient="from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900"
            border="border-orange-400 dark:border-orange-600"
          />
        );
      case 'mad-sad-glad':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="mad-sad-glad"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">😊</span>}
            gradient="from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900"
            border="border-pink-400 dark:border-pink-600"
          />
        );
      case 'how-might-we':
        return (
          <RetroCommand
            {...commonProps}
            title={getTitle()}
            sections={data.sections || []}
            type="how-might-we"
            createdBy={getCreatedBy()}
            closed={isClosed()}
            icon={<span className="text-white text-xl">💡</span>}
            gradient="from-yellow-50 to-amber-50 dark:from-gray-800 dark:to-gray-900"
            border="border-yellow-400 dark:border-yellow-600"
          />
        );
      case 'fishbone':
        return (
          <FishboneCommand
            {...commonProps}
            title={getTitle()}
            problem={data.problem || getTitle()}
            categories={data.categories || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'raci':
        return (
          <RACICommand
            {...commonProps}
            title={getTitle()}
            roles={data.roles || []}
            tasks={data.tasks || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'roman-voting':
        return (
          <RomanVotingCommand
            {...commonProps}
            title={getTitle()}
            question={data.question || getTitle()}
            votes={data.votes || []}
            revealed={data.revealed || false}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'lean-canvas':
        return (
          <LeanCanvasCommand
            {...commonProps}
            title={getTitle()}
            blocks={data.blocks || {}}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'customer-journey':
        return (
          <CustomerJourneyCommand
            {...commonProps}
            title={getTitle()}
            persona={data.persona || ''}
            stages={data.stages || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'risk-matrix':
        return (
          <RiskMatrixCommand
            {...commonProps}
            title={getTitle()}
            risks={data.risks || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'rice':
        return (
          <RICECommand
            {...commonProps}
            title={getTitle()}
            items={data.items || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'working-agreements':
        return (
          <WorkingAgreementsCommand
            {...commonProps}
            title={getTitle()}
            categories={data.categories || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      case 'brainwriting':
        return (
          <BrainwritingCommand
            {...commonProps}
            title={getTitle()}
            rounds={data.rounds || []}
            currentRound={data.currentRound || 0}
            timePerRound={data.timePerRound || 5}
            ideasPerRound={data.ideasPerRound || 3}
            participants={data.participants || []}
            ideas={data.ideas || []}
            createdBy={getCreatedBy()}
            closed={isClosed()}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-gray-500">
            Tipo de dinámica no soportado: {dynamic.commandType}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Bar */}
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700`}>
            <Icon className={iconConfig.color} size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {dynamic.commandData?.title || dynamic.commandData?.question || 'Dinámica'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Creado por {dynamic.userId?.name || 'Usuario'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Online Users */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800"
                  title={user.info.name}
                >
                  {user.info.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs font-medium border-2 border-white dark:border-gray-800">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {onlineUsers.length} online
            </span>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm font-medium ${
              showHelp
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            }`}
            title="Ver metodología"
          >
            <BookOpen size={16} />
            Guía
          </button>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {!showTimer ? (
              <div className="relative group">
                <button
                  onClick={() => setShowTimer(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition text-sm font-medium"
                >
                  <Timer size={16} />
                  Timer
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                {/* Timer presets */}
                {!timerRunning && timerMinutes === Math.floor(timerInitialSeconds / 60) && timerSeconds === 0 && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5, 10].map(mins => (
                      <button
                        key={mins}
                        onClick={() => startTimer(mins)}
                        className="px-2 py-0.5 text-xs rounded bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300 dark:hover:bg-purple-700"
                      >
                        {mins}m
                      </button>
                    ))}
                    <span className="text-purple-400 mx-1">|</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="min"
                      className="w-12 px-1.5 py-0.5 text-xs rounded bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-200 text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value);
                          if (val > 0 && val <= 120) {
                            startTimer(val);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 0 && val <= 120) {
                          startTimer(val);
                        }
                      }}
                    />
                  </div>
                )}
                {/* Timer display */}
                {(timerRunning || timerMinutes !== Math.floor(timerInitialSeconds / 60) || timerSeconds !== 0) && (
                  <>
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-purple-200 dark:text-purple-800"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={100}
                          strokeDashoffset={100 - timerProgress}
                          className={`${timerMinutes === 0 && timerSeconds <= 30 ? 'text-red-500' : 'text-purple-600 dark:text-purple-400'}`}
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${timerMinutes === 0 && timerSeconds <= 30 ? 'text-red-600' : 'text-purple-700 dark:text-purple-300'}`}>
                        {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={toggleTimer}
                      className="p-1.5 rounded-lg bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300"
                    >
                      {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="p-1.5 rounded-lg bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300"
                    >
                      <RotateCw size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowTimer(false);
                    setTimerRunning(false);
                  }}
                  className="p-1 text-purple-500 hover:text-purple-700"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {/* Hidden audio for timer end */}
            <audio ref={audioRef} src="/sounds/timer-end.mp3" preload="auto" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Finalizar button - only for creator and not closed */}
            {isCreator && !isClosed && (
              <button
                onClick={handleCloseDynamic}
                disabled={closing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition text-sm font-medium disabled:opacity-50"
                title="Finalizar dinámica"
              >
                {closing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Finalizar
              </button>
            )}
            {isClosed && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                <Lock size={14} />
                Finalizada
              </span>
            )}
            <button
              onClick={onMinimize}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              title="Minimizar (Esc)"
            >
              <Minimize2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
              title="Salir"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Content with Help Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className={`flex-1 overflow-auto p-4 transition-all ${showHelp ? 'pr-2' : ''}`}>
          <div className="w-full h-full">
            <ErrorBoundary
              componentName={`dinámica ${dynamic.commandType}`}
              onClose={onClose}
            >
              {renderDynamicComponent()}
            </ErrorBoundary>
          </div>
        </div>

        {/* Methodology Help Panel */}
        {showHelp && (
          <div className="w-80 lg:w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-blue-500" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Guía de Metodología
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              {METHODOLOGY_GUIDE[dynamic.commandType] ? (
                <div className="space-y-4">
                  {/* Title & Description */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 text-lg mb-2">
                      {METHODOLOGY_GUIDE[dynamic.commandType].title}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {METHODOLOGY_GUIDE[dynamic.commandType].description}
                    </p>
                  </div>

                  {/* Steps */}
                  <div>
                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-xs">
                        ✓
                      </span>
                      Pasos a seguir
                    </h5>
                    <ol className="space-y-2 ml-2">
                      {METHODOLOGY_GUIDE[dynamic.commandType].steps.map((step, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tips */}
                  <div>
                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs">
                        💡
                      </span>
                      Tips y recomendaciones
                    </h5>
                    <ul className="space-y-2 ml-2">
                      {METHODOLOGY_GUIDE[dynamic.commandType].tips.map((tip, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="flex-shrink-0 text-amber-500">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <HelpCircle size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No hay guía disponible para este tipo de dinámica.</p>
                </div>
              )}

              {/* Footer tip */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Presiona el botón "Guía" para ocultar este panel
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
