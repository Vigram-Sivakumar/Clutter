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
    const { editor } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    const attrs = listBlock.node.attrs;

    // Only toggles, only non-empty
    if (attrs.listType !== 'toggle') return false;
    if (ctx.currentNode.textContent.length === 0) return false;

    // 1️⃣ Create a NORMAL sibling list item (at same level)
    editor.commands.insertContent({
      type: 'listBlock',
      attrs: {
        blockId: crypto.randomUUID(),
        listType: 'bullet',
        level: attrs.level, // Same level initially
        parentBlockId: attrs.parentBlockId,
      },
    });

    // 2️⃣ Ask ENGINE to indent it (this sets correct level + hierarchy)
    const engine = (editor as any)._engine;
    if (engine) {
      // Small delay to ensure the block is registered before indenting
      setTimeout(() => {
        engine.dispatch({
          type: 'indent-block',
        });
      }, 0);
    }

    return true; // CRITICAL: stops TipTap fallback
  },
});
