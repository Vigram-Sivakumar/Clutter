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
 * Convert ProseMirror document to BlockTree
 *
 * PHASE 3: Now understands CONTAINER nodes (toggleBlock)
 *
 * Uses two-pass algorithm:
 * 1. Collect all blocks with their parentBlockId (from attrs OR container context)
 * 2. Build tree from those relationships
 *
 * CONTAINER SEMANTICS:
 * - Most blocks: hierarchy via parentBlockId attribute (flat structure)
 * - toggleBlock: hierarchy via DOM nesting (container structure)
 *   - toggleBlock > toggleContent > children have parentBlockId = toggleBlock.blockId
 *
 * This hybrid approach supports both legacy flat blocks and new container blocks.
 */
function proseMirrorDocToBlockTree(pmDoc: any): BlockTree {
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

  // PASS 1: Collect all blocks with their parentBlockId
  // PHASE 3: Use container stack for toggleBlock children
  const blockList: Array<{
    id: BlockId;
    type: string;
    parentBlockId: BlockId | null;
    content: any;
  }> = [];

  // Container stack: tracks current container block (toggleBlock)
  const containerStack: BlockId[] = [];

  pmDoc.descendants((node: any, _pos: number) => {
    // PHASE 3: Detect toggleBlock container
    if (node.type.name === 'toggleBlock' && node.attrs?.blockId) {
      // Register toggleBlock itself
      const toggleBlockId = node.attrs.blockId;
      const parentBlockId =
        node.attrs.parentBlockId || containerStack.at(-1) || null;

      blockList.push({
        id: toggleBlockId,
        type: node.type.name,
        parentBlockId,
        content: node.toJSON(),
      });

      console.log('[Bridge] Found block:', {
        type: node.type.name,
        blockId: toggleBlockId,
        parentBlockId: parentBlockId || 'root',
      });

      // Push onto container stack for children
      containerStack.push(toggleBlockId);

      // Traverse children manually
      node.forEach((child: any, _offset: number, _index: number) => {
        // Skip toggleHeaderNew (inline content, not a block)
        if (child.type.name === 'toggleHeaderNew') {
          return;
        }

        // Traverse toggleContent children
        if (child.type.name === 'toggleContent') {
          child.forEach((grandchild: any) => {
            if (grandchild.attrs?.blockId) {
              blockList.push({
                id: grandchild.attrs.blockId,
                type: grandchild.type.name,
                parentBlockId: toggleBlockId, // ← CONTAINER SEMANTICS
                content: grandchild.toJSON(),
              });

              console.log('[Bridge] Found block:', {
                type: grandchild.type.name,
                blockId: grandchild.attrs.blockId,
                parentBlockId: toggleBlockId,
              });
            }
          });
        }
      });

      // Pop container stack after processing children
      containerStack.pop();

      // Don't descend into toggleBlock via default traversal
      return false;
    }

    // Regular blocks: use attribute-based parentBlockId (legacy flat structure)
    if (node.attrs?.blockId) {
      const parentBlockId =
        node.attrs.parentBlockId || containerStack.at(-1) || null;

      blockList.push({
        id: node.attrs.blockId,
        type: node.type.name,
        parentBlockId,
        content: node.toJSON(),
      });

      console.log('[Bridge] Found block:', {
        type: node.type.name,
        blockId: node.attrs.blockId,
        parentBlockId: parentBlockId || 'root',
      });
    }

    return true; // Continue descending
  });

  // PASS 2: Build tree from parentBlockId attributes (not DOM structure!)
  for (const block of blockList) {
    const parentId = block.parentBlockId || rootId;

    nodes[block.id] = {
      id: block.id,
      type: block.type,
      parentId,
      children: [],
      content: block.content,
    };

    // Add to parent's children
    if (nodes[parentId]) {
      nodes[parentId].children.push(block.id);
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
 * BLOCK IDENTITY LAW:
 * - Engine is authoritative on block identity
 * - TipTap is authoritative on block existence
 * - Therefore: rebuild engine block index from TipTap after every change
 *
 * CRITICAL: We walk editor.state.doc directly, NOT editor.getJSON()
 * because getJSON() returns serialized data that may not match runtime state.
 *
 * This is NOT incremental. This is a full rebuild.
 * Performance is fine - trust > micro-optimization.
 * This is how Notion / Craft / Tana work.
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

  console.log('[Bridge] Syncing TipTap→Engine (full rebuild)');

  // Mark as TipTap update
  updateSource.current = 'tiptap';

  try {
    // CRITICAL: Walk the actual ProseMirror document, not JSON serialization
    const pmDoc = editor.state.doc;
    const newTree = proseMirrorDocToBlockTree(pmDoc);

    // Replace engine's tree entirely
    engine.tree = newTree;

    console.log('[Bridge] Engine block index rebuilt:', {
      blockCount: Object.keys(newTree.nodes).length - 1, // -1 for root
      blocks: Object.keys(newTree.nodes).filter((id) => id !== 'root'),
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

  // Initialize engine with current ProseMirror document
  const initialTree = proseMirrorDocToBlockTree(editor.state.doc);
  const engine = new EditorEngine(initialTree);
  const resolver = new IntentResolver(engine, editor); // Pass editor for PM sync

  // Update source tracker
  const updateSource: { current: UpdateSource } = { current: null };

  // TipTap → Engine sync (on document changes)
  const handleUpdate = ({ editor: updatedEditor }: any) => {
    syncTipTapToEngine(updatedEditor, engine, updateSource);
  };
  editor.on('update', handleUpdate);

  // TipTap → Engine sync (on selection changes)
  const handleSelectionUpdate = ({ editor: updatedEditor }: any) => {
    syncSelectionToEngine(updatedEditor, engine);
  };
  editor.on('selectionUpdate', handleSelectionUpdate);

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
    editor.off('update', handleUpdate);
    editor.off('selectionUpdate', handleSelectionUpdate);
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
