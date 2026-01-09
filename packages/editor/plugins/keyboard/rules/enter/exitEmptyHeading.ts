/**
 * Exit Empty Heading Rule (Enter)
 *
 * When: Empty heading
 * Do: Convert to paragraph
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';

export const exitEmptyHeading = defineRule({
  id: 'enter:exitEmptyHeading',
  description: 'Convert empty heading to paragraph on Enter',
  priority: 80,

  when(ctx: KeyboardContext): boolean {
    const { currentNode } = ctx;

    return (
      currentNode.type.name === 'heading' && currentNode.textContent === ''
    );
  },

  execute(ctx: KeyboardContext): EditorIntent {
    const { currentNode } = ctx;

    return {
      type: 'convert-block',
      blockId: currentNode.attrs.blockId,
      to: 'paragraph',
    };
  },
});
