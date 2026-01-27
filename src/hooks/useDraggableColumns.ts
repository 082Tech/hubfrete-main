import { useState, useCallback, useEffect } from 'react';

export interface ColumnDefinition {
  id: string;
  label: string;
  minWidth?: string;
  sticky?: 'left' | 'right';
  sortable?: boolean;
  sortKey?: string;
}

interface UseDraggableColumnsOptions {
  columns: ColumnDefinition[];
  persistKey?: string;
}

export function useDraggableColumns({ columns, persistKey }: UseDraggableColumnsOptions) {
  // Initialize column order from localStorage or default order
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (persistKey) {
      try {
        const stored = localStorage.getItem(`column-order-${persistKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate that all column IDs exist
          const validIds = columns.map(c => c.id);
          const allValid = parsed.every((id: string) => validIds.includes(id));
          if (allValid && parsed.length === validIds.length) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error loading column order:', e);
      }
    }
    return columns.map(c => c.id);
  });

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Save to localStorage when order changes
  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(`column-order-${persistKey}`, JSON.stringify(columnOrder));
    }
  }, [columnOrder, persistKey]);

  // Get ordered columns
  const orderedColumns = columnOrder
    .map(id => columns.find(c => c.id === id))
    .filter((c): c is ColumnDefinition => c !== undefined);

  const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    // Don't allow dragging sticky columns
    const column = columns.find(c => c.id === columnId);
    if (column?.sticky) {
      e.preventDefault();
      return;
    }
    
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
    
    // Add dragging style
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, [columns]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedColumn(null);
    setDragOverColumn(null);
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    
    // Don't allow dropping on sticky columns
    const column = columns.find(c => c.id === columnId);
    if (column?.sticky) return;
    
    if (draggedColumn && columnId !== draggedColumn) {
      setDragOverColumn(columnId);
    }
  }, [draggedColumn, columns]);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    // Don't allow dropping on sticky columns
    const targetColumn = columns.find(c => c.id === targetColumnId);
    if (targetColumn?.sticky) return;
    
    const sourceColumnId = e.dataTransfer.getData('text/plain');
    if (!sourceColumnId || sourceColumnId === targetColumnId) return;

    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const sourceIndex = newOrder.indexOf(sourceColumnId);
      const targetIndex = newOrder.indexOf(targetColumnId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Remove source and insert at target position
        newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, sourceColumnId);
      }

      return newOrder;
    });

    setDraggedColumn(null);
    setDragOverColumn(null);
  }, [columns]);

  const resetColumnOrder = useCallback(() => {
    setColumnOrder(columns.map(c => c.id));
  }, [columns]);

  return {
    orderedColumns,
    columnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetColumnOrder,
  };
}
