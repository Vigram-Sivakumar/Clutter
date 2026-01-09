/**
 * Outdent Empty List Rule (Enter)
 *
 * When: Empty list block at level > 0
 * Do: Emit outdent-block intent
 *
 * Resolver decides how to decrease level or convert to paragraph.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const outdentEmptyList = defineRule({
  id: 'enter:outdentEmptyList',
  description: 'Outdent list when pressing Enter in empty list at level > 0',
  priority: 90,

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

    // Must be at level > 0
    const attrs = listBlock.node.attrs;
    return attrs.level > 0;
  },

  execute(ctx: KeyboardContext): EditorIntent | boolean {
    const { editor } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    return {
      type: 'outdent-block',
      blockId: listBlock.node.attrs.blockId,
    };
  },
});
