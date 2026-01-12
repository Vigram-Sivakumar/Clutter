/**
 * Normalize Empty Block - UNIVERSAL BACKSPACE RULE
 * 
 * 🔒 STRUCTURAL NORMALIZATION LAW (Step 4A):
 * 
 * ANY empty, non-paragraph block + Backspace → paragraph (same indent)
 * 
 * This is the universal fallback that ensures ALL block types behave consistently.
 * No exceptions. No block-type-specific logic. Paragraph is the universal fallback.
 * 
 * Applies to:
 * - callout
 * - blockquote
 * - heading
 * - codeBlock
 * - toggle (listBlock with listType='toggle')
 * - task/bullet/numbered (already handled by outdentEmptyList, but this is backup)
 * - ANY future block type
 * 
 * This rule runs BEFORE all block-specific rules to ensure consistency.
 * 
 * Priority: 110 (highest - runs before outdentEmptyList at 105)
 */

import { defineRule } from '../../types/KeyboardRule';
import { createBlock } from '../../../../core/createBlock';
import { isStructuralDeleteInProgress } from '../../../../core/structuralDeleteState';

export const normalizeEmptyBlock = defineRule({
  id: 'backspace:normalizeEmptyBlock',
  priority: 110, // HIGHEST - must run before all block-specific rules
  stopPropagation: true, // 🔒 TERMINAL - prevent any further Backspace processing
  
  when: ({ state }) => {
    // 🔒 CURSOR AUTHORITY LAW: Skip if structural delete is in progress
    // Normalization is a text-level rule; structural delete wins
    if (isStructuralDeleteInProgress()) {
      console.log('[Backspace][Normalize] Skipped (structural delete in progress)');
      return false;
    }
    
    const { selection, doc } = state;
    const { $from } = selection;
    
    // Only when cursor at start of block (pos 0 within block)
    if ($from.parentOffset !== 0) return false;
    
    // Get current block
    const depth = $from.depth;
    const currentBlock = $from.node(depth);
    
    // 🔒 LAW: Only normalize empty, non-paragraph blocks
    if (currentBlock.type.name === 'paragraph') return false;
    if (currentBlock.type.name === 'horizontalRule') return false; // Cannot normalize (no content)
    
    // Check if block is empty
    const isEmpty = currentBlock.content.size === 0;
    
    return isEmpty;
  },
  
  execute: ({ editor, state }) => {
    const { selection } = state;
    const { $from } = selection;
    
    const depth = $from.depth;
    const currentBlock = $from.node(depth);
    const blockPos = $from.before(depth);
    const indent = currentBlock.attrs?.indent ?? 0;
    
    console.log('[Backspace][Normalize] TERMINAL - Converting empty block to paragraph', {
      blockType: currentBlock.type.name,
      indent,
      blockId: currentBlock.attrs?.blockId?.slice(0, 8),
      atRoot: indent === 0,
    });
    
    // 🛡️ GUARD: Cannot normalize if no blockId (shouldn't happen)
    if (!currentBlock.attrs?.blockId) {
      console.error('[Backspace][Normalize] Cannot normalize block without blockId');
      return false;
    }
    
    // 🔒 EMPTY ROOT BLOCK LAW:
    // If this block is at indent=0 and empty, this normalization is TERMINAL.
    // NO delete logic should run afterward. This is a conversion, not a deletion.
    const isRootBlock = indent === 0;
    
    editor.commands.command(({ state: cmdState, dispatch }) => {
      if (!dispatch) return false;
      
      const tr = cmdState.tr;
      
      // Delete current block
      const blockEnd = blockPos + currentBlock.nodeSize;
      tr.delete(blockPos, blockEnd);
      
      // Create new paragraph at same position with same indent
      const paragraph = createBlock(cmdState, tr, {
        type: 'paragraph',
        insertPos: blockPos,
        indent,
      });
      
      if (!paragraph) {
        console.error('[Backspace][Normalize] Failed to create paragraph during normalization');
        return false;
      }
      
      // Place cursor at start of new paragraph
      const cursorPos = blockPos + 1; // Inside paragraph
      tr.setSelection(state.selection.constructor.create(tr.doc, cursorPos));
      
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each normalization is its own undo step
      
      // 🔒 CRITICAL: Mark this transaction as TERMINAL
      // This prevents any delete/merge logic from running afterward
      tr.setMeta('blockNormalized', true);
      tr.setMeta('terminalBackspace', true);
      tr.setMeta('keyboardNormalization', true); // 🛡️ For DEV invariant checking
      
      dispatch(tr);
      return true;
    });
    
    console.log('[Backspace][Normalize] Event CONSUMED - no further processing', {
      isRootBlock,
    });
    
    // 🔒 RETURN TRUE = CONSUME EVENT
    // This MUST prevent any further Backspace processing
    return true;
  },
});
