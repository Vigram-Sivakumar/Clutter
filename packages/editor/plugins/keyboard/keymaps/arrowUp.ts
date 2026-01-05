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
 * Arrow keys are control keys. We always consume the event to prevent
 * ProseMirror fallback and ensure deterministic navigation via the rule engine.
 * 
 * @param editor - TipTap editor instance
 * @returns always true (event is consumed)
 */
export function handleArrowUp(editor: Editor): boolean {
  arrowUpEngine.handle(editor, 'ArrowUp');
  return true;
}

