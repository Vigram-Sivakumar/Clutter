/**
 * UI-specific theme hook that provides colors
 * Wraps the shared useTheme hook with UI colors
 */

import { useTheme as useSharedTheme } from '@clutter/shared';
import { colors } from '../tokens/colors';

export const useTheme = () => {
  return useSharedTheme(colors);
};
















