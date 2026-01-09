/**
 * Merge With Structural Block Rule (Backspace)
 *
 * Preventive rule:
 * When cursor is at start of a block but previous block is structural
 * (code block, divider, callout, etc), we intentionally prevent merge.
 * Emits noop to explicitly block default merge behavior.
 *
 * Canonical Decision Table: Step 2B-1 (prevention variant)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';

const STRUCTURAL_BLOCKS = [
  'codeBlock',
  'horizontalRule',
  'callout',
  'blockquote',
];

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

  execute(_ctx: KeyboardContext): EditorIntent {
    // Explicitly prevent merge with structural blocks
    // This is intentional non-action, not silence
    return { type: 'noop' };
  },
});
