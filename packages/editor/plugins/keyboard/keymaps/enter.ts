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
import type { KeyHandlingResult } from '../types/KeyHandlingResult';
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
 * OWNERSHIP CONTRACT:
 * - Returns KeyHandlingResult with explicit handled status
 * - Caller must check result.handled and prevent default if true
 *
 * @param editor - TipTap editor instance
 * @returns KeyHandlingResult indicating whether key was handled
 */
export function handleEnter(editor: Editor): KeyHandlingResult {
  // Get resolver from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;

  if (resolver) {
    // Set resolver if available
    enterEngine.setResolver(resolver);
  }

  return enterEngine.handle(editor, 'Enter');
}
