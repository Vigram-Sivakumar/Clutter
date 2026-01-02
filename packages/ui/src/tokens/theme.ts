/**
 * Theme system for light and dark modes
 */

import { colors } from './colors';
import type { ThemeMode } from '@clutter/shared';

export const getThemeColors = (mode: ThemeMode) => {
  return colors[mode];
};

export type ThemeColors = ReturnType<typeof getThemeColors>;


