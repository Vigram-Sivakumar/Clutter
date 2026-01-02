/**
 * Editor Design Tokens
 * 
 * Centralized constants for spacing, sizing, and typography.
 * All values in pixels unless otherwise noted.
 */

export const spacing = {
  /** Total visual spacing between blocks (gap + margin) */
  block: 8,
  /** Flexbox gap between sibling blocks */
  gap: 8,
  /** Medium gap for more breathing room */
  margin: 2,
  /** Horizontal indent per nesting level (marker 24px + gap 8px) */
  indent: 32,
  /** Gap between marker and text */
  inline: 8,
  /** Visual offset for blocks inside a toggle (independent of hierarchy) */
  toggleIndent: 32,
} as const;

export const sizing = {
  /** Width/height of list markers (bullet, checkbox, etc.) */
  marker: 16,
  /** Marker container width (holds 16px marker centered) */
  markerContainer: 24,
  /** Line height in pixels (at body font size) */
  lineHeight: 24,
  /** Icon size within markers */
  icon: 16,
} as const;

export const typography = {
  /** Font family stack (system fonts - same as v1) */
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
  /** Body text size */
  body: 16,
  bodySmall: 14,
  label: 12,
  /** Heading sizes */
  Display: 32,
  h1: 32,
  h2: 24,
  h3: 20,
  /** Line height multiplier */
  lineHeightRatio: 1.5,
  /** Font weights */
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

/**
 * Calculate line height in pixels for a given font size
 */
export function getLineHeight(fontSize: number): number {
  return Math.round(fontSize * typography.lineHeightRatio);
}

/**
 * Calculate indent for a given nesting level
 */
export function getIndent(level: number): number {
  return level * spacing.indent;
}

/**
 * Placeholder text for empty blocks
 * Single source of truth for consistent messaging
 */
export const placeholders = {
  /** Default placeholder shown on empty editor and focused empty blocks */
  default: 'Type / for commands, or start typing...',
  /** Code block placeholder - no slash commands in code blocks */
  codeBlock: 'Type or paste code...',
} as const;

/**
 * Semantic colors for editor elements
 * These should match the values in colors.ts
 */
export const editorColors = {
  /** Divider/border color for HR elements */
  divider: {
    light: '#e9e9e7',
    dark: '#2f2f2f',
  },
  /** Wavy underline color (orange) */
  wavyUnderline: '#FF8C00',
} as const;

/**
 * Reusable SVG patterns for decorative elements
 * Single source of truth for consistent visuals across components
 */
export const patterns = {
  /**
   * Smooth S-curve wave pattern using cubic bezier curves
   * Used by: WavyUnderline mark, HorizontalRule (wavy style)
   * 
   * Geometry: viewBox 16x6, stroke-width 1.2
   * The pattern tiles seamlessly at 16px intervals
   */
  wave: {
    /** SVG path for the wave curve */
    path: "M0 3 C4 3, 4 1, 8 1 S12 3, 16 3",
    /** ViewBox dimensions */
    viewBox: "0 0 16 6",
    /** Pattern tile width */
    width: 16,
    /** Pattern tile height */
    height: 6,
    /** Stroke width for the wave line */
    strokeWidth: 1.2,
  },
} as const;

/**
 * Generate a wave SVG data URL with a specific color
 * @param color - Hex color (e.g., '#FF8C00')
 * @returns CSS url() value for background-image
 */
export function getWaveSvg(color: string): string {
  const { path, viewBox, strokeWidth } = patterns.wave;
  // URL-encode the # in hex color
  const encodedColor = color.replace('#', '%23');
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'%3E%3Cpath d='${path}' fill='none' stroke='${encodedColor}' stroke-width='${strokeWidth}' stroke-linecap='round'/%3E%3C/svg%3E")`;
}

/**
 * Get CSS properties for applying a wave pattern as background
 * @param color - Hex color for the wave
 * @returns Object with CSS properties
 */
export function getWaveStyles(color: string): {
  backgroundImage: string;
  backgroundRepeat: string;
  backgroundPosition: string;
  backgroundSize: string;
} {
  const { width, height } = patterns.wave;
  return {
    backgroundImage: getWaveSvg(color),
    backgroundRepeat: 'repeat-x',
    backgroundPosition: '0 100%',
    backgroundSize: `${width}px ${height}px`,
  };
}
