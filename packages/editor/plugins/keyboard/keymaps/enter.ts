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
import type { IntentResolver } from '../../../core/engine';
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

// Rules for Enter key
const enterRules = [
  exitEmptyBlockInToggle, // Priority 115 - exit nested/toggle blocks FIRST
  splitListItem, // Priority 110 - split list items
  exitEmptyListInWrapper, // Priority 100
  outdentEmptyList, // Priority 90
  exitEmptyList, // Priority 85 - convert empty list at level 0 to paragraph
  exitEmptyHeading, // Priority 80
  exitEmptyWrapper, // Priority 70
  createParagraphAfterHeading, // Priority 60
];

// Create engine (will be initialized with resolver per-editor)
const enterEngine = createKeyboardEngine(enterRules);

/**
 * Handle Enter key press
 *
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleEnter(editor: Editor): boolean {
  // Get resolver from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;

  if (resolver) {
    // Set resolver if available
    enterEngine.setResolver(resolver);
  }

  const handled = enterEngine.handle(editor, 'Enter');
  return handled;
}
