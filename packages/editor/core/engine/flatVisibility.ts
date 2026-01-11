/**
 * Flat Visibility Model
 *
 * Determines which blocks are visible based on collapse state.
 * NO structure mutation - pure filtering.
 */

export interface FlatBlock {
  id: string;
  indent: number;
  collapsed: boolean;
}

/**
 * Get visible blocks from flat list
 *
 * ALGORITHM:
 * - Walk blocks in order
 * - If a block is collapsed, hide all following blocks with greater indent
 * - Resume showing when indent returns to same or less
 *
 * This is O(n) and deterministic.
 */
export function getVisibleBlocks<T extends FlatBlock>(blocks: T[]): T[] {
  const visible: T[] = [];
  let hiddenIndent: number | null = null;

  for (const block of blocks) {
    // If we're hiding, check if this block should remain hidden
    if (hiddenIndent !== null && block.indent > hiddenIndent) {
      continue; // Still hidden
    }

    // This block is visible
    visible.push(block);

    // If this block is collapsed, start hiding deeper blocks
    if (block.collapsed) {
      hiddenIndent = block.indent;
    }
    // If we were hiding and this block is at same/less indent, stop hiding
    else if (hiddenIndent !== null && block.indent <= hiddenIndent) {
      hiddenIndent = null;
    }
  }

  return visible;
}

/**
 * Check if a block has children (for showing collapse caret)
 *
 * RULE: A block has children if the next block has greater indent
 */
export function hasChildren(blocks: FlatBlock[], index: number): boolean {
  const current = blocks[index];
  const next = blocks[index + 1];
  return next !== undefined && next.indent > current.indent;
}

/**
 * Check if a block is hidden by a collapsed ancestor
 *
 * Used for cursor safety - never place cursor in hidden block
 */
export function isBlockHidden(
  blocks: FlatBlock[],
  blockIndex: number
): boolean {
  // Walk backwards to find if any ancestor is collapsed
  const targetIndent = blocks[blockIndex].indent;

  for (let i = blockIndex - 1; i >= 0; i--) {
    const ancestor = blocks[i];

    // Found potential ancestor (has lower indent)
    if (ancestor.indent < targetIndent) {
      if (ancestor.collapsed) {
        return true; // This ancestor is collapsed, so we're hidden
      }
      // Continue checking higher ancestors
    }
  }

  return false; // No collapsed ancestors found
}
