/**
 * Code Mark - Inline code
 * 
 * Renders as <code> tag with monospace font.
 * - Shortcut: Cmd/Ctrl+E
 * - Markdown: `code`
 */

import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    code: {
      /**
       * Set code mark
       */
      setCode: () => ReturnType;
      /**
       * Toggle code mark
       */
      toggleCode: () => ReturnType;
      /**
       * Unset code mark
       */
      unsetCode: () => ReturnType;
    };
  }
}

export const Code = Mark.create({
  name: 'code',

  // Code cannot have other marks inside it
  excludes: '_',

  // Code mark should be applied to the whole word
  exitable: true,

  // Parse from HTML
  parseHTML() {
    return [{ tag: 'code' }];
  },

  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'code',
      mergeAttributes(HTMLAttributes, {
        style: `
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 0.9em;
          padding: 2px 4px;
          background-color: rgba(135, 131, 120, 0.15);
          border-radius: 3px;
          color: #FF8C00;
        `.replace(/\s+/g, ' ').trim(),
      }),
      0,
    ];
  },

  // Commands
  addCommands() {
    return {
      setCode:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleCode:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetCode:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-e': () => this.editor.commands.toggleCode(),
      'Mod-E': () => this.editor.commands.toggleCode(),
    };
  },
});
