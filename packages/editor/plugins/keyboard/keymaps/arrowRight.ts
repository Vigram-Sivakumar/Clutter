/**
 * ArrowRight Keymap
 * 
 * Handles right arrow navigation across blocks.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import { moveToNextBlock } from '../rules/navigation';

// Create engine with ArrowRight rules
const arrowRightEngine = createKeyboardEngine([
  moveToNextBlock,
]);

/**
 * Handle ArrowRight key press
 * 
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleArrowRight(editor: Editor): boolean {
  return arrowRightEngine.handle(editor, 'ArrowRight');
}

