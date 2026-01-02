/**
 * Strike Mark - Strikethrough text
 * 
 * Renders as <s> tag with line-through decoration.
 * - Shortcut: Cmd/Ctrl+Shift+S
 * - Markdown: ~~text~~
 */

import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    strike: {
      /**
       * Set strike mark
       */
      setStrike: () => ReturnType;
      /**
       * Toggle strike mark
       */
      toggleStrike: () => ReturnType;
      /**
       * Unset strike mark
       */
      unsetStrike: () => ReturnType;
    };
  }
}

export const Strike = Mark.create({
  name: 'strike',

  // Parse from HTML
  parseHTML() {
    return [
      { tag: 's' },
      { tag: 'del' },
      { tag: 'strike' },
      { style: 'text-decoration=line-through' },
      { style: 'text-decoration-line=line-through' },
    ];
  },

  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    return [
      's',
      mergeAttributes(HTMLAttributes, {
        style: 'text-decoration: line-through;',
      }),
      0,
    ];
  },

  // Commands
  addCommands() {
    return {
      setStrike:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleStrike:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetStrike:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-S': () => this.editor.commands.toggleStrike(),
    };
  },
});
