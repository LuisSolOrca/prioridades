'use client';

import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  priorities: any[];
  onStatusChange: (priorityId: string, newStatus: string) => Promise<void>;
  onViewDetails: (priority: any) => void;
}

const columns = [
  {
    id: 'EN_TIEMPO',
    title: 'En Tiempo',
    color: 'bg-green-100',
    headerColor: 'bg-green-600',
  },
  {
    id: 'EN_RIESGO',
    title: 'En Riesgo',
    color: 'bg-yellow-100',
    headerColor: 'bg-yellow-600',
  },
  {
    id: 'BLOQUEADO',
    title: 'Bloqueado',
    color: 'bg-red-100',
    headerColor: 'bg-red-600',
  },
  {
    id: 'COMPLETADO',
    title: 'Completado',
    color: 'bg-blue-100',
    headerColor: 'bg-blue-600',
  },
];

export default function KanbanBoard({ priorities, onStatusChange, onViewDetails }: KanbanBoardProps) {
  const handleDragEnd = async (result: DropResult) => {
    // Save current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const { destination, source, draggableId } = result;

    // No destination or dropped in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // Status changed
    if (destination.droppableId !== source.droppableId) {
      await onStatusChange(draggableId, destination.droppableId);

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    }
  };

  const handleDragStart = () => {
    // Prevent default scroll behavior
    if (window) {
      document.body.style.overflow = 'hidden';
    }
  };

  const handleDragUpdate = () => {
    // Keep scroll locked during drag
    if (window && document.body.style.overflow !== 'hidden') {
      document.body.style.overflow = 'hidden';
    }
  };

  const resetScroll = () => {
    // Re-enable scroll after drag ends
    if (window) {
      document.body.style.overflow = '';
    }
  };

  const getPrioritiesByStatus = (status: string) => {
    return priorities.filter(p => p.status === status);
  };

  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={(result) => {
        handleDragEnd(result);
        resetScroll();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnPriorities = getPrioritiesByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`${column.headerColor} text-white rounded-t-lg px-4 py-3 flex items-center justify-between`}>
                <h3 className="font-bold text-sm">{column.title}</h3>
                <span className="bg-white bg-opacity-30 rounded-full px-2 py-1 text-xs font-semibold">
                  {columnPriorities.length}
                </span>
              </div>

              {/* Droppable Column */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      ${column.color} rounded-b-lg p-3 min-h-[500px] flex-1
                      ${snapshot.isDraggingOver ? 'ring-2 ring-blue-400 bg-opacity-80' : ''}
                      transition-all duration-200
                    `}
                  >
                    {columnPriorities.map((priority, index) => (
                      <KanbanCard
                        key={priority._id}
                        priority={priority}
                        index={index}
                        onViewDetails={onViewDetails}
                      />
                    ))}
                    {provided.placeholder}

                    {columnPriorities.length === 0 && (
                      <div className="text-center text-gray-400 text-sm mt-8">
                        No hay prioridades
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
