/**
 * Enter Skip Hidden Blocks Rule
 *
 * STEP 2: Ensure ENTER never inserts inside collapsed subtrees
 *
 * When: Next block(s) are hidden by collapsed parent
 * Do: Insert after entire collapsed range, not inside it
 *
 * CRITICAL: Hidden blocks behave as if they do not exist.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { getNextBlock, isAtEndOfBlock } from '../../types/KeyboardContext';

/**
 * Check if a block is hidden by a collapsed parent
 *
 * Reuses the same logic from Step 1 (arrow key navigation).
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

/**
 * Find the next visible insertion position
 *
 * Skips entire collapsed subtrees to find where new content should go.
 */
function getNextVisibleInsertionPos(ctx: KeyboardContext): number | null {
  let nextBlock = getNextBlock(ctx);

  // getNextBlock already skips hidden blocks (from Step 1)
  // So we just need to find where to insert
  if (!nextBlock) {
    return null; // No next block, insert at end
  }

  // nextBlock is guaranteed visible (Step 1 invariant)
  return nextBlock.pos;
}

export const enterSkipHiddenBlocks = defineRule({
  id: 'enter:skipHiddenBlocks',
  description:
    'Skip collapsed subtrees when pressing Enter - insert after hidden range',
  priority: 95, // Below splitListItem (110), above outdentEmptyList (90)

  when(ctx: KeyboardContext): boolean {
    // Only intervene when at end of block
    if (!isAtEndOfBlock(ctx)) {
      return false;
    }

    // Check if there are hidden blocks ahead
    const { $from } = ctx;

    // Get parent and index
    const parentDepth = $from.depth - 1;
    if (parentDepth < 0) return false;

    const parent = $from.node(parentDepth);
    const currentIndex = $from.index(parentDepth);

    // Check if next sibling exists and is hidden
    if (currentIndex >= parent.childCount - 1) {
      return false; // No next sibling
    }

    const nextNode = parent.child(currentIndex + 1);
    return isBlockHidden(ctx, nextNode);
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;
    const insertPos = getNextVisibleInsertionPos(ctx);

    if (insertPos === null) {
      // No next block, use default behavior
      return false;
    }

    // Insert paragraph at the visible position
    // This skips the entire collapsed range
    return editor
      .chain()
      .focus()
      .insertContentAt(insertPos, {
        type: 'paragraph',
        attrs: {
          blockId: crypto.randomUUID(),
          // No parentBlockId - this is a sibling, not a child
        },
      })
      .setTextSelection(insertPos + 1)
      .run();
  },
});
