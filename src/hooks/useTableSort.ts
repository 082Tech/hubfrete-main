import { useState, useCallback, useMemo, useEffect } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface UseTableSortOptions<T> {
  data: T[];
  defaultSort?: SortConfig;
  persistKey?: string; // localStorage key for persistence
  sortFunctions?: Record<string, (a: T, b: T) => number>;
}

export interface UseTableSortReturn<T> {
  sortedData: T[];
  sortConfig: SortConfig;
  requestSort: (key: string) => void;
  getSortDirection: (key: string) => SortDirection;
  clearSort: () => void;
}

export function useTableSort<T>({
  data,
  defaultSort = { key: '', direction: null },
  persistKey,
  sortFunctions = {},
}: UseTableSortOptions<T>): UseTableSortReturn<T> {
  // Load initial sort from localStorage if persistKey provided
  const getInitialSort = (): SortConfig => {
    if (persistKey) {
      try {
        const stored = localStorage.getItem(`table-sort-${persistKey}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return defaultSort;
  };

  const [sortConfig, setSortConfig] = useState<SortConfig>(getInitialSort);

  // Persist to localStorage when sort changes
  useEffect(() => {
    if (persistKey) {
      try {
        localStorage.setItem(`table-sort-${persistKey}`, JSON.stringify(sortConfig));
      } catch {
        // Ignore storage errors
      }
    }
  }, [sortConfig, persistKey]);

  const requestSort = useCallback((key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        // Cycle through: asc -> desc -> null
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return { key: '', direction: null };
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const getSortDirection = useCallback(
    (key: string): SortDirection => {
      return sortConfig.key === key ? sortConfig.direction : null;
    },
    [sortConfig]
  );

  const clearSort = useCallback(() => {
    setSortConfig({ key: '', direction: null });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const sorted = [...data];
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      // Use custom sort function if provided
      if (sortFunctions[key]) {
        return sortFunctions[key](a, b) * multiplier;
      }

      // Default comparison
      const aValue = (a as Record<string, unknown>)[key];
      const bValue = (b as Record<string, unknown>)[key];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' }) * multiplier;
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * multiplier;
      }

      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue.getTime() - bValue.getTime()) * multiplier;
      }

      // Date string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aDate = Date.parse(aValue);
        const bDate = Date.parse(bValue);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return (aDate - bDate) * multiplier;
        }
      }

      return 0;
    });

    return sorted;
  }, [data, sortConfig, sortFunctions]);

  return {
    sortedData,
    sortConfig,
    requestSort,
    getSortDirection,
    clearSort,
  };
}
