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
  startPos: number,
  currentLevel: number,
  newLevel: number
): Array<{
  blockId: string;
  pos: number;
  oldLevel: number;
  newLevel: number;
}> {
  const levelDelta = currentLevel - newLevel;
  const affected: Array<{
    blockId: string;
    pos: number;
    oldLevel: number;
    newLevel: number;
  }> = [];

  // The block being outdented
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
      newLevel: item.level - levelDelta,
    });
  }

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
