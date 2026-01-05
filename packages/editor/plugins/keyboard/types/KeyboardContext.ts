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
  
  /** Key that triggered this (for context) */
  readonly key: 'Enter' | 'Backspace' | 'Tab' | 'Delete' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
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

