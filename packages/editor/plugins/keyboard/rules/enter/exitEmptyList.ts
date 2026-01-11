/**
 * Exit Empty List Rule (Enter) — FLAT MODEL
 *
 * 🔥 THE ENTER LAW (EMPTY BLOCKS AT ROOT):
 * When block is empty AND indent === 0 and Enter is pressed:
 *   → Convert the list block to a paragraph
 *   → User exits "list mode" and returns to normal text
 *
 * This is the final step of the "walk to root, then exit" flow.
 *
 * Example:
 * A
 *   B
 * - [ ]  ← empty list, indent=0, cursor here
 *
 * Enter →
 * A
 *   B
 * |      ← converted to paragraph, cursor here
 *
 * Press Enter again (on empty paragraph) → creates new paragraph below
 *
 * When: Empty list block at indent === 0 (not in wrapper)
 * Do: Convert list to paragraph (matches Notion/Craft)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const exitEmptyList = defineRule({
  id: 'enter:exitEmptyList',
  description: 'Create new block after empty list at indent=0 - FLAT MODEL',
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

    // 🔥 FLAT MODEL: Must be at indent === 0
    // If indent > 0, outdentEmptyList handles it (decreases indent)
    const attrs = listBlock.node.attrs;
    const indent = attrs.indent ?? 0;
    if (indent > 0) {
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

    // ✅ CANONICAL ENTER PATTERN: ONE Enter = ONE transaction
    // Convert empty list to paragraph at indent 0
    // This matches Notion/Craft - don't create new block, just convert
    return editor.commands.command(({ state, dispatch }) => {
      if (!dispatch) return false;

      const tr = state.tr;
      const { pos, node } = listBlock;

      // Convert the listBlock node to a paragraph node
      // Preserve the blockId and indent
      const paragraph = state.schema.nodes.paragraph.create(
        {
          blockId: node.attrs.blockId,
          indent: 0,
        },
        node.content // Keep any content (though it should be empty)
      );

      // Replace the list block with paragraph
      tr.replaceWith(pos, pos + node.nodeSize, paragraph);

      // Keep cursor in the converted paragraph (inside the content)
      const newCursorPos = pos + 1;
      try {
        const $pos = tr.doc.resolve(newCursorPos);
        tr.setSelection(state.selection.constructor.near($pos));
      } catch (e) {
        console.warn('[exitEmptyList] Could not set selection:', e);
      }

      // Mark for undo - FORCE history boundary (one undo per Enter)
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter = separate undo step

      // Dispatch ONCE - no more transactions
      dispatch(tr);
      return true; // HARD STOP
    });
  },
});
