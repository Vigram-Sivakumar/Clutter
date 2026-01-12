// packages/editor/core/structuralEnter/performStructuralEnter.ts

import type { Editor } from '@tiptap/core';
import { createBlock } from '../createBlock';
import { resolveStructuralEnter } from './cursorLaw';
import type {
  EnterContext,
  StructuralEnterSource,
} from './types';

/**
 * SINGLE AUTHORITY FOR ENTER
 *
 * - Creates structure explicitly
 * - Generates fresh blockIds
 * - Applies exactly one transaction
 * - Places cursor exactly once
 * 
 * 🔒 BLOCK IDENTITY LAW:
 * - Generates new blockId ONCE for the new block
 * - Passes it explicitly to createBlock()
 * - PM schema does NOT regenerate it (schemas now have default: null)
 * - Bridge mirrors PM → Engine without modification
 */
export function performStructuralEnter({
  editor,
  source,
}: {
  editor: Editor;
  source: StructuralEnterSource;
}): boolean {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Keyboard] Editor identity:', editor);
  }

  const engine = (editor as any)._engine;

  if (!engine) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StructuralEnter] Engine not attached (consumed anyway)');
    }
    return true; // ✅ Consume Enter - never allow PM to handle it
  }

  if (!engine.tree || !engine.tree.nodes) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StructuralEnter] Engine tree not initialized (consumed anyway)');
    }
    return true; // ✅ Consume Enter
  }

  // 🔒 GUARD: Engine must have blocks before structural operations
  const engineBlockCount = Object.keys(engine.tree.nodes).filter(id => id !== 'root').length;
  if (engineBlockCount === 0) {
    console.warn('[StructuralEnter] Engine not ready – skipping');
    return true; // ✅ Consume but defer
  }

  const { state, view } = editor;
  const { selection } = state;

  if (!selection.empty) {
    console.warn('[StructuralEnter] Non-empty selection, skipping');
    return true; // ✅ Consume anyway
  }

  // Get current block from PM selection
  const { $from } = selection;
  const blockNode = $from.node($from.depth);
  
  if (!blockNode || !blockNode.attrs?.blockId) {
    console.warn('[StructuralEnter] Current block not found');
    return true; // ✅ Consume anyway
  }

  const blockId = blockNode.attrs.blockId;
  
  // 🔍 DIAGNOSTIC: Show what PM has vs what Engine has
  if (process.env.NODE_ENV !== 'production') {
    // Get ALL blockIds from PM document
    // 🔒 CRITICAL: Only collect BLOCK nodes, not inline/text/mark nodes
    const pmBlockIds: string[] = [];
    editor.state.doc.descendants((node: any) => {
      if (node.isBlock && node.attrs?.blockId) {
        pmBlockIds.push(node.attrs.blockId);
      }
      return false; // Do not descend into block children
    });
    
    const engineBlockIds = Object.keys(engine.tree.nodes).filter(id => id !== 'root');
    
    console.log('[StructuralEnter] DIAGNOSTIC:', {
      cursorInBlock: blockId.substring(0, 8),
      pmBlockIds: pmBlockIds.map(id => id.substring(0, 8)),
      engineBlockIds: engineBlockIds.map(id => id.substring(0, 8)),
      match: engineBlockIds.includes(blockId) ? '✅' : '❌ MISMATCH'
    });
    
    // 🔒 SANITY ASSERTION: PM and Engine must have same block count
    if (pmBlockIds.length !== engineBlockIds.length) {
      console.warn('[Invariant] PM/Engine block count mismatch:', {
        pmCount: pmBlockIds.length,
        engineCount: engineBlockIds.length,
        pmBlockIds: pmBlockIds.map(id => id.substring(0, 8)),
        engineBlockIds: engineBlockIds.map(id => id.substring(0, 8)),
      });
    }
  }
  
  // 🔒 GUARD: Cursor block must exist in Engine (PM-Engine consistency)
  const block = engine.getBlock(blockId);

  if (!block) {
    console.warn('[StructuralEnter] Cursor block not in engine – deferring');
    console.warn('[StructuralEnter] This means Bridge has not synced yet. Operation will succeed on next keypress.');
    return true; // ✅ Consume but defer - let Bridge finish syncing
  }

  // Calculate cursor context
  const cursorOffset = $from.parentOffset;
  const textLength = blockNode.textContent.length;
  const currentBlockType = blockNode.type.name;

  // 🔒 CHILD-FIRST INSERTION LAW
  // Determine if this block can have children (hierarchy-aware blocks)
  // Currently disabled for all blocks - enable when implementing toggles/containers
  // 
  // Future blocks that should return true:
  // - toggleHeader (toggle block header)
  // - containerBlock (generic container)
  // - collapsibleSection (collapsible sections)
  const canHaveChildren = false; // TODO: Implement toggle blocks

  const context: EnterContext = {
    cursorOffset,
    textLength,
    isEmpty: textLength === 0,
    atStart: cursorOffset === 0,
    atEnd: cursorOffset === textLength,
    canHaveChildren,
    blockType: currentBlockType,
  };

  // 🧠 Decide WHAT Enter means (pure logic)
  const decision = resolveStructuralEnter(context);

  // 🔒 BLOCK TYPE INHERITANCE LAW
  // Enter creates a sibling of the SAME block type, except:
  // - Headings downgrade to paragraph
  // - Children of containers may have different rules (future)
  const nextBlockType = currentBlockType === 'heading' ? 'paragraph' : currentBlockType;

  // 🔒 LIST TYPE INHERITANCE LAW
  // For listBlocks, preserve the listType attribute (bullet, numbered, task)
  const inheritedAttrs: Record<string, any> = {};
  if (currentBlockType === 'listBlock' && blockNode.attrs.listType) {
    inheritedAttrs.listType = blockNode.attrs.listType;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[StructuralEnter] Insertion context:', {
      blockType: currentBlockType,
      canHaveChildren,
      intent: decision.intent.kind,
      nextBlockType,
      listType: inheritedAttrs.listType || 'N/A',
    });
  }

  // 🧱 Execute structure explicitly via createBlock()
  const newBlockId = crypto.randomUUID();

  // Find current block position in PM document
  let currentBlockPos: number | null = null;
  state.doc.descendants((node, pos) => {
    if (node.attrs?.blockId === blockId) {
      currentBlockPos = pos;
      return false;
    }
    return true;
  });

  if (currentBlockPos === null) {
    console.error('[StructuralEnter] Could not find block position');
    return true;
  }

  const tr = state.tr;

  // Execute the structural change
  switch (decision.intent.kind) {
    case 'create-sibling-above': {
      createBlock(state, tr, {
        type: nextBlockType,
        blockId: newBlockId,
        insertPos: currentBlockPos,
        indent: block.indent,
        attrs: inheritedAttrs, // 🔒 Preserve listType, etc.
      });
      break;
    }

    case 'create-sibling-below': {
      const insertPos = currentBlockPos + blockNode.nodeSize;
      createBlock(state, tr, {
        type: nextBlockType,
        blockId: newBlockId,
        insertPos,
        indent: block.indent,
        attrs: inheritedAttrs, // 🔒 Preserve listType, etc.
      });
      break;
    }

    case 'split-block': {
      // Calculate positions for split
      const contentStart = currentBlockPos + 1;
      const splitAt = contentStart + cursorOffset;
      const contentEnd = currentBlockPos + blockNode.nodeSize - 1;

      // Extract content after cursor
      const afterContent = tr.doc.slice(splitAt, contentEnd).content;

      // Delete content after cursor from current block
      tr.delete(splitAt, contentEnd);

      // Insert new block with the extracted content
      const insertPos = currentBlockPos + blockNode.nodeSize - (contentEnd - splitAt);
      createBlock(state, tr, {
        type: nextBlockType,
        blockId: newBlockId,
        insertPos,
        indent: block.indent,
        content: afterContent,
        attrs: inheritedAttrs, // 🔒 Preserve listType, etc.
      });
      break;
    }

    case 'create-child': {
      // 🔒 CHILD-FIRST INSERTION: Create a child block inside the current container
      // This maintains hierarchy: User stays "inside" the container block
      // Currently disabled (canHaveChildren = false), ready for toggle/container blocks
      const insertPos = currentBlockPos + blockNode.nodeSize;
      createBlock(state, tr, {
        type: 'paragraph', // Children default to paragraph (can be changed by user)
        blockId: newBlockId,
        insertPos,
        indent: block.indent + 1, // Child is one level deeper
        attrs: {}, // Children don't inherit parent attrs (except indent)
      });
      break;
    }

    case 'noop':
    default:
      return true; // ✅ Consume but do nothing
  }

  // Apply the transaction (creates the block in PM)
  tr.setMeta('addToHistory', true);
  view.dispatch(tr);

  // 🎯 Cursor placement (authoritative)
  // Place cursor at start of newly created block
  requestAnimationFrame(() => {
    const { state: newState } = editor;
    let targetPos: number | null = null;

    newState.doc.descendants((node, pos) => {
      if (node.attrs?.blockId === newBlockId) {
        targetPos = pos + 1; // Inside the block's content
        return false;
      }
      return true;
    });

    if (targetPos !== null) {
      const tr = newState.tr;
      tr.setSelection(
        newState.selection.constructor.near(newState.doc.resolve(targetPos))
      );
      editor.view.dispatch(tr);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[StructuralEnter]', {
      source,
      intent: decision.intent.kind,
      newBlockId: newBlockId.substring(0, 8),
    });

    // 🛡️ DEV INVARIANT: Check for duplicate blockIds
    // If this fires, Enter created a duplicate identity (should never happen)
    requestAnimationFrame(() => {
      const engine = (editor as any)._engine;
      if (engine && engine.tree && engine.tree.nodes) {
        const ids = Object.keys(engine.tree.nodes).filter(id => id !== 'root');
        const uniqueIds = new Set(ids);
        
        if (uniqueIds.size !== ids.length) {
          const duplicates = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
          console.error('[Invariant] Duplicate blockId detected after Enter', {
            duplicates: duplicates.map((id: string) => id.substring(0, 8)),
            totalBlocks: ids.length,
            uniqueBlocks: uniqueIds.size,
          });
        }
      }
    });
  }

  return true;
}
