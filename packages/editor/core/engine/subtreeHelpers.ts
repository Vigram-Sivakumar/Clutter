/**
 * Subtree Helpers for Indent/Outdent Operations
 *
 * CRITICAL INVARIANT:
 * When a block moves (indent/outdent), its entire visual subtree MUST move with it.
 *
 * Visual subtree = all consecutive following blocks with level > current block's level
 *
 * This ensures:
 * - No orphaned blocks
 * - Tree structure preserved
 * - Collapse continues to work correctly
 * - Undo/redo maintains validity
 *
 * See: docs/INDENT_TREE_INVARIANT.md
 */

import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Get visual subtree range for a block in flat ProseMirror document
 *
 * Returns all consecutive blocks after startPos that have level > baseLevel.
 * This defines the "ownership" of a block over its visual children.
 *
 * @param doc - ProseMirror document
 * @param startPos - Position of the block
 * @param baseLevel - Level of the block
 * @returns Array of { pos: number, node: PMNode, level: number } for all descendants
 */
export function getVisualSubtree(
  doc: PMNode,
  startPos: number,
  baseLevel: number
): Array<{ pos: number; node: PMNode; level: number; blockId: string }> {
  const subtree: Array<{
    pos: number;
    node: PMNode;
    level: number;
    blockId: string;
  }> = [];

  let foundStart = false;

  doc.descendants((node, pos) => {
    // Skip until we find the starting block
    if (!foundStart) {
      if (pos === startPos) {
        foundStart = true;
      }
      return true; // Keep searching
    }

    // We're past the start block - check if this is a descendant
    const nodeLevel = node.attrs?.level ?? 0;

    // If level <= baseLevel, we've exited the subtree
    if (nodeLevel <= baseLevel) {
      return false; // Stop traversing
    }

    // This block is part of the subtree
    const blockId = node.attrs?.blockId;
    if (blockId) {
      subtree.push({
        pos,
        node,
        level: nodeLevel,
        blockId,
      });
    }

    return true; // Continue traversing
  });

  return subtree;
}

/**
 * Get all blocks that need level adjustment when outdenting
 *
 * When a block outdents, all its visual descendants must outdent by the same amount.
 *
 * @param doc - ProseMirror document
 * @param startPos - Position of the block being outdented
 * @param currentLevel - Current level of the block
 * @param newLevel - New level after outdent
 * @returns Array of { blockId, pos, oldLevel, newLevel } for all affected blocks
 */
export function getOutdentAffectedBlocks(
  doc: PMNode,
  blockPos: number,
  currentLevel: number,
  newLevel: number
): Array<{
  blockId: string;
  pos: number;
  oldLevel: number;
  newLevel: number;
}> {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔥 FIX: Self-contained subtree detection (no helper dependencies)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RULE: Include root + all following blocks with level > root.level
  //       Stop when hitting a block with level <= root.level
  //
  // This is the Notion-grade subtree invariant.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const affected: Array<{
    blockId: string;
    pos: number;
    oldLevel: number;
    newLevel: number;
  }> = [];

  let started = false;

  doc.descendants((node: any, pos: number) => {
    if (!node.attrs?.blockId) return true;

    // Find root block
    if (pos === blockPos) {
      started = true;
      affected.push({
        blockId: node.attrs.blockId,
        pos,
        oldLevel: currentLevel,
        newLevel,
      });
      return true; // Continue to find descendants
    }

    // Haven't found root yet, keep searching
    if (!started) return true;

    const level = node.attrs.level ?? 0;

    // 🛑 STOP: Reached sibling or ancestor (exited subtree)
    if (level <= currentLevel) {
      return false;
    }

    // ✅ INCLUDE: This is a descendant
    affected.push({
      blockId: node.attrs.blockId,
      pos,
      oldLevel: level,
      newLevel: level - 1, // Outdent by one level
    });

    return true; // Continue traversing descendants
  });

  return affected;
}

/**
 * Get all blocks that need level adjustment when indenting
 *
 * When a block indents, all its visual descendants must indent by the same amount.
 *
 * @param doc - ProseMirror document
 * @param startPos - Position of the block being indented
 * @param currentLevel - Current level of the block
 * @param newLevel - New level after indent
 * @returns Array of { blockId, pos, oldLevel, newLevel } for all affected blocks
 */
export function getIndentAffectedBlocks(
  doc: PMNode,
  startPos: number,
  currentLevel: number,
  newLevel: number
): Array<{
  blockId: string;
  pos: number;
  oldLevel: number;
  newLevel: number;
}> {
  const levelDelta = newLevel - currentLevel;
  const affected: Array<{
    blockId: string;
    pos: number;
    oldLevel: number;
    newLevel: number;
  }> = [];

  // The block being indented
  const startNode = doc.nodeAt(startPos);
  if (startNode?.attrs?.blockId) {
    affected.push({
      blockId: startNode.attrs.blockId,
      pos: startPos,
      oldLevel: currentLevel,
      newLevel,
    });
  }

  // All its visual descendants
  const subtree = getVisualSubtree(doc, startPos, currentLevel);
  for (const item of subtree) {
    affected.push({
      blockId: item.blockId,
      pos: item.pos,
      oldLevel: item.level,
      newLevel: item.level + levelDelta,
    });
  }

  return affected;
}

/**
 * Check if candidate block is a descendant of parent block
 *
 * Used to prevent circular references when indenting (can't indent under your own child).
 *
 * @param doc - ProseMirror document
 * @param candidateId - Block that might be a descendant
 * @param parentId - Block that might be an ancestor
 * @returns true if candidate is in parent's subtree
 */
export function isDescendantOf(
  doc: PMNode,
  candidateId: string,
  parentId: string
): boolean {
  let candidatePos: number | null = null;
  let candidateLevel: number | null = null;
  let parentPos: number | null = null;
  let parentLevel: number | null = null;

  doc.descendants((node, pos) => {
    if (node.attrs?.blockId === candidateId) {
      candidatePos = pos;
      candidateLevel = node.attrs.level ?? 0;
    }
    if (node.attrs?.blockId === parentId) {
      parentPos = pos;
      parentLevel = node.attrs.level ?? 0;
    }
    return candidatePos === null || parentPos === null;
  });

  // If either not found, can't be descendant
  if (
    candidatePos === null ||
    parentPos === null ||
    candidateLevel === null ||
    parentLevel === null
  ) {
    return false;
  }

  // Candidate must come AFTER parent
  if (candidatePos <= parentPos) return false;

  // Walk from parent to candidate
  let foundDescendant = false;
  let checkingSubtree = false;

  doc.descendants((node, pos) => {
    if (pos === parentPos) {
      checkingSubtree = true;
      return true;
    }

    if (checkingSubtree) {
      const nodeLevel = node.attrs?.level ?? 0;

      // If we're back at parent level or lower, subtree ended
      if (nodeLevel <= parentLevel) {
        checkingSubtree = false;
        return false; // Stop checking
      }

      // If this is the candidate, it's a descendant
      if (node.attrs?.blockId === candidateId) {
        foundDescendant = true;
        return false; // Stop checking
      }
    }

    return true;
  });

  return foundDescendant;
}

/**
 * Calculate correct parentBlockId based on level
 *
 * Walks backward from current position to find the nearest block at level-1.
 * This is the structural parent.
 *
 * @param doc - ProseMirror document
 * @param currentPos - Position of current block
 * @param currentLevel - Level of current block
 * @returns blockId of parent, or null if at root
 */
export function getParentBlockIdForLevel(
  doc: PMNode,
  currentPos: number,
  currentLevel: number
): string | null {
  if (currentLevel === 0) return null;

  const targetLevel = currentLevel - 1;
  let parentBlockId: string | null = null;

  // Walk backward to find nearest block at targetLevel
  doc.descendants((node, pos) => {
    if (pos >= currentPos) return false; // Stop at current position

    const nodeLevel = node.attrs?.level ?? 0;
    const blockId = node.attrs?.blockId;

    if (nodeLevel === targetLevel && blockId) {
      parentBlockId = blockId; // Keep updating (last one wins)
    }

    return true;
  });

  return parentBlockId;
}

/**
 * Validate tree after indent/outdent operation (DEV MODE ONLY)
 *
 * Checks that no invalid indent jumps exist (level can only increase by 1).
 *
 * @param doc - ProseMirror document
 * @throws Error if tree invariant is violated
 */
export function assertValidIndentTree(doc: PMNode): void {
  if (process.env.NODE_ENV !== 'development') return;

  let prevLevel = 0;
  let index = 0;

  doc.descendants((node) => {
    const level = node.attrs?.level ?? 0;
    const blockId = node.attrs?.blockId;

    if (!blockId) return true; // Skip non-block nodes

    // Rule: Level can only increase by 1 at a time
    if (level > prevLevel + 1) {
      throw new Error(
        `[INDENT INVARIANT VIOLATED] Block ${blockId} at index ${index}: ` +
          `level jumped from ${prevLevel} to ${level} (max allowed: ${prevLevel + 1})`
      );
    }

    // Rule: First block must be level 0
    if (index === 0 && level !== 0) {
      throw new Error(
        `[INDENT INVARIANT VIOLATED] First block must have level=0, got ${level}`
      );
    }

    prevLevel = level;
    index++;
    return true;
  });
}

/**
 * Validate no forward parenting exists (DEV MODE ONLY)
 *
 * Checks that a child's parent always appears BEFORE the child in document order.
 * Forward parenting indicates structural corruption.
 *
 * @param doc - ProseMirror document
 * @throws Error if forward parenting detected
 */
export function assertNoForwardParenting(doc: PMNode): void {
  if (process.env.NODE_ENV !== 'development') return;

  const blockPositions = new Map<string, number>();
  let index = 0;

  // Build position map
  doc.descendants((node) => {
    const blockId = node.attrs?.blockId;
    if (blockId) {
      blockPositions.set(blockId, index);
      index++;
    }
    return true;
  });

  // Check parentBlockId references
  doc.descendants((node) => {
    const blockId = node.attrs?.blockId;
    const parentBlockId = node.attrs?.parentBlockId;

    if (blockId && parentBlockId && parentBlockId !== 'root') {
      const childPos = blockPositions.get(blockId);
      const parentPos = blockPositions.get(parentBlockId);

      if (childPos !== undefined && parentPos !== undefined) {
        if (parentPos >= childPos) {
          throw new Error(
            `[FORWARD PARENTING DETECTED] Block ${blockId} (pos ${childPos}) ` +
              `has parent ${parentBlockId} (pos ${parentPos}) that appears after it. ` +
              `Parents must always appear before children in document order.`
          );
        }
      }
    }
    return true;
  });
}
