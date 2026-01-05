/**
 * Theme system for light and dark modes
 */

import { colors } from './colors';
import { ThemeMode } from '@clutter/domain';

export const getThemeColors = (mode: ThemeMode) => {
  return colors[mode];
};

export type ThemeColors = ReturnType<typeof getThemeColors>;


