/**
 * Exit Empty List Rule (Enter)
 *
 * When: Empty list block at level 0 (not in wrapper)
 * Do: Convert to paragraph
 *
 * This is the base case for exiting lists.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const exitEmptyList = defineRule({
  id: 'enter:exitEmptyList',
  description: 'Convert empty list at level 0 to paragraph on Enter',
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

    // Must be at level 0 (otherwise outdentEmptyList handles it)
    const attrs = listBlock.node.attrs;
    if (attrs.level > 0) {
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

    // TEMPORARY: Direct TipTap command until ConvertBlockCommand is implemented
    // This converts the list block to a paragraph
    return editor
      .chain()
      .command(({ tr, state }) => {
        const { pos } = listBlock;

        // Convert the listBlock node to a paragraph node
        // Preserve the blockId for consistency
        const paragraph = state.schema.nodes.paragraph.create(
          {
            blockId: listBlock.node.attrs.blockId,
          },
          listBlock.node.content // Keep any content (though it should be empty)
        );

        // Replace the list block with paragraph
        tr.replaceWith(pos, pos + listBlock.node.nodeSize, paragraph);

        // Set cursor to start of new paragraph (inside the content)
        const newCursorPos = pos + 1;
        try {
          const $pos = tr.doc.resolve(newCursorPos);
          tr.setSelection(state.selection.constructor.near($pos));
        } catch (e) {
          console.warn('[exitEmptyList] Could not set selection:', e);
        }

        return true;
      })
      .run();

    // TODO: Once ConvertBlockCommand is implemented, use this instead:
    // return {
    //   type: 'convert-block',
    //   blockId: listBlock.node.attrs.blockId,
    //   to: 'paragraph',
    // };
  },
});
