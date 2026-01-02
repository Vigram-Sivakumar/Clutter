/**
 * Notion-inspired interaction tokens
 * For hover, focus, active states and interaction patterns
 */

export const interactions = {
  // Cursor types
  cursor: {
    default: 'default',
    pointer: 'pointer',
    text: 'text',
    notAllowed: 'not-allowed',
    grab: 'grab',
    grabbing: 'grabbing',
    move: 'move',
    resize: 'resize',
  },

  // User select
  userSelect: {
    none: 'none',
    text: 'text',
    all: 'all',
    auto: 'auto',
  },

  // Pointer events
  pointerEvents: {
    none: 'none',
    auto: 'auto',
  },

  // Opacity levels
  opacity: {
    disabled: 0.5,
    hover: 0.8,
    pressed: 0.7,
    loading: 0.6,
  },

  // Transform scale (for press effects)
  scale: {
    pressed: 0.98,
    hover: 1.02,
  },

  // Shadow (for elevation)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },

  // Focus ring (use getFocusRing function with colors)
  focusRing: {
    width: '2px',
    style: 'solid',
    offset: '2px',
  },

  // Outline (use getOutline function with colors)
  outline: {
    none: 'none',
    focusOffset: '2px',
  },

  // Fade gradients (use getFadeGradient function with colors)
  fadeGradient: {
    length: '48px',
    padding: '48px',
  },
} as const;

/**
 * Get focus ring styles using color tokens
 * @param colors - Color tokens from useTheme
 */
export const getFocusRing = (colors: { text: { default: string } }) => ({
  width: interactions.focusRing.width,
  style: interactions.focusRing.style,
  offset: interactions.focusRing.offset,
  color: colors.text.default,
});

/**
 * Get outline styles using color tokens
 * @param colors - Color tokens from useTheme
 */
export const getOutline = (colors: { border: { focus: string } }) => ({
  none: interactions.outline.none,
  focus: `2px solid ${colors.border.focus}`,
  focusOffset: interactions.outline.focusOffset,
});

/**
 * Get fade gradient for overlaying content (e.g., "Hide" button over text)
 * Creates a smooth left-to-right fade from transparent to solid background
 * @param colors - Color tokens from useTheme OR a direct color string
 * @param direction - Gradient direction ('left' | 'right' | 'top' | 'bottom')
 * @param backgroundType - Background color to use ('default' | 'secondary') - only used if colors is an object
 */
export const getFadeGradient = (
  colors: { background: { default: string; secondary: string } } | string,
  direction: 'left' | 'right' | 'top' | 'bottom' = 'right',
  backgroundType: 'default' | 'secondary' = 'default'
) => {
  const directionMap = {
    right: 'to right',
    left: 'to left',
    bottom: 'to bottom',
    top: 'to top',
  };
  
  // If colors is a string, use it directly; otherwise use the color token
  const bgColor = typeof colors === 'string' 
    ? colors 
    : (backgroundType === 'secondary' 
        ? colors.background.secondary 
        : colors.background.default);
  
  return {
    background: `linear-gradient(${directionMap[direction]}, transparent, ${bgColor} ${interactions.fadeGradient.length})`,
    padding: interactions.fadeGradient.padding,
  };
};

export type InteractionToken = typeof interactions;

