/**
 * Border radius scale
 * Consistent rounding following a 2× geometric progression (3px → 6px → 12px)
 * 
 * Usage: radius['6'] for 6px, radius['3'] for 3px, etc.
 * 
 * This provides:
 * - Type safety (only approved values)
 * - Autocomplete support
 * - Single source of truth
 * - Easy refactoring (search for radius['6'])
 */

export const radius = {
  // Small radius - buttons, tags, pills, inputs, badges, inline elements
  '3': '3px',
  
  // Medium radius - cards, list items, sections, popovers, dropdowns, containers
  '6': '6px',
  
  // Large radius - modals, dialogs, windows, large surfaces
  '12': '12px',
} as const;

export type RadiusToken = typeof radius;

