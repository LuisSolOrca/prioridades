'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  'Frecuentes': ['👍', '❤️', '😄', '🎉', '👏', '🔥', '💯', '✅'],
  'Emociones': ['😀', '😃', '😊', '😍', '🥰', '😘', '😂', '🤣', '😭', '😢', '😡', '😱', '😨', '🤔', '🙄', '😴'],
  'Gestos': ['👋', '👌', '✌️', '🤝', '🙏', '💪', '👊', '✊'],
  'Símbolos': ['✨', '⭐', '🌟', '💫', '🚀', '🎯', '⚡', '🔔', '🎁', '🎊', '🎈']
};

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Frecuentes');
  const [alignRight, setAlignRight] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Ajustar posición del picker basado en espacio disponible
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const pickerWidth = 320; // w-80 = 320px
      const spaceOnRight = window.innerWidth - buttonRect.right;

      // Si no hay suficiente espacio a la derecha, alinear a la izquierda
      setAlignRight(spaceOnRight >= pickerWidth);
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Botón para abrir el picker */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-lg opacity-50 hover:opacity-100 transition p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Más emojis"
      >
        <Smile size={18} />
      </button>

      {/* Picker Dropdown */}
      {isOpen && (
        <div className={`absolute bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 w-80 ${alignRight ? 'right-0' : 'left-0'}`}>
          {/* Header con pestañas de categorías */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-2">
            <div className="flex gap-1 overflow-x-auto">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1 text-xs rounded whitespace-nowrap transition ${
                    activeCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de emojis */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-2 transition transform hover:scale-125"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].length} emojis disponibles
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
