/**
 * Exit Empty List in Wrapper Rule (Enter)
 *
 * When: Empty list block at level 0 inside a wrapper (toggle/blockquote/callout)
 * Do: Exit the wrapper by converting to paragraph outside
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const exitEmptyListInWrapper = defineRule({
  id: 'enter:exitEmptyListInWrapper',
  description: 'Exit wrapper when pressing Enter in empty list at level 0',
  priority: 100,

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

    // Must be at level 0
    const attrs = listBlock.node.attrs;
    if (attrs.level > 0) {
      return false;
    }

    // Must be inside a wrapper
    const wrapper = findAncestorNode(editor, [
      'toggleBlock',
      'blockquote',
      'callout',
    ]);
    return !!wrapper;
  },

  execute(ctx: KeyboardContext): EditorIntent | boolean {
    const { editor } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    // Convert list to paragraph to exit wrapper
    return {
      type: 'convert-block',
      blockId: listBlock.node.attrs.blockId,
      to: 'paragraph',
    };
  },
});
