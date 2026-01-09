/**
 * Outdent Empty List Rule (Enter)
 *
 * When: Empty list block at level > 0
 * Do: Outdent the list (decrease level)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
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

  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    // TODO: Convert to 'outdent-block' intent once indent/outdent intents are designed
    // This is structural hierarchy manipulation, not conversion
    // Needs coordinated design with Tab handler's 'indent-block' intent

    // Outdent the list
    return editor
      .chain()
      .command(({ tr }) => {
        const listBlock = findAncestorNode(editor, 'listBlock');
        if (!listBlock) return false;

        const currentLevel = listBlock.node.attrs.level;
        tr.setNodeMarkup(listBlock.pos, undefined, {
          ...listBlock.node.attrs,
          level: Math.max(0, currentLevel - 1),
        });
        return true;
      })
      .run();
  },
});
