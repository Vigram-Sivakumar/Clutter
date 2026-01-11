/**
 * Backspace Keymap
 *
 * Aggregates all Backspace rules into a single handler.
 * This is the new way to handle Backspace behavior.
 *
 * Usage in TipTap extension:
 * ```ts
 * addKeyboardShortcuts() {
 *   return {
 *     Backspace: () => handleBackspace(this.editor),
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
// FLAT MODEL: Re-enable rules for proper empty list → paragraph flow
import {
  deleteEmptyParagraph,
  outdentEmptyList, // Converts empty list to paragraph (priority 105)
  // exitEmptyWrapper, // Still disabled
  mergeWithStructuralBlock,
} from '../rules/backspace';

// Rules for Backspace key (sorted by priority internally by KeyboardEngine)
const backspaceRules = [
  outdentEmptyList, // Priority 105 - convert empty list to paragraph first
  deleteEmptyParagraph, // Priority 100 - delete empty paragraph second
  mergeWithStructuralBlock, // Safety guard for structural blocks
];

// Create engine (will be initialized with resolver per-editor)
const backspaceEngine = createKeyboardEngine(backspaceRules);

/**
 * Handle Backspace key press
 *
 * OWNERSHIP CONTRACT:
 * - Returns KeyHandlingResult with explicit handled status
 * - Caller must check result.handled and prevent default if true
 *
 * @param editor - TipTap editor instance
 * @returns KeyHandlingResult indicating whether key was handled
 */
export function handleBackspace(editor: Editor): KeyHandlingResult {
  // Get resolver from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;

  if (resolver) {
    // Set resolver if available
    backspaceEngine.setResolver(resolver);
  }

  return backspaceEngine.handle(editor, 'Backspace');
}
