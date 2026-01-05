/**
 * ArrowDown Keymap
 * 
 * Handles down arrow navigation across blocks.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import { moveToNextLine } from '../rules/navigation';

// Create engine with ArrowDown rules
const arrowDownEngine = createKeyboardEngine([
  moveToNextLine,
]);

/**
 * Handle ArrowDown key press
 * 
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleArrowDown(editor: Editor): boolean {
  return arrowDownEngine.handle(editor, 'ArrowDown');
}

