/**
 * Backspace Keymap
 * 
 * Aggregates all Backspace rules into a single handler.
 * This is the new way to handle Backspace behavior.
 * 
 * Usage in TipTap extension:
 * ```ts
 * addKeyboardShortcuts() {
 *   return {
 *     Backspace: () => handleBackspace(this.editor),
 *   };
 * }
 * ```
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import {
  deleteEmptyParagraph,
  outdentEmptyList,
  exitEmptyWrapper,
  mergeWithStructuralBlock,
} from '../rules/backspace';

// Create engine with all Backspace rules
const backspaceEngine = createKeyboardEngine([
  deleteEmptyParagraph,
  outdentEmptyList,
  exitEmptyWrapper,
  mergeWithStructuralBlock,
]);

/**
 * Handle Backspace key press
 * 
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleBackspace(editor: Editor): boolean {
  return backspaceEngine.handle(editor, 'Backspace');
}

