// Shared utility functions
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Theme utilities
import type { ThemeMode } from '@clutter/domain';

export const getThemeColors = <T extends Record<ThemeMode, any>>(
  colors: T,
  mode: ThemeMode
): T[ThemeMode] => {
  return colors[mode];
};

// Sorting utilities
export * from './sorting';

// Date formatting utilities
export * from './dateFormatting';

