/**
 * Heading Node - H1, H2, H3 headings
 *
 * Block-level headings with configurable level attribute.
 * Uses uniform block structure (no marker, just content).
 * No margin - parent handles spacing via gap.
 *
 * - H1: 32px, bold
 * - H2: 24px, semibold
 * - H3: 20px, semibold
 */

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Heading as HeadingComponent } from '../../components/Heading';
import type { HeadingLevel } from '../../types';
import {
  convertEmptyBlockToParagraph,
  insertParagraphAfterBlock,
  handleEmptyBlockInToggle,
} from '../../utils/keyboardHelpers';
import { EnterRules, BackspaceRules } from '../../utils/keyboardRules';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules
import {
  handleArrowLeft,
  handleArrowRight,
  handleArrowUp,
  handleArrowDown,
} from '../../plugins/keyboard';

declare module '@tiptap/core' {
  // eslint-disable-next-line no-unused-vars
  interface Commands<ReturnType> {
    heading: {
      /**
       * Set a heading node with a specific level
       */
      setHeading: (_attributes: { headingLevel: HeadingLevel }) => ReturnType;
      /**
       * Toggle a heading node with a specific level
       */
      toggleHeading: (_attributes: {
        headingLevel: HeadingLevel;
      }) => ReturnType;
    };
  }
}

export const Heading = Node.create({
  name: 'heading',

  // Higher priority so keyboard handlers run before global handlers
  priority: 1000,

  // Block-level content
  group: 'block',

  // Contains inline content (text with marks)
  content: 'inline*',

  // Headings define their own boundaries (important for backspace behavior)
  defining: true,

  // Attributes
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: (attributes) => {
          const blockId = attributes.blockId || crypto.randomUUID();
          return { 'data-block-id': blockId };
        },
      },
      parentBlockId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-parent-block-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentBlockId) {
            return { 'data-parent-block-id': attributes.parentBlockId };
          }
          return {};
        },
      },
      headingLevel: {
        default: 1,
        parseHTML: (element) => {
          const tag = element.tagName.toLowerCase();
          const match = tag.match(/^h([1-3])$/);
          return match ? parseInt(match[1], 10) : 1;
        },
        renderHTML: (_attributes) => ({}),
      },
      level: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: (attributes) => ({ 'data-level': attributes.level || 0 }),
      },
      parentToggleId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-parent-toggle-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentToggleId) {
            return { 'data-parent-toggle-id': attributes.parentToggleId };
          }
          return {};
        },
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [
      { tag: 'h1', attrs: { headingLevel: 1 } },
      { tag: 'h2', attrs: { headingLevel: 2 } },
      { tag: 'h3', attrs: { headingLevel: 3 } },
    ];
  },

  // Render to HTML (for copy/paste, export)
  renderHTML({ node, HTMLAttributes }) {
    const headingLevel = node.attrs.headingLevel as HeadingLevel;
    return [`h${headingLevel}`, HTMLAttributes, 0];
  },

  // Use React NodeView for rendering in editor
  addNodeView() {
    return ReactNodeViewRenderer(HeadingComponent);
  },

  // Commands
  addCommands() {
    return {
      setHeading:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleHeading:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      // Arrow navigation (cross-block)
      ArrowLeft: ({ editor }) => handleArrowLeft(editor),
      ArrowRight: ({ editor }) => handleArrowRight(editor),
      ArrowUp: ({ editor }) => handleArrowUp(editor),
      ArrowDown: ({ editor }) => handleArrowDown(editor),

      // Cmd/Ctrl+Alt+1/2/3 for headings
      'Mod-Alt-1': () =>
        this.editor.commands.toggleHeading({ headingLevel: 1 }),
      'Mod-Alt-2': () =>
        this.editor.commands.toggleHeading({ headingLevel: 2 }),
      'Mod-Alt-3': () =>
        this.editor.commands.toggleHeading({ headingLevel: 3 }),

      // NOTE: Tab / Shift+Tab behavior is centrally handled
      // via keyboard rules emitting indent-block / outdent-block intents.
      // Node extensions must not handle structural keyboard logic.

      // Shift+Enter: Insert line break (soft break)
      'Shift-Enter': ({ editor }) => {
        // Check if we're inside a heading
        const { state } = editor;
        const { $from } = state.selection;

        if ($from.parent.type.name === this.name) {
          return editor.commands.setHardBreak();
        }

        return false;
      },

      // Enter keeps all text in heading, creates empty paragraph below
      Enter: ({ editor }) => {
        console.log('[OLD Heading.Enter] Handler called');

        const headingContext = EnterRules.isInHeading(editor);

        if (!headingContext.inHeading) {
          console.log('[OLD Heading.Enter] Not in heading, returning false');
          return false;
        }

        const headingNode = headingContext.headingNode!;
        const headingPos = headingContext.headingPos!;
        const attrs = headingNode.attrs;
        const parentToggleId = attrs.parentToggleId;
        const isEmpty = headingNode.textContent === '';

        console.log('[OLD Heading.Enter] In heading', {
          isEmpty,
          pos: headingPos,
          parentToggleId,
        });

        // Handle empty heading using shared handler
        if (isEmpty) {
          console.log(
            '[OLD Heading.Enter] Empty heading, using handleEmptyBlockInToggle'
          );
          return handleEmptyBlockInToggle(
            editor,
            headingPos,
            headingNode,
            'heading'
          );
        }

        // Non-empty: Create paragraph after heading
        console.log(
          '[OLD Heading.Enter] Non-empty heading, calling insertParagraphAfterBlock'
        );
        const result = insertParagraphAfterBlock(
          editor,
          headingPos,
          headingNode
        );

        console.log('[OLD Heading.Enter] After insertParagraphAfterBlock', {
          result,
          selectionFrom: editor.state.selection.from,
          selectionTo: editor.state.selection.to,
        });

        return result;
      },

      // Backspace at start of empty heading converts to paragraph
      Backspace: ({ editor }) => {
        // PHASE 1 REFACTOR: Use detector for empty heading check
        const context = BackspaceRules.isInEmptyHeadingAtStart(editor);

        if (!context.isEmpty) {
          return false;
        }

        // Empty heading at start: convert to paragraph
        // (KEEP ALL EXECUTION CODE)
        const heading = context.heading!;
        const headingPos = context.headingPos!;

        return convertEmptyBlockToParagraph(editor, headingPos, heading);
      },
    };
  },
});
