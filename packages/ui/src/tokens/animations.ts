/**
 * Notion-inspired animation tokens
 * For transitions, durations, and easing functions
 */

export const animations = {
  // Duration (in milliseconds)
  duration: {
    instant: 0,
    fast: 100,
    normal: 150,
    slow: 200,
    slower: 300,
    slowest: 500,
  },

  // Easing functions (Notion-style smooth transitions)
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Notion's signature smooth easing
    smooth: 'cubic-bezier(0.2, 0, 0, 1)',
    smoothOut: 'cubic-bezier(0.2, 0, 0.2, 1)',
  },

  // Transition presets
  transition: {
    // Color transitions
    color: 'color 150ms cubic-bezier(0.2, 0, 0, 1)',
    backgroundColor: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1)',
    borderColor: 'border-color 150ms cubic-bezier(0.2, 0, 0, 1)',

    // Transform transitions
    transform: 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    scale: 'transform 100ms cubic-bezier(0.2, 0, 0, 1)',

    // Opacity transitions
    opacity: 'opacity 150ms cubic-bezier(0.2, 0, 0, 1)',
    fade: 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)',

    // Layout transitions
    height: 'height 200ms cubic-bezier(0.2, 0, 0, 1)',
    width: 'width 200ms cubic-bezier(0.2, 0, 0, 1)',
    padding: 'padding 200ms cubic-bezier(0.2, 0, 0, 1)',
    margin: 'margin 200ms cubic-bezier(0.2, 0, 0, 1)',

    // Combined transitions
    all: 'all 150ms cubic-bezier(0.2, 0, 0, 1)',
    default: 'all 150ms cubic-bezier(0.2, 0, 0, 1)',

    // Modal/overlay transitions
    modal: 'opacity 200ms cubic-bezier(0.2, 0, 0, 1), transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    slide: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      from: { transform: 'translateY(10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideDown: {
      from: { transform: 'translateY(-10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    scaleOut: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.95)', opacity: 0 },
    },
  },

  // Named presets (for common use cases)
  presets: {
    // Collapse/Expand Animation (used for sections, folders, collapsible content)
    collapse: {
      duration: '150ms',
      easing: 'ease',
      height: 'grid-template-rows 150ms ease',    // Grid-based height animation
      content: 'opacity 150ms ease',              // Content fade animation
    },
    // Standard transitions (hover effects, color changes)
    standard: {
      duration: '150ms',
      easing: 'ease',
    },
    // Fast transitions (quick UI feedback)
    fast: {
      duration: '100ms',
      easing: 'ease',
    },
    // Slow transitions (larger, dramatic changes)
    slow: {
      duration: '300ms',
      easing: 'ease',
    },
  },
} as const;

export type AnimationToken = typeof animations;

