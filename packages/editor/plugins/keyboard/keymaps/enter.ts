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
// 🔒 STRUCTURAL ENTER: All Enter operations delegate to performStructuralEnter
import {
  enterOnSelectedBlocks, // Priority 1000 - HIGHEST: ANY halo-selected blocks (single or multi) 🔒
  enterToggleCreatesChild, // Priority 120 - toggle creates child (not split)
  exitEmptyBlockInToggle, // Priority 115 - outdent empty indented blocks
  outdentEmptyList, // Priority 90 - outdent empty nested lists
  exitEmptyList, // Priority 85 - convert empty root lists to paragraph
  enterEmptyBlockFallback, // Priority -1000 - GLOBAL FALLBACK (delegates to authority)
} from '../rules/enter';

// Rules for Enter key
// 🔒 STRUCTURAL ENTER: All rules delegate to performStructuralEnter authority
const enterRules = [
  enterOnSelectedBlocks, // Priority 1000 - HIGHEST: ANY halo-selected blocks (single or multi) 🔒
  enterToggleCreatesChild, // Priority 120 - toggle creates child before split
  exitEmptyBlockInToggle, // Priority 115 - outdent empty indented blocks
  outdentEmptyList, // Priority 90 - outdent empty nested lists
  exitEmptyList, // Priority 85 - convert empty root lists to paragraph
  enterEmptyBlockFallback, // Priority -1000 - GLOBAL FALLBACK (delegates to authority) 🔒
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
