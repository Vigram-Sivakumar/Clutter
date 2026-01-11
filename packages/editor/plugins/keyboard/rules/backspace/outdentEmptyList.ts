/**
 * Convert Empty List Rule (Backspace) — FLAT MODEL
 *
 * 🔥 BACKSPACE LAW (EMPTY LISTS):
 * When Backspace is pressed at start of empty list (any indent):
 *   → Convert the list to paragraph (preserve indent)
 *   → Next Backspace deletes the paragraph
 *
 * This matches Notion/Craft behavior exactly.
 *
 * Example:
 * A
 *     B
 *     - [ ]  ← empty list, indent=1, cursor at start
 *     D
 *
 * Backspace →
 * A
 *     B
 *     |      ← converted to paragraph, indent=1, cursor at start
 *     D
 *
 * Backspace again →
 * A
 *     B ← cursor jumps here
 *     D
 *
 * When: At start of empty list block (any indent level)
 * Do: Convert list to paragraph, preserve indent
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const outdentEmptyList = defineRule({
  id: 'backspace:convertEmptyList',
  description: 'Convert empty list to paragraph on Backspace - FLAT MODEL',
  priority: 90, // Higher than deleteEmptyParagraph (100) - lists convert before deletion

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

    // 🔥 CONVERT TO PARAGRAPH (Notion/Craft behavior)
    // Preserve indent level, convert type only
    return editor
      .chain()
      .command(({ tr, state }) => {
        const { pos, node } = listBlock;

        // Convert list to paragraph, preserve indent
        const paragraph = state.schema.nodes.paragraph.create(
          {
            blockId: node.attrs.blockId,
            indent: node.attrs.indent ?? 0,
          },
          node.content // Keep content (though should be empty)
        );

        // Replace list with paragraph
        tr.replaceWith(pos, pos + node.nodeSize, paragraph);

        // Keep cursor at start of converted paragraph
        const newCursorPos = pos + 1;
        try {
          const $pos = tr.doc.resolve(newCursorPos);
          tr.setSelection(state.selection.constructor.near($pos));
        } catch (e) {
          console.warn('[convertEmptyList] Could not set selection:', e);
        }

        // Mark for undo
        tr.setMeta('addToHistory', true);
        tr.setMeta('historyGroup', 'convert-empty-list');

        return true;
      })
      .run();
  },
});
