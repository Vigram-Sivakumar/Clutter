/**
 * Move to Next Line Rule (ArrowDown)
 * 
 * When: Cursor at visual end of block (bottom line)
 * Do: Move cursor to next block, preserving horizontal position
 * 
 * Universal behavior: ArrowDown at block boundary moves to next block.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { isAtVisualEndOfBlock, getNextBlock, getVisualColumn } from '../../types/KeyboardContext';

export const moveToNextLine = defineRule({
  id: 'navigation:moveToNextLine',
  description: 'Move cursor to next block when at visual bottom',
  priority: 50, // Lower than editing rules
  
  when(ctx: KeyboardContext): boolean {
    // Must be collapsed selection
    if (!ctx.isEmpty) {
      return false;
    }
    
    // Must be at visual end of current block
    if (!isAtVisualEndOfBlock(ctx)) {
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
    
    // Get current visual column to preserve horizontal position
    const column = getVisualColumn(ctx);
    
    // Move cursor to next block at same column (or end if shorter)
    const targetPos = nextBlock.pos + 1 + Math.min(column, nextBlock.node.content.size);
    const $pos = state.doc.resolve(targetPos);
    
    return editor.commands.setTextSelection($pos.pos);
  },
});

