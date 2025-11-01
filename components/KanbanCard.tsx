'use client';

import { Draggable } from '@hello-pangea/dnd';

interface KanbanCardProps {
  priority: any;
  index: number;
  onViewDetails: (priority: any) => void;
}

const statusColors = {
  EN_TIEMPO: 'bg-green-50 border-green-200',
  EN_RIESGO: 'bg-yellow-50 border-yellow-200',
  BLOQUEADO: 'bg-red-50 border-red-200',
  COMPLETADO: 'bg-blue-50 border-blue-200',
};

export default function KanbanCard({ priority, index, onViewDetails }: KanbanCardProps) {
  return (
    <Draggable draggableId={priority._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-white rounded-lg border-2 p-3 mb-2 shadow-sm cursor-move
            ${statusColors[priority.status as keyof typeof statusColors]}
            ${snapshot.isDragging ? 'shadow-lg scale-105 rotate-2' : ''}
            transition-all duration-200
          `}
        >
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-sm text-gray-800 line-clamp-2">
              {priority.title}
            </h3>

            {priority.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {priority.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                  {priority.completionPercentage}%
                </span>
                {priority.initiatives && priority.initiatives.length > 0 && (
                  <div className="flex gap-1">
                    {priority.initiatives.slice(0, 2).map((init: any) => (
                      <span
                        key={init._id}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: init.color }}
                        title={init.name}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => onViewDetails(priority)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
