'use client';

import { RefreshCw } from 'lucide-react';

interface AzureSyncButtonProps {
  priority: any; // Usar any para aceptar cualquier tipo de Priority
  onOpenModal: (priority: any) => void;
}

export default function AzureSyncButton({ priority, onOpenModal }: AzureSyncButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenModal(priority);
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded transition-all text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      title="Sincronizar con Azure DevOps"
    >
      <RefreshCw size={16} />
    </button>
  );
}
