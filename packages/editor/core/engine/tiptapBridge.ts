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
  updateSource: { current: UpdateSource }
): void {
  // Skip if update originated from engine
  if (updateSource.current === 'engine') {
    console.log(
      '[Bridge] Skipping TipTap→Engine sync (originated from engine)'
    );
    return;
  }

  console.log('[Bridge] Syncing TipTap→Engine (flat model)');

  // Mark as TipTap update
  updateSource.current = 'tiptap';

  try {
    // 🔥 FLAT MODEL SYNC: Read blocks as ordered list
    const pmDoc = editor.state.doc;
    const blocks: Array<{
      id: BlockId;
      type: string;
      indent: number;
      content: any;
    }> = [];

    // Walk PM document and collect blocks (in document order)
    pmDoc.descendants((node: any) => {
      if (node.attrs?.blockId) {
        blocks.push({
          id: node.attrs.blockId,
          type: node.type.name,
          indent: node.attrs.indent ?? 0, // Read ONLY indent
          content: node.toJSON(),
        });
      }
      return true; // Continue descending
    });

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
      blocks: blocks.map((b) => `${b.id.slice(0, 8)}:indent=${b.indent}`),
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
  syncTipTapToEngine(editor, engine, updateSource);

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
