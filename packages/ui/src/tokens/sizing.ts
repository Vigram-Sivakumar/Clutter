/**
 * Notion-inspired sizing tokens
 * For component dimensions, icons, and layout constraints
 */

export const sizing = {
  // Icon sizes (4px scale)
  icon: {
    xs: 12,  // Dismiss buttons, tag close icons
    sm: 16,  // Primary UI actions (most common)
    md: 20,  // Large elements
    lg: 24,  // Hero actions
    xl: 32,  // Extra large icons
    pageTitleIcon: 32, // Page title emoji/icon size (matches title font)

  },

  // Button heights (matching actual Button component sizes)
  button: {
    xs: '20px',
    small: '24px',
    medium: '28px',
  },

  // Input heights (matching button heights for consistency)
  input: {
    xs: '20px',
    small: '24px',
    medium: '28px',
  },

  // Border radius
  radius: {
    none: '0px',
    sm: '3px',
    md: '4px',
    lg: '6px',
    xl: '8px',
    full: '9999px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  // Layout constraints
  layout: {
    sidebarWidth: '240px',
    sidebarCollapsedWidth: '48px',
    headerHeight: '45px',
    maxContentWidth: '900px',
    minContentWidth: '320px',
  },
} as const;

export type SizingToken = typeof sizing;

