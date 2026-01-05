/**
 * Enter Keymap
 * 
 * Aggregates all Enter rules into a single handler.
 * This is the new way to handle Enter behavior.
 * 
 * Usage in TipTap extension:
 * ```ts
 * addKeyboardShortcuts() {
 *   return {
 *     Enter: () => handleEnter(this.editor),
 *   };
 * }
 * ```
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import {
  splitListItem,
  exitEmptyListInWrapper,
  outdentEmptyList,
  exitEmptyHeading,
  exitEmptyWrapper,
  createParagraphAfterHeading,
} from '../rules/enter';

// Create engine with all Enter rules
const enterEngine = createKeyboardEngine([
  splitListItem, // Priority 110 - split list items before exiting
  exitEmptyListInWrapper,
  outdentEmptyList,
  exitEmptyHeading,
  exitEmptyWrapper,
  createParagraphAfterHeading,
]);

/**
 * Handle Enter key press
 * 
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleEnter(editor: Editor): boolean {
  return enterEngine.handle(editor, 'Enter');
}

