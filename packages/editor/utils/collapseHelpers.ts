/**
 * Shared collapse utilities for blocks with collapsible children
 * Used by both ListBlock (tasks) and ToggleHeader
 */

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface CollapsibleBlockAttrs {
  collapsed?: boolean;
  level: number;
}

/**
 * Check if a block should be hidden because a parent is collapsed
 *
 * This searches backwards through the document to find a collapsed ancestor.
 * Works for any block type that has 'level' and 'collapsed' attributes.
 *
 * @param doc - ProseMirror document
 * @param currentPos - Position of the block to check
 * @param currentLevel - Indentation level of the block
 * @param collapsibleTypes - Array of node type names that can be collapsed (e.g., ['listBlock', 'toggleHeader'])
 */
export function isHiddenByCollapsedAncestor(
  doc: ProseMirrorNode,
  currentPos: number,
  currentLevel: number,
  collapsibleTypes: string[]
): boolean {
  // Search backwards from current position to find collapsed parent
  let foundCollapsedParent = false;

  doc.nodesBetween(0, currentPos, (node, nodePos) => {
    // Only check collapsible node types
    if (!collapsibleTypes.includes(node.type.name)) {
      return true;
    }

    const attrs = node.attrs as CollapsibleBlockAttrs;

    // If we find a collapsed block at a lower level (parent), check if it's our ancestor
    if (attrs.collapsed && attrs.level < currentLevel) {
      // Check if this collapsed item is actually a parent (no sibling/parent between it and us)
      let isDirectAncestor = true;
      doc.nodesBetween(nodePos + node.nodeSize, currentPos, (n) => {
        if (collapsibleTypes.includes(n.type.name)) {
          const nAttrs = n.attrs as CollapsibleBlockAttrs;
          // If we hit a node at same or lower level than the collapsed node, it's not our ancestor
          if (nAttrs.level <= attrs.level) {
            isDirectAncestor = false;
            return false;
          }
        }
        return true;
      });

      if (isDirectAncestor) {
        foundCollapsedParent = true;
        return false; // Stop searching
      }
    }
    return true;
  });

  return foundCollapsedParent;
}

/**
 * Check if a block is hidden by a collapsed toggle parent
 * Convenience function for blocks that can be children of toggles
 */
export function isHiddenByCollapsedToggle(
  doc: ProseMirrorNode,
  currentPos: number,
  parentToggleId: string | null
): boolean {
  if (!parentToggleId) return false;

  // Search backwards to find the toggle header with matching ID
  let isHidden = false;

  doc.nodesBetween(0, currentPos, (node) => {
    if (node.type.name === 'toggleHeader') {
      const toggleId = node.attrs.toggleId as string;
      const collapsed = node.attrs.collapsed as boolean;

      // If this is our parent toggle and it's collapsed, we should hide
      if (toggleId === parentToggleId && collapsed) {
        isHidden = true;
        return false; // Stop searching
      }
    }
    return true;
  });

  return isHidden;
}

/**
 * Check if a block should be hidden by a collapsed parent (flat schema)
 *
 * This walks up the parentBlockId chain to find collapsed task or toggle ancestors.
 * Used by the flat toggle/task implementation (not legacy toggleHeader).
 *
 * @param doc - ProseMirror document
 * @param currentPos - Position of the block to check
 * @returns true if any ancestor is collapsed
 */
export function isHiddenByCollapsedParent(
  doc: ProseMirrorNode,
  currentPos: number
): boolean {
  const currentNode = doc.nodeAt(currentPos);
  if (!currentNode) return false;

  let currentParentId = currentNode.attrs.parentBlockId as string | undefined;

  // Walk up the parent chain checking for collapsed ancestors
  while (currentParentId) {
    let foundParent = false;
    let parentCollapsed = false;

    doc.descendants((node) => {
      if (node.type.name === 'listBlock') {
        const attrs = node.attrs as {
          blockId?: string;
          listType?: string;
          collapsed?: boolean;
          parentBlockId?: string;
        };

        // Found the parent
        if (attrs.blockId === currentParentId) {
          foundParent = true;

          // Check if it's a collapsed task or toggle
          if (
            (attrs.listType === 'task' || attrs.listType === 'toggle') &&
            attrs.collapsed
          ) {
            parentCollapsed = true;
            return false; // Stop searching
          }

          // Move up to next parent
          currentParentId = attrs.parentBlockId;
          return false; // Stop this iteration
        }
      }
      return true;
    });

    if (parentCollapsed) {
      return true; // Found collapsed ancestor
    }

    if (!foundParent) {
      break; // No more parents
    }
  }

  return false;
}

/**
 * Get information about children of a collapsible block
 * Used for displaying completion counts, etc.
 *
 * @param doc - ProseMirror document
 * @param currentPos - Position of the parent block
 * @param currentLevel - Level of the parent block
 * @param childNodeType - Type of child nodes to count (e.g., 'listBlock')
 */
export function getChildrenInfo(
  doc: ProseMirrorNode,
  currentPos: number,
  currentLevel: number,
  childNodeType: string
): { total: number; completed: number; hasChildren: boolean } {
  let total = 0;
  let completed = 0;
  let foundSelf = false;
  let stopped = false;

  doc.descendants((node, nodePos) => {
    if (stopped) return false;

    if (node.type.name === childNodeType) {
      const attrs = node.attrs as CollapsibleBlockAttrs & { checked?: boolean };

      // Find our position
      if (nodePos === currentPos) {
        foundSelf = true;
        return true;
      }

      // After finding self, count children
      if (foundSelf) {
        // Stop when we hit a node at same or lower level
        if (attrs.level <= currentLevel) {
          stopped = true;
          return false;
        }

        // Only count direct children (level + 1)
        if (attrs.level === currentLevel + 1) {
          total++;
          if (attrs.checked) {
            completed++;
          }
        }
      }
    }
    return true;
  });

  return { total, completed, hasChildren: total > 0 };
}
