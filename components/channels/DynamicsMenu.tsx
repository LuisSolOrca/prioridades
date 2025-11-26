'use client';

import { useState } from 'react';
import {
  Vote,
  Lightbulb,
  RotateCcw,
  Target,
  Heart,
  Search,
  Plus,
  X,
  Trash2
} from 'lucide-react';

interface DynamicType {
  type: string;
  name: string;
  description: string;
}

interface DynamicCategory {
  id: string;
  name: string;
  icon: typeof Vote;
  color: string;
  bgColor: string;
  borderColor: string;
  dynamics: DynamicType[];
}

const DYNAMIC_CATEGORIES: DynamicCategory[] = [
  {
    id: 'voting',
    name: 'Votación',
    icon: Vote,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    dynamics: [
      { type: 'poll', name: 'Encuesta', description: 'Votación simple con múltiples opciones' },
      { type: 'dot-voting', name: 'Dot Voting', description: 'Distribuir puntos entre opciones' },
      { type: 'blind-vote', name: 'Voto Oculto', description: 'Resultados ocultos hasta revelar' },
      { type: 'fist-of-five', name: 'Puño de Cinco', description: 'Consenso rápido (0-5)' },
      { type: 'confidence-vote', name: 'Confianza', description: 'Medir nivel de confianza' },
      { type: 'nps', name: 'NPS', description: 'Net Promoter Score' },
      { type: 'roman-voting', name: 'Roman Voting', description: 'Pulgar arriba/abajo/lado - más rápido que Puño de Cinco' },
    ]
  },
  {
    id: 'ideation',
    name: 'Ideación',
    icon: Lightbulb,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    dynamics: [
      { type: 'brainstorm', name: 'Brainstorm', description: 'Lluvia de ideas colaborativa' },
      { type: 'mind-map', name: 'Mapa Mental', description: 'Ideas conectadas visualmente' },
      { type: 'pros-cons', name: 'Pros y Contras', description: 'Análisis de ventajas y desventajas' },
      { type: 'decision-matrix', name: 'Matriz de Decisión', description: 'Criterios ponderados' },
      { type: 'ranking', name: 'Ranking', description: 'Ordenar opciones por preferencia' },
      { type: 'six-hats', name: '6 Sombreros', description: '6 sombreros de Bono - perspectivas múltiples' },
      { type: 'crazy-8s', name: 'Crazy 8s', description: '8 ideas en 8 minutos - design sprint' },
      { type: 'affinity-map', name: 'Mapa de Afinidad', description: 'Agrupar ideas por categorías' },
      { type: 'scamper', name: 'SCAMPER', description: 'Sustituir, Combinar, Adaptar, Modificar, Propósito, Eliminar, Reorganizar' },
      { type: 'starbursting', name: 'Starbursting', description: 'Estrella de 6 puntas: Qué, Quién, Dónde, Cuándo, Por qué, Cómo' },
      { type: 'reverse-brainstorm', name: 'Brainstorm Inverso', description: '¿Cómo causar el problema? → invertir soluciones' },
      { type: 'worst-idea', name: 'Peores Ideas', description: 'Generar las peores ideas → transformarlas' },
      { type: 'lotus-blossom', name: 'Lotus Blossom', description: 'Idea central con 8 pétalos de sub-ideas' },
      { type: 'how-might-we', name: 'How Might We', description: 'Puente entre problema e ideación - "¿Cómo podríamos...?"' },
      { type: 'brainwriting', name: 'Brainwriting 6-3-5', description: '6 personas, 3 ideas, 5 minutos - mejor que brainstorm para introvertidos' },
    ]
  },
  {
    id: 'retrospective',
    name: 'Retrospectiva',
    icon: RotateCcw,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    dynamics: [
      { type: 'retrospective', name: 'Retro Ágil', description: 'Bien / Mejorar / Acciones' },
      { type: 'rose-bud-thorn', name: 'Rose-Bud-Thorn', description: 'Rosas, brotes y espinas' },
      { type: 'sailboat', name: 'Velero', description: 'Viento, ancla, rocas, isla' },
      { type: 'start-stop-continue', name: 'Start-Stop-Continue', description: 'Qué empezar, parar, continuar' },
      { type: '4ls', name: '4Ls', description: 'Liked, Learned, Lacked, Longed for' },
      { type: 'starfish', name: 'Starfish', description: 'Keep, Less, More, Stop, Start - más completa que Start-Stop-Continue' },
      { type: 'mad-sad-glad', name: 'Mad/Sad/Glad', description: 'Retro emocional rápida - ¿Qué te enojó/entristeció/alegró?' },
      { type: 'team-health', name: 'Team Health', description: 'Salud del equipo (Spotify)' },
      { type: 'mood', name: 'Check-in', description: 'Estado de ánimo del equipo' },
    ]
  },
  {
    id: 'strategy',
    name: 'Análisis',
    icon: Target,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dynamics: [
      { type: 'swot', name: 'SWOT', description: 'Fortalezas, Debilidades, Oportunidades, Amenazas' },
      { type: 'soar', name: 'SOAR', description: 'Fortalezas, Oportunidades, Aspiraciones, Resultados' },
      { type: 'five-whys', name: '5 Porqués', description: 'Análisis de causa raíz preguntando "¿Por qué?" 5 veces' },
      { type: 'impact-effort', name: 'Impacto/Esfuerzo', description: 'Matriz de priorización 2x2' },
      { type: 'opportunity-tree', name: 'Árbol de Oportunidades', description: 'Objetivo → Oportunidades → Soluciones' },
      { type: 'empathy-map', name: 'Mapa de Empatía', description: 'Dice, Piensa, Hace, Siente - Design Thinking' },
      { type: 'moscow', name: 'MoSCoW', description: 'Must, Should, Could, Won\'t - Priorización clásica' },
      { type: 'pre-mortem', name: 'Pre-mortem', description: 'Imaginar el fracaso para prevenir riesgos' },
      { type: 'fishbone', name: 'Fishbone / Ishikawa', description: 'Diagrama de causa-efecto visual en forma de espina de pescado' },
      { type: 'risk-matrix', name: 'Matriz de Riesgos', description: 'Probabilidad × Impacto - complementa Pre-mortem' },
      { type: 'rice', name: 'RICE', description: 'Reach × Impact × Confidence ÷ Effort - priorización robusta' },
      { type: 'customer-journey', name: 'Customer Journey Map', description: 'Mapear experiencia completa del cliente' },
    ]
  },
  {
    id: 'productivity',
    name: 'Productividad',
    icon: Target,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    dynamics: [
      { type: 'standup', name: 'Daily Standup', description: 'Reporte diario del equipo' },
      { type: 'action-items', name: 'Acciones', description: 'Lista con responsable y fecha' },
      { type: 'checklist', name: 'Checklist', description: 'Lista de verificación' },
      { type: 'agenda', name: 'Agenda', description: 'Temas de reunión con tiempos' },
      { type: 'parking-lot', name: 'Parking Lot', description: 'Temas para discutir después' },
      { type: 'pomodoro', name: 'Pomodoro', description: 'Timer compartido 25/5 min' },
      { type: 'estimation-poker', name: 'Planning Poker', description: 'Estimar esfuerzo en equipo' },
      { type: 'lean-coffee', name: 'Lean Coffee', description: 'Reunión estructurada con votación de temas' },
      { type: 'user-story-mapping', name: 'User Story Mapping', description: 'Mapear historias de usuario por actividades' },
      { type: 'raci', name: 'RACI', description: 'Matriz de responsabilidades - Responsable, Aprobador, Consultado, Informado' },
    ]
  },
  {
    id: 'recognition',
    name: 'Reconocimiento',
    icon: Heart,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    dynamics: [
      { type: 'kudos-wall', name: 'Muro de Kudos', description: 'Reconocimientos del equipo' },
      { type: 'icebreaker', name: 'Icebreaker', description: 'Pregunta para romper el hielo' },
    ]
  },
  {
    id: 'frameworks',
    name: 'Frameworks',
    icon: Lightbulb,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    dynamics: [
      { type: 'inception-deck', name: 'Incepción Ágil', description: 'Mazo de 10 cartas para alinear al equipo' },
      { type: 'delegation-poker', name: 'Delegation Poker', description: 'Definir niveles de delegación (Management 3.0)' },
      { type: 'moving-motivators', name: 'Moving Motivators', description: 'Descubrir motivaciones del equipo (Management 3.0)' },
      { type: 'lean-canvas', name: 'Lean Canvas', description: '9 bloques para validar modelo de negocio - startups y productos nuevos' },
      { type: 'working-agreements', name: 'Working Agreements', description: 'Acuerdos de trabajo del equipo - fundacional para equipos nuevos' },
    ]
  }
];

// Types that need options input
const TYPES_WITH_OPTIONS = ['poll', 'dot-voting', 'blind-vote', 'ranking'];
// Types that need matrix input (options + criteria)
const TYPES_WITH_MATRIX = ['decision-matrix'];

interface DynamicsMenuProps {
  onSelectDynamic: (type: string, title: string, options?: string[], criteria?: string[]) => void;
}

export default function DynamicsMenu({ onSelectDynamic }: DynamicsMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [selectedDynamic, setSelectedDynamic] = useState<DynamicType | null>(null);
  const [dynamicTitle, setDynamicTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [newOption, setNewOption] = useState('');
  const [criteria, setCriteria] = useState<string[]>(['', '']);
  const [newCriterion, setNewCriterion] = useState('');

  const filteredCategories = DYNAMIC_CATEGORIES.map(category => ({
    ...category,
    dynamics: category.dynamics.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.dynamics.length > 0);

  const handleDynamicClick = (dynamic: DynamicType) => {
    setSelectedDynamic(dynamic);
    setDynamicTitle('');
    setOptions(['', '']);
    setNewOption('');
    setCriteria(['', '']);
    setNewCriterion('');
    setShowTitleModal(true);
  };

  const needsOptions = selectedDynamic ? TYPES_WITH_OPTIONS.includes(selectedDynamic.type) : false;
  const needsMatrix = selectedDynamic ? TYPES_WITH_MATRIX.includes(selectedDynamic.type) : false;

  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddCriterion = () => {
    if (newCriterion.trim()) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion('');
    }
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length > 2) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const handleCriterionChange = (index: number, value: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = value;
    setCriteria(newCriteria);
  };

  const handleCreateDynamic = () => {
    if (selectedDynamic && dynamicTitle.trim()) {
      if (needsMatrix) {
        const validOptions = options.filter(o => o.trim());
        const validCriteria = criteria.filter(c => c.trim());
        if (validOptions.length < 2) {
          alert('Necesitas al menos 2 opciones');
          return;
        }
        if (validCriteria.length < 2) {
          alert('Necesitas al menos 2 criterios');
          return;
        }
        onSelectDynamic(selectedDynamic.type, dynamicTitle.trim(), validOptions, validCriteria);
      } else if (needsOptions) {
        const validOptions = options.filter(o => o.trim());
        if (validOptions.length < 2) {
          alert('Necesitas al menos 2 opciones');
          return;
        }
        onSelectDynamic(selectedDynamic.type, dynamicTitle.trim(), validOptions);
      } else {
        onSelectDynamic(selectedDynamic.type, dynamicTitle.trim());
      }
      setShowTitleModal(false);
      setSelectedDynamic(null);
      setDynamicTitle('');
      setOptions(['', '']);
      setCriteria(['', '']);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dinámicas de Grupo
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Selecciona una dinámica para trabajar colaborativamente
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar dinámica..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {DYNAMIC_CATEGORIES.map(category => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(isSelected ? null : category.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? `${category.bgColor} ${category.borderColor}`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className={`mx-auto ${category.color}`} size={24} />
              <p className={`mt-2 text-sm font-medium ${isSelected ? category.color : 'text-gray-700 dark:text-gray-300'}`}>
                {category.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Dynamics Grid */}
      <div className="space-y-6">
        {(selectedCategory
          ? filteredCategories.filter(c => c.id === selectedCategory)
          : filteredCategories
        ).map(category => {
          const Icon = category.icon;
          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={category.color} size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {category.name}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.dynamics.map(dynamic => (
                  <button
                    key={dynamic.type}
                    onClick={() => handleDynamicClick(dynamic)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${category.bgColor} ${category.borderColor} hover:scale-[1.02]`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {dynamic.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {dynamic.description}
                        </p>
                      </div>
                      <Plus className={`flex-shrink-0 ${category.color}`} size={20} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Title Modal */}
      {showTitleModal && selectedDynamic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Nueva {selectedDynamic.name}
              </h3>
              <button
                onClick={() => setShowTitleModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedDynamic.description}
            </p>

            {/* Title/Question input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {needsOptions ? 'Pregunta' : 'Título'}
              </label>
              <input
                type="text"
                placeholder={needsOptions ? "¿Cuál es tu pregunta?" : "Título de la dinámica..."}
                value={dynamicTitle}
                onChange={(e) => setDynamicTitle(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Options input for poll-type dynamics */}
            {needsOptions && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Opciones (mínimo 2)
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Opción ${index + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Agregar otra opción..."
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                    className="flex-1 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleAddOption}
                    disabled={!newOption.trim()}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Matrix inputs for decision-matrix */}
            {needsMatrix && (
              <>
                {/* Options */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Opciones a evaluar (mínimo 2)
                  </label>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Opción ${index + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Agregar otra opción..."
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                      className="flex-1 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleAddOption}
                      disabled={!newOption.trim()}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Criteria */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Criterios de evaluación (mínimo 2)
                  </label>
                  <div className="space-y-2">
                    {criteria.map((criterion, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Criterio ${index + 1}`}
                          value={criterion}
                          onChange={(e) => handleCriterionChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                        {criteria.length > 2 && (
                          <button
                            onClick={() => handleRemoveCriterion(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Agregar otro criterio..."
                      value={newCriterion}
                      onChange={(e) => setNewCriterion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCriterion())}
                      className="flex-1 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleAddCriterion}
                      disabled={!newCriterion.trim()}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowTitleModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateDynamic}
                disabled={!dynamicTitle.trim() || (needsOptions && options.filter(o => o.trim()).length < 2)}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Dinámica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { DYNAMIC_CATEGORIES };
