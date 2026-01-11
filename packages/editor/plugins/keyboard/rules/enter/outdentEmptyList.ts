/**
 * Outdent Empty List Rule (Enter) — FLAT MODEL
 *
 * 🔥 THE ENTER LAW (EMPTY BLOCKS):
 * When block is empty and Enter is pressed:
 *   - If indent > 0: Outdent by 1 (same block, just move left)
 *   - If indent === 0: Create new sibling (handled by exitEmptyList)
 *
 * This creates the smooth "walk to root" behavior in Craft/Workflowy.
 *
 * When: Empty list block at indent > 0
 * Do: Emit outdent-block intent (reduces indent by 1)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const outdentEmptyList = defineRule({
  id: 'enter:outdentEmptyList',
  description: 'Outdent empty list on Enter (indent > 0) - FLAT MODEL',
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

    // 🔥 FLAT MODEL: Must be at indent > 0
    // If indent === 0, exitEmptyList handles it (creates new block)
    const attrs = listBlock.node.attrs;
    const indent = attrs.indent ?? 0;
    return indent > 0;
  },

  execute(ctx: KeyboardContext): EditorIntent | boolean {
    const { editor } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    // Emit outdent intent - FlatIntentResolver will decrease indent by 1
    return {
      type: 'outdent-block',
      blockId: listBlock.node.attrs.blockId,
    };
  },
});
