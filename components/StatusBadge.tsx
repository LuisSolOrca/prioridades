import { PriorityStatus } from '@/models/Priority';

interface StatusBadgeProps {
  status: PriorityStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    'EN_TIEMPO': { label: 'En Tiempo', color: 'bg-green-500' },
    'EN_RIESGO': { label: 'En Riesgo', color: 'bg-yellow-500' },
    'BLOQUEADO': { label: 'Bloqueado', color: 'bg-red-500' },
    'COMPLETADO': { label: 'Completado', color: 'bg-blue-500' },
    'REPROGRAMADO': { label: 'Reprogramado', color: 'bg-gray-500' }
  };

  const { label, color } = config[status] || config['EN_TIEMPO'];

  return (
    <span className={`${color} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap`}>
      {label}
    </span>
  );
}
