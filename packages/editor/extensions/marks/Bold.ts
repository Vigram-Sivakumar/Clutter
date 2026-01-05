/**
 * Bold Mark - Strong text emphasis
 * 
 * Renders as <strong> tag with bold font weight.
 * - Shortcut: Cmd/Ctrl+B
 * - Markdown: **text** or __text__
 */

import { Mark, mergeAttributes } from '@tiptap/core';
import { typography } from '../../tokens';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bold: {
      /**
       * Set bold mark
       */
      setBold: () => ReturnType;
      /**
       * Toggle bold mark
       */
      toggleBold: () => ReturnType;
      /**
       * Unset bold mark
       */
      unsetBold: () => ReturnType;
    };
  }
}

export const Bold = Mark.create({
  name: 'bold',

  // Parse from HTML
  parseHTML() {
    return [
      { tag: 'strong' },
      { tag: 'b' },
      {
        style: 'font-weight',
        getAttrs: (value) => {
          const weight = typeof value === 'string' ? parseInt(value, 10) : 0;
          return weight >= 600 ? {} : false;
        },
      },
    ];
  },

  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'strong',
      mergeAttributes(HTMLAttributes, {
        style: `font-weight: ${typography.weight.bold};`,
      }),
      0,
    ];
  },

  // Commands
  addCommands() {
    return {
      setBold:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleBold:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetBold:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-B': () => this.editor.commands.toggleBold(),
    };
  },
});
