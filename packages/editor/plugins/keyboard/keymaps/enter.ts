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
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🔒 KEYBOARD INVARIANT (DO NOT VIOLATE)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * - Enter & Backspace are GLOBAL behaviors
 * - Block-specific rules may only run when block is NON-EMPTY
 * - Empty blocks MUST fall through to global rules
 * - One keypress = ONE history group
 * - Emptiness beats structure (always)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import type { IntentResolver } from '../../../core/engine';
import type { KeyHandlingResult } from '../types/KeyHandlingResult';
// FLAT TOGGLE FIX: Re-enable exit rules for empty list items
import {
  enterOnSelectedBlocks, // Priority 1000 - HIGHEST: ANY halo-selected blocks (single or multi) 🔒
  enterToggleCreatesChild, // Priority 120 - toggle creates child (not split)
  exitEmptyBlockInToggle, // Priority 115 - outdent empty indented blocks
  splitListItem,
  normalizeEmptyBlockOnEnter, // Priority 105 - UNIVERSAL: empty non-paragraph/list → paragraph below
  // exitEmptyListInWrapper, // Not needed for flat schema
  outdentEmptyList, // RE-ENABLED: Outdent empty nested lists
  exitEmptyList, // RE-ENABLED: Convert empty root lists to paragraph
  // exitEmptyHeading, // Let PM handle
  // exitEmptyWrapper, // Let PM handle
  // createParagraphAfterHeading, // Let PM handle
} from '../rules/enter';
import { enterEmptyBlockFallback } from '../rules/enter/enterEmptyBlockFallback'; // Priority -1000 - GLOBAL FALLBACK (ALWAYS HANDLES ENTER)

// Rules for Enter key
// FLAT TOGGLE FIX: Re-enabled exit rules for proper empty list handling
const enterRules = [
  enterOnSelectedBlocks, // Priority 1000 - HIGHEST: ANY halo-selected blocks (single or multi) 🔒
  enterToggleCreatesChild, // Priority 120 - toggle creates child before split
  exitEmptyBlockInToggle, // Priority 115 - outdent empty indented blocks
  splitListItem, // Priority 110 - split non-empty list items
  normalizeEmptyBlockOnEnter, // Priority 105 - UNIVERSAL: empty non-paragraph/list → paragraph below
  // exitEmptyListInWrapper, // Not needed - flat schema
  outdentEmptyList, // RE-ENABLED: Priority 95 - outdent empty nested lists
  exitEmptyList, // RE-ENABLED: Priority 90 - convert empty root lists to paragraph
  // exitEmptyHeading, // Let PM handle naturally
  // exitEmptyWrapper, // Let PM handle naturally
  // createParagraphAfterHeading, // Let PM handle naturally
  enterEmptyBlockFallback, // Priority -1000 - GLOBAL FALLBACK (ALWAYS HANDLES ENTER) 🔒
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
