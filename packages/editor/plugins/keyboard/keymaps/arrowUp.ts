/**
 * ArrowUp Keymap
 *
 * Handles up arrow navigation across blocks.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import { moveToPreviousLine } from '../rules/navigation';

// Create engine with ArrowUp rules
const arrowUpEngine = createKeyboardEngine([moveToPreviousLine]);

/**
 * Handle ArrowUp key press
 *
 * ✅ CORRECTED: Arrow keys must fall back to native when no rule handles them.
 * This restores natural cursor movement within and across blocks.
 *
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleArrowUp(editor: Editor): boolean {
  const result = arrowUpEngine.handle(editor, 'ArrowUp');
  // ✅ CRITICAL: Extract .handled boolean for TipTap
  // If false, TipTap will allow native cursor movement
  return result.handled;
}
