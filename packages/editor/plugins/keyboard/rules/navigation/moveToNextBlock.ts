/**
 * Move to Next Block Rule (ArrowRight)
 * 
 * When: Cursor at end of block
 * Do: Move cursor to start of next block
 * 
 * Universal behavior: ArrowRight at block boundary moves to next block.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { isAtEndOfBlock, getNextBlock } from '../../types/KeyboardContext';

export const moveToNextBlock = defineRule({
  id: 'navigation:moveToNextBlock',
  description: 'Move cursor to start of next block when at end',
  priority: 50, // Lower than editing rules
  
  when(ctx: KeyboardContext): boolean {
    // Must be collapsed selection
    if (!ctx.isEmpty) {
      return false;
    }
    
    // Must be at end of current block
    if (!isAtEndOfBlock(ctx)) {
      return false;
    }
    
    // Must have a next block
    const nextBlock = getNextBlock(ctx);
    return nextBlock !== null;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor, state } = ctx;
    const nextBlock = getNextBlock(ctx);
    
    if (!nextBlock) return false;
    
    // Move cursor to start of next block
    const targetPos = nextBlock.pos + 1; // +1 to get inside the block
    const $pos = state.doc.resolve(targetPos);
    
    return editor.commands.setTextSelection($pos.pos);
  },
});

