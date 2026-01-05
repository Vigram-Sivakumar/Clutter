/**
 * ArrowUp Keymap
 * 
 * Handles up arrow navigation across blocks.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import { moveToPreviousLine } from '../rules/navigation';

// Create engine with ArrowUp rules
const arrowUpEngine = createKeyboardEngine([
  moveToPreviousLine,
]);

/**
 * Handle ArrowUp key press
 * 
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleArrowUp(editor: Editor): boolean {
  return arrowUpEngine.handle(editor, 'ArrowUp');
}

