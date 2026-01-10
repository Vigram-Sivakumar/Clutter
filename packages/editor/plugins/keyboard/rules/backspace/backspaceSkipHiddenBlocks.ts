/**
 * Backspace Skip Hidden Blocks Rule
 *
 * STEP 3: Ensure BACKSPACE never deletes or merges with collapsed subtrees
 *
 * When: At start of block AND previous block is hidden
 * Do: Skip hidden siblings, move to previous visible block
 *
 * CRITICAL: Hidden blocks behave as if they do not exist.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import {
  isAtStartOfBlock,
  getPreviousBlock,
} from '../../types/KeyboardContext';

/**
 * Check if a block is hidden by a collapsed parent
 *
 * Reuses the same logic from Steps 1 & 2.
 * This ensures consistency across all keyboard operations.
 */
function isBlockHidden(ctx: KeyboardContext, blockNode: any): boolean {
  const { state } = ctx;
  const { doc } = state;
  const parentBlockId = blockNode.attrs?.parentBlockId;

  if (!parentBlockId) {
    return false; // Root-level blocks are never hidden
  }

  // Find if any ancestor is collapsed
  let isHidden = false;

  doc.descendants((node) => {
    if (
      node.attrs?.blockId === parentBlockId &&
      node.attrs?.collapsed === true
    ) {
      isHidden = true;
      return false; // Stop traversal
    }
    return true;
  });

  return isHidden;
}

export const backspaceSkipHiddenBlocks = defineRule({
  id: 'backspace:skipHiddenBlocks',
  description:
    'Skip collapsed subtrees when pressing Backspace - never delete hidden content',
  priority: 95, // Symmetric with enterSkipHiddenBlocks

  when(ctx: KeyboardContext): boolean {
    // Only intervene when at start of block
    if (!isAtStartOfBlock(ctx)) {
      return false;
    }

    // Check if previous block exists and is hidden
    const prevBlock = getPreviousBlock(ctx);

    if (!prevBlock) {
      return false; // No previous block
    }

    // If previous block is hidden, we need to skip it
    return isBlockHidden(ctx, prevBlock.node);
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    // getPreviousBlock already skips hidden blocks (Step 1)
    // So this will give us the first visible previous block
    const prevBlock = getPreviousBlock(ctx);

    if (!prevBlock) {
      // At document start - nothing to do
      return false;
    }

    // Move cursor to end of previous visible block
    // This positions the cursor correctly, and any subsequent
    // deletion/merge will happen on visible blocks only
    const targetPos = prevBlock.pos + prevBlock.node.nodeSize - 1;

    return editor.commands.setTextSelection(targetPos);
  },
});
