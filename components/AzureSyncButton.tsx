'use client';

import { RefreshCw } from 'lucide-react';

interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
}

interface Priority {
  _id: string;
  title: string;
  checklist?: ChecklistItem[];
}

interface AzureSyncButtonProps {
  priority: Priority;
  onOpenModal: (priority: Priority) => void;
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
