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
  exitEmptyBlockInToggle,
  splitListItem,
  exitEmptyListInWrapper,
  outdentEmptyList,
  exitEmptyList,
  exitEmptyHeading,
  exitEmptyWrapper,
  createParagraphAfterHeading,
} from '../rules/enter';

// Create engine with all Enter rules (ordered by priority)
const enterEngine = createKeyboardEngine([
  exitEmptyBlockInToggle, // Priority 115 - exit nested/toggle blocks FIRST
  splitListItem, // Priority 110 - split list items
  exitEmptyListInWrapper, // Priority 100
  outdentEmptyList, // Priority 90
  exitEmptyList, // Priority 85 - convert empty list at level 0 to paragraph
  exitEmptyHeading, // Priority 80
  exitEmptyWrapper, // Priority 70
  createParagraphAfterHeading, // Priority 60
]);

/**
 * Handle Enter key press
 *
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleEnter(editor: Editor): boolean {
  const { state } = editor;

  console.log('⌨️  [ENTER KEY PRESSED] ════════════════════════════════');
  console.log('📍 [Enter Handler] Starting Enter key handling', {
    from: state.selection.from,
    to: state.selection.to,
    parentType: state.selection.$from.parent.type.name,
    parentText: state.selection.$from.parent.textContent.substring(0, 50),
  });

  const handled = enterEngine.handle(editor, 'Enter');

  const newState = editor.state;
  console.log('✅ [Enter Handler] Enter key handling complete', {
    handled,
    from: newState.selection.from,
    to: newState.selection.to,
    parentType: newState.selection.$from.parent.type.name,
  });
  console.log('════════════════════════════════════════════════════════');

  return handled;
}
