/**
 * Clipboard Manager
 * 
 * Sealed clipboard core for Ctrl+C / Ctrl+X / Ctrl+V
 * Engine-aware, deterministic, structurally correct.
 */

import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection, NodeSelection, AllSelection } from '@tiptap/pm/state';
import type { ClipboardPayloadV1, ClipboardState } from './types';
import type { BlockType } from '../engine/types';
import { createBlock } from '../createBlock';

/**
 * In-memory clipboard state
 * (Not persisted, lives only during editor session)
 */
let clipboardState: ClipboardState = {
  payload: null,
  lastOperation: null,
  lastOperationTime: null,
};

/**
 * 🔒 GUARD: Ensure we only copy structural attributes
 * Never copy: blockId, collapsed, selection metadata
 */
function getSafeAttrs(node: PMNode): Record<string, any> {
  const attrs = { ...node.attrs };
  
  // ❌ Delete identity and state
  delete attrs.blockId;
  delete attrs.collapsed;
  
  // ✅ Keep structural/content attributes
  // (listType, checked, headingLevel, type, style, etc.)
  
  return attrs;
}

/**
 * 🔒 GUARD: Validate block type is supported for clipboard
 */
function isCopyableBlockType(typeName: string): typeName is BlockType {
  const copyableTypes: BlockType[] = [
    'paragraph',
    'listBlock',
    'heading',
    'blockquote',
    'callout',
    'codeBlock',
    'horizontalRule',
  ];
  return copyableTypes.includes(typeName as BlockType);
}

/**
 * ✂️ COPY: Serialize selected blocks to internal clipboard
 * 
 * Algorithm:
 * 1. Resolve selection → blocks (ordered)
 * 2. Extract: type, content, indent, safe attrs
 * 3. Store payload in memory
 * 4. No document mutation
 * 
 * @returns true if copy succeeded
 */
export function copyToClipboard(state: EditorState): boolean {
  const { selection, doc } = state;
  
  // 🛡️ GUARD 1: Validate selection type
  if (
    !(selection instanceof TextSelection) &&
    !(selection instanceof NodeSelection) &&
    !(selection instanceof AllSelection)
  ) {
    console.warn('[Clipboard] Unsupported selection type for copy', {
      type: selection.constructor.name,
    });
    return false;
  }
  
  // Extract blocks from selection
  const blocks: ClipboardPayloadV1['blocks'] = [];
  
  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    // Only process top-level blocks (depth 1)
    const $pos = doc.resolve(pos);
    if ($pos.depth !== 1) return;
    
    // 🛡️ GUARD 2: Only copyable block types
    if (!isCopyableBlockType(node.type.name)) {
      console.warn('[Clipboard] Skipping non-copyable block', {
        type: node.type.name,
        pos,
      });
      return;
    }
    
    blocks.push({
      type: node.type.name as BlockType,
      content: node.content.size > 0 ? node : null,
      indent: node.attrs.indent ?? 0,
      attrs: getSafeAttrs(node),
    });
  });
  
  // 🛡️ GUARD 3: At least one block copied
  if (blocks.length === 0) {
    console.warn('[Clipboard] No blocks selected for copy');
    return false;
  }
  
  // Store in internal clipboard
  clipboardState = {
    payload: {
      version: 1,
      source: 'clutter-editor',
      blocks,
    },
    lastOperation: 'copy',
    lastOperationTime: Date.now(),
  };
  
  console.log('[Clipboard] Copied', {
    blockCount: blocks.length,
    types: blocks.map((b) => b.type),
    indents: blocks.map((b) => b.indent),
  });
  
  return true;
}

/**
 * ✂️ CUT: Copy + delete selected blocks
 * 
 * Algorithm:
 * 1. Perform copy
 * 2. Delete selected blocks
 * 3. Move cursor to safe position
 * 
 * @returns true if cut succeeded
 */
export function cutToClipboard(
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean {
  // Step 1: Copy
  const copied = copyToClipboard(state);
  if (!copied) return false;
  
  // Step 2: Delete (if dispatch available)
  if (!dispatch) {
    console.warn('[Clipboard] Cut requires dispatch to delete blocks');
    return false;
  }
  
  const { selection } = state;
  const tr = state.tr;
  
  // Delete selection range
  tr.deleteSelection();
  
  // 🛡️ GUARD: Ensure valid cursor position after delete
  const newPos = Math.min(tr.selection.from, tr.doc.content.size - 1);
  const $newPos = tr.doc.resolve(Math.max(1, newPos));
  tr.setSelection(TextSelection.near($newPos));
  
  tr.setMeta('addToHistory', true);
  tr.setMeta('closeHistory', true);
  
  dispatch(tr);
  
  clipboardState.lastOperation = 'cut';
  clipboardState.lastOperationTime = Date.now();
  
  console.log('[Clipboard] Cut complete', {
    deletedFrom: selection.from,
    deletedTo: selection.to,
    newCursorPos: tr.selection.from,
  });
  
  return true;
}

/**
 * 📋 PASTE (INTERNAL): Insert copied blocks at cursor
 * 
 * Algorithm:
 * 1. Determine insertion point
 * 2. Calculate base indent
 * 3. For each block:
 *    - Re-base indent: baseIndent + (block.indent - firstBlock.indent)
 *    - Create via createBlock()
 * 4. Cursor lands in first pasted block
 * 
 * @returns true if paste succeeded
 */
export function pasteFromClipboard(
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean {
  if (!dispatch) {
    console.warn('[Clipboard] Paste requires dispatch');
    return false;
  }
  
  // 🛡️ GUARD 1: Check internal clipboard has payload
  if (!clipboardState.payload || clipboardState.payload.blocks.length === 0) {
    console.warn('[Clipboard] No internal clipboard payload to paste');
    return false;
  }
  
  const { selection } = state;
  const tr = state.tr;
  const payload = clipboardState.payload;
  
  // Step 1: Determine insertion point
  // For now, insert after current block
  const $from = selection.$from;
  let insertPos = $from.after($from.depth);
  
  // 🛡️ GUARD 2: Validate insertion position
  if (insertPos <= 0 || insertPos > tr.doc.content.size) {
    console.error('[Clipboard] Invalid insertion position', {
      insertPos,
      docSize: tr.doc.content.size,
    });
    return false;
  }
  
  // Step 2: Determine base indent
  const currentBlock = $from.node($from.depth);
  const baseIndent = currentBlock?.attrs?.indent ?? 0;
  
  // Step 3: Calculate relative indent offset
  const firstBlockIndent = payload.blocks[0]?.indent ?? 0;
  const indentOffset = baseIndent - firstBlockIndent;
  
  console.log('[Clipboard] Paste setup', {
    insertPos,
    baseIndent,
    firstBlockIndent,
    indentOffset,
    blockCount: payload.blocks.length,
  });
  
  // Step 4: Insert each block
  let firstInsertedPos: number | null = null;
  
  for (let i = 0; i < payload.blocks.length; i++) {
    const block = payload.blocks[i];
    if (!block) continue;
    
    // Re-base indent
    const newIndent = Math.max(0, block.indent + indentOffset);
    
    // Create block via centralized function
    const node = createBlock(state, tr, {
      type: block.type,
      insertPos,
      indent: newIndent,
      attrs: block.attrs, // Safe attrs (no blockId)
      content: block.content?.content ?? null,
    });
    
    if (!node) {
      console.error('[Clipboard] Failed to create block during paste', {
        type: block.type,
        index: i,
      });
      continue;
    }
    
    // Track first inserted position for cursor
    if (firstInsertedPos === null) {
      firstInsertedPos = insertPos;
    }
    
    // Move insertion point forward
    insertPos += node.nodeSize;
  }
  
  // Step 5: Position cursor in first pasted block
  if (firstInsertedPos !== null) {
    const $insertPos = tr.doc.resolve(firstInsertedPos + 1);
    tr.setSelection(TextSelection.near($insertPos));
  }
  
  tr.setMeta('addToHistory', true);
  tr.setMeta('closeHistory', true);
  
  dispatch(tr);
  
  clipboardState.lastOperation = 'paste';
  clipboardState.lastOperationTime = Date.now();
  
  console.log('[Clipboard] Paste complete', {
    blocksInserted: payload.blocks.length,
    cursorPos: tr.selection.from,
  });
  
  return true;
}

/**
 * 🌍 PASTE (EXTERNAL): Insert plain text as paragraphs
 * 
 * For now: Split by \n\n, each chunk → paragraph
 * No markdown, no lists, no guessing (Step 3B territory)
 * 
 * @returns true if paste succeeded
 */
export function pasteExternalText(
  state: EditorState,
  text: string,
  dispatch?: (tr: Transaction) => void
): boolean {
  if (!dispatch) {
    console.warn('[Clipboard] External paste requires dispatch');
    return false;
  }
  
  // Split by double newline (paragraphs)
  const chunks = text.split('\n\n').filter((chunk) => chunk.trim().length > 0);
  
  if (chunks.length === 0) {
    console.warn('[Clipboard] No content in external paste');
    return false;
  }
  
  const { selection } = state;
  const tr = state.tr;
  const $from = selection.$from;
  
  // Determine insertion point and base indent
  let insertPos = $from.after($from.depth);
  const currentBlock = $from.node($from.depth);
  const baseIndent = currentBlock?.attrs?.indent ?? 0;
  
  // 🛡️ GUARD: Validate insertion position
  if (insertPos <= 0 || insertPos > tr.doc.content.size) {
    console.error('[Clipboard] Invalid insertion position for external paste', {
      insertPos,
      docSize: tr.doc.content.size,
    });
    return false;
  }
  
  console.log('[Clipboard] External paste', {
    chunks: chunks.length,
    insertPos,
    baseIndent,
  });
  
  // Insert each chunk as paragraph
  let firstInsertedPos: number | null = null;
  
  for (const chunk of chunks) {
    const textNode = state.schema.text(chunk.trim());
    
    const node = createBlock(state, tr, {
      type: 'paragraph',
      insertPos,
      indent: baseIndent,
      content: textNode ? state.schema.nodes.paragraph.create(null, textNode).content : null,
    });
    
    if (!node) {
      console.error('[Clipboard] Failed to create paragraph for external paste');
      continue;
    }
    
    if (firstInsertedPos === null) {
      firstInsertedPos = insertPos;
    }
    
    insertPos += node.nodeSize;
  }
  
  // Position cursor in first pasted block
  if (firstInsertedPos !== null) {
    const $insertPos = tr.doc.resolve(firstInsertedPos + 1);
    tr.setSelection(TextSelection.near($insertPos));
  }
  
  tr.setMeta('addToHistory', true);
  tr.setMeta('closeHistory', true);
  
  dispatch(tr);
  
  console.log('[Clipboard] External paste complete', {
    paragraphsInserted: chunks.length,
  });
  
  return true;
}

/**
 * Get current clipboard state (for debugging)
 */
export function getClipboardState(): ClipboardState {
  return clipboardState;
}

/**
 * Clear internal clipboard (for testing/reset)
 */
export function clearClipboard(): void {
  clipboardState = {
    payload: null,
    lastOperation: null,
    lastOperationTime: null,
  };
}
