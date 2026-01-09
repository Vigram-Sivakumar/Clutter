/**
 * Outdent Empty List Rule (Backspace)
 *
 * When: At start of empty list block
 * Do: Emit outdent-block intent
 *
 * Resolver decides:
 * - If level > 0: decrease level (outdent)
 * - If level = 0: convert to paragraph
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const outdentEmptyList = defineRule({
  id: 'backspace:outdentEmptyList',
  description: 'Outdent or convert empty list on Backspace',
  priority: 90,

  when(ctx: KeyboardContext): boolean {
    const { editor, cursorOffset } = ctx;

    // Must be at start
    if (cursorOffset !== 0) {
      return false;
    }

    // Must be in a list block
    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) {
      return false;
    }

    // List must be empty
    return listBlock.node.textContent === '';
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
