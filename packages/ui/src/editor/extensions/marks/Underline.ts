/**
 * Underline Mark - Underlined text (standard underline)
 * 
 * Renders as <u> tag with text-decoration underline.
 * Note: Cmd+U is used for WavyUnderline. Use slash command for regular underline.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    underline: {
      /**
       * Set underline mark
       */
      setUnderline: () => ReturnType;
      /**
       * Toggle underline mark
       */
      toggleUnderline: () => ReturnType;
      /**
       * Unset underline mark
       */
      unsetUnderline: () => ReturnType;
    };
  }
}

export const Underline = Mark.create({
  name: 'underline',

  // Parse from HTML
  parseHTML() {
    return [
      { tag: 'u' },
      { style: 'text-decoration=underline' },
      { style: 'text-decoration-line=underline' },
    ];
  },

  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'u',
      mergeAttributes(HTMLAttributes, {
        style: 'text-decoration: underline;',
      }),
      0,
    ];
  },

  // Commands
  addCommands() {
    return {
      setUnderline:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleUnderline:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetUnderline:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // No keyboard shortcut - Cmd+U is used for WavyUnderline
});
