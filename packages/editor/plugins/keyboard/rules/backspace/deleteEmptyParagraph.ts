/**
 * Delete Empty Paragraph Rule (Backspace)
 *
 * When: Cursor at start of empty paragraph
 * Do: Delete the paragraph
 *
 * Canonical Decision Table: Step 2B-2 (Block is empty AND structural)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';

export const deleteEmptyParagraph = defineRule({
  id: 'backspace:deleteEmptyParagraph',
  description: 'Delete empty paragraph when cursor at start',
  priority: 100, // High priority - handle empty paragraphs first

  when(ctx: KeyboardContext): boolean {
    const { cursorOffset, currentNode } = ctx;

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

  execute(ctx: KeyboardContext): EditorIntent {
    const { currentNode } = ctx;

    return {
      type: 'delete-block',
      blockId: currentNode.attrs.blockId,
    };
  },
});
