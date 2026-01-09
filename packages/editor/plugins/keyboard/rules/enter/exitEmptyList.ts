/**
 * Exit Empty List Rule (Enter)
 *
 * When: Empty list block at level 0 (not in wrapper)
 * Do: Convert to paragraph
 *
 * This is the base case for exiting lists.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const exitEmptyList = defineRule({
  id: 'enter:exitEmptyList',
  description: 'Convert empty list at level 0 to paragraph on Enter',
  priority: 85, // Between outdentEmptyList (90) and exitEmptyHeading (80)

  when(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    // Must be in a list block
    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) {
      return false;
    }

    // List must be empty
    if (listBlock.node.textContent !== '') {
      return false;
    }

    // Must be at level 0 (otherwise outdentEmptyList handles it)
    const attrs = listBlock.node.attrs;
    if (attrs.level > 0) {
      return false;
    }

    // Must NOT be in a wrapper (otherwise exitEmptyListInWrapper handles it)
    const wrapper = findAncestorNode(editor, [
      'toggleBlock',
      'blockquote',
      'callout',
    ]);
    return !wrapper;
  },

  execute(ctx: KeyboardContext): EditorIntent | boolean {
    const { editor } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    // Convert list to paragraph
    return {
      type: 'convert-block',
      blockId: listBlock.node.attrs.blockId,
      to: 'paragraph',
    };
  },
});
