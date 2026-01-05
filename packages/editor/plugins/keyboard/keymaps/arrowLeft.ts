/**
 * ArrowLeft Keymap
 * 
 * Handles left arrow navigation across blocks.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import { moveToPreviousBlock } from '../rules/navigation';

// Create engine with ArrowLeft rules
const arrowLeftEngine = createKeyboardEngine([
  moveToPreviousBlock,
]);

/**
 * Handle ArrowLeft key press
 * 
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleArrowLeft(editor: Editor): boolean {
  return arrowLeftEngine.handle(editor, 'ArrowLeft');
}

