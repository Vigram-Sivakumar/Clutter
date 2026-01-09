/**
 * Outdent Empty List Rule (Backspace)
 *
 * When: At start of empty list block
 * Do: Outdent (if level > 0) or convert to paragraph (if level = 0)
 *
 * LEGACY: Requires dedicated indent-block / outdent-block intent pair.
 * Will be migrated during Tab / Shift+Tab phase.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
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

  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    const currentLevel = listBlock.node.attrs.level;

    if (currentLevel > 0) {
      // Outdent
      return editor
        .chain()
        .command(({ tr }) => {
          tr.setNodeMarkup(listBlock.pos, undefined, {
            ...listBlock.node.attrs,
            level: currentLevel - 1,
          });
          return true;
        })
        .run();
    } else {
      // Convert to paragraph
      return editor.chain().setNode('paragraph').run();
    }
  },
});
