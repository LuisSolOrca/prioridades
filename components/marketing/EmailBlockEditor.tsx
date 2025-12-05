'use client';

import { useState, useCallback } from 'react';
import {
  Type,
  Image as ImageIcon,
  Square,
  Minus,
  Columns,
  Code,
  Share2,
  Play,
  ShoppingBag,
  Menu,
  Trash2,
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Copy,
  Settings,
  Smartphone,
  Monitor,
  Sparkles,
} from 'lucide-react';
import AIContentGenerator from './AIContentGenerator';

// Types
export type EmailBlockType =
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'html'
  | 'social'
  | 'video'
  | 'product'
  | 'menu';

export interface IEmailBlock {
  id: string;
  type: EmailBlockType;
  content: any;
  styles?: Record<string, any>;
  children?: IEmailBlock[];
}

export interface IGlobalStyles {
  backgroundColor: string;
  contentWidth: number;
  fontFamily: string;
  linkColor?: string;
  textColor?: string;
}

export interface IEmailContent {
  blocks: IEmailBlock[];
  globalStyles: IGlobalStyles;
}

interface EmailBlockEditorProps {
  value: IEmailContent;
  onChange: (content: IEmailContent) => void;
  onPreview?: () => void;
}

// Block type configurations
const BLOCK_TYPES: {
  id: EmailBlockType;
  label: string;
  icon: typeof Type;
  defaultContent: any;
  defaultStyles: Record<string, any>;
}[] = [
  {
    id: 'text',
    label: 'Texto',
    icon: Type,
    defaultContent: '<p>Escribe tu texto aquí...</p>',
    defaultStyles: { padding: '16px', backgroundColor: '#ffffff' },
  },
  {
    id: 'image',
    label: 'Imagen',
    icon: ImageIcon,
    defaultContent: { url: '', alt: '', link: '' },
    defaultStyles: { padding: '16px', textAlign: 'center' },
  },
  {
    id: 'button',
    label: 'Botón',
    icon: Square,
    defaultContent: {
      text: 'Click aquí',
      url: '#',
      backgroundColor: '#0066cc',
      color: '#ffffff',
      borderRadius: '4px',
    },
    defaultStyles: { padding: '16px', textAlign: 'center' },
  },
  {
    id: 'divider',
    label: 'Divisor',
    icon: Minus,
    defaultContent: { color: '#e0e0e0', thickness: '1px' },
    defaultStyles: { padding: '16px 0' },
  },
  {
    id: 'spacer',
    label: 'Espacio',
    icon: Square,
    defaultContent: {},
    defaultStyles: { height: '32px' },
  },
  {
    id: 'columns',
    label: 'Columnas',
    icon: Columns,
    defaultContent: { columnCount: 2 },
    defaultStyles: { padding: '16px' },
  },
  {
    id: 'html',
    label: 'HTML',
    icon: Code,
    defaultContent: '<!-- Tu código HTML aquí -->',
    defaultStyles: { padding: '16px' },
  },
  {
    id: 'social',
    label: 'Redes',
    icon: Share2,
    defaultContent: {
      links: [
        { name: 'Facebook', url: '#', icon: 'facebook' },
        { name: 'Twitter', url: '#', icon: 'twitter' },
        { name: 'Instagram', url: '#', icon: 'instagram' },
      ],
    },
    defaultStyles: { padding: '16px', textAlign: 'center' },
  },
  {
    id: 'video',
    label: 'Video',
    icon: Play,
    defaultContent: { thumbnailUrl: '', videoUrl: '', alt: 'Video' },
    defaultStyles: { padding: '16px', textAlign: 'center' },
  },
  {
    id: 'menu',
    label: 'Menú',
    icon: Menu,
    defaultContent: {
      links: [
        { text: 'Inicio', url: '#' },
        { text: 'Productos', url: '#' },
        { text: 'Contacto', url: '#' },
      ],
    },
    defaultStyles: { padding: '16px', textAlign: 'center' },
  },
];

const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function EmailBlockEditor({ value, onChange, onPreview }: EmailBlockEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPalette, setShowPalette] = useState(true);

  const selectedBlock = value.blocks.find((b) => b.id === selectedBlockId);

  // Add block
  const addBlock = useCallback((type: EmailBlockType, afterId?: string, initialContent?: any) => {
    const blockConfig = BLOCK_TYPES.find((b) => b.id === type);
    if (!blockConfig) return;

    const defaultContent = JSON.parse(JSON.stringify(blockConfig.defaultContent));
    const newBlock: IEmailBlock = {
      id: generateId(),
      type,
      content: initialContent !== undefined ? (
        typeof defaultContent === 'object' && typeof initialContent === 'object'
          ? { ...defaultContent, ...initialContent }
          : initialContent
      ) : defaultContent,
      styles: { ...blockConfig.defaultStyles },
    };

    if (type === 'columns') {
      newBlock.children = [
        { id: generateId(), type: 'text', content: '<p>Columna 1</p>', styles: { padding: '8px' } },
        { id: generateId(), type: 'text', content: '<p>Columna 2</p>', styles: { padding: '8px' } },
      ];
    }

    let newBlocks: IEmailBlock[];
    if (afterId) {
      const index = value.blocks.findIndex((b) => b.id === afterId);
      newBlocks = [
        ...value.blocks.slice(0, index + 1),
        newBlock,
        ...value.blocks.slice(index + 1),
      ];
    } else {
      newBlocks = [...value.blocks, newBlock];
    }

    onChange({ ...value, blocks: newBlocks });
    setSelectedBlockId(newBlock.id);
  }, [value, onChange]);

  // Remove block
  const removeBlock = useCallback((blockId: string) => {
    onChange({
      ...value,
      blocks: value.blocks.filter((b) => b.id !== blockId),
    });
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [value, onChange, selectedBlockId]);

  // Move block
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const index = value.blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === value.blocks.length - 1) return;

    const newBlocks = [...value.blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

    onChange({ ...value, blocks: newBlocks });
  }, [value, onChange]);

  // Duplicate block
  const duplicateBlock = useCallback((blockId: string) => {
    const block = value.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const newBlock: IEmailBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: generateId(),
    };

    const index = value.blocks.findIndex((b) => b.id === blockId);
    const newBlocks = [
      ...value.blocks.slice(0, index + 1),
      newBlock,
      ...value.blocks.slice(index + 1),
    ];

    onChange({ ...value, blocks: newBlocks });
    setSelectedBlockId(newBlock.id);
  }, [value, onChange]);

  // Update block
  const updateBlock = useCallback((blockId: string, updates: Partial<IEmailBlock>) => {
    onChange({
      ...value,
      blocks: value.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    });
  }, [value, onChange]);

  // Update global styles
  const updateGlobalStyles = useCallback((styles: Partial<IGlobalStyles>) => {
    onChange({
      ...value,
      globalStyles: { ...value.globalStyles, ...styles },
    });
  }, [value, onChange]);

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
      {/* Block Palette */}
      {showPalette && (
        <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Bloques</h3>
            <p className="text-xs text-gray-500 mt-1">Arrastra o haz clic para agregar</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* AI Content Generator */}
            <div className="relative mb-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Generar con IA</span>
              </div>
              <AIContentGenerator
                compact
                buttonLabel="Crear contenido"
                contentTypes={[
                  { id: 'email-subject', label: 'Línea de asunto', description: 'Asuntos que generan aperturas' },
                  { id: 'email-subject-ab', label: 'Asuntos A/B', description: 'Variantes para test A/B' },
                  { id: 'email-headline', label: 'Titular', description: 'Titulares impactantes' },
                  { id: 'email-body', label: 'Cuerpo del email', description: 'Contenido persuasivo' },
                  { id: 'email-cta', label: 'Botón CTA', description: 'Textos para botones' },
                  { id: 'cta-variants', label: 'Variantes CTA', description: 'CTAs con diferentes enfoques' },
                  { id: 'email-preheader', label: 'Preheader', description: 'Texto de previsualización' },
                ]}
                onContentGenerated={(content, type) => {
                  if (type === 'email-body') {
                    // Add as text block with content
                    addBlock('text', undefined, content);
                  } else if (type === 'email-cta') {
                    // Add as button block with CTA text
                    const ctaText = typeof content === 'string' ? content.split('\n')[0]?.trim() : content;
                    addBlock('button', undefined, { text: ctaText });
                  } else if (type === 'email-headline') {
                    // Add as text block with headline
                    const headline = typeof content === 'string' ? content.split('\n')[0]?.trim() : content;
                    addBlock('text', undefined, `<h2 style="font-size: 24px; font-weight: bold; margin: 0;">${headline}</h2>`);
                  }
                  // For subject/preheader, content is shown and can be copied
                }}
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bloques</p>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map((block) => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.id}
                    onClick={() => addBlock(block.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Icon className="w-5 h-5 text-gray-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{block.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Styles */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Estilos Globales</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Color de fondo</label>
                <input
                  type="color"
                  value={value.globalStyles.backgroundColor}
                  onChange={(e) => updateGlobalStyles({ backgroundColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ancho del contenido</label>
                <input
                  type="number"
                  value={value.globalStyles.contentWidth}
                  onChange={(e) => updateGlobalStyles({ contentWidth: parseInt(e.target.value) || 600 })}
                  className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  min={400}
                  max={800}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fuente</label>
                <select
                  value={value.globalStyles.fontFamily}
                  onChange={(e) => updateGlobalStyles({ fontFamily: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={showPalette ? 'Ocultar paleta' : 'Mostrar paleta'}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Vista escritorio"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Vista móvil"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 overflow-y-auto p-8"
          style={{ backgroundColor: value.globalStyles.backgroundColor }}
        >
          <div
            className="mx-auto bg-white shadow-lg"
            style={{
              maxWidth: previewMode === 'mobile' ? 375 : value.globalStyles.contentWidth,
              fontFamily: value.globalStyles.fontFamily,
            }}
          >
            {value.blocks.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="mb-4">No hay bloques</p>
                <button
                  onClick={() => addBlock('text')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Agregar bloque
                </button>
              </div>
            ) : (
              value.blocks.map((block, index) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onUpdate={(updates) => updateBlock(block.id, updates)}
                  onRemove={() => removeBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, 'up')}
                  onMoveDown={() => moveBlock(block.id, 'down')}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onAddAfter={() => setSelectedBlockId(block.id)}
                  isFirst={index === 0}
                  isLast={index === value.blocks.length - 1}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Block Settings Panel */}
      {selectedBlock && (
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Configuración
            </h3>
            <button
              onClick={() => setSelectedBlockId(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <BlockSettings
              block={selectedBlock}
              onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Block Renderer Component
interface BlockRendererProps {
  block: IEmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<IEmailBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onAddAfter: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function BlockRenderer({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  isFirst,
  isLast,
}: BlockRendererProps) {
  const styleStr = block.styles || {};

  // Helper to safely get string content for rendering
  const getStringContent = (content: any): string => {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    if (typeof content === 'object') {
      if (content.text) return content.text;
      if (content.html) return content.html;
      return '';
    }
    return String(content);
  };

  // Helper to safely get content value
  const getContentValue = (key: string, defaultValue: any = '') => {
    if (typeof block.content === 'object' && block.content !== null) {
      return block.content[key] ?? defaultValue;
    }
    return defaultValue;
  };

  return (
    <div
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onSelect}
    >
      {/* Block Controls */}
      <div className={`absolute -left-10 top-0 flex flex-col gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
          className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button className="p-1 bg-white dark:bg-gray-700 rounded shadow cursor-move">
          <GripVertical className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
          className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Block Actions */}
      <div className={`absolute -right-10 top-0 flex flex-col gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-100"
          title="Duplicar"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-red-100 hover:text-red-600"
          title="Eliminar"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Block Content */}
      <div style={styleStr}>
        {block.type === 'text' && (
          <div
            dangerouslySetInnerHTML={{ __html: getStringContent(block.content) }}
            className="prose max-w-none"
          />
        )}

        {block.type === 'image' && (
          <div className="text-center">
            {getContentValue('url') ? (
              <img
                src={getContentValue('url')}
                alt={getContentValue('alt', '')}
                className="max-w-full h-auto inline-block"
              />
            ) : (
              <div className="inline-block p-8 bg-gray-100 dark:bg-gray-700 rounded">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Haz clic para agregar imagen</p>
              </div>
            )}
          </div>
        )}

        {block.type === 'button' && (
          <div style={{ textAlign: styleStr.textAlign || 'center' }}>
            <a
              href="#"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: getContentValue('backgroundColor', '#0066cc'),
                color: getContentValue('color', '#ffffff'),
                textDecoration: 'none',
                borderRadius: getContentValue('borderRadius', '4px'),
                fontWeight: 'bold',
              }}
            >
              {getContentValue('text', 'Click aquí')}
            </a>
          </div>
        )}

        {block.type === 'divider' && (
          <hr
            style={{
              border: 'none',
              borderTop: `${getContentValue('thickness', '1px')} solid ${getContentValue('color', '#e0e0e0')}`,
            }}
          />
        )}

        {block.type === 'spacer' && (
          <div style={{ height: styleStr.height || '32px' }} />
        )}

        {block.type === 'columns' && (
          <div className="flex gap-4">
            {(block.children || []).map((child, idx) => {
              const childContent = typeof child.content === 'string'
                ? child.content
                : (child.content?.text || child.content?.html || `Columna ${idx + 1}`);
              return (
                <div key={child.id} className="flex-1 border border-dashed border-gray-300 p-2 min-h-[60px]">
                  <div dangerouslySetInnerHTML={{ __html: childContent }} />
                </div>
              );
            })}
          </div>
        )}

        {block.type === 'html' && (
          <div
            dangerouslySetInnerHTML={{ __html: getStringContent(block.content) }}
            className="bg-gray-50 p-4 rounded"
          />
        )}

        {block.type === 'social' && (
          <div className="flex justify-center gap-4">
            {(getContentValue('links', []) as any[]).map((link: any, idx: number) => (
              <a key={idx} href={link.url} className="text-blue-600 hover:text-blue-700">
                {link.name}
              </a>
            ))}
          </div>
        )}

        {block.type === 'video' && (
          <div className="text-center">
            {getContentValue('thumbnailUrl') ? (
              <div className="relative inline-block">
                <img
                  src={getContentValue('thumbnailUrl')}
                  alt={getContentValue('alt', 'Video')}
                  className="max-w-full h-auto"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="inline-block p-8 bg-gray-100 dark:bg-gray-700 rounded">
                <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Agregar video</p>
              </div>
            )}
          </div>
        )}

        {block.type === 'menu' && (
          <div className="flex justify-center gap-6">
            {(getContentValue('links', []) as any[]).map((link: any, idx: number) => (
              <a key={idx} href={link.url} className="text-gray-700 hover:text-blue-600">
                {link.text}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Block Settings Component
interface BlockSettingsProps {
  block: IEmailBlock;
  onUpdate: (updates: Partial<IEmailBlock>) => void;
}

function BlockSettings({ block, onUpdate }: BlockSettingsProps) {
  // Helper to safely get string content
  const getStringContent = (content: any): string => {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    if (typeof content === 'object') {
      // If it has a 'text' or 'html' property, use that
      if (content.text) return content.text;
      if (content.html) return content.html;
      // Otherwise return empty to avoid [object Object]
      return '';
    }
    return String(content);
  };

  const updateContent = (updates: Record<string, any>) => {
    // For object-based content types, merge updates
    if (typeof block.content === 'object' && block.content !== null) {
      onUpdate({ content: { ...block.content, ...updates } });
    } else {
      onUpdate({ content: updates });
    }
  };

  const updateStyles = (updates: Record<string, any>) => {
    onUpdate({ styles: { ...block.styles, ...updates } });
  };

  // Get content value for object-based blocks
  const getContentValue = (key: string, defaultValue: any = '') => {
    if (typeof block.content === 'object' && block.content !== null) {
      return block.content[key] ?? defaultValue;
    }
    return defaultValue;
  };

  return (
    <div className="space-y-4">
      {/* Content Settings */}
      {block.type === 'text' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contenido
            </label>
            <AIContentGenerator
              compact
              buttonLabel="IA"
              contentTypes={[
                { id: 'email-body', label: 'Cuerpo de email', description: 'Contenido persuasivo' },
                { id: 'email-headline', label: 'Titular', description: 'Titulares impactantes' },
              ]}
              onContentGenerated={(content) => {
                onUpdate({ content: typeof content === 'string' ? content : String(content) });
              }}
            />
          </div>
          <textarea
            value={getStringContent(block.content)}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            placeholder="HTML del texto..."
          />
          <p className="text-xs text-gray-500 mt-1">Soporta HTML y variables como {'{{contact.firstName}}'}</p>
        </div>
      )}

      {block.type === 'image' && (
        <>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              URL de la imagen
            </label>
            <input
              type="text"
              value={getContentValue('url', '')}
              onChange={(e) => updateContent({ url: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Texto alternativo
            </label>
            <input
              type="text"
              value={getContentValue('alt', '')}
              onChange={(e) => updateContent({ alt: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Descripción de la imagen"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Enlace (opcional)
            </label>
            <input
              type="text"
              value={getContentValue('link', '')}
              onChange={(e) => updateContent({ link: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="https://..."
            />
          </div>
        </>
      )}

      {block.type === 'button' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Texto del botón
              </label>
              <AIContentGenerator
                compact
                buttonLabel="IA"
                contentTypes={[
                  { id: 'email-cta', label: 'CTA simple', description: 'Textos para botones' },
                  { id: 'cta-variants', label: 'Variantes CTA', description: 'Múltiples opciones con enfoques' },
                ]}
                onContentGenerated={(content, type) => {
                  if (type === 'cta-variants' && content?.variants) {
                    // Show first variant by default
                    const firstVariant = content.variants[0];
                    if (firstVariant) {
                      updateContent({ text: firstVariant.text });
                    }
                  } else {
                    updateContent({ text: typeof content === 'string' ? content.split('\n')[0]?.trim() : content });
                  }
                }}
              />
            </div>
            <input
              type="text"
              value={getContentValue('text', '')}
              onChange={(e) => updateContent({ text: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              URL
            </label>
            <input
              type="text"
              value={getContentValue('url', '')}
              onChange={(e) => updateContent({ url: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Color de fondo
              </label>
              <input
                type="color"
                value={getContentValue('backgroundColor', '#0066cc')}
                onChange={(e) => updateContent({ backgroundColor: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Color del texto
              </label>
              <input
                type="color"
                value={getContentValue('color', '#ffffff')}
                onChange={(e) => updateContent({ color: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Radio del borde
            </label>
            <input
              type="text"
              value={getContentValue('borderRadius', '4px')}
              onChange={(e) => updateContent({ borderRadius: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="4px"
            />
          </div>
        </>
      )}

      {block.type === 'divider' && (
        <>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Color
            </label>
            <input
              type="color"
              value={getContentValue('color', '#e0e0e0')}
              onChange={(e) => updateContent({ color: e.target.value })}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Grosor
            </label>
            <input
              type="text"
              value={getContentValue('thickness', '1px')}
              onChange={(e) => updateContent({ thickness: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="1px"
            />
          </div>
        </>
      )}

      {block.type === 'spacer' && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Altura
          </label>
          <input
            type="text"
            value={block.styles?.height || '32px'}
            onChange={(e) => updateStyles({ height: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            placeholder="32px"
          />
        </div>
      )}

      {block.type === 'html' && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Código HTML
          </label>
          <textarea
            value={getStringContent(block.content)}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={10}
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono"
            placeholder="<!-- Tu código HTML aquí -->"
          />
        </div>
      )}

      {/* Common Style Settings */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Estilos</h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Padding</label>
            <input
              type="text"
              value={block.styles?.padding || '16px'}
              onChange={(e) => updateStyles({ padding: e.target.value })}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
              placeholder="16px"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Color de fondo</label>
            <input
              type="color"
              value={block.styles?.backgroundColor || '#ffffff'}
              onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
