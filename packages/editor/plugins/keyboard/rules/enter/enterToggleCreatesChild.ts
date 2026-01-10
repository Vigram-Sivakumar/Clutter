/**
 * Enter Toggle Creates Paragraph Child Rule
 *
 * When: Cursor inside a non-empty toggle list item
 * Do: Create paragraph child (not list item)
 *
 * Priority 120 (higher than splitListItem) ensures toggle behavior
 * runs BEFORE split logic for other list types.
 *
 * This matches Notion/Craft/Logseq behavior:
 * - Toggle + Enter → paragraph child (not bullet)
 * - Engine accepts paragraph with parentBlockId
 * - No normalization, no flattening
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const enterToggleCreatesChild = defineRule({
  id: 'enter:toggleCreateChild',
  description: 'Create paragraph child when pressing Enter in non-empty toggle',
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

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    const { node, pos } = listBlock;
    const attrs = node.attrs;

    // Only toggles, only non-empty (double-check)
    if (attrs.listType !== 'toggle') return false;
    if (ctx.currentNode.textContent.length === 0) return false;

    // Create paragraph child (not listBlock)
    const paragraph = state.schema.nodes.paragraph.create({
      blockId: crypto.randomUUID(),
      parentBlockId: attrs.blockId, // Child of toggle
      level: attrs.level, // Inherit level (not level+1 - flat hierarchy)
      parentToggleId: null,
    });

    // Insert after toggle
    const insertPos = pos + node.nodeSize;

    return editor
      .chain()
      .command(({ tr }) => {
        tr.insert(insertPos, paragraph);
        const $pos = tr.doc.resolve(insertPos + 1);
        tr.setSelection(state.selection.constructor.near($pos));
        return true;
      })
      .run();
  },
});
