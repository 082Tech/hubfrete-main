import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";

interface DraggableTableHeadProps {
  columnId: string;
  isDragging?: boolean;
  isDragOver?: boolean;
  isSticky?: boolean;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  onColumnDragStart?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragEnd?: (e: React.DragEvent) => void;
  onColumnDragOver?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragLeave?: () => void;
  onColumnDrop?: (e: React.DragEvent, columnId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function DraggableTableHead({
  columnId,
  isDragging,
  isDragOver,
  isSticky,
  sortable,
  sortDirection,
  onSort,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  className,
  children,
}: DraggableTableHeadProps) {
  const SortIcon = sortDirection === 'asc' 
    ? ArrowUp 
    : sortDirection === 'desc' 
      ? ArrowDown 
      : ArrowUpDown;

  return (
    <th
      draggable={!isSticky}
      onDragStart={(e) => onColumnDragStart?.(e, columnId)}
      onDragEnd={onColumnDragEnd}
      onDragOver={(e) => onColumnDragOver?.(e, columnId)}
      onDragLeave={onColumnDragLeave}
      onDrop={(e) => onColumnDrop?.(e, columnId)}
      className={cn(
        "h-12 px-4 text-left align-middle font-semibold text-muted-foreground select-none transition-all",
        !isSticky && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        isDragOver && "bg-primary/10 border-l-2 border-primary",
        className
      )}
    >
      <div className="flex items-center gap-1">
        {!isSticky && (
          <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />
        )}
        {sortable ? (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={onSort}
          >
            {children}
            <SortIcon className={cn(
              "w-3 h-3 shrink-0",
              sortDirection ? "text-primary" : "text-muted-foreground"
            )} />
          </button>
        ) : (
          <span className="flex items-center gap-1">{children}</span>
        )}
      </div>
    </th>
  );
}
