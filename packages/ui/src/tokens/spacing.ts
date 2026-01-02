/**
 * Spacing scale
 * Based on 4px increments (with 2px, 6px for fine control)
 * 
 * Usage: spacing['16'] for 16px, spacing['8'] for 8px, etc.
 * For component-specific semantics, define local constants in the component file.
 * 
 * This provides:
 * - Type safety (only approved values)
 * - Autocomplete support
 * - Single source of truth
 * - Easy refactoring (search for spacing['16'])
 */

export const spacing = {
  // Base scale - use these everywhere
  '0': '0px',
  '2': '2px',
  '4': '4px',
  '6': '6px',
  '8': '8px',
  '12': '12px',
  '16': '16px',
  '20': '20px',
  '24': '24px',
  '32': '32px',
  '40': '40px',
  '48': '48px',
  '64': '64px',
  '80': '80px',
  '96': '96px',
  '128': '128px',
} as const;

export type SpacingToken = typeof spacing;

