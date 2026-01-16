/**
 * Tab Keymap - Structural indentation control
 *
 * Tab changes structure, never content.
 *
 * 🔒 INTENT BOUNDARY SYNC (Phase 2):
 * Before resolving any structural intent, Engine must be synced from PM.
 * This ensures Engine is never stale at the moment of intent resolution.
 *
 * Canonical Decision Tables:
 * - Tab → indent-block intent
 * - Shift+Tab → outdent-block intent
 *
 * All logic lives in rules and resolver.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import type { IntentResolver } from '../../../core/engine';
import { indentBlock, outdentBlock } from '../rules/tab';
import type { KeyHandlingResult } from '../types/KeyHandlingResult';

const tabRules = [indentBlock, outdentBlock];

const tabEngine = createKeyboardEngine(tabRules);

export function handleTab(
  editor: Editor,
  isShift: boolean = false
): KeyHandlingResult {
  console.log('📋 [handleTab] Called, isShift:', isShift);

  // Get resolver and engine from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;
  const engine = (editor as any)._engine;

  console.log('📋 [handleTab] Resolver:', resolver ? 'found' : 'NOT FOUND');

  // 🧭 TAB FLOW TRACE
  console.log('🧭 TAB FLOW', {
    isShift,
    selectedBlock: engine?.cursor?.blockId,
  });

  if (resolver) {
    tabEngine.setResolver(resolver);
  }

  // Pass modifier info through the context by storing it on the editor
  (editor as any)._shiftPressed = isShift;

  const result = tabEngine.handle(editor, 'Tab');
  console.log('📋 [handleTab] Result:', result);
  return result;
}

/**
 * @deprecated DELETED - No longer needed
 * 
 * This function was a hack that rebuilt Engine from PM during user input.
 * It violated the flat model and caused selection corruption.
 * 
 * Apple Notes architecture: ProseMirror is authoritative, no engine sync needed.
 * 
 * Kept as a tombstone to prevent regression.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function rebuildEngineFromPMDoc_DELETED(_pmDoc: any, _engine: any): void {
  // This function is intentionally empty (dead code tombstone)
}
