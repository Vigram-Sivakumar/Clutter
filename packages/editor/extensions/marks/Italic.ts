/**
 * Italic Mark - Emphasized text
 * 
 * Renders as <em> tag with italic font style.
 * - Shortcut: Cmd/Ctrl+I
 * - Markdown: *text* or _text_
 */

import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    italic: {
      /**
       * Set italic mark
       */
      setItalic: () => ReturnType;
      /**
       * Toggle italic mark
       */
      toggleItalic: () => ReturnType;
      /**
       * Unset italic mark
       */
      unsetItalic: () => ReturnType;
    };
  }
}

export const Italic = Mark.create({
  name: 'italic',

  // Parse from HTML
  parseHTML() {
    return [
      { tag: 'em' },
      { tag: 'i' },
      { style: 'font-style=italic' },
    ];
  },

  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'em',
      mergeAttributes(HTMLAttributes, {
        style: 'font-style: italic;',
      }),
      0,
    ];
  },

  // Commands
  addCommands() {
    return {
      setItalic:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleItalic:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetItalic:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-I': () => this.editor.commands.toggleItalic(),
    };
  },
});
