/**
 * Exit Empty List Rule (Enter) — FLAT MODEL
 *
 * 🔥 THE ENTER LAW (EMPTY BLOCKS AT ROOT):
 * When block is empty AND indent === 0 and Enter is pressed:
 *   → Create a NEW sibling block after current block
 *   → Keep current empty block (don't delete or convert)
 *
 * This is the final step of the "walk to root" flow.
 *
 * Example:
 * A
 *   B
 * E  ← empty, indent=0, cursor here
 *
 * Enter →
 * A
 *   B
 * E
 * F  ← NEW block created
 *
 * When: Empty list block at indent === 0 (not in wrapper)
 * Do: Create new paragraph sibling
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

    // 🔥 FLAT MODEL: Create NEW paragraph after current block
    // Don't convert or delete current block - just insert new sibling
    return editor
      .chain()
      .command(({ tr, state }) => {
        const { pos, node } = listBlock;
        const blockEndPos = pos + node.nodeSize;

        // Create new paragraph at indent 0
        const newParagraph = state.schema.nodes.paragraph.create({
          blockId: crypto.randomUUID(),
          indent: 0,
        });

        // Insert after current block
        tr.insert(blockEndPos, newParagraph);

        // Move cursor to new paragraph
        const newCursorPos = blockEndPos + 1;
        try {
          const $pos = tr.doc.resolve(newCursorPos);
          tr.setSelection(state.selection.constructor.near($pos));
        } catch (e) {
          console.warn('[exitEmptyList] Could not set selection:', e);
        }

        return true;
      })
      .run();
  },
});
