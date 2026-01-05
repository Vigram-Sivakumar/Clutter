/**
 * Move to Previous Block Rule (ArrowLeft)
 * 
 * When: Cursor at start of block
 * Do: Move cursor to end of previous block
 * 
 * Universal behavior: ArrowLeft at block boundary moves to previous block.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { isAtStartOfBlock, getPreviousBlock } from '../../types/KeyboardContext';
import { TextSelection } from '@tiptap/pm/state';

export const moveToPreviousBlock = defineRule({
  id: 'navigation:moveToPreviousBlock',
  description: 'Move cursor to end of previous block when at start',
  priority: 50, // Lower than editing rules
  
  when(ctx: KeyboardContext): boolean {
    // Must be collapsed selection
    if (!ctx.isEmpty) {
      return false;
    }
    
    // Must be at start of current block
    if (!isAtStartOfBlock(ctx)) {
      return false;
    }
    
    // Must have a previous block
    const prevBlock = getPreviousBlock(ctx);
    return prevBlock !== null;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor, state } = ctx;
    const prevBlock = getPreviousBlock(ctx);
    
    if (!prevBlock) return false;
    
    // Move cursor to end of previous block
    const targetPos = prevBlock.pos + prevBlock.node.nodeSize - 1;
    const $pos = state.doc.resolve(targetPos);
    
    return editor.commands.setTextSelection($pos.pos);
  },
});

