/**
 * Hybrid color palette
 * Light mode: Minimal editorial aesthetic (clean off-white #fafaf8 with strong black contrast)
 * Dark mode: Notion-inspired dark theme (#141414 base)
 * Inspired by high-end portfolio and magazine design
 */

// Stone palette for light mode - minimal editorial aesthetic (inspired by high-end portfolios)
const stone = {
  50: '#fafaf8',    // Light: clean off-white background (minimal base)
  100: '#f5f5f0',   // Light: secondary background (subtle layering)
  200: '#ecece6',   // Light: tertiary background, subtle dividers
  300: '#deddd5',   // Light: hover background, default border
  400: '#b8b7ae',   // Light: disabled text, placeholder
  500: '#8a8980',   // Light: tertiary text, markers
  600: '#5c5b52',   // Light: secondary text
  700: '#3d3c35',   // Light: tags, focus states
  800: '#26251f',   // Light: hover text, pressed states
  900: '#131210',   // Light: default text (strong black for editorial contrast)
} as const;

// Neutral palette for dark mode - Notion-inspired dark aesthetic
const neutral = {
  50: '#d5d5d5',    // Dark: default text (light gray, Notion-inspired)
  100: '#b5b5b5',   // Dark: bright text/highlights
  200: '#a0a0a0',   // Dark: tags
  300: '#868686',   // Dark: secondary text
  400: '#6b6b6b',   // Dark: tertiary text, focus states
  500: '#4d4d4d',   // Dark: markers, disabled text
  600: '#3b3b3b',   // Dark: borders, dividers
  700: '#2e2e2e',   // Dark: active background
  800: '#232323',   // Dark: hover background
  900: '#1e1e1e',   // Dark: tertiary background
  950: '#141414',   // Dark: default background (original Notion dark)
} as const;

export const colors = {
  light: {
    // Background colors - Minimal editorial aesthetic
    background: {
      default: stone[50],       // clean off-white base
      secondary: stone[100],    // subtle layering
      tertiary: stone[200],     // soft dividers and sections
      hover: `${stone[400]}35`, // interactive hover state (buttons)
      subtleHover: stone[200],  // sidebar item hover state
      active: stone[400],       // pressed/active state
      subtleActive: stone[200],       // sidebar item pressed/active state

    },

    // Text colors - Strong editorial contrast
    text: {
      default: stone[900],      // strong black for readability
      secondary: stone[600],    // medium weight for hierarchy
      tertiary: stone[500],     // lighter for subtle content
      subtle: stone[600],     // lighter for subtle content

      disabled: stone[700],     // faded/disabled state
      placeholder: `${stone[700]}50`, // placeholder at 60%
      inverse: stone[50],       // off-white text on dark backgrounds
    },

    // Marker colors (bullets, numbers, icons, etc.)
    marker: stone[500],         // subtle markers

    // Border colors - Minimal lines
    border: {
      default: stone[300],      // default border
      subtle: stone[200],      // default border
      hover: stone[400],        // interactive border
      focus: stone[700],        // focus indicator
      divider: stone[200],      // subtle dividers
    },

    // Accent colors - Tag/highlight colors only
    accent: {
      // Gold for favorites/stars
      gold: '#eab308',        // yellow-500
      // Tag/highlight colors - paired background and text for accessibility
      default:  { bg: stone[200], text: stone[900] },
      gray:     { bg: stone[300], text: stone[800] },
      brown:    { bg: '#fef3c7', text: '#78350f' }, // amber-100, amber-900
      orange:   { bg: '#ffedd5', text: '#9a3412' }, // orange-100, orange-800
      yellow:   { bg: '#fef9c3', text: '#854d0e' }, // yellow-100, yellow-800
      green:    { bg: '#d1fae5', text: '#065f46' }, // emerald-100, emerald-800
      purple:   { bg: '#e9d5ff', text: '#6b21a8' }, // purple-200, purple-800
      pink:     { bg: '#fce7f3', text: '#9f1239' }, // pink-100, pink-800
      red:      { bg: '#fee2e2', text: '#991b1b' }, // red-100, red-800
    },

    // Semantic colors - adjusted for newspaper aesthetic
    semantic: {
      success: '#059669',     // emerald-600
      warning: '#d97706',     // amber-600
      error: '#dc2626',       // red-600
      info: stone[700],       // use dark shade instead of blue
      orange: '#f97316',      // orange-500
      calendarAccent: '#e95824', // Calendar today/selected highlight
    },

    // Button colors
    button: {
      primary: {
        background: stone[800],     // Light gray for primary action
        text: stone[100],           // Dark text on light background
        hover: stone[700],           // Lighter on hover
      },
      danger: {
        background: '#dc2626',      // red-600
        text: stone[50],            // Light text on red background
        hover: '#b91c1c',           // red-700
      },
    },

    // Overlay colors
    overlay: {
      light: `${stone[900]}14`,    // ink overlay at 8%
      medium: `${stone[900]}29`,   // ink overlay at 16%
      heavy: `${stone[900]}66`,    // ink overlay at 40%
      backdrop: 'rgba(37, 36, 32, 0.5)', // modal backdrop (50% opacity)
    },

    // Shadow colors (for box-shadow) - softer shadows for newspaper aesthetic
    shadow: {
      sm: 'rgba(37, 36, 32, 0.04)',
      md: 'rgba(37, 36, 32, 0.08)',
      lg: 'rgba(37, 36, 32, 0.12)',
    },

  },
  dark: {
    // Background colors - Notion-inspired dark aesthetic
    background: {
      default: neutral[950],    // #141414 (original Notion dark)
      secondary: '#181818',     // slightly lighter layer
      tertiary: neutral[900],   // #1e1e1e (elevated surface)
      hover: neutral[800],      // #232323 (hover state for buttons)
      subtleHover: neutral[900], // #2e2e2e (sidebar item hover state)
      active: neutral[900],     // #2e2e2e (active/pressed state)
    },

    // Text colors - Notion-inspired hierarchy
    text: {
      default: neutral[100],     // #d5d5d5 (primary text)
      secondary: neutral[300],  // #868686 (secondary text)
      tertiary: neutral[500],   // #4d4d4d (subtle text)
      subtle: neutral[400],   // #4d4d4d (subtle text)
      disabled: neutral[700],   // #4d4d4d (disabled)
      placeholder: `${neutral[500]}99`, // #4d4d4d at 60%
      // placeholder: neutral[800], // #4d4d4d at 60%

      inverse: '#191919',       // dark text on light backgrounds
    },

    // Marker colors (bullets, numbers, icons, etc.)
    marker: neutral[500],       // #4d4d4d (subtle markers)

    // Border colors - Notion-inspired borders
    border: {
      default: neutral[600],    // #3b3b3b (default border)
      subtle: neutral[800],      // default border
      hover: neutral[500],      // #4d4d4d (hover border)
      focus: neutral[400],      // #6b6b6b (focus indicator)
      divider: neutral[600],    // #3b3b3b (subtle dividers)
    },

    // Accent colors - Notion-inspired tag colors
    accent: {
      // Gold for favorites/stars
      gold: '#FFD666',        // Notion gold
      // Tag/highlight colors - Notion-inspired with WCAG AA compliance
      default:  { bg: '#373737', text: '#E3E2E0' },
      gray:     { bg: '#454545', text: '#D4D4D4' },
      brown:    { bg: '#4A3228', text: '#D4B59E' },
      orange:   { bg: '#4A2D0A', text: '#FFB366' },
      yellow:   { bg: '#3D3209', text: '#FFD966' },
      green:    { bg: '#1A3D36', text: '#6BC4B0' },
      purple:   { bg: '#352450', text: '#C9A8F0' },
      pink:     { bg: '#451230', text: '#F28DC1' },
      red:      { bg: '#4A1D1D', text: '#FF9999' },
    },

    // Semantic colors - Notion-inspired
    semantic: {
      success: '#4a9b8e',     // Notion success green
      warning: '#e6c547',     // Notion warning yellow
      error: '#e67c73',       // Notion error red
      info: '#3b8ef6',        // Notion info blue
      orange: '#FF8C00',      // Notion orange
      calendarAccent: '#e95824', // Calendar today/selected highlight
    },

    // Button colors
    button: {
      primary: {
        background: neutral[50],   // Light gray for primary action (d5d5d5)
        text: neutral[950],         // Dark text on light background
        hover: neutral[100],         // Brighter on hover
      },
      danger: {
        background: '#e67c73',      // Notion error red
        text: neutral[950],         // Dark text on red background
        hover: '#f08a81',           // Lighter red on hover
      },
    },

    // Overlay colors
    overlay: {
      light: 'rgba(245, 245, 243, 0.08)',   // warm off-white overlay
      medium: 'rgba(245, 245, 243, 0.16)',  // warm off-white overlay
      heavy: 'rgba(245, 245, 243, 0.4)',    // warm off-white overlay
      backdrop: 'rgba(0, 0, 0, 0.5)',       // modal backdrop (50% opacity)
    },

    // Shadow colors (for box-shadow) - deeper shadows for charcoal
    shadow: {
      sm: 'rgba(18, 18, 17, 0.3)',
      md: 'rgba(18, 18, 17, 0.4)',
      lg: 'rgba(18, 18, 17, 0.5)',
    },

  },
} as const;

export type ColorToken = typeof colors;

// Export the palettes for direct access
export { stone, neutral };

