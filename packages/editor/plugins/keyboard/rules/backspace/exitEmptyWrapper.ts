/**
 * Exit Empty Wrapper Rule (Backspace)
 *
 * When: At start of empty block inside blockquote/callout
 * Do: Delete the empty block
 *
 * Canonical Decision Table: Step 2B-2 (Block is empty AND structural)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const exitEmptyWrapper = defineRule({
  id: 'backspace:exitEmptyWrapper',
  description: 'Exit wrapper when pressing Backspace at start of empty block',
  priority: 80,

  when(ctx: KeyboardContext): boolean {
    const { editor, currentNode, cursorOffset } = ctx;

    // Must be at start
    if (cursorOffset !== 0) {
      return false;
    }

    // Current block must be empty
    if (currentNode.textContent !== '') {
      return false;
    }

    // Must be inside a wrapper
    const wrapper = findAncestorNode(editor, [
      'blockquote',
      'callout',
      'toggleHeader',
    ]);
    return !!wrapper;
  },

  execute(ctx: KeyboardContext): EditorIntent {
    const { currentNode } = ctx;

    return {
      type: 'delete-block',
      blockId: currentNode.attrs.blockId,
    };
  },
});
