/**
 * Backspace Skip Hidden Blocks Rule
 *
 * Ensures BACKSPACE never deletes or merges with collapsed subtrees.
 *
 * PRINCIPLE: Detect position divergence, not visibility.
 * - If previous logical block != previous physical block, we're skipping hidden content.
 * - Delegate to getPreviousBlock() (collapse-aware, battle-tested).
 *
 * CRITICAL: CollapsePlugin is the single authority for visibility.
 * This rule only detects and respects that authority.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import {
  isAtStartOfBlock,
  getPreviousBlock,
} from '../../types/KeyboardContext';

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

    // Get the previous LOGICAL block (collapse-aware)
    const prevLogical = getPreviousBlock(ctx);

    // Get the previous PHYSICAL sibling
    const { $from } = ctx;
    const parentDepth = $from.depth - 1;
    if (parentDepth < 0) return false;

    const parent = $from.node(parentDepth);
    const currentIndex = $from.index(parentDepth);

    // If there's no physical previous sibling, no skip needed
    if (currentIndex === 0) {
      return false;
    }

    // Calculate physical previous block position
    const currentBlockPos = $from.before($from.depth);
    const physicalPrevNode = parent.child(currentIndex - 1);
    const physicalPrevPos = currentBlockPos - physicalPrevNode.nodeSize;

    // POSITION DIVERGENCE TEST:
    // If logical and physical positions differ, there's a collapsed range between them
    if (!prevLogical) {
      // No logical previous block, but physical sibling exists
      // This means everything before current block is hidden
      return true;
    }

    // If positions differ, we're skipping hidden content
    return prevLogical.pos !== physicalPrevPos;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    // Get previous visible block (collapse-aware helper)
    const prevVisible = getPreviousBlock(ctx);

    if (!prevVisible) {
      // At document start - nothing to do
      return false;
    }

    // Move cursor to end of previous visible block
    // This positions the cursor correctly, and any subsequent
    // deletion/merge will happen on visible blocks only
    const targetPos = prevVisible.pos + prevVisible.node.nodeSize - 1;

    return editor.commands.setTextSelection(targetPos);
  },
});
