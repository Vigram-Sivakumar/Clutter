/**
 * ArrowDown Keymap
 *
 * Handles down arrow navigation across blocks.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import { moveToNextLine } from '../rules/navigation';

// Create engine with ArrowDown rules
const arrowDownEngine = createKeyboardEngine([moveToNextLine]);

/**
 * Handle ArrowDown key press
 *
 * ✅ CORRECTED: Arrow keys must fall back to native when no rule handles them.
 * This restores natural cursor movement within and across blocks.
 *
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleArrowDown(editor: Editor): boolean {
  const result = arrowDownEngine.handle(editor, 'ArrowDown');
  // ✅ CRITICAL: Extract .handled boolean for TipTap
  // If false, TipTap will allow native cursor movement
  return result.handled;
}
