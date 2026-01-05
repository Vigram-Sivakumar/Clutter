/**
 * React hook for theme management
 * Platform-agnostic theme hook
 */

import { useThemeStore } from '../stores/theme';
import { getThemeColors } from '../utils';
import type { ThemeMode } from '@clutter/domain';

export const useTheme = <T extends Record<ThemeMode, any>>(colors: T) => {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const themeColors = getThemeColors(colors, mode);

  return {
    mode,
    setMode,
    toggleMode,
    colors: themeColors,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
};

export type { ThemeMode };


