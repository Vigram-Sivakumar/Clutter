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
    
    // If we're here: non-empty list item, split it
    return true;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor, state } = ctx;
    
    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;
    
    const { pos: listBlockPos, node: listBlockNode } = listBlock;
    const attrs = listBlockNode.attrs;
    
    // Get cursor position within the list block
    const { $from } = state.selection;
    const cursorPosInBlock = $from.pos - listBlockPos - 1; // Relative to block start
    
    // Split the content at cursor
    const contentBefore = listBlockNode.content.cut(0, cursorPosInBlock);
    const contentAfter = listBlockNode.content.cut(cursorPosInBlock);
    
    return editor
      .chain()
      .command(({ tr }) => {
        // Update current block with "before" content
        tr.setNodeMarkup(listBlockPos, undefined, attrs);
        
        // Delete content after cursor in current block
        if (contentAfter.size > 0) {
          const deleteFrom = listBlockPos + 1 + cursorPosInBlock;
          const deleteTo = deleteFrom + contentAfter.size;
          tr.delete(deleteFrom, deleteTo);
        }
        
        return true;
      })
      .command(({ tr }) => {
        // Insert new list item after current one with "after" content
        const insertPos = listBlockPos + listBlockNode.nodeSize - contentAfter.size;
        
        const newListBlock = state.schema.nodes.listBlock.create(
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
        
        tr.insert(insertPos, newListBlock);
        
        // Move cursor to start of new list item
        tr.setSelection(state.schema.nodes.listBlock.spec.content ? 
          state.selection.constructor.near(tr.doc.resolve(insertPos + 1)) :
          state.selection
        );
        
        return true;
      })
      .run();
  },
});

