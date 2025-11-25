'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  Users,
  Lightbulb,
  Target,
  AlertTriangle,
  DollarSign,
  Package,
  MapPin,
  Rocket,
  Clock,
  X
} from 'lucide-react';

interface CardResponse {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface InceptionCard {
  id: string;
  title: string;
  question: string;
  description: string;
  icon: string;
  color: string;
  responses: CardResponse[];
  completed: boolean;
}

interface InceptionDeckCommandProps {
  projectId: string;
  messageId?: string;
  channelId: string;
  title: string;
  cards: InceptionCard[];
  currentCardIndex: number;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const DEFAULT_CARDS: Omit<InceptionCard, 'responses' | 'completed'>[] = [
  {
    id: '1',
    title: '¿Por qué estamos aquí?',
    question: '¿Cuál es el propósito principal de este proyecto?',
    description: 'Define la razón de ser del proyecto y qué problema resuelve.',
    icon: 'target',
    color: 'bg-blue-500'
  },
  {
    id: '2',
    title: 'Elevator Pitch',
    question: 'Resume el proyecto en 30 segundos',
    description: 'Para [cliente objetivo] que [necesidad], el [producto] es un [categoría] que [beneficio clave]. A diferencia de [competencia], nuestro producto [diferenciador único].',
    icon: 'rocket',
    color: 'bg-purple-500'
  },
  {
    id: '3',
    title: 'Caja del Producto',
    question: '¿Cómo venderías este producto?',
    description: 'Diseña la "caja" del producto: nombre, eslogan, 3 beneficios principales y características destacadas.',
    icon: 'package',
    color: 'bg-pink-500'
  },
  {
    id: '4',
    title: 'Lista de NO',
    question: '¿Qué NO vamos a hacer?',
    description: 'Define claramente qué está fuera del alcance. Tan importante como lo que sí haremos.',
    icon: 'x',
    color: 'bg-red-500'
  },
  {
    id: '5',
    title: 'Conoce a tus Vecinos',
    question: '¿Quiénes son los stakeholders?',
    description: 'Identifica a todas las personas y equipos que impactan o son impactados por el proyecto.',
    icon: 'users',
    color: 'bg-green-500'
  },
  {
    id: '6',
    title: 'Muestra la Solución',
    question: '¿Cómo se ve la arquitectura?',
    description: 'Dibuja un diagrama de alto nivel de la solución técnica propuesta.',
    icon: 'layers',
    color: 'bg-indigo-500'
  },
  {
    id: '7',
    title: '¿Qué nos quita el sueño?',
    question: '¿Cuáles son los mayores riesgos?',
    description: 'Identifica los riesgos técnicos, de negocio o de equipo que podrían hacer fracasar el proyecto.',
    icon: 'alert',
    color: 'bg-orange-500'
  },
  {
    id: '8',
    title: 'Tamaño del Proyecto',
    question: '¿Qué tan grande es esto?',
    description: 'Estima el tamaño: ¿semanas, meses, trimestres? ¿Cuántas personas necesitamos?',
    icon: 'clock',
    color: 'bg-teal-500'
  },
  {
    id: '9',
    title: '¿Qué vamos a sacrificar?',
    question: 'Tiempo, Alcance, Presupuesto, Calidad - ¿qué es negociable?',
    description: 'No podemos tener todo. Define las prioridades y qué estamos dispuestos a ceder.',
    icon: 'target',
    color: 'bg-yellow-500'
  },
  {
    id: '10',
    title: '¿Cuánto va a costar?',
    question: '¿Cuál es la inversión necesaria?',
    description: 'Estima el costo en tiempo, dinero y recursos. Sé realista.',
    icon: 'dollar',
    color: 'bg-emerald-500'
  }
];

const IconMap: Record<string, typeof Layers> = {
  target: Target,
  rocket: Rocket,
  package: Package,
  x: X,
  users: Users,
  layers: Layers,
  alert: AlertTriangle,
  clock: Clock,
  dollar: DollarSign,
  lightbulb: Lightbulb,
  mappin: MapPin
};

export default function InceptionDeckCommand({
  projectId,
  messageId,
  channelId,
  title,
  cards,
  currentCardIndex,
  createdBy,
  closed,
  onClose,
  onUpdate
}: InceptionDeckCommandProps) {
  const { data: session } = useSession();
  const [localCards, setLocalCards] = useState<InceptionCard[]>(cards);
  const [cardIndex, setCardIndex] = useState(currentCardIndex);
  const [newResponse, setNewResponse] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync with props
  useEffect(() => {
    setLocalCards(cards);
    setCardIndex(currentCardIndex);
  }, [cards, currentCardIndex]);

  const currentCard = localCards[cardIndex];
  const progress = localCards.filter(c => c.completed).length;
  const totalCards = localCards.length;

  const CardIcon = currentCard ? IconMap[currentCard.icon] || Lightbulb : Lightbulb;

  const updateCommandData = async (updates: Partial<{ cards: InceptionCard[]; currentCardIndex: number }>) => {
    if (!messageId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandData: {
            title,
            cards: updates.cards || localCards,
            currentCardIndex: updates.currentCardIndex ?? cardIndex,
            createdBy,
            closed
          }
        })
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating inception deck:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddResponse = async () => {
    if (!newResponse.trim() || !session?.user || closed) return;

    const response: CardResponse = {
      id: Date.now().toString(),
      text: newResponse.trim(),
      userId: session.user.id,
      userName: session.user.name || 'Usuario',
      createdAt: new Date().toISOString()
    };

    const updatedCards = [...localCards];
    updatedCards[cardIndex] = {
      ...updatedCards[cardIndex],
      responses: [...updatedCards[cardIndex].responses, response]
    };

    setLocalCards(updatedCards);
    setNewResponse('');
    await updateCommandData({ cards: updatedCards });
  };

  const handleRemoveResponse = async (responseId: string) => {
    if (closed) return;

    const updatedCards = [...localCards];
    updatedCards[cardIndex] = {
      ...updatedCards[cardIndex],
      responses: updatedCards[cardIndex].responses.filter(r => r.id !== responseId)
    };

    setLocalCards(updatedCards);
    await updateCommandData({ cards: updatedCards });
  };

  const handleToggleComplete = async () => {
    if (closed) return;

    const updatedCards = [...localCards];
    updatedCards[cardIndex] = {
      ...updatedCards[cardIndex],
      completed: !updatedCards[cardIndex].completed
    };

    setLocalCards(updatedCards);
    await updateCommandData({ cards: updatedCards });
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? Math.max(0, cardIndex - 1)
      : Math.min(totalCards - 1, cardIndex + 1);

    setCardIndex(newIndex);
    await updateCommandData({ currentCardIndex: newIndex });
  };

  const handleJumpToCard = async (index: number) => {
    setCardIndex(index);
    await updateCommandData({ currentCardIndex: index });
  };

  if (!currentCard) {
    return (
      <div className="text-center py-8 text-gray-500">
        Error: No se encontró la carta
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers size={24} />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-indigo-200 text-sm">Mazo de Incepción Ágil</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
              {progress}/{totalCards} completadas
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(progress / totalCards) * 100}%` }}
          />
        </div>

        {/* Card navigation dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {localCards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => handleJumpToCard(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === cardIndex
                  ? 'bg-white scale-125'
                  : card.completed
                    ? 'bg-green-400'
                    : 'bg-white/40 hover:bg-white/60'
              }`}
              title={card.title}
            />
          ))}
        </div>
      </div>

      {/* Current Card */}
      <div className="p-6">
        <div className={`${currentCard.color} text-white rounded-xl p-6 mb-6`}>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <CardIcon size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/70 text-sm">Carta {cardIndex + 1} de {totalCards}</span>
                {currentCard.completed && (
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={12} /> Completada
                  </span>
                )}
              </div>
              <h4 className="text-2xl font-bold mb-2">{currentCard.title}</h4>
              <p className="text-white/90 text-lg mb-3">{currentCard.question}</p>
              <p className="text-white/70 text-sm">{currentCard.description}</p>
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="mb-6">
          <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Lightbulb size={18} className="text-yellow-500" />
            Respuestas del equipo ({currentCard.responses.length})
          </h5>

          {currentCard.responses.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic py-4 text-center">
              Aún no hay respuestas. ¡Sé el primero en contribuir!
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {currentCard.responses.map((response) => (
                <div
                  key={response.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 group"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {response.text}
                    </p>
                    {!closed && response.userId === session?.user?.id && (
                      <button
                        onClick={() => handleRemoveResponse(response.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    — {response.userName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add response */}
        {!closed && (
          <div className="flex gap-2 mb-6">
            <textarea
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder="Escribe tu respuesta o idea..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddResponse();
                }
              }}
            />
            <button
              onClick={handleAddResponse}
              disabled={!newResponse.trim() || saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
            >
              <Plus size={20} />
            </button>
          </div>
        )}

        {/* Navigation and actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleNavigate('prev')}
            disabled={cardIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            Anterior
          </button>

          {!closed && (
            <button
              onClick={handleToggleComplete}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                currentCard.completed
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'
              }`}
            >
              <Check size={18} />
              {currentCard.completed ? 'Completada' : 'Marcar completa'}
            </button>
          )}

          <button
            onClick={() => handleNavigate('next')}
            disabled={cardIndex === totalCards - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Summary when all complete */}
        {progress === totalCards && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-full text-white">
                <Check size={20} />
              </div>
              <div>
                <h5 className="font-semibold text-green-800 dark:text-green-300">
                  ¡Incepción Completada!
                </h5>
                <p className="text-sm text-green-600 dark:text-green-400">
                  El equipo ha respondido todas las cartas del mazo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_CARDS };
