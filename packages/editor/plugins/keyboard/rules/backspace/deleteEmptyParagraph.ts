/**
 * Delete Empty Paragraph Rule (Backspace)
 * 
 * When: Cursor at start of empty paragraph
 * Do: Delete the paragraph, merge with previous block
 * 
 * This is the simplest rule - a good first migration example.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';

export const deleteEmptyParagraph = defineRule({
  id: 'backspace:deleteEmptyParagraph',
  description: 'Delete empty paragraph when cursor at start',
  priority: 100, // High priority - handle empty paragraphs first
  
  when(ctx: KeyboardContext): boolean {
    const { $from, cursorOffset, currentNode } = ctx;
    
    // Must be at start of paragraph
    if (cursorOffset !== 0) {
      return false;
    }
    
    // Must be a paragraph
    if (currentNode.type.name !== 'paragraph') {
      return false;
    }
    
    // Must be empty
    if (currentNode.textContent !== '') {
      return false;
    }
    
    return true;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;
    
    // Let TipTap's default backspace handle the deletion
    // This will merge with the previous block
    return editor.commands.deleteNode('paragraph');
  },
});

