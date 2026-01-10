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

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },
});
