/**
 * TipTap Bridge - Unidirectional sync: PM → Engine
 *
 * 🔥 PHASE 2: ENGINE IS STATELESS MIRROR (CANONICAL MODEL)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OWNERSHIP RULES (LOCKED):
 * - Block existence → ProseMirror (authoritative)
 * - Block order → ProseMirror (authoritative)
 * - Engine → Stateless mirror (derived from PM)
 * - Sync direction → ONE WAY (PM → Engine)
 *
 * FLAT MODEL:
 * - Blocks are a flat ordered list
 * - indent is the ONLY structural attribute
 * - NO tree rebuilding
 * - NO parent inference
 * - NO level computation
 *
 * Text & Editing:
 * - Text content (inside block) → TipTap
 * - IME / composition → TipTap
 * - Cursor math (inside text) → TipTap
 *
 * Intent Resolution:
 * - Structural intents → FlatIntentResolver
 * - Undo / redo → ProseMirror history
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useEffect, useRef, useMemo } from 'react';
import type { Editor } from '@tiptap/core';
// NodeSelection preserved for future re-enablement of block selection sync
import { NodeSelection as _NodeSelection } from '@tiptap/pm/state';
import { EditorEngine } from './index';
import { FlatIntentResolver } from './flatIntentResolver';
import type { BlockTree, BlockNode, BlockId } from './types';

/**
 * Update source tracker - prevents infinite loops
 */
type UpdateSource = 'engine' | 'tiptap' | null;

/**
 * Track last synced PM blockIds to detect structural changes
 * This is more reliable than docChanged, which can be false even when structure changes
 */
let lastSyncedBlockIds: string[] = [];

/**
 * Bridge state (FLAT MODEL)
 */
interface BridgeState {
  engine: EditorEngine;
  resolver: FlatIntentResolver;
  updateSource: UpdateSource;
}

/**
 * @deprecated - OLD TREE MODEL (Phase 2: No longer used)
 *
 * This function reconstructs trees from parentBlockId, which violates the flat model.
 * Use syncTipTapToEngine instead, which reads only: blockId, type, indent.
 *
 * Kept for reference only - DO NOT USE.
 *
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
function _proseMirrorDocToBlockTree(pmDoc: any): BlockTree {
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

  // 🔑 PASS 3: CRITICAL FIX - Compute level from parent chain
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Without level, the Engine cannot reason about hierarchy.
  // Level MUST be derived from parent chain, not stored redundantly.
  //
  // This was the root cause of all outdent/indent corruption:
  // - level=undefined everywhere
  // - All level comparisons (prev.level >= current.level) failed
  // - Subtree detection broke
  // - Parent inference was impossible
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function computeLevel(blockId: BlockId): number {
    let level = 0;
    let current = nodes[blockId]?.parentId;

    while (current && current !== rootId) {
      level++;
      current = nodes[current]?.parentId;
    }

    return level;
  }

  // Apply level to all blocks
  for (const blockId in nodes) {
    if (blockId !== rootId) {
      (nodes[blockId] as any).level = computeLevel(blockId);
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
 * 🔥 PHASE 2: ENGINE IS STATELESS MIRROR OF PM
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * NEW OWNERSHIP MODEL:
 * - PM is authoritative on block existence and order
 * - Engine is a derived, stateless mirror
 * - Sync flows ONE WAY: PM → Engine
 *
 * WHAT WE READ FROM PM:
 * - blockId ✅
 * - type ✅
 * - indent ✅
 *
 * WHAT WE DO NOT READ:
 * - parentBlockId ❌ (old tree model)
 * - level ❌ (old tree model)
 * - children ❌ (no tree reconstruction)
 *
 * CRITICAL: We walk editor.state.doc directly, NOT editor.getJSON()
 * because getJSON() returns serialized data that may not match runtime state.
 *
 * This is NOT incremental. This is a full rebuild.
 * Performance is fine - correctness > micro-optimization.
 * This is how Notion / Craft / Tana work.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export function syncTipTapToEngine(
  editor: Editor,
  engine: EditorEngine,
  updateSource: { current: UpdateSource },
  forceBridgeSync: boolean = false
): void {
  // Skip if update originated from engine
  if (updateSource.current === 'engine') {
    console.log(
      '[Bridge] Skipping TipTap→Engine sync (originated from engine)'
    );
    return;
  }

  // 🔥 FLAT MODEL SYNC: Read blocks as ordered list
  const pmDoc = editor.state.doc;
  const blocks: Array<{
    id: BlockId;
    type: string;
    indent: number;
    content: any;
  }> = [];

  // Collect block IDs from PM document
  // 🔒 CRITICAL: Only collect BLOCK nodes, not inline/text/mark nodes
  const currentBlockIds: string[] = [];
  pmDoc.descendants((node: any) => {
    if (node.isBlock && node.attrs?.blockId) {
      currentBlockIds.push(node.attrs.blockId);
    }
    return false; // Do not descend into block children
  });

  // 🔒 INVARIANT: blockIds must be UNIQUE across the entire document
  // Duplicate blockIds indicate corruption (normalization replayed incorrectly, cloned nodes, etc.)
  const seenIds = new Set<string>();
  for (const id of currentBlockIds) {
    if (seenIds.has(id)) {
      console.error('[INVARIANT VIOLATION] Duplicate blockId detected:', {
        duplicateId: id,
        allBlockIds: currentBlockIds.map((bid) => bid.substring(0, 8)),
        pmBlockCount: currentBlockIds.length,
        uniqueCount: seenIds.size,
      });
      throw new Error(
        `[INVARIANT VIOLATION] Duplicate blockId detected: ${id.substring(0, 8)}... ` +
          `This indicates a critical bug in block creation/normalization logic.`
      );
    }
    seenIds.add(id);
  }

  // 🔒 FORCED SYNC (bypasses all checks)
  if (forceBridgeSync) {
    console.log('[Bridge] Forced sync requested – bypassing structure check');
  }
  // 🔒 FORCE SYNC DURING INITIALIZATION
  // Until editor is fully initialized, never trust "unchanged" checks
  // BlockIdGenerator and other initialization mutations happen asynchronously
  else if (!editor.isDestroyed && !editor.isInitialized) {
    console.log('[Bridge] Editor not initialized – forcing sync');
  } else {
    // 🔒 CRITICAL: Always rebuild if PM block count ≠ Engine block count
    // This is the PRIMARY structural invariant for a block-based editor
    const pmBlockCount = currentBlockIds.length;
    const engineBlockCount = Object.keys(engine.tree.nodes).filter(
      (id) => id !== 'root'
    ).length;

    if (pmBlockCount !== engineBlockCount) {
      console.log('[Bridge] Block count mismatch – forcing rebuild:', {
        pmBlockCount,
        engineBlockCount,
        pmBlockIds: currentBlockIds.map((id) => id.substring(0, 8)),
        engineBlockIds: Object.keys(engine.tree.nodes)
          .filter((id) => id !== 'root')
          .map((id) => id.substring(0, 8)),
      });
      // Fall through to rebuild
    } else {
      // 🔒 SECONDARY CHECK: Block IDs changed (reordering, deletion, etc.)
      const structureChanged = currentBlockIds.some(
        (id, i) => id !== lastSyncedBlockIds[i]
      );

      if (!structureChanged) {
        console.log('[Bridge] Block structure unchanged – skipping sync');
        return;
      }

      console.log('[Bridge] Block order changed – syncing Engine');
    }
  }

  // Now collect full block data for sync
  // 🔒 CRITICAL: Only collect BLOCK nodes, not inline/text/mark nodes
  pmDoc.descendants((node: any) => {
    if (node.isBlock && node.attrs?.blockId) {
      blocks.push({
        id: node.attrs.blockId,
        type: node.type.name,
        indent: node.attrs.indent ?? 0,
        content: node.toJSON(),
      });
    }
    return false; // Do not descend into block children
  });

  // Mark as TipTap update
  updateSource.current = 'tiptap';

  try {
    // 🔑 BUILD MINIMAL TREE FOR BACKWARD COMPATIBILITY
    // Engine code still expects a tree structure, but we derive it
    // from the flat list + indent, NOT from parentBlockId
    const nodes: Record<BlockId, BlockNode> = {};
    const rootId = 'root';

    nodes[rootId] = {
      id: rootId,
      type: 'doc',
      parentId: null,
      children: [],
      content: null,
    };

    // For now, all blocks are children of root (flat)
    // FlatIntentResolver doesn't use parent/child relationships
    for (const block of blocks) {
      nodes[block.id] = {
        id: block.id,
        type: block.type,
        parentId: rootId, // All blocks under root (flat)
        children: [], // No hierarchical children
        content: block.content,
      };

      nodes[rootId].children.push(block.id);
    }

    // Replace engine's tree
    engine.tree = {
      rootId,
      nodes,
    };

    console.log('[Bridge] Engine synced from PM:', {
      blockCount: blocks.length,
      blocks: blocks.map((b) => `${b.type}:${b.id.slice(0, 8)}`),
    });

    // 🔒 INVARIANT CHECK: PM blockIds should match Engine blockIds after sync
    if (process.env.NODE_ENV !== 'production') {
      const engineBlockIds = Object.keys(nodes).filter((id) => id !== 'root');
      for (const pmId of currentBlockIds) {
        if (!engineBlockIds.includes(pmId)) {
          console.error(
            '[Bridge][INVARIANT VIOLATION] PM blockId not in Engine:',
            {
              pmBlockId: pmId.substring(0, 8),
              pmBlockIds: currentBlockIds.map((id) => id.substring(0, 8)),
              engineBlockIds: engineBlockIds.map((id) => id.substring(0, 8)),
            }
          );
        }
      }
    }

    // 🔒 UPDATE: Save current blockIds as last synced state
    lastSyncedBlockIds = currentBlockIds;
  } finally {
    // Reset source using microtask (safer than setTimeout for PM transaction timing)
    queueMicrotask(() => {
      if (updateSource.current === 'tiptap') {
        updateSource.current = null;
      }
    });
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
    // Reset source using microtask (safer than setTimeout for PM transaction timing)
    queueMicrotask(() => {
      if (updateSource.current === 'engine') {
        updateSource.current = null;
      }
    });
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

  // 🛡️ BRIDGE FIX: Skip block selection sync after structural changes
  // During delete/move/promote operations, DOM is unstable and TipTap's
  // natural cursor placement is correct. Forcing selection restoration
  // causes NodeView lifecycle violations and crashes.
  //
  // TODO: Refine this to only skip when engine.lastOperation?.type === 'structural'
  // so legitimate block selections (click-to-select) still sync properly.
  if (selection.kind === 'block') {
    console.log(
      '[Bridge] Skipping block selection sync after structural change'
    );
    return;
  }

  // NOTE: Block selection sync code temporarily disabled by guard above.
  // Will be re-enabled once we track engine.lastOperation.type to distinguish
  // between structural mutations (delete/move) and user selections (click-to-select).
  //
  // Original code (preserved for future re-enablement):
  // if (selection.kind === 'block' && selection.blockIds.length > 0) {
  //   const blockId = selection.blockIds[0];
  //   const { doc } = editor.state;
  //   let blockPos: number | null = null;
  //   doc.descendants((node, pos) => {
  //     if (node.attrs?.blockId === blockId) {
  //       blockPos = pos;
  //       return false;
  //     }
  //     return true;
  //   });
  //   if (blockPos !== null) {
  //     const tr = editor.state.tr.setSelection(_NodeSelection.create(doc, blockPos));
  //     editor.view.dispatch(tr);
  //   }
  // }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎯 TEXT SELECTION SYNC: Cursor Stability After Structural Moves
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // After indent/outdent, the cursor MUST stay on the same logical block.
  //
  // GOLDEN RULE: Cursor identity beats cursor position.
  // - Cursor is attached to blockId, not DOM position
  // - After structural changes, find block by blockId and restore cursor
  // - Never jump to parent/child/sibling
  //
  // This ensures:
  // ✅ Tab → cursor stays in indented block
  // ✅ Shift+Tab → cursor stays in outdented block
  // ✅ No jarring cursor jumps
  // ✅ Matches Notion/Workflowy behavior
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (selection.kind === 'text' && engine.cursor) {
    const { blockId, offset } = engine.cursor;
    const { doc } = editor.state;

    // Find the block by blockId (identity, not position)
    let blockPos: number | null = null;
    let blockNode: any = null;
    doc.descendants((node, pos) => {
      if (node.attrs?.blockId === blockId) {
        blockPos = pos;
        blockNode = node;
        return false; // Stop traversal
      }
      return true;
    });

    if (blockPos !== null && blockNode) {
      // Calculate safe cursor position inside the block
      // Content starts at blockPos + 1 (after opening tag)
      const contentStart = blockPos + 1;
      const contentEnd = blockPos + blockNode.nodeSize - 1; // Before closing tag
      const textLength = contentEnd - contentStart;

      // Clamp offset to valid range
      const safeOffset = Math.min(Math.max(0, offset), textLength);
      const cursorPos = contentStart + safeOffset;

      // Only update if cursor position actually changed
      if (
        editor.state.selection.from !== cursorPos ||
        editor.state.selection.to !== cursorPos
      ) {
        try {
          editor.commands.setTextSelection(cursorPos);
          console.log(
            `[Bridge] Restored cursor to block ${blockId.slice(0, 8)} at offset ${safeOffset}`
          );
        } catch (err) {
          console.warn(
            `[Bridge] Failed to restore cursor to block ${blockId.slice(0, 8)}:`,
            err
          );
        }
      }
    }
  }
}

/**
 * Create and manage the bridge between engine and TipTap
 */
function createBridge(editor: Editor): BridgeState {
  console.log('[Bridge] Creating TipTap ↔ Engine bridge');
  console.log('[Bridge] Editor identity:', editor);

  // 🔥 PHASE 2: Initialize engine with empty tree, then hydrate from PM
  // Create empty engine first
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

  // 🔥 PHASE C: Use FlatIntentResolver (flat indent model)
  // Old parent-pointer model disabled
  const resolver = new FlatIntentResolver(engine, editor);

  // Update source tracker
  const updateSource: { current: UpdateSource } = { current: null };

  // 1️⃣ HYDRATE ENGINE FROM PM (immediately on bridge creation)
  syncTipTapToEngine(editor, engine, updateSource, false);

  // TipTap → Engine sync (on document changes)
  const handleUpdate = ({ editor: updatedEditor, transaction }: any) => {
    const forceBridgeSync = transaction?.getMeta('forceBridgeSync');

    // 🔒 POST-TRANSACTION INVARIANT CHECK
    // ALWAYS verify PM block count matches Engine block count after ANY transaction
    // This catches structural changes that don't set docChanged or other meta flags
    const pmBlockIds: string[] = [];
    updatedEditor.state.doc.descendants((node: any) => {
      // 🔒 CRITICAL: Only collect BLOCK nodes, not inline/text/mark nodes
      if (node.isBlock && node.attrs?.blockId) {
        pmBlockIds.push(node.attrs.blockId);
      }
      return false; // Do not descend into block children
    });

    const engineBlockCount = Object.keys(engine.tree.nodes).filter(
      (id) => id !== 'root'
    ).length;
    const pmBlockCount = pmBlockIds.length;

    console.log('[Bridge] Update event received:', {
      docChanged: transaction?.docChanged,
      meta: transaction?.getMeta('blockIdGenerator')
        ? 'BlockIdGenerator'
        : 'other',
      forceBridgeSync: forceBridgeSync ? 'YES' : 'no',
      pmBlockCount,
      engineBlockCount,
    });

    // 🔒 CRITICAL: If block counts don't match, FORCE rebuild immediately
    // This ensures Engine is never more than 0 transactions behind PM
    if (pmBlockCount !== engineBlockCount) {
      console.log('[Bridge] Post-transaction block mismatch – forcing rebuild');
      syncTipTapToEngine(updatedEditor, engine, updateSource, true);
      return;
    }

    // Normal sync path (with all guards)
    syncTipTapToEngine(updatedEditor, engine, updateSource, forceBridgeSync);
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
 * React hook to get EditorEngine + FlatIntentResolver for a TipTap editor
 *
 * Usage:
 * ```tsx
 * const editor = useEditor({ ... });
 * const { engine, resolver } = useEditorEngine(editor);
 * ```
 */
export function useEditorEngine(editor: Editor | null): {
  engine: EditorEngine | null;
  resolver: FlatIntentResolver | null;
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
export function getResolverForEditor(
  _editor: Editor
): FlatIntentResolver | null {
  // TODO: Store resolver in editor instance for retrieval
  return null;
}
