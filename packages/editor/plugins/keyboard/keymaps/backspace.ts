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
import {
  deleteEmptyParagraph,
  outdentEmptyList,
  exitEmptyWrapper,
  mergeWithStructuralBlock,
} from '../rules/backspace';

// Rules for Backspace key
const backspaceRules = [
  deleteEmptyParagraph,
  outdentEmptyList,
  exitEmptyWrapper,
  mergeWithStructuralBlock,
];

// Create engine (will be initialized with resolver per-editor)
const backspaceEngine = createKeyboardEngine(backspaceRules);

/**
 * Handle Backspace key press
 *
 * @param editor - TipTap editor instance
 * @returns true if handled, false to allow default behavior
 */
export function handleBackspace(editor: Editor): boolean {
  // Get resolver from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;

  if (resolver) {
    // Set resolver if available
    backspaceEngine.setResolver(resolver);
  }

  return backspaceEngine.handle(editor, 'Backspace');
}
