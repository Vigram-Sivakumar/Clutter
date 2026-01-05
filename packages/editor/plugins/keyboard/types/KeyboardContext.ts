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
  readonly key: 'Enter' | 'Backspace' | 'Tab' | 'Delete';
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

