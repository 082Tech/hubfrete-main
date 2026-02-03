import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'grid';

const STORAGE_KEY = 'hubfrete_view_mode_preference';

/**
 * Hook para persistir a preferência de visualização (lista/grid) do usuário.
 * A preferência é salva no localStorage e compartilhada entre todas as telas.
 * Por padrão, inicia como 'list'.
 */
export function useViewModePreference() {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'list';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'list';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'list' || e.newValue === 'grid')) {
        setViewModeState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { viewMode, setViewMode };
}
