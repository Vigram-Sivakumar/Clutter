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
import { isAtVisualEndOfBlock, getNextBlock, findClosestPosInBlock } from '../../types/KeyboardContext';

export const moveToNextLine = defineRule({
  id: 'navigation:moveToNextLine',
  description: 'Move cursor to next block when at visual bottom, preserving X-coordinate',
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
    const { editor } = ctx;
    const nextBlock = getNextBlock(ctx);
    
    if (!nextBlock) return false;
    
    // Find closest position in next block using visual X-coordinate
    const targetPos = findClosestPosInBlock(editor, nextBlock.pos, ctx.visualX);
    
    return editor.commands.setTextSelection(targetPos);
  },
});

