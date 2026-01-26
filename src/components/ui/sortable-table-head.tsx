import * as React from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '@/hooks/useTableSort';

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  children: React.ReactNode;
}

export const SortableTableHead = React.forwardRef<HTMLTableCellElement, SortableTableHeadProps>(
  ({ className, sortKey, sortDirection, onSort, children, ...props }, ref) => {
    const handleClick = () => {
      onSort(sortKey);
    };

    const SortIcon = sortDirection === 'asc' 
      ? ArrowUp 
      : sortDirection === 'desc' 
        ? ArrowDown 
        : ArrowUpDown;

    return (
      <th
        ref={ref}
        className={cn(
          "h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors [&:has([role=checkbox])]:pr-0",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <div className="flex items-center gap-1">
          {children}
          <SortIcon 
            className={cn(
              "w-3 h-3 shrink-0 transition-opacity",
              sortDirection ? "opacity-100" : "opacity-40"
            )} 
          />
        </div>
      </th>
    );
  }
);

SortableTableHead.displayName = 'SortableTableHead';
