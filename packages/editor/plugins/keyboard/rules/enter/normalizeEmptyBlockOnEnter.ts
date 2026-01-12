/**
 * Normalize Empty Block on Enter - UNIVERSAL ENTER RULE
 * 
 * 🔒 STRUCTURAL NORMALIZATION LAW (Step 4A):
 * 
 * ANY empty, non-paragraph block + Enter → create paragraph below (same indent)
 * 
 * This ensures ALL block types behave consistently on Enter.
 * No exceptions. No block-type-specific logic.
 * 
 * Behavior:
 * - Empty callout + Enter → create paragraph below
 * - Empty quote + Enter → create paragraph below
 * - Empty heading + Enter → create paragraph below
 * - Empty code block + Enter → create paragraph below
 * - etc.
 * 
 * This matches list behavior: empty list + Enter → create new list item below
 * 
 * Priority: 105 (high - runs before most list-specific rules but after halo selection)
 */

import { defineRule } from '../../types/KeyboardRule';
import { createBlock } from '../../../../core/createBlock';
import { TextSelection } from '@tiptap/pm/state';

export const normalizeEmptyBlockOnEnter = defineRule({
  id: 'enter:normalizeEmptyBlock',
  priority: 105, // HIGH - runs before most block-specific rules
  
  when: ({ state, currentNode }) => {
    const { selection } = state;
    
    // Only when cursor is inside block (not halo selection)
    if (selection instanceof TextSelection === false) return false;
    
    // Get current block
    const blockType = currentNode.type.name;
    
    // 🔒 LAW: Only normalize empty, non-paragraph, non-list blocks
    // Lists have their own rules (exitEmptyList, outdentEmptyList)
    if (blockType === 'paragraph') return false;
    if (blockType === 'listBlock') return false; // Lists handled separately
    if (blockType === 'horizontalRule') return false; // Cannot have content
    
    // Check if block is empty
    const isEmpty = currentNode.content.size === 0;
    
    return isEmpty;
  },
  
  execute: ({ editor, state, currentNode }) => {
    const { selection } = state;
    const { $from } = selection;
    
    const depth = $from.depth;
    const blockPos = $from.before(depth);
    const indent = currentNode.attrs?.indent ?? 0;
    
    console.log('[Enter] Normalizing empty block - creating paragraph below', {
      blockType: currentNode.type.name,
      indent,
      blockId: currentNode.attrs?.blockId,
    });
    
    editor.commands.command(({ state: cmdState, dispatch }) => {
      if (!dispatch) return false;
      
      const tr = cmdState.tr;
      
      // Calculate insertion position: after current block
      const insertPos = blockPos + currentNode.nodeSize;
      
      // Create new paragraph at same indent
      const paragraph = createBlock(cmdState, tr, {
        type: 'paragraph',
        insertPos,
        indent,
      });
      
      if (!paragraph) {
        console.error('[Enter] Failed to create paragraph during normalization');
        return false;
      }
      
      // Place cursor at start of new paragraph
      const cursorPos = insertPos + 1; // Inside paragraph
      tr.setSelection(TextSelection.create(tr.doc, cursorPos));
      
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter is its own undo step
      
      dispatch(tr);
      return true;
    });
    
    return true;
  },
});
