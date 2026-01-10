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
// PHASE 3.3.a: Most imports removed - rules disabled
import {
  // exitEmptyBlockInToggle, // DISABLED
  splitListItem,
  // exitEmptyListInWrapper, // DISABLED
  // outdentEmptyList, // DISABLED
  // exitEmptyList, // DISABLED
  // exitEmptyHeading, // DISABLED
  // exitEmptyWrapper, // DISABLED
  // createParagraphAfterHeading, // DISABLED
} from '../rules/enter';

// Rules for Enter key
// PHASE 3.3.a: Most rules DISABLED - let ProseMirror handle Enter naturally
const enterRules = [
  // exitEmptyBlockInToggle, // DISABLED - PM handles container exit naturally
  splitListItem, // Priority 110 - split list items (keep for now)
  // exitEmptyListInWrapper, // DISABLED - PM handles naturally
  // outdentEmptyList, // DISABLED - PM handles naturally
  // exitEmptyList, // DISABLED - PM handles naturally
  // exitEmptyHeading, // DISABLED - PM handles naturally
  // exitEmptyWrapper, // DISABLED - PM handles naturally
  // createParagraphAfterHeading, // DISABLED - PM handles naturally
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
