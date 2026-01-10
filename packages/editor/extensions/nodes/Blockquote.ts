/**
 * Blockquote Node - Quoted text block
 * 
 * Block element with left border for quoted content.
 * Contains inline content (text with marks).
 * - Markdown: > text
 * - 2px vertical margin
 * - 3px left border
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Blockquote as BlockquoteComponent } from '../../components/Blockquote';
import { 
  createShiftEnterHandler, 
  createWrapperEnterHandler, 
  createWrapperBackspaceHandler,
} from '../../utils/keyboardHelpers';
import { EnterRules } from '../../utils/keyboardRules';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockquote: {
      /**
       * Set a blockquote node
       */
      setBlockquote: () => ReturnType;
      /**
       * Toggle a blockquote node
       */
      toggleBlockquote: () => ReturnType;
      /**
       * Unset a blockquote node
       */
      unsetBlockquote: () => ReturnType;
    };
  }
}

export const Blockquote = Node.create({
  name: 'blockquote',

  // Higher priority so keyboard handlers run before global handlers
  priority: 1000,

  // Block-level content
  group: 'block',

  // Contains inline content (text with marks)
  content: 'inline*',

  // Defines its own boundaries
  defining: true,

  // Attributes
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: (attributes) => {
          const blockId = attributes.blockId || crypto.randomUUID();
          return { 'data-block-id': blockId };
        },
      },
      parentBlockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-parent-block-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentBlockId) {
            return { 'data-parent-block-id': attributes.parentBlockId };
          }
          return {};
        },
      },
      level: {
        default: 0,
        parseHTML: (element) => parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: (attributes) => ({ 'data-level': attributes.level || 0 }),
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [{ tag: 'blockquote' }];
  },

  // Render to HTML (fallback)
  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes), 0];
  },

  // Use React component for rendering
  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteComponent) as any;
  },

  // Commands
  addCommands() {
    return {
      setBlockquote:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      toggleBlockquote:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
      unsetBlockquote:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),

      // NOTE: Tab / Shift+Tab behavior is centrally handled
      // via keyboard rules emitting indent-block / outdent-block intents.
      // Node extensions must not handle structural keyboard logic.

      // Shift+Enter: Insert line break (hard break)
      'Shift-Enter': createShiftEnterHandler('blockquote'),

      // PHASE 2: Use generic wrapper handlers
      // Enter in middle: insert line break (not split block)
      // Enter at end: create paragraph after blockquote
      // Backspace in empty: convert to paragraph
      Enter: createWrapperEnterHandler('blockquote'),
      Backspace: createWrapperBackspaceHandler('blockquote'),
    };
  },
});
