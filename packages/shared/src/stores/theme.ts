/**
 * Theme store using Zustand
 * Manages light/dark mode state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../types';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'clutter-theme-storage',
    }
  )
);


