/**
 * Exit Empty Heading Rule (Enter)
 * 
 * When: Empty heading
 * Do: Convert to paragraph
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';

export const exitEmptyHeading = defineRule({
  id: 'enter:exitEmptyHeading',
  description: 'Convert empty heading to paragraph on Enter',
  priority: 80,
  
  when(ctx: KeyboardContext): boolean {
    const { currentNode } = ctx;
    
    return currentNode.type.name === 'heading' && currentNode.textContent === '';
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;
    
    return editor
      .chain()
      .setNode('paragraph')
      .run();
  },
});

