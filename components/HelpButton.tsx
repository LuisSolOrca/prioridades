'use client';

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function HelpButton() {
  const [isHovered, setIsHovered] = useState(false);

  const openHelp = () => {
    window.open('/help', '_blank', 'width=1200,height=800');
  };

  return (
    <button
      onClick={openHelp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 group"
      title="Ayuda - Manual de Usuario"
    >
      <HelpCircle size={24} />

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl">
          <div className="font-semibold mb-1">Manual de Usuario</div>
          <div className="text-xs text-gray-300">
            Haz clic para abrir la ayuda
          </div>
          {/* Arrow */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </button>
  );
}
