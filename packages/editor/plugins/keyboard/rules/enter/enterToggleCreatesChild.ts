/**
 * Enter Toggle Creates Child Rule
 *
 * When: Cursor inside a non-empty toggle list item
 * Do: Create child bullet list item at level + 1
 *
 * Priority 120 (higher than splitListItem) ensures toggle behavior
 * runs BEFORE split logic for other list types.
 *
 * This prevents TipTap's default Enter fallback (paragraph sibling).
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const enterToggleCreatesChild = defineRule({
  id: 'enter:toggleCreateChild',
  description: 'Create child list item when pressing Enter in non-empty toggle',
  priority: 120, // Higher than splitListItem (110) - must run first

  when(ctx: KeyboardContext): boolean {
    const { editor, currentNode } = ctx;

    // Must be in a list block
    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) {
      return false;
    }

    const attrs = listBlock.node.attrs;

    // ONLY toggles
    if (attrs.listType !== 'toggle') {
      return false;
    }

    // ONLY non-empty
    if (currentNode.textContent.length === 0) {
      return false;
    }

    return true;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, state } = ctx;
    const { schema } = state;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    const { node, pos } = listBlock;
    const attrs = node.attrs;

    // Create child bullet list item
    const newChild = schema.nodes.listBlock.create({
      blockId: crypto.randomUUID(),
      listType: 'bullet',
      level: attrs.level + 1,
      parentBlockId: attrs.parentBlockId ?? 'root', // FLAT: keep same parent
      collapsed: false,
    });

    const insertPos = pos + node.nodeSize;

    editor
      .chain()
      .command(({ tr }) => {
        tr.insert(insertPos, newChild);
        const $pos = tr.doc.resolve(insertPos + 1);
        tr.setSelection(state.selection.constructor.near($pos));
        return true;
      })
      .run();

    return true; // CRITICAL: stops TipTap fallback
  },
});
