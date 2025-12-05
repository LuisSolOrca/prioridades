'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Type,
  Trash2,
  Plus,
  Move,
  Eye,
  Smartphone,
  Monitor,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Palette,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  X,
  Check,
  Loader2,
} from 'lucide-react';

// Types
export type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'STORY' | 'REEL' | 'TEXT';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1';

export interface ICreativeAsset {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  r2Key?: string;
}

export interface ITextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    backgroundColor?: string;
    textAlign: 'left' | 'center' | 'right';
  };
}

export interface ICarouselSlide {
  id: string;
  asset: ICreativeAsset;
  headline?: string;
  description?: string;
  linkUrl?: string;
  order: number;
}

export interface ICreativeData {
  type: CreativeType;
  aspectRatio: AspectRatio;
  primaryAsset?: ICreativeAsset;
  carouselSlides?: ICarouselSlide[];
  headline?: string;
  bodyText?: string;
  callToAction?: string;
  linkUrl?: string;
  textOverlays?: ITextOverlay[];
  backgroundColor?: string;
}

const ASPECT_RATIOS: { id: AspectRatio; label: string; icon: typeof Square; dimensions: string }[] = [
  { id: '1:1', label: 'Cuadrado', icon: Square, dimensions: '1080x1080' },
  { id: '4:5', label: 'Vertical', icon: RectangleVertical, dimensions: '1080x1350' },
  { id: '9:16', label: 'Story/Reel', icon: RectangleVertical, dimensions: '1080x1920' },
  { id: '16:9', label: 'Horizontal', icon: RectangleHorizontal, dimensions: '1920x1080' },
  { id: '1.91:1', label: 'Link Ad', icon: RectangleHorizontal, dimensions: '1200x628' },
];

const CREATIVE_TYPES: { id: CreativeType; label: string; icon: typeof ImageIcon }[] = [
  { id: 'IMAGE', label: 'Imagen', icon: ImageIcon },
  { id: 'VIDEO', label: 'Video', icon: Video },
  { id: 'CAROUSEL', label: 'Carrusel', icon: GripVertical },
  { id: 'STORY', label: 'Story', icon: Smartphone },
];

const CTA_OPTIONS = [
  'Comprar ahora',
  'Más información',
  'Registrarse',
  'Descargar',
  'Contactar',
  'Reservar',
  'Ver más',
  'Solicitar cotización',
  'Suscribirse',
  'Obtener oferta',
];

interface CreativeBuilderProps {
  value: ICreativeData;
  onChange: (data: ICreativeData) => void;
  compact?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function CreativeBuilder({ value, onChange, compact = false }: CreativeBuilderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingOverlay, setEditingOverlay] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverSlide, setDragOverSlide] = useState<number | null>(null);

  // Get aspect ratio dimensions for preview
  const getPreviewDimensions = () => {
    const aspectRatio = value.aspectRatio || '1:1';
    const baseWidth = 300;
    const ratios: Record<AspectRatio, number> = {
      '1:1': 1,
      '4:5': 1.25,
      '9:16': 1.78,
      '16:9': 0.5625,
      '1.91:1': 0.52,
    };
    const height = baseWidth * (ratios[aspectRatio] || 1);
    return { width: baseWidth, height };
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null, slideIndex?: number) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Solo se permiten imágenes y videos');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/marketing/creatives/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir archivo');
      }

      const result = await response.json();
      const asset: ICreativeAsset = result.asset;

      if (value.type === 'CAROUSEL' && slideIndex !== undefined) {
        // Add to carousel
        const slides = [...(value.carouselSlides || [])];
        if (slides[slideIndex]) {
          slides[slideIndex] = { ...slides[slideIndex], asset };
        } else {
          slides.push({
            id: generateId(),
            asset,
            order: slides.length,
          });
        }
        onChange({ ...value, carouselSlides: slides });
      } else {
        // Set as primary asset
        onChange({
          ...value,
          primaryAsset: asset,
          type: isVideo ? 'VIDEO' : value.type,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [value, onChange]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, slideIndex?: number) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files, slideIndex);
    setDragOverSlide(null);
  }, [handleFileUpload]);

  // Add text overlay
  const addTextOverlay = useCallback(() => {
    const newOverlay: ITextOverlay = {
      id: generateId(),
      text: 'Tu texto aquí',
      position: { x: 50, y: 50 },
      style: {
        fontSize: 24,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
      },
    };
    onChange({
      ...value,
      textOverlays: [...(value.textOverlays || []), newOverlay],
    });
    setEditingOverlay(newOverlay.id);
  }, [value, onChange]);

  // Update text overlay
  const updateOverlay = useCallback((id: string, updates: Partial<ITextOverlay>) => {
    onChange({
      ...value,
      textOverlays: value.textOverlays?.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    });
  }, [value, onChange]);

  // Remove text overlay
  const removeOverlay = useCallback((id: string) => {
    onChange({
      ...value,
      textOverlays: value.textOverlays?.filter((o) => o.id !== id),
    });
    setEditingOverlay(null);
  }, [value, onChange]);

  // Add carousel slide
  const addCarouselSlide = useCallback(() => {
    const slides = value.carouselSlides || [];
    onChange({
      ...value,
      type: 'CAROUSEL',
      carouselSlides: [
        ...slides,
        {
          id: generateId(),
          asset: { type: 'image', url: '' },
          order: slides.length,
        },
      ],
    });
  }, [value, onChange]);

  // Remove carousel slide
  const removeCarouselSlide = useCallback((index: number) => {
    const slides = [...(value.carouselSlides || [])];
    slides.splice(index, 1);
    slides.forEach((s, i) => (s.order = i));
    onChange({ ...value, carouselSlides: slides });
    if (currentSlide >= slides.length) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [value, onChange, currentSlide]);

  const { width: previewWidth, height: previewHeight } = getPreviewDimensions();

  return (
    <div className={compact ? '' : 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'}>
      {!compact && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Constructor de Creativo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Diseña tu anuncio con imágenes, videos y texto
          </p>
        </div>
      )}

      <div className={compact ? '' : 'p-4'}>
        {/* Type & Aspect Ratio Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Creativo
            </label>
            <div className="flex flex-wrap gap-2">
              {CREATIVE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => onChange({ ...value, type: type.id })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      value.type === type.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Formato
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ratio) => {
                const Icon = ratio.icon;
                return (
                  <button
                    key={ratio.id}
                    onClick={() => onChange({ ...value, aspectRatio: ratio.id })}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      value.aspectRatio === ratio.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={ratio.dimensions}
                  >
                    <Icon className="w-3 h-3" />
                    {ratio.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Area */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Vista Previa
              </label>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Container */}
            <div
              className="relative mx-auto bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
              style={{
                width: previewWidth,
                height: previewHeight,
                backgroundColor: value.backgroundColor || '#1a1a2e',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOverSlide(-1); }}
              onDragLeave={() => setDragOverSlide(null)}
              onDrop={(e) => handleDrop(e)}
            >
              {/* Upload overlay */}
              {dragOverSlide === -1 && (
                <div className="absolute inset-0 bg-blue-500/50 flex items-center justify-center z-20">
                  <p className="text-white font-medium">Suelta para subir</p>
                </div>
              )}

              {/* Uploading indicator */}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Subiendo...</p>
                  </div>
                </div>
              )}

              {/* Content */}
              {value.type === 'CAROUSEL' && value.carouselSlides && value.carouselSlides.length > 0 ? (
                <>
                  {/* Carousel slide */}
                  {value.carouselSlides[currentSlide]?.asset?.url ? (
                    <img
                      src={value.carouselSlides[currentSlide].asset.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <p className="text-sm">Slide {currentSlide + 1}</p>
                    </div>
                  )}

                  {/* Carousel navigation */}
                  {value.carouselSlides.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                        disabled={currentSlide === 0}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentSlide(Math.min(value.carouselSlides!.length - 1, currentSlide + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                        disabled={currentSlide === value.carouselSlides!.length - 1}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {value.carouselSlides.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              i === currentSlide ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : value.primaryAsset?.url ? (
                value.primaryAsset.type === 'video' ? (
                  <video
                    src={value.primaryAsset.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={value.primaryAsset.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div
                  className="flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mb-2" />
                  <p className="text-sm text-center">
                    Arrastra una imagen o video<br />
                    o haz clic para seleccionar
                  </p>
                </div>
              )}

              {/* Text Overlays */}
              {value.textOverlays?.map((overlay) => (
                <div
                  key={overlay.id}
                  className={`absolute cursor-move select-none ${
                    editingOverlay === overlay.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    left: `${overlay.position.x}%`,
                    top: `${overlay.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => setEditingOverlay(overlay.id)}
                >
                  <p
                    style={{
                      fontSize: `${overlay.style.fontSize}px`,
                      fontFamily: overlay.style.fontFamily,
                      fontWeight: overlay.style.fontWeight,
                      color: overlay.style.color,
                      backgroundColor: overlay.style.backgroundColor,
                      textAlign: overlay.style.textAlign,
                      padding: overlay.style.backgroundColor ? '4px 8px' : 0,
                      borderRadius: overlay.style.backgroundColor ? '4px' : 0,
                    }}
                  >
                    {overlay.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Carousel slides thumbnails */}
            {value.type === 'CAROUSEL' && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
                {value.carouselSlides?.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      index === currentSlide ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => setCurrentSlide(index)}
                  >
                    {slide.asset?.url ? (
                      <img src={slide.asset.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCarouselSlide(index);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 rounded-full text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCarouselSlide}
                  className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>

          {/* Settings Panel */}
          <div className="space-y-4">
            {/* Upload Button */}
            {(value.type !== 'CAROUSEL' || !value.carouselSlides?.length) && (
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {uploading ? 'Subiendo...' : 'Subir imagen o video'}
                </button>
              </div>
            )}

            {/* Text Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Headline
              </label>
              <input
                type="text"
                value={value.headline || ''}
                onChange={(e) => onChange({ ...value, headline: e.target.value })}
                placeholder="Tu mensaje principal"
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">{(value.headline?.length || 0)}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Texto del Anuncio
              </label>
              <textarea
                value={value.bodyText || ''}
                onChange={(e) => onChange({ ...value, bodyText: e.target.value })}
                placeholder="Texto del anuncio"
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">{(value.bodyText?.length || 0)}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Call to Action
                </label>
                <select
                  value={value.callToAction || ''}
                  onChange={(e) => onChange({ ...value, callToAction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Seleccionar...</option>
                  {CTA_OPTIONS.map((cta) => (
                    <option key={cta} value={cta}>{cta}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL de destino
                </label>
                <input
                  type="url"
                  value={value.linkUrl || ''}
                  onChange={(e) => onChange({ ...value, linkUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Text Overlays */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Textos sobre imagen
                </label>
                <button
                  onClick={addTextOverlay}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Agregar texto
                </button>
              </div>

              {value.textOverlays && value.textOverlays.length > 0 && (
                <div className="space-y-2">
                  {value.textOverlays.map((overlay) => (
                    <div
                      key={overlay.id}
                      className={`p-3 rounded-lg border ${
                        editingOverlay === overlay.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) => updateOverlay(overlay.id, { text: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => removeOverlay(overlay.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {editingOverlay === overlay.id && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            type="color"
                            value={overlay.style.color}
                            onChange={(e) =>
                              updateOverlay(overlay.id, {
                                style: { ...overlay.style, color: e.target.value },
                              })
                            }
                            className="w-8 h-8 rounded cursor-pointer"
                            title="Color del texto"
                          />
                          <select
                            value={overlay.style.fontSize}
                            onChange={(e) =>
                              updateOverlay(overlay.id, {
                                style: { ...overlay.style, fontSize: parseInt(e.target.value) },
                              })
                            }
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => (
                              <option key={size} value={size}>{size}px</option>
                            ))}
                          </select>
                          <select
                            value={overlay.style.fontWeight}
                            onChange={(e) =>
                              updateOverlay(overlay.id, {
                                style: { ...overlay.style, fontWeight: e.target.value },
                              })
                            }
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color de fondo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.backgroundColor || '#1a1a2e'}
                  onChange={(e) => onChange({ ...value, backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={value.backgroundColor || '#1a1a2e'}
                  onChange={(e) => onChange({ ...value, backgroundColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
