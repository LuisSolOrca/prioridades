'use client';

import { useEditor, EditorContent, NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { useCallback, useEffect, useState, useRef } from 'react';
import { mergeAttributes } from '@tiptap/core';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Palette,
  Highlighter,
  Quote,
  Minus,
  X,
  Upload,
  Link2Off,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
];

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#BBF7D0', '#A5F3FC', '#DDD6FE', '#FECACA', '#FED7AA',
];

const IMAGE_SIZES = [
  { label: '25%', value: '25%' },
  { label: '50%', value: '50%' },
  { label: '75%', value: '75%' },
  { label: '100%', value: '100%' },
  { label: 'Original', value: 'auto' },
];

// Custom Image extension with width support
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('width') || element.style.width || '100%',
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}`,
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          return {
            'data-align': attributes.align,
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-align'] || 'center';
    const wrapperStyle = align === 'center' ? 'text-align: center;' :
                         align === 'right' ? 'text-align: right;' : 'text-align: left;';

    return ['div', { style: wrapperStyle }, ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]];
  },
});

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Escribe tu mensaje aquí...',
  minHeight = '250px',
}: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageWidth, setImageWidth] = useState('100%');
  const [imageAlign, setImageAlign] = useState('center');
  const [selectedImageNode, setSelectedImageNode] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      ResizableImage.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4 cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        style: `min-height: ${minHeight}`,
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG') {
          const node = view.state.doc.nodeAt(pos);
          if (node?.type.name === 'image') {
            setSelectedImageNode({ pos, node });
            setImageWidth(node.attrs.width || '100%');
            setImageAlign(node.attrs.align || 'center');
            setShowImageEditModal(true);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;

    const url = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;
    editor.chain().focus().setImage({ src: url, width: imageWidth, align: imageAlign } as any).run();
    setShowImageModal(false);
    setImageUrl('');
    setImageWidth('100%');
    setImageAlign('center');
  }, [editor, imageUrl, imageWidth, imageAlign]);

  const updateSelectedImage = useCallback(() => {
    if (!editor || !selectedImageNode) return;

    const { pos, node } = selectedImageNode;
    editor.chain().focus().setNodeSelection(pos).updateAttributes('image', {
      width: imageWidth,
      align: imageAlign,
    }).run();

    setShowImageEditModal(false);
    setSelectedImageNode(null);
  }, [editor, selectedImageNode, imageWidth, imageAlign]);

  const deleteSelectedImage = useCallback(() => {
    if (!editor || !selectedImageNode) return;

    const { pos } = selectedImageNode;
    editor.chain().focus().setNodeSelection(pos).deleteSelection().run();

    setShowImageEditModal(false);
    setSelectedImageNode(null);
  }, [editor, selectedImageNode]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url, width: imageWidth, align: imageAlign } as any).run();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
      setShowImageModal(false);
      setImageWidth('100%');
      setImageAlign('center');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!editor) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[250px] bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition ${
        isActive
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => (
    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
  );

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
        >
          <Redo size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Título 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Título 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Título 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Colors */}
        <div className="relative">
          <ToolbarButton
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            title="Color de texto"
          >
            <Palette size={16} />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 grid grid-cols-4 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition flex items-center justify-center text-gray-500 col-span-4 mt-1"
              >
                <X size={14} /> Quitar
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <ToolbarButton
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            isActive={editor.isActive('highlight')}
            title="Resaltar"
          >
            <Highlighter size={16} />
          </ToolbarButton>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 grid grid-cols-3 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setShowHighlightPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition flex items-center justify-center text-gray-500 col-span-3 mt-1"
              >
                <X size={14} /> Quitar
              </button>
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinear izquierda"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centrar"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinear derecha"
        >
          <AlignRight size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista con viñetas"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Cita"
        >
          <Quote size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href;
            setLinkUrl(previousUrl || '');
            setShowLinkModal(true);
          }}
          isActive={editor.isActive('link')}
          title="Enlace"
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Quitar enlace"
          >
            <Link2Off size={16} />
          </ToolbarButton>
        )}

        {/* Image */}
        <ToolbarButton
          onClick={() => setShowImageModal(true)}
          title="Insertar imagen"
        >
          <ImageIcon size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Horizontal rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea horizontal"
        >
          <Minus size={16} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Insertar enlace
            </h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkModal(false);
                    setLinkUrl('');
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Quitar enlace
                </button>
              )}
              <button
                type="button"
                onClick={setLink}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Insertar imagen
            </h3>

            {/* File upload */}
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition text-gray-600 dark:text-gray-400"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Subir imagen desde tu computadora
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                Máximo 5MB. Formatos: JPG, PNG, GIF, WebP
              </p>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">o</span>
              </div>
            </div>

            {/* URL input */}
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />

            {/* Size options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tamaño de imagen
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setImageWidth(size.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      imageWidth === size.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alineación
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageAlign('left')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    imageAlign === 'left'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlignLeft size={16} className="inline mr-1" /> Izquierda
                </button>
                <button
                  type="button"
                  onClick={() => setImageAlign('center')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    imageAlign === 'center'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlignCenter size={16} className="inline mr-1" /> Centro
                </button>
                <button
                  type="button"
                  onClick={() => setImageAlign('right')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    imageAlign === 'right'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlignRight size={16} className="inline mr-1" /> Derecha
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addImage}
                disabled={!imageUrl}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Insertar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      {showImageEditModal && selectedImageNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Editar imagen
            </h3>

            {/* Preview */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
              <img
                src={selectedImageNode.node.attrs.src}
                alt="Preview"
                style={{ width: imageWidth === 'auto' ? 'auto' : imageWidth, maxWidth: '100%' }}
                className="inline-block rounded"
              />
            </div>

            {/* Size options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tamaño de imagen
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setImageWidth(size.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      imageWidth === size.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alineación
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageAlign('left')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    imageAlign === 'left'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlignLeft size={16} className="inline mr-1" /> Izquierda
                </button>
                <button
                  type="button"
                  onClick={() => setImageAlign('center')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    imageAlign === 'center'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlignCenter size={16} className="inline mr-1" /> Centro
                </button>
                <button
                  type="button"
                  onClick={() => setImageAlign('right')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    imageAlign === 'right'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlignRight size={16} className="inline mr-1" /> Derecha
                </button>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={deleteSelectedImage}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Eliminar
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImageEditModal(false);
                    setSelectedImageNode(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={updateSelectedImage}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close color pickers */}
      {(showColorPicker || showHighlightPicker) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowColorPicker(false);
            setShowHighlightPicker(false);
          }}
        />
      )}
    </div>
  );
}
