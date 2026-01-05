/**
 * KeyboardContext - What rules have access to
 * 
 * This is the complete state a keyboard rule needs to make decisions.
 * It's deliberately minimal and immutable.
 * 
 * Rules inspect context, they don't mutate it.
 */

import type { Editor } from '@tiptap/core';
import type { EditorState, Selection } from '@tiptap/pm/state';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';

/**
 * KeyboardContext - Immutable snapshot of editor state at key press
 */
export interface KeyboardContext {
  /** The editor instance (for chain commands) */
  readonly editor: Editor;
  
  /** ProseMirror editor state */
  readonly state: EditorState;
  
  /** Current selection */
  readonly selection: Selection;
  
  /** Resolved position of cursor ($from) */
  readonly $from: ResolvedPos;
  
  /** Current parent node (block cursor is in) */
  readonly currentNode: PMNode;
  
  /** Cursor offset within parent */
  readonly cursorOffset: number;
  
  /** Is selection empty? */
  readonly isEmpty: boolean;
  
  /** Visual X-coordinate (screen space) for vertical navigation */
  readonly visualX: number;
  
  /** Key that triggered this (for context) */
  readonly key: 'Enter' | 'Backspace' | 'Tab' | 'Delete' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
}

/**
 * Get visual X-coordinate of caret (screen space)
 */
function getCaretVisualX(editor: Editor): number {
  const view = editor.view;
  const { from } = editor.state.selection;
  try {
    const coords = view.coordsAtPos(from);
    return coords.left;
  } catch (e) {
    // Fallback if coords fail
    return 0;
  }
}

/**
 * Create a KeyboardContext from editor state
 */
export function createKeyboardContext(
  editor: Editor,
  key: KeyboardContext['key']
): KeyboardContext {
  const { state } = editor;
  const { selection } = state;
  const { $from, empty } = selection;
  
  return {
    editor,
    state,
    selection,
    $from,
    currentNode: $from.parent,
    cursorOffset: $from.parentOffset,
    isEmpty: empty,
    visualX: getCaretVisualX(editor),
    key,
  };
}

/**
 * Navigation helpers for KeyboardContext
 */

/**
 * Is cursor at the start of the current block?
 */
export function isAtStartOfBlock(ctx: KeyboardContext): boolean {
  return ctx.cursorOffset === 0;
}

/**
 * Is cursor at the end of the current block?
 */
export function isAtEndOfBlock(ctx: KeyboardContext): boolean {
  return ctx.cursorOffset === ctx.currentNode.content.size;
}

/**
 * Get the previous block node (if any)
 */
export function getPreviousBlock(ctx: KeyboardContext): { pos: number; node: PMNode } | null {
  const { $from } = ctx;
  
  // Get parent and index
  const parentDepth = $from.depth - 1;
  if (parentDepth < 0) return null;
  
  const parent = $from.node(parentDepth);
  const index = $from.index(parentDepth);
  
  if (index === 0) return null; // No previous sibling
  
  const prevNode = parent.child(index - 1);
  const prevPos = $from.before($from.depth) - prevNode.nodeSize;
  
  return { pos: prevPos, node: prevNode };
}

/**
 * Get the next block node (if any)
 */
export function getNextBlock(ctx: KeyboardContext): { pos: number; node: PMNode } | null {
  const { $from } = ctx;
  
  // Get parent and index
  const parentDepth = $from.depth - 1;
  if (parentDepth < 0) return null;
  
  const parent = $from.node(parentDepth);
  const index = $from.index(parentDepth);
  
  if (index >= parent.childCount - 1) return null; // No next sibling
  
  const nextNode = parent.child(index + 1);
  const nextPos = $from.after($from.depth);
  
  return { pos: nextPos, node: nextNode };
}

/**
 * Get visual column position (for preserving horizontal position)
 * 
 * Returns visual X-coordinate for vertical navigation.
 */
export function getVisualColumn(ctx: KeyboardContext): number {
  return ctx.visualX;
}

/**
 * Find the closest text position in a block to a given visual X-coordinate
 * 
 * This enables column-preserving vertical navigation.
 */
export function findClosestPosInBlock(
  editor: Editor,
  blockPos: number,
  visualX: number
): number {
  const { view, state } = editor;
  const { doc } = state;
  
  // Get the block node
  const $pos = doc.resolve(blockPos);
  const node = $pos.nodeAfter;
  
  if (!node) return blockPos + 1;
  
  // Start at the beginning of the block
  let bestPos = blockPos + 1;
  let bestDistance = Infinity;
  
  // Scan through the block content to find closest position
  const endPos = blockPos + node.nodeSize;
  for (let pos = blockPos + 1; pos < endPos; pos++) {
    try {
      const coords = view.coordsAtPos(pos);
      const distance = Math.abs(coords.left - visualX);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPos = pos;
      }
    } catch (e) {
      // Position might not be valid, skip it
      continue;
    }
  }
  
  return bestPos;
}

/**
 * Is cursor at the visual start of block?
 * 
 * INTERIM: Always returns true for collapsed selections to fully own vertical navigation.
 * This prevents ProseMirror's fallback behavior and ensures ArrowUp always fires.
 * 
 * TODO: Implement true visual-line detection for wrapped text.
 * Future: Only return true when cursor is on first visual line of block.
 */
export function isAtVisualStartOfBlock(ctx: KeyboardContext): boolean {
  // Interim: always intercept vertical navigation
  // This is correct until we implement visual-line detection
  return ctx.isEmpty;
}

/**
 * Is cursor at the visual end of block?
 * 
 * INTERIM: Always returns true for collapsed selections to fully own vertical navigation.
 * This prevents ProseMirror's fallback behavior and ensures ArrowDown always fires.
 * 
 * TODO: Implement true visual-line detection for wrapped text.
 * Future: Only return true when cursor is on last visual line of block.
 */
export function isAtVisualEndOfBlock(ctx: KeyboardContext): boolean {
  // Interim: always intercept vertical navigation
  // This is correct until we implement visual-line detection
  return ctx.isEmpty;
}

