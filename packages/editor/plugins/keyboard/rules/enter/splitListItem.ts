/**
 * Split List Item Rule (Enter)
 *
 * When: Cursor inside a non-empty list item (not at start, not at end, or at end)
 * Do: Split the list item at cursor position
 *
 * This is THE fundamental list behavior - preserving list continuity.
 *
 * Examples:
 * ☐ Buy milk |and eggs  →  ☐ Buy milk
 *                           ☐ |and eggs
 *
 * ☐ Buy milk|  →  ☐ Buy milk
 *                  ☐ |
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const splitListItem = defineRule({
  id: 'enter:splitListItem',
  description: 'Split list item at cursor position on Enter',
  priority: 110, // Higher than exit rules - split before exit

  when(ctx: KeyboardContext): boolean {
    const { editor, currentNode, isEmpty } = ctx;

    // Selection must be collapsed
    if (!isEmpty) {
      return false;
    }

    // Must be in a list block
    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) {
      return false;
    }

    // List block itself is the current node (inline content)
    // If it's empty, other rules handle it
    if (currentNode.textContent === '') {
      return false;
    }

    // TOGGLE EXCEPTION: Non-empty toggle + Enter creates CHILD, not sibling
    // This prevents splitListItem from running on toggles
    if (listBlock.node.attrs.listType === 'toggle') {
      return false; // Let toggle-specific handler in execute() take over
    }

    // If we're here: non-empty list item, split it
    return true;
  },

  execute(ctx: KeyboardContext): EditorIntent | boolean {
    const { editor, state, currentNode } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    const { pos: listBlockPos, node: listBlockNode } = listBlock;
    const attrs = listBlockNode.attrs;

    // TOGGLE SPECIAL CASE: Create child instead of sibling
    if (attrs.listType === 'toggle' && currentNode.textContent.length > 0) {
      const newListBlock = state.schema.nodes.listBlock.create({
        blockId: crypto.randomUUID(),
        listType: 'bullet', // child defaults to bullet
        checked: null,
        level: attrs.level + 1, // hierarchy expressed via level only
        parentBlockId: attrs.parentBlockId ?? 'root', // FLAT: keep parent, not toggle
        parentToggleId: null,
      });

      const insertPos = listBlockPos + listBlockNode.nodeSize;

      return editor
        .chain()
        .command(({ tr }) => {
          tr.insert(insertPos, newListBlock);

          const $pos = tr.doc.resolve(insertPos + 1);
          tr.setSelection(state.selection.constructor.near($pos));

          return true;
        })
        .run();
    }

    // Get cursor position within the list block
    const { $from } = state.selection;
    const cursorPosInBlock = $from.pos - listBlockPos - 1; // Relative to block start

    // TODO: Convert to split-block intent once list-specific splitting is supported
    // For now, keep legacy implementation due to complex list block creation logic

    // Split the content at cursor
    const contentAfter = listBlockNode.content.cut(cursorPosInBlock);

    // FIXED: Single atomic transaction to prevent extra block creation
    return editor
      .chain()
      .command(({ tr, state: cmdState }) => {
        // Step 1: Delete content after cursor in current block
        if (contentAfter.size > 0) {
          const deleteFrom = listBlockPos + 1 + cursorPosInBlock;
          const deleteTo = deleteFrom + contentAfter.size;
          tr.delete(deleteFrom, deleteTo);
        }

        // Step 2: Calculate insert position AFTER deletion
        // Current block now ends at: listBlockPos + 1 + cursorPosInBlock + 1 (closing)
        // We want to insert right after the current block
        const currentBlockEndPos = listBlockPos + cursorPosInBlock + 2;

        // Step 3: Create and insert new list item with "after" content
        const newListBlock = cmdState.schema.nodes.listBlock.create(
          {
            blockId: crypto.randomUUID(),
            listType: attrs.listType,
            checked: attrs.listType === 'task' ? false : null,
            level: attrs.level || 0,
            parentBlockId: attrs.parentBlockId || null,
            parentToggleId: attrs.parentToggleId || null,
          },
          contentAfter
        );

        tr.insert(currentBlockEndPos, newListBlock);

        // Step 4: Position cursor at start of new list item (inside the content)
        // New block starts at currentBlockEndPos
        // Content starts at currentBlockEndPos + 1
        const newCursorPos = currentBlockEndPos + 1;

        try {
          const $pos = tr.doc.resolve(newCursorPos);
          tr.setSelection(cmdState.selection.constructor.near($pos));
        } catch (e) {
          // Fallback: just put cursor at the position
          console.warn('[splitListItem] Could not set selection:', e);
        }

        return true;
      })
      .run();
  },
});
