/**
 * ToggleBlock - True container node for toggles
 *
 * PHASE 1 IMPLEMENTATION - NEW SCHEMA
 *
 * This is the architecturally correct toggle structure:
 *   toggleBlock (container)
 *   ├─ toggleHeaderNew (inline content only)
 *   └─ toggleContent (block children)
 *
 * ProseMirror now understands:
 * - Real parent/child hierarchy
 * - Cursor depth matches visual depth
 * - Enter/Tab/Backspace work naturally
 * - No keyboard hacks needed
 *
 * COEXISTENCE:
 * - This node coexists with legacy ToggleHeader
 * - Old documents still render with old toggle
 * - New creation will use this structure (Phase 2)
 * - Migration happens in Phase 5
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { ToggleBlockView } from '../../components/ToggleBlockView';

export type ToggleBlockAttrs = {
  blockId: string | null;
  collapsed: boolean;
};

export const ToggleBlock = Node.create({
  name: 'toggleBlock',

  group: 'block',

  // CRITICAL: Container must have BOTH header and content
  // This is what makes hierarchy real in ProseMirror
  content: 'toggleHeaderNew toggleContent',

  // Prevent content from leaking across toggle boundaries
  isolating: true,

  // Structure is meaningful (affects Enter/Backspace behavior)
  defining: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id'),
        renderHTML: (attrs) => ({
          'data-block-id': attrs.blockId,
        }),
      },
      collapsed: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attrs) =>
          attrs.collapsed ? { 'data-collapsed': 'true' } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggleBlock"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggleBlock',
      }),
      0, // Content hole (ProseMirror renders children here)
    ];
  },

  addCommands() {
    return {
      /**
       * PHASE 2: Insert new toggleBlock with correct structure
       *
       * Creates:
       *   toggleBlock (collapsed=false)
       *   ├─ toggleHeaderNew (empty, cursor here)
       *   └─ toggleContent
       *       └─ paragraph (empty)
       *
       * This is the canonical initial structure.
       * ProseMirror handles all cursor/Enter behavior naturally.
       */
      insertToggleBlock:
        () =>
        ({ state, dispatch }) => {
          const { schema } = state;

          const toggleBlock = schema.nodes.toggleBlock;
          const toggleHeaderNew = schema.nodes.toggleHeaderNew;
          const toggleContent = schema.nodes.toggleContent;
          const paragraph = schema.nodes.paragraph;

          if (
            !toggleBlock ||
            !toggleHeaderNew ||
            !toggleContent ||
            !paragraph
          ) {
            console.error('[insertToggleBlock] Required nodes not found');
            return false;
          }

          // Create structure: toggleBlock > header + content(paragraph)
          // 🔑 CRITICAL: Don't create empty text nodes - let PM handle empty inline content
          const header = toggleHeaderNew.create();
          const content = toggleContent.create({}, [
            paragraph.create({ blockId: crypto.randomUUID() }),
          ]);

          const node = toggleBlock.create(
            {
              blockId: crypto.randomUUID(),
              collapsed: false,
            },
            [header, content]
          );

          if (!dispatch) return true;

          // Replace current selection with toggle
          const tr = state.tr.replaceSelectionWith(node);

          // Place cursor inside header (first child of toggleBlock)
          const posAfterInsert = tr.selection.from;
          const $pos = tr.doc.resolve(posAfterInsert + 1);

          tr.setSelection(TextSelection.near($pos));

          dispatch(tr);

          console.log(
            '✅ [insertToggleBlock] Created new toggleBlock with real hierarchy'
          );

          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },
});
