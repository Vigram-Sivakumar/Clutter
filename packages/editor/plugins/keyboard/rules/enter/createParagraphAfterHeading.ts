/**
 * Create Paragraph After Heading Rule (Enter)
 * 
 * When: At end of non-empty heading
 * Do: Create new paragraph below
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';

export const createParagraphAfterHeading = defineRule({
  id: 'enter:createParagraphAfterHeading',
  description: 'Create paragraph below when pressing Enter at end of heading',
  priority: 60,
  
  when(ctx: KeyboardContext): boolean {
    const { currentNode, cursorOffset } = ctx;
    
    // Must be in a heading
    if (currentNode.type.name !== 'heading') {
      return false;
    }
    
    // Heading must not be empty
    if (currentNode.textContent === '') {
      return false;
    }
    
    // Must be at end of heading
    return cursorOffset === currentNode.content.size;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;
    
    // Split block and convert new block to paragraph
    return editor
      .chain()
      .splitBlock()
      .setNode('paragraph')
      .run();
  },
});

