/**
 * Subtree Helpers for Indent/Outdent Operations
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CANONICAL OUTLINER INVARIANT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * - Structure is defined ONLY by parentBlockId
 * - A block owns its entire subtree
 * - When a block moves, its subtree MUST move with it
 * - Levels are ALWAYS derived, never mutated directly
 *
 * Violating this causes orphaned or ghost children.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Get entire subtree of a block via parent-pointer traversal
 *
 * This is the CORRECT way to find descendants in a flat parent-pointer tree.
 * Does NOT rely on visual order or level comparisons.
 *
 * @param blockId - Root block ID
 * @param doc - ProseMirror document
 * @returns Array of all descendant blocks (not including root)
 */
export function getSubtree(
  blockId: string,
  doc: PMNode
): Array<{ blockId: string; node: PMNode; pos: number }> {
  // Build parent → children map
  const childrenMap = new Map<
    string,
    Array<{ blockId: string; node: PMNode; pos: number }>
  >();

  doc.descendants((node: PMNode, pos: number) => {
    if (node.attrs?.blockId) {
      const parentId = node.attrs.parentBlockId || 'root';
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push({
        blockId: node.attrs.blockId,
        node,
        pos,
      });
    }
    return true;
  });

  // BFS to collect all descendants
  const result: Array<{ blockId: string; node: PMNode; pos: number }> = [];
  const queue: string[] = [blockId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) || [];

    for (const child of children) {
      result.push(child);
      queue.push(child.blockId);
    }
  }

  return result;
}

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
  rootBlockId: string,
  _rootLevel: number
): Array<{
  blockId: string;
  pos: number;
  oldLevel: number;
  newLevel: number;
}> {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔑 CRITICAL FIX: Parent-based DFS, NOT level-based scanning
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WRONG (old approach):
  //   - Scan forward while level > rootLevel
  //   - Assumes visual nesting = structural nesting
  //   - Fails when parentBlockId ≠ visual parent
  //
  // CORRECT (new approach):
  //   - Build parent → children map from parentBlockId
  //   - DFS from root to collect ALL descendants
  //   - Parents are truth, levels are derived
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // PASS 1: Build parent → children map + blockId → node map
  const childrenMap = new Map<string, string[]>();
  const nodeMap = new Map<string, { node: any; pos: number }>();

  doc.descendants((node: any, pos: number) => {
    if (!node.attrs?.blockId) return true;

    const { blockId, parentBlockId } = node.attrs;
    nodeMap.set(blockId, { node, pos });

    const parent = parentBlockId || 'root';
    if (!childrenMap.has(parent)) {
      childrenMap.set(parent, []);
    }
    childrenMap.get(parent)!.push(blockId);

    return true;
  });

  // PASS 2: DFS from root to collect entire subtree
  const subtreeIds: string[] = [];

  function collectSubtree(id: string) {
    subtreeIds.push(id);
    const children = childrenMap.get(id) ?? [];
    children.forEach(collectSubtree);
  }

  collectSubtree(rootBlockId);

  // PASS 3: Build affected blocks with positions and level deltas
  const affected: Array<{
    blockId: string;
    pos: number;
    oldLevel: number;
    newLevel: number;
  }> = [];

  for (const blockId of subtreeIds) {
    const data = nodeMap.get(blockId);
    if (!data) continue;

    const oldLevel = data.node.attrs.level ?? 0;
    const newLevel = oldLevel - 1; // Outdent by one level

    affected.push({
      blockId,
      pos: data.pos,
      oldLevel,
      newLevel,
    });
  }

  // 🌿 FORENSIC CHECKPOINT 2: SUBTREE CALCULATION RESULT
  console.group('🌿 SUBTREE RESULT');
  console.log('root:', rootBlockId.slice(0, 8));
  affected.forEach((b) => {
    console.log(
      `${b.blockId.slice(0, 8)} | old=${b.oldLevel} → new=${b.newLevel}`
    );
  });
  console.groupEnd();

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
  // 🔑 Parent-based DFS (same as outdent)
  const levelDelta = newLevel - currentLevel;

  // Get root block ID
  const startNode = doc.nodeAt(startPos);
  if (!startNode?.attrs?.blockId) return [];

  const rootBlockId = startNode.attrs.blockId;

  // PASS 1: Build parent → children map + blockId → node map
  const childrenMap = new Map<string, string[]>();
  const nodeMap = new Map<string, { node: any; pos: number }>();

  doc.descendants((node: any, pos: number) => {
    if (!node.attrs?.blockId) return true;

    const { blockId, parentBlockId } = node.attrs;
    nodeMap.set(blockId, { node, pos });

    const parent = parentBlockId || 'root';
    if (!childrenMap.has(parent)) {
      childrenMap.set(parent, []);
    }
    childrenMap.get(parent)!.push(blockId);

    return true;
  });

  // PASS 2: DFS from root to collect entire subtree
  const subtreeIds: string[] = [];

  function collectSubtree(id: string) {
    subtreeIds.push(id);
    const children = childrenMap.get(id) ?? [];
    children.forEach(collectSubtree);
  }

  collectSubtree(rootBlockId);

  // PASS 3: Build affected blocks with level deltas
  const affected: Array<{
    blockId: string;
    pos: number;
    oldLevel: number;
    newLevel: number;
  }> = [];

  for (const blockId of subtreeIds) {
    const data = nodeMap.get(blockId);
    if (!data) continue;

    const oldLevel = data.node.attrs.level ?? 0;

    affected.push({
      blockId,
      pos: data.pos,
      oldLevel,
      newLevel: oldLevel + levelDelta,
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
