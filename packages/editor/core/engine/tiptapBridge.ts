/**
 * TipTap Bridge - Bidirectional sync between EditorEngine and TipTap
 *
 * OWNERSHIP RULES:
 * - Block structure → EditorEngine
 * - Block order → EditorEngine
 * - Selection (block-level) → EditorEngine
 * - Text content (inside block) → TipTap
 * - IME / composition → TipTap
 * - Cursor math (inside text) → TipTap
 * - Undo / redo → EditorEngine
 *
 * TipTap reflects. Engine decides.
 */

import { useEffect, useRef, useMemo } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorEngine, IntentResolver } from './index';
import type { BlockTree, BlockNode, BlockId } from './types';

/**
 * Update source tracker - prevents infinite loops
 */
type UpdateSource = 'engine' | 'tiptap' | null;

/**
 * Bridge state
 */
interface BridgeState {
  engine: EditorEngine;
  resolver: IntentResolver;
  updateSource: UpdateSource;
}

/**
 * Convert TipTap JSON to BlockTree
 *
 * This is the initial hydration only.
 * After this, we do incremental updates.
 */
function tiptapJsonToBlockTree(tiptapJson: any): BlockTree {
  const nodes: Record<BlockId, BlockNode> = {};
  const rootId = 'root';

  // Root document node
  nodes[rootId] = {
    id: rootId,
    type: 'doc',
    parentId: null,
    children: [],
    content: null,
  };

  // Convert TipTap blocks to engine blocks
  if (tiptapJson.content && Array.isArray(tiptapJson.content)) {
    for (const block of tiptapJson.content) {
      const blockId =
        block.attrs?.blockId || `block-${Date.now()}-${Math.random()}`;

      nodes[blockId] = {
        id: blockId,
        type: block.type,
        parentId: rootId,
        children: [],
        content: block, // Store full TipTap JSON for now
      };

      nodes[rootId].children.push(blockId);
    }
  }

  return {
    rootId,
    nodes,
  };
}

/**
 * Sync TipTap document changes to engine
 *
 * Only updates blocks that actually changed.
 */
function syncTipTapToEngine(
  editor: Editor,
  engine: EditorEngine,
  updateSource: { current: UpdateSource }
): void {
  // Skip if update originated from engine
  if (updateSource.current === 'engine') {
    console.log(
      '[Bridge] Skipping TipTap→Engine sync (originated from engine)'
    );
    return;
  }

  console.log('[Bridge] Syncing TipTap→Engine');

  // Mark as TipTap update
  updateSource.current = 'tiptap';

  try {
    const tiptapJson = editor.getJSON();

    // TODO: Implement incremental updates
    // For now, we just log that content changed
    // The engine.tree will be updated by commands

    console.log('[Bridge] TipTap content changed:', {
      blockCount: tiptapJson.content?.length || 0,
    });
  } finally {
    // Reset source after a tick
    setTimeout(() => {
      if (updateSource.current === 'tiptap') {
        updateSource.current = null;
      }
    }, 0);
  }
}

/**
 * Sync engine changes to TipTap
 *
 * Applies minimal transactions to TipTap.
 */
function syncEngineToTipTap(
  editor: Editor,
  engine: EditorEngine,
  updateSource: { current: UpdateSource }
): void {
  // Skip if update originated from TipTap
  if (updateSource.current === 'tiptap') {
    console.log(
      '[Bridge] Skipping Engine→TipTap sync (originated from TipTap)'
    );
    return;
  }

  console.log('[Bridge] Syncing Engine→TipTap');

  // Mark as engine update
  updateSource.current = 'engine';

  try {
    // TODO: Implement incremental updates
    // For now, commands will update TipTap directly
    // This is where we'll apply minimal transactions

    console.log('[Bridge] Engine state changed:', {
      mode: engine.getMode(),
      selection: engine.selection.kind,
    });
  } finally {
    // Reset source after a tick
    setTimeout(() => {
      if (updateSource.current === 'engine') {
        updateSource.current = null;
      }
    }, 0);
  }
}

/**
 * Sync TipTap selection to engine
 */
function syncSelectionToEngine(editor: Editor, engine: EditorEngine): void {
  const { selection } = editor.state;

  // Text selection
  if (selection.empty) {
    // Cursor position
    const $from = selection.$from;
    const blockDepth = $from.depth;

    if (blockDepth > 0) {
      const blockNode = $from.node(blockDepth);
      const blockId = blockNode.attrs?.blockId;

      if (blockId) {
        engine.cursor = {
          blockId,
          offset: selection.from - $from.start(blockDepth),
        };
        engine.selection = { kind: 'none' };
        engine.focus = { blockId };
      }
    }
  } else if (selection.constructor.name === '_TextSelection') {
    // Text range selection
    const $from = selection.$from;
    const blockDepth = $from.depth;

    if (blockDepth > 0) {
      const blockNode = $from.node(blockDepth);
      const blockId = blockNode.attrs?.blockId;

      if (blockId) {
        const blockStart = $from.start(blockDepth);
        engine.selection = {
          kind: 'text',
          blockId,
          from: selection.from - blockStart,
          to: selection.to - blockStart,
        };
        engine.focus = { blockId };
      }
    }
  } else if (selection.constructor.name === '_NodeSelection') {
    // Block selection
    const node = (selection as any).node;
    const blockId = node?.attrs?.blockId;

    if (blockId) {
      engine.selection = {
        kind: 'block',
        blockIds: [blockId],
      };
      engine.focus = { blockId };
      engine.cursor = null;
    }
  }
}

/**
 * Sync engine selection to TipTap
 */
function syncSelectionToTipTap(
  editor: Editor,
  engine: EditorEngine,
  updateSource: { current: UpdateSource }
): void {
  // Skip if update originated from TipTap
  if (updateSource.current === 'tiptap') {
    return;
  }

  const { selection } = engine;

  // Block selection → TipTap node selection
  if (selection.kind === 'block' && selection.blockIds.length > 0) {
    const blockId = selection.blockIds[0]; // TODO: Handle multi-block selection

    // Find block position in document
    const { doc } = editor.state;
    let blockPos: number | null = null;

    doc.descendants((node, pos) => {
      if (node.attrs?.blockId === blockId) {
        blockPos = pos;
        return false;
      }
      return true;
    });

    if (blockPos !== null) {
      // Create node selection
      const { NodeSelection } = require('@tiptap/pm/state');
      const tr = editor.state.tr.setSelection(
        NodeSelection.create(doc, blockPos)
      );
      editor.view.dispatch(tr);
    }
  }

  // TODO: Handle text selection sync if needed
}

/**
 * Create and manage the bridge between engine and TipTap
 */
function createBridge(editor: Editor): BridgeState {
  console.log('[Bridge] Creating TipTap ↔ Engine bridge');

  // Initialize engine with current TipTap content
  const initialTree = tiptapJsonToBlockTree(editor.getJSON());
  const engine = new EditorEngine(initialTree);
  const resolver = new IntentResolver(engine);

  // Update source tracker
  const updateSource: { current: UpdateSource } = { current: null };

  // TipTap → Engine sync (on document changes)
  const unsubscribeUpdate = editor.on('update', ({ editor: updatedEditor }) => {
    syncTipTapToEngine(updatedEditor, engine, updateSource);
  });

  // TipTap → Engine sync (on selection changes)
  const unsubscribeSelectionUpdate = editor.on(
    'selectionUpdate',
    ({ editor: updatedEditor }) => {
      syncSelectionToEngine(updatedEditor, engine);
    }
  );

  // Engine → TipTap sync (on engine changes)
  const unsubscribeEngine = engine.onChange(() => {
    syncEngineToTipTap(editor, engine, updateSource);
    syncSelectionToTipTap(editor, engine, updateSource);
  });

  // Initial selection sync
  syncSelectionToEngine(editor, engine);

  console.log('[Bridge] Bridge established:', {
    blockCount: engine.tree.rootId
      ? engine.getChildren(engine.tree.rootId).length
      : 0,
    mode: engine.getMode(),
  });

  // Cleanup function
  const cleanup = () => {
    console.log('[Bridge] Cleaning up bridge');
    unsubscribeUpdate();
    unsubscribeSelectionUpdate();
    unsubscribeEngine();
  };

  // Store cleanup for later
  (engine as any)._bridgeCleanup = cleanup;

  return {
    engine,
    resolver,
    updateSource: updateSource.current,
  };
}

/**
 * React hook to get EditorEngine + IntentResolver for a TipTap editor
 *
 * Usage:
 * ```tsx
 * const editor = useEditor({ ... });
 * const { engine, resolver } = useEditorEngine(editor);
 * ```
 */
export function useEditorEngine(editor: Editor | null): {
  engine: EditorEngine | null;
  resolver: IntentResolver | null;
} {
  // Store bridge state in ref (survives rerenders)
  const bridgeRef = useRef<BridgeState | null>(null);

  // Create bridge once when editor becomes available
  const bridge = useMemo(() => {
    if (!editor) {
      return null;
    }

    // Clean up previous bridge if it exists
    if (bridgeRef.current) {
      const prevEngine = bridgeRef.current.engine as any;
      if (prevEngine._bridgeCleanup) {
        prevEngine._bridgeCleanup();
      }
    }

    // Create new bridge
    const newBridge = createBridge(editor);
    bridgeRef.current = newBridge;

    return newBridge;
  }, [editor]); // Only recreate if editor instance changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bridgeRef.current) {
        const engine = bridgeRef.current.engine as any;
        if (engine._bridgeCleanup) {
          engine._bridgeCleanup();
        }
      }
    };
  }, []);

  if (!bridge) {
    return {
      engine: null,
      resolver: null,
    };
  }

  return {
    engine: bridge.engine,
    resolver: bridge.resolver,
  };
}

/**
 * Get the resolver for an editor (if bridge exists)
 *
 * This is useful for passing resolver to KeyboardEngine.
 */
export function getResolverForEditor(_editor: Editor): IntentResolver | null {
  // TODO: Store resolver in editor instance for retrieval
  return null;
}
