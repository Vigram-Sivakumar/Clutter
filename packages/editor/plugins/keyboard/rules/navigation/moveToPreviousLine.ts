/**
 * Move to Previous Line Rule (ArrowUp)
 * 
 * When: Cursor at visual start of block (top line)
 * Do: Move cursor to previous block, preserving horizontal position
 * 
 * Universal behavior: ArrowUp at block boundary moves to previous block.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { isAtVisualStartOfBlock, getPreviousBlock, findClosestPosInBlock } from '../../types/KeyboardContext';

export const moveToPreviousLine = defineRule({
  id: 'navigation:moveToPreviousLine',
  description: 'Move cursor to previous block when at visual top, preserving X-coordinate',
  priority: 50, // Lower than editing rules
  
  when(ctx: KeyboardContext): boolean {
    // Must be collapsed selection
    if (!ctx.isEmpty) {
      return false;
    }
    
    // Must be at visual start of current block
    if (!isAtVisualStartOfBlock(ctx)) {
      return false;
    }
    
    // Must have a previous block
    const prevBlock = getPreviousBlock(ctx);
    return prevBlock !== null;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;
    const prevBlock = getPreviousBlock(ctx);
    
    if (!prevBlock) return false;
    
    // Find closest position in previous block using visual X-coordinate
    const targetPos = findClosestPosInBlock(editor, prevBlock.pos, ctx.visualX);
    
    return editor.commands.setTextSelection(targetPos);
  },
});

