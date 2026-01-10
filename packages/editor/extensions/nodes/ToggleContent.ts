/**
 * ToggleContent - Real child container for toggles
 *
 * PHASE 1 IMPLEMENTATION - BLOCK CONTAINER
 *
 * This node contains the ACTUAL CHILDREN of a toggle.
 * It is a true ProseMirror container - children are real children,
 * not siblings pretending via CSS and parentToggleId.
 *
 * Hierarchy:
 *   toggleBlock
 *   ├─ toggleHeaderNew
 *   └─ toggleContent     ← This node (real children)
 *       ├─ paragraph
 *       ├─ listBlock
 *       └─ paragraph
 *
 * WHY THIS MATTERS:
 * - ProseMirror knows children are inside toggle
 * - Cursor depth = visual depth
 * - Enter on empty child naturally exits (PM default behavior)
 * - Tab adoption works without hacks
 * - Selection respects hierarchy
 *
 * COEXISTENCE:
 * - Only used with new toggleBlock
 * - Never used with legacy ToggleHeader
 * - No migration logic here (Phase 5)
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const ToggleContent = Node.create({
  name: 'toggleContent',

  // ONE OR MORE block nodes (paragraphs, lists, headings, etc.)
  // "+" means at least one child required
  content: 'block+',

  // This is a structural container
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggleContent"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggleContent',
      }),
      0, // Content hole (children render here)
    ];
  },

  // NO addKeyboardShortcuts
  // NO addNodeView (uses default rendering inside parent)
  // Parent toggleBlock controls collapse/expand
});
