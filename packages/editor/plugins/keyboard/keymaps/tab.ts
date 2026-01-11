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
import { syncTipTapToEngine } from '../../../core/engine/tiptapBridge';

const tabRules = [indentBlock, outdentBlock];

const tabEngine = createKeyboardEngine(tabRules);

/**
 * 🔒 INTENT BOUNDARY SYNC (Phase 2)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * INVARIANT: Engine must be synced from PM before resolving structural intents
 * 
 * Why this is needed:
 * - PM transactions complete before keyboard shortcuts fire
 * - Editor lifecycle hooks (on('update')) fire too late for intent resolution
 * - Structural intents (Tab, delete, etc.) need fresh Engine state
 * 
 * This is NOT a rebuild - it's an idempotent sync using the flat model.
 * This is the standard "intent boundary sync" pattern used by Notion/Craft/Tana.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
function ensureFreshEngine(
  editor: Editor,
  engine: any,
  source: 'keyboard' | 'command' | 'gesture' = 'keyboard'
): void {
  const updateSource = { current: null as any };
  syncTipTapToEngine(editor, engine, updateSource);
  console.log(`[Intent Boundary] Engine synced from PM (source: ${source})`);
}

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

  // 🔒 INTENT BOUNDARY SYNC - Ensure Engine is fresh before intent resolution
  if (engine && editor.state.doc) {
    ensureFreshEngine(editor, engine, 'keyboard');

    const pmBlockCount = countPMBlocks(editor.state.doc);
    const engineBlockCount = Object.keys(engine.tree.nodes).length - 1;

    console.log(
      '📋 [handleTab] PM blocks:',
      pmBlockCount,
      '| Engine blocks:',
      engineBlockCount
    );

    // After sync, counts MUST match - if not, we have a sync bug
    if (pmBlockCount !== engineBlockCount) {
      console.error('❌ [handleTab] ENGINE DESYNC AFTER SYNC — SYNC BUG');
      console.error('  PM blocks:', pmBlockCount);
      console.error('  Engine blocks:', engineBlockCount);
      console.error('  This should NEVER happen after ensureFreshEngine()');
      
      return {
        handled: true,
        reason: 'ENGINE_DESYNC_AFTER_SYNC',
      };
    }
  }

  // Pass modifier info through the context by storing it on the editor
  (editor as any)._shiftPressed = isShift;

  const result = tabEngine.handle(editor, 'Tab');
  console.log('📋 [handleTab] Result:', result);
  return result;
}

// Temporary helper: Count blocks in PM doc
function countPMBlocks(pmDoc: any): number {
  let count = 0;
  pmDoc.descendants((node: any) => {
    if (node.attrs?.blockId) count++;
  });
  return count;
}

/**
 * @deprecated DELETED - No longer needed (Phase 2 complete)
 * 
 * This function was a hack that rebuilt Engine from PM during user input.
 * It violated the flat model and caused selection corruption.
 * 
 * Replaced by: ensureFreshEngine() + syncTipTapToEngine()
 * Which properly syncs at the intent boundary using the flat model.
 * 
 * Kept as a tombstone to prevent regression.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function rebuildEngineFromPMDoc_DELETED(_pmDoc: any, _engine: any): void {
  // This function is intentionally empty (dead code tombstone)
  // See ensureFreshEngine() for the correct implementation
}
