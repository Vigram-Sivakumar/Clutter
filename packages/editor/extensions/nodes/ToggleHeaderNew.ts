/**
 * ToggleHeaderNew - Header content for new toggle structure
 *
 * PHASE 1 IMPLEMENTATION - INLINE CONTENT ONLY
 *
 * This node contains ONLY the toggle title text (inline content).
 * It is NOT a block node - it's a structural component of toggleBlock.
 *
 * Hierarchy:
 *   toggleBlock
 *   ├─ toggleHeaderNew  ← This node (inline text only)
 *   └─ toggleContent
 *
 * KEY DIFFERENCE from legacy ToggleHeader:
 * - No keyboard shortcuts (handled by container)
 * - No children (children live in toggleContent)
 * - No collapse state (managed by parent toggleBlock)
 * - Pure inline content container
 *
 * COEXISTENCE:
 * - This is NEW and separate from ToggleHeader
 * - Both can exist in the same document
 * - No naming conflict (different node names)
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const ToggleHeaderNew = Node.create({
  name: 'toggleHeaderNew',

  // Inline content only (text, bold, italic, links, etc.)
  content: 'inline*',

  // This is a structural node (affects cursor behavior)
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggleHeaderNew"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggleHeaderNew',
      }),
      0, // Content hole
    ];
  },

  // NO addKeyboardShortcuts
  // NO addNodeView (uses default rendering inside parent)
  // Parent toggleBlock controls all behavior
});
