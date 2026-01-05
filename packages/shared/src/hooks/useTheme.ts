/**
 * React hook for theme management
 * Platform-agnostic theme hook
 */

import { useThemeStore } from '@clutter/state';
import type { ThemeMode } from '@clutter/domain';

// Internal helper for theme color selection
const getThemeColors = <T extends Record<ThemeMode, any>>(
  colors: T,
  mode: ThemeMode
): T[ThemeMode] => {
  return colors[mode];
};

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


