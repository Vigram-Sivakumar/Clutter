/**
 * Merge With Structural Block Rule (Backspace)
 * 
 * When: At start of paragraph with structural block before (code, horizontal rule, etc.)
 * Do: Prevent default merge (structural blocks shouldn't merge with text)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';

const STRUCTURAL_BLOCKS = ['codeBlock', 'horizontalRule', 'callout', 'blockquote'];

export const mergeWithStructuralBlock = defineRule({
  id: 'backspace:mergeWithStructuralBlock',
  description: 'Prevent merging with structural blocks',
  priority: 70,
  
  when(ctx: KeyboardContext): boolean {
    const { currentNode, cursorOffset, $from } = ctx;
    
    // Must be at start of paragraph
    if (cursorOffset !== 0 || currentNode.type.name !== 'paragraph') {
      return false;
    }
    
    // Check if there's a structural block before
    const indexInParent = $from.index($from.depth - 1);
    if (indexInParent === 0) {
      return false; // No block before
    }
    
    const parent = $from.node($from.depth - 1);
    const blockBefore = parent.child(indexInParent - 1);
    
    return STRUCTURAL_BLOCKS.includes(blockBefore.type.name);
  },
  
  execute(ctx: KeyboardContext): boolean {
    // Prevent default merge by returning true (handled)
    // The structural block stays intact
    return true;
  },
});

