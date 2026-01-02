/**
 * WavyUnderline Mark - Decorative wavy underline
 * 
 * Custom mark that renders a wavy underline using SVG background.
 * Uses shared wave pattern from tokens for consistency with *** break line.
 */

import { Mark, mergeAttributes } from '@tiptap/core';
import { getWaveStyles, patterns } from '../../tokens';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wavyUnderline: {
      /**
       * Set wavy underline mark
       */
      setWavyUnderline: () => ReturnType;
      /**
       * Toggle wavy underline mark
       */
      toggleWavyUnderline: () => ReturnType;
      /**
       * Unset wavy underline mark
       */
      unsetWavyUnderline: () => ReturnType;
    };
  }
}

// Wave color for underline (orange)
const WAVE_COLOR = '#FF8C00';

export const WavyUnderline = Mark.create({
  name: 'wavyUnderline',

  // Parse from HTML
  parseHTML() {
    return [
      {
        tag: 'span[data-wavy-underline]',
      },
    ];
  },

  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    const waveStyles = getWaveStyles(WAVE_COLOR);
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-wavy-underline': 'true',
        style: `
          display: inline;
          background-image: ${waveStyles.backgroundImage};
          background-repeat: ${waveStyles.backgroundRepeat};
          background-position: ${waveStyles.backgroundPosition};
          background-size: ${waveStyles.backgroundSize};
          padding-bottom: ${patterns.wave.height - 1}px;
        `.replace(/\s+/g, ' ').trim(),
      }),
      0,
    ];
  },

  // Commands
  addCommands() {
    return {
      setWavyUnderline:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleWavyUnderline:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetWavyUnderline:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // Keyboard shortcut
  addKeyboardShortcuts() {
    return {
      'Mod-u': () => this.editor.commands.toggleWavyUnderline(),
    };
  },
});
