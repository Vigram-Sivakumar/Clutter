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
 * Arrow keys are control keys. We always consume the event to prevent
 * ProseMirror fallback and ensure deterministic navigation via the rule engine.
 * 
 * @param editor - TipTap editor instance
 * @returns always true (event is consumed)
 */
export function handleArrowDown(editor: Editor): boolean {
  arrowDownEngine.handle(editor, 'ArrowDown');
  return true;
}

