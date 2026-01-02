import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Options for usePersistedState hook
 */
interface UsePersistedStateOptions<T> {
  key: string;
  defaultValue: T;
  saveState: (key: string, value: T) => void;
  loadState: (key: string) => Promise<T | null>;
  debounceMs?: number;
  enabled?: boolean; // Allow disabling persistence (e.g., for web version)
}

/**
 * Hook to manage state with automatic persistence to database
 * 
 * Features:
 * - Loads initial state from database on mount
 * - Debounces saves to avoid too many writes
 * - Prevents saving during hydration phase
 * - Type-safe with TypeScript
 * 
 * @example
 * ```tsx
 * const [isCollapsed, setIsCollapsed] = usePersistedState({
 *   key: 'ui.sidebar.collapsed',
 *   defaultValue: false,
 *   saveState: debouncedSaveUIState,
 *   loadState: loadUIState,
 * });
 * ```
 */
export function usePersistedState<T>({
  key,
  defaultValue,
  saveState,
  loadState,
  debounceMs = 500,
  enabled = true,
}: UsePersistedStateOptions<T>): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load initial state from storage
  useEffect(() => {
    if (!enabled) {
      setIsInitialized(true);
      return;
    }

    loadState(key).then((loadedValue) => {
      if (isMountedRef.current) {
        if (loadedValue !== null) {
          setState(loadedValue);
        }
        setIsInitialized(true);
      }
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [key, loadState, enabled]);

  // Save state to storage (debounced)
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        
        // Only save if initialized and persistence is enabled (don't save during hydration)
        if (isInitialized && enabled) {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }
          
          saveTimerRef.current = setTimeout(() => {
            saveState(key, newValue);
            saveTimerRef.current = null;
          }, debounceMs);
        }
        
        return newValue;
      });
    },
    [key, saveState, debounceMs, isInitialized, enabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // Flush any pending save immediately on unmount
        saveState(key, state);
      }
    };
  }, [key, state, saveState]);

  return [state, setPersistedState];
}

/**
 * Simpler version for non-Tauri environments (uses localStorage)
 * This allows the same components to work in web builds
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.error(`Failed to save to localStorage: ${key}`, error);
        }
        return newValue;
      });
    },
    [key]
  );

  return [state, setPersistedState];
}

