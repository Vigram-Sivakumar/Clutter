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
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import type { IntentResolver } from '../../../core/engine';
import type { KeyHandlingResult } from '../types/KeyHandlingResult';
// PHASE 3.3.a: Most imports removed - rules disabled
import {
  // deleteEmptyParagraph, // DISABLED
  // outdentEmptyList, // DISABLED
  // exitEmptyWrapper, // DISABLED
  mergeWithStructuralBlock,
} from '../rules/backspace';

// Rules for Backspace key
// PHASE 3.3.a: Most rules DISABLED - let ProseMirror handle Backspace naturally
const backspaceRules = [
  // deleteEmptyParagraph, // DISABLED - PM handles naturally
  // outdentEmptyList, // DISABLED - PM handles naturally
  // exitEmptyWrapper, // DISABLED - PM handles naturally
  mergeWithStructuralBlock, // Keep as safety guard (noop when merging with structural blocks)
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
