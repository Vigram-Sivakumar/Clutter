/**
 * useDragSelection - Hook for drag-to-select multiple blocks
 * 
 * Manages drag selection state and provides utilities for:
 * - Tracking drag start/end positions
 * - Calculating selection box dimensions
 * - Finding intersecting blocks
 */

import { useState, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/core';

interface DragPosition {
  x: number;
  y: number;
}

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragSelectionState {
  isDragging: boolean;
  selectionBox: SelectionBox | null;
  selectedBlockPositions: number[];
}

export function useDragSelection(editor: Editor | null) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectedBlockPositions, setSelectedBlockPositions] = useState<number[]>([]);
  
  const startPos = useRef<DragPosition | null>(null);
  const currentPos = useRef<DragPosition | null>(null);

  /**
   * Start drag selection
   */
  const startDrag = useCallback((x: number, y: number) => {
    startPos.current = { x, y };
    currentPos.current = { x, y };
    setIsDragging(true);
    setSelectionBox(null);
    setSelectedBlockPositions([]);
  }, []);

  /**
   * Update drag position and calculate intersecting blocks
   */
  const updateDrag = useCallback((x: number, y: number) => {
    if (!isDragging || !startPos.current || !editor) return;

    currentPos.current = { x, y };

    // Calculate selection box
    const left = Math.min(startPos.current.x, x);
    const top = Math.min(startPos.current.y, y);
    const width = Math.abs(x - startPos.current.x);
    const height = Math.abs(y - startPos.current.y);

    setSelectionBox({ left, top, width, height });

    // Find intersecting blocks
    const intersectingPositions = findIntersectingBlocks(
      { left, top, width, height },
      editor
    );
    setSelectedBlockPositions(intersectingPositions);
  }, [isDragging, editor]);

  /**
   * End drag and set ProseMirror selection
   */
  const endDrag = useCallback(() => {
    if (!isDragging || !editor) return;

    // If we have selected blocks, set ProseMirror selection
    if (selectedBlockPositions.length > 0) {
      setMultiBlockSelection(editor, selectedBlockPositions);
    }

    // Reset drag state
    setIsDragging(false);
    startPos.current = null;
    currentPos.current = null;
    setSelectionBox(null);
    // Keep selectedBlockPositions for visual feedback until next selection
  }, [isDragging, editor, selectedBlockPositions]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setIsDragging(false);
    setSelectionBox(null);
    setSelectedBlockPositions([]);
    startPos.current = null;
    currentPos.current = null;
  }, []);

  return {
    isDragging,
    selectionBox,
    selectedBlockPositions,
    startDrag,
    updateDrag,
    endDrag,
    clearSelection,
  };
}

/**
 * Find blocks that intersect with selection box
 */
function findIntersectingBlocks(
  selectionBox: SelectionBox,
  editor: Editor
): number[] {
  const { view } = editor;
  const { state } = view;
  const positions: number[] = [];

  // Get all block-level nodes from the document
  state.doc.descendants((node, pos) => {
    // Only check top-level blocks (depth 1)
    if (node.isBlock && pos > 0) {
      // Get DOM element for this node
      const domNode = view.nodeDOM(pos);
      if (domNode && domNode instanceof HTMLElement) {
        const rect = domNode.getBoundingClientRect();
        
        // Check if selection box intersects with block
        if (boxesIntersect(selectionBox, rect)) {
          positions.push(pos);
        }
      }
    }
    
    // Don't descend into child nodes
    return false;
  });

  return positions;
}

/**
 * Check if two boxes intersect
 */
function boxesIntersect(
  box1: SelectionBox,
  box2: DOMRect
): boolean {
  return !(
    box1.left + box1.width < box2.left ||
    box2.left + box2.width < box1.left ||
    box1.top + box1.height < box2.top ||
    box2.top + box2.height < box1.top
  );
}

/**
 * Set ProseMirror selection to span multiple blocks
 */
function setMultiBlockSelection(
  editor: Editor,
  positions: number[]
): void {
  if (positions.length === 0) return;

  const { state, dispatch } = editor.view;
  const { tr } = state;

  // Sort positions
  const sortedPositions = [...positions].sort((a, b) => a - b);
  const firstPos = sortedPositions[0];
  const lastPos = sortedPositions[sortedPositions.length - 1];

  // Get the node at the last position to calculate end
  const lastNode = state.doc.nodeAt(lastPos);
  if (!lastNode) return;

  // Create a text selection spanning from first to last block
  const { TextSelection } = require('@tiptap/pm/state');
  const selection = TextSelection.create(
    tr.doc,
    firstPos,
    lastPos + lastNode.nodeSize
  );

  tr.setSelection(selection);
  dispatch(tr);
}

