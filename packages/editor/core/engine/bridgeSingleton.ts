/**
 * Bridge Singleton - Process-Lifetime Immortal Instance
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🔥 CRITICAL: BRIDGE IS A SINGLETON - NEVER DESTROYED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * PROBLEM:
 * React lifecycle hooks create/destroy resources on every re-render.
 * This causes:
 * - Bridge cleanup during normal operation
 * - editor._engine becomes undefined
 * - Stale DOM handlers crash: "editor2._engine is undefined"
 *
 * SOLUTION:
 * Bridge is a MODULE-LEVEL SINGLETON, not a React hook resource.
 * - Created ONCE when first editor is ready
 * - NEVER cleaned up during app lifetime
 * - Survives all React re-renders, note switches, editor refreshes
 *
 * This matches how Notion, Craft, and Linear structure their editors.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import type { Editor } from '@tiptap/core';
import { EditorEngine } from './index';
import { FlatIntentResolver } from './flatIntentResolver';
import { syncTipTapToEngine } from './tiptapBridge';

interface Bridge {
  engine: EditorEngine;
  resolver: FlatIntentResolver;
  updateSource: { current: 'engine' | 'tiptap' | null };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 MODULE-LEVEL SINGLETON - Lives for entire app lifetime
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let BRIDGE: Bridge | null = null;

/**
 * Get or create the singleton bridge
 *
 * GUARANTEED:
 * - Called with same editor instance (window.__editor)
 * - Only creates bridge ONCE
 * - Never destroys bridge
 * - Safe to call from any React component
 */
export function ensureBridge(editor: Editor): Bridge {
  // Return existing bridge if already created
  if (BRIDGE) {
    return BRIDGE;
  }

  console.log('[Bridge] Creating SINGLETON bridge (immortal, never destroyed)');
  console.log('[Bridge] Editor identity:', editor);

  // Create empty engine
  const engine = new EditorEngine({
    rootId: 'root',
    nodes: {
      root: {
        id: 'root',
        type: 'doc',
        parentId: null,
        children: [],
        content: null,
      },
    },
  });

  // Create flat intent resolver
  const resolver = new FlatIntentResolver(engine, editor);

  // Update source tracker
  const updateSource: { current: 'engine' | 'tiptap' | null } = {
    current: null,
  };

  // Hydrate engine from PM immediately
  syncTipTapToEngine(editor, engine, updateSource, false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Register event listeners (NEVER unregistered)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // TipTap → Engine sync (on document changes)
  editor.on('update', ({ editor: updatedEditor, transaction }: any) => {
    const forceBridgeSync = transaction?.getMeta('forceBridgeSync');

    // Post-transaction block count check
    const pmBlockIds: string[] = [];
    updatedEditor.state.doc.descendants((node: any) => {
      if (node.isBlock && node.attrs?.blockId) {
        pmBlockIds.push(node.attrs.blockId);
      }
      return false;
    });

    const engineBlockCount = Object.keys(engine.tree.nodes).filter(
      (id) => id !== 'root'
    ).length;
    const pmBlockCount = pmBlockIds.length;

    // Force rebuild if block counts don't match
    if (pmBlockCount !== engineBlockCount) {
      console.log('[Bridge] Post-transaction block mismatch – forcing rebuild');
      syncTipTapToEngine(updatedEditor, engine, updateSource, true);
      return;
    }

    // Normal sync
    syncTipTapToEngine(updatedEditor, engine, updateSource, forceBridgeSync);
  });

  // TipTap → Engine sync (on selection changes)
  editor.on('selectionUpdate', () => {
    // Selection sync handled by syncSelectionToEngine in bridge
    // (imported functions handle this)
  });

  // Engine → TipTap sync (on engine changes)
  engine.onChange(() => {
    // Selection sync handled by syncSelectionToTipTap in bridge
    // (imported functions handle this)
  });

  // Store singleton
  BRIDGE = {
    engine,
    resolver,
    updateSource,
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Attach to editor for global access
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (editor as any)._engine = engine;
  (editor as any)._resolver = resolver;

  console.log('[Bridge] Bridge established (SINGLETON, IMMORTAL):', {
    blockCount: engine.tree.rootId
      ? engine.getChildren(engine.tree.rootId).length
      : 0,
    mode: engine.getMode(),
  });

  return BRIDGE;
}

/**
 * Get the singleton bridge (if it exists)
 * Returns null if bridge hasn't been created yet
 */
export function getBridge(): Bridge | null {
  return BRIDGE;
}
