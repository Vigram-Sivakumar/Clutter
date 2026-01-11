/**
 * Multi-Selection Utilities
 * 
 * Helpers for detecting and working with multi-block selections
 */

import { Editor } from '@tiptap/react';
import { Node as PMNode } from '@tiptap/pm/model';

export interface SelectedBlock {
  pos: number;
  node: PMNode;
  nodeSize: number;
}

/**
 * Check if current selection spans multiple blocks
 */
export function isMultiBlockSelection(editor: Editor): boolean {
  const { selection, doc } = editor.state;
  const { from, to } = selection;

  // Check if entire document is selected
  if (from === 0 && to === doc.content.size) {
    return true;
  }

  // Check if selection spans multiple blocks
  const { $from, $to } = selection;
  if ($from.depth > 0 && $to.depth > 0) {
    const fromBlock = $from.node(1);
    const toBlock = $to.node(1);
    return fromBlock !== toBlock;
  }

  return false;
}

/**
 * Get all blocks that are currently selected
 * Returns array of { pos, node, nodeSize } in document order
 */
export function getSelectedBlocks(editor: Editor): SelectedBlock[] {
  const { selection, doc } = editor.state;
  const { from, to } = selection;
  const blocks: SelectedBlock[] = [];
  const seenPositions = new Set<number>();

  // If selecting entire document, iterate through all top-level children
  if (from === 0 && to === doc.content.size) {
    doc.forEach((node, offset) => {
      blocks.push({
        pos: offset,
        node,
        nodeSize: node.nodeSize,
      });
    });
    return blocks;
  }

  // For partial selections, find blocks using nodesBetween
  doc.nodesBetween(from, to, (node, pos, parent) => {
    // Only collect top-level blocks (direct children of doc)
    if (parent === doc && node.isBlock && !seenPositions.has(pos)) {
      seenPositions.add(pos);
      blocks.push({
        pos,
        node,
        nodeSize: node.nodeSize,
      });
      return false; // Don't descend into block children
    }
  });

  return blocks;
}

/**
 * Get the number of selected blocks
 */
export function getSelectedBlockCount(editor: Editor): number {
  if (!isMultiBlockSelection(editor)) {
    return 1;
  }
  return getSelectedBlocks(editor).length;
}

/**
 * Get the single halo-selected block (NodeSelection only)
 * Returns null if no block is selected or multiple blocks are selected
 * 
 * This is the SAFE way to get block info for keyboard rules.
 * Never use $pos.after() directly - it crashes at doc depth.
 */
export function getSingleSelectedBlock(editor: Editor): SelectedBlock | null {
  const { selection } = editor.state;
  
  // Only handle NodeSelection (single block via handle click)
  if (!(selection instanceof NodeSelection)) {
    return null;
  }
  
  // Multi-block selection should not create blocks
  if (isMultiBlockSelection(editor)) {
    return null;
  }
  
  const blocks = getSelectedBlocks(editor);
  if (blocks.length !== 1) {
    return null;
  }
  
  const firstBlock = blocks[0];
  return firstBlock ?? null; // Convert undefined to null
}

// Re-export NodeSelection for convenience
import { NodeSelection } from '@tiptap/pm/state';

/**
 * Execute an action on all selected blocks
 * Actions are executed in reverse order to preserve positions
 */
export function executeOnSelectedBlocks(
  editor: Editor,
  action: (_block: SelectedBlock, _index: number, _total: number) => void
): void {
  const blocks = getSelectedBlocks(editor);
  
  // Execute in reverse order to preserve positions during deletion/modification
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block) {
      action(block, i, blocks.length);
    }
  }
}

