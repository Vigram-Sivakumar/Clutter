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
 * 🔧 PHASE 2: Resolve blocks from TextSelection
 * 
 * TextSelection can span text inside blocks, but we always copy WHOLE blocks.
 * This derives the owning blocks from the text selection range.
 */
function resolveBlocksFromSelection(
  doc: PMNode,
  from: number,
  to: number
): PMNode[] {
  const blocks: PMNode[] = [];
  const seen = new Set<number>();
  
  doc.nodesBetween(from, to, (node, pos) => {
    // Only process top-level blocks (depth 1)
    const $pos = doc.resolve(pos);
    if ($pos.depth !== 1) return;
    
    // Skip if already seen (nodesBetween can visit same node multiple times)
    if (seen.has(pos)) return;
    seen.add(pos);
    
    // 🛡️ GUARD: Only copyable block types
    if (!isCopyableBlockType(node.type.name)) {
      console.warn('[Clipboard] Skipping non-copyable block', {
        type: node.type.name,
        pos,
      });
      return;
    }
    
    blocks.push(node);
  });
  
  return blocks;
}

/**
 * ✂️ COPY: Serialize selected blocks to internal clipboard
 * 
 * 🎯 Step 3B.2 Phase 2: TextSelection support
 * 
 * Algorithm:
 * 1. Resolve selection → derive owning blocks
 * 2. Extract: type, content, indent, safe attrs
 * 3. Store payload in memory
 * 4. No document mutation
 * 
 * TextSelection copies WHOLE blocks (not inline text fragments).
 * This matches Craft/Workflowy behavior.
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
  
  // 🎯 Phase 2: Derive blocks from selection (handles TextSelection)
  const selectedBlocks = resolveBlocksFromSelection(doc, selection.from, selection.to);
  
  // 🛡️ GUARD 2: At least one block resolved
  if (selectedBlocks.length === 0) {
    console.warn('[Clipboard] No blocks resolved from selection');
    return false;
  }
  
  // Serialize blocks to clipboard payload
  const blocks: ClipboardPayloadV1['blocks'] = selectedBlocks.map((node) => ({
    type: node.type.name as BlockType,
    content: node.content.size > 0 ? node : null,
    indent: node.attrs.indent ?? 0,
    attrs: getSafeAttrs(node),
  }));
  
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
    selectionType: selection.constructor.name,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 STEP 3B.2: PASTE INTENT ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Deterministic paste behavior based on cursor position and content.
// Every paste scenario maps to exactly one intent.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Paste intent classification
 * 
 * Determines HOW to paste based on:
 * - Selection type (NodeSelection vs TextSelection)
 * - Cursor position (start/mid/end of block)
 * - Block state (empty vs non-empty)
 * - Paste content (single para vs multiple blocks)
 */
enum PasteIntent {
  /** Block is selected (NodeSelection/halo) → replace it */
  REPLACE_BLOCK = 'replace',
  
  /** Cursor mid-block → split and insert between */
  SPLIT_BLOCK = 'split',
  
  /** Cursor at end of non-empty block, single para → append inline */
  APPEND_TO_BLOCK = 'append',
  
  /** Cursor at boundary or end with multiple blocks → insert after */
  INSERT_AFTER = 'insert_after',
}

/**
 * 🔍 LAW 1: Detect paste intent from selection and content
 * 
 * Deterministic: Given same selection + content, always returns same intent.
 * No heuristics, no magic.
 */
function detectPasteIntent(
  state: EditorState,
  payload: ClipboardPayloadV1
): PasteIntent {
  const { selection } = state;
  
  // ✅ INTENT 1: Block selected (halo) → Replace
  if (selection instanceof NodeSelection) {
    return PasteIntent.REPLACE_BLOCK;
  }
  
  // All other cases use TextSelection
  if (!(selection instanceof TextSelection)) {
    // Fallback for unexpected selection types
    console.warn('[Paste] Unexpected selection type, defaulting to INSERT_AFTER', {
      type: selection.constructor.name,
    });
    return PasteIntent.INSERT_AFTER;
  }
  
  const { $from } = selection;
  const block = $from.node($from.depth);
  const cursorOffset = $from.parentOffset;
  const blockContentSize = block.content.size;
  
  // Detect position in block
  const atStart = cursorOffset === 0;
  const atEnd = cursorOffset === blockContentSize;
  const midBlock = !atStart && !atEnd;
  
  // Detect block state
  const isEmpty = blockContentSize === 0;
  
  // Detect paste content
  const isSingleParagraph = 
    payload.blocks.length === 1 && 
    payload.blocks[0]?.type === 'paragraph';
  
  console.log('[Paste] Intent detection', {
    cursorOffset,
    blockContentSize,
    atStart,
    atEnd,
    midBlock,
    isEmpty,
    isSingleParagraph,
    pasteBlockCount: payload.blocks.length,
  });
  
  // ✅ INTENT 2: Mid-block → Split
  if (midBlock) {
    return PasteIntent.SPLIT_BLOCK;
  }
  
  // ✅ INTENT 3: At end of non-empty block, single para → Append inline
  if (atEnd && !isEmpty && isSingleParagraph) {
    return PasteIntent.APPEND_TO_BLOCK;
  }
  
  // ✅ INTENT 4: All other cases → Insert after
  // - At start of block
  // - At end of empty block
  // - At end with multiple blocks
  return PasteIntent.INSERT_AFTER;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 PASTE INTENT HANDLERS (Step 3B.2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 🔹 LAW 2: REPLACE_BLOCK - Delete selected block(s), insert pasted blocks
 * 
 * Behavior:
 * 1. Delete selected block(s)
 * 2. Insert pasted blocks at same position
 * 3. Use deleted block's indent as base indent
 * 4. Cursor lands in first pasted block, offset 0
 */
function handleReplaceBlock(
  state: EditorState,
  tr: Transaction,
  payload: ClipboardPayloadV1
): boolean {
  const { selection } = state;
  
  if (!(selection instanceof NodeSelection)) {
    console.error('[Paste] REPLACE_BLOCK requires NodeSelection');
    return false;
  }
  
  const { node: selectedNode, $from } = selection;
  const selectedBlockPos = $from.before($from.depth);
  const baseIndent = selectedNode.attrs?.indent ?? 0;
  
  console.log('[Paste] REPLACE_BLOCK', {
    selectedBlockPos,
    selectedBlockType: selectedNode.type.name,
    baseIndent,
    pasteBlockCount: payload.blocks.length,
  });
  
  // Delete selected block
  tr.delete(selectedBlockPos, selectedBlockPos + selectedNode.nodeSize);
  
  // Insert pasted blocks at same position
  let insertPos = selectedBlockPos;
  const firstBlockIndent = payload.blocks[0]?.indent ?? 0;
  const indentOffset = baseIndent - firstBlockIndent;
  
  for (const block of payload.blocks) {
    const newIndent = Math.max(0, block.indent + indentOffset);
    
    const node = createBlock(state, tr, {
      type: block.type,
      insertPos,
      indent: newIndent,
      attrs: block.attrs,
      content: block.content?.content ?? null,
    });
    
    if (!node) {
      console.error('[Paste] Failed to create block in REPLACE_BLOCK');
      continue;
    }
    
    insertPos += node.nodeSize;
  }
  
  // Cursor lands in first pasted block, offset 0
  const $firstBlock = tr.doc.resolve(selectedBlockPos + 1);
  tr.setSelection(TextSelection.create(tr.doc, $firstBlock.pos));
  
  console.log('[Paste] REPLACE_BLOCK complete', {
    cursorPos: tr.selection.from,
  });
  
  return true;
}

/**
 * 🔹 LAW 5: INSERT_AFTER - Insert pasted blocks after current block
 * 
 * Behavior:
 * 1. Insert pasted blocks after current block
 * 2. Base indent = current block indent
 * 3. Cursor lands in first pasted block, offset 0
 * 
 * Used for:
 * - Cursor at start of block
 * - Cursor at end of empty block
 * - Cursor at end with multiple blocks to paste
 */
function handleInsertAfter(
  state: EditorState,
  tr: Transaction,
  payload: ClipboardPayloadV1
): boolean {
  const { selection } = state;
  const { $from } = selection;
  const currentBlock = $from.node($from.depth);
  const baseIndent = currentBlock?.attrs?.indent ?? 0;
  
  // Insert after current block
  let insertPos = $from.after($from.depth);
  
  // 🛡️ GUARD: Validate position
  if (insertPos <= 0 || insertPos > tr.doc.content.size) {
    console.error('[Paste] INSERT_AFTER invalid position', {
      insertPos,
      docSize: tr.doc.content.size,
    });
    return false;
  }
  
  console.log('[Paste] INSERT_AFTER', {
    insertPos,
    baseIndent,
    pasteBlockCount: payload.blocks.length,
  });
  
  const firstBlockIndent = payload.blocks[0]?.indent ?? 0;
  const indentOffset = baseIndent - firstBlockIndent;
  const firstInsertPos = insertPos;
  
  for (const block of payload.blocks) {
    const newIndent = Math.max(0, block.indent + indentOffset);
    
    const node = createBlock(state, tr, {
      type: block.type,
      insertPos,
      indent: newIndent,
      attrs: block.attrs,
      content: block.content?.content ?? null,
    });
    
    if (!node) {
      console.error('[Paste] Failed to create block in INSERT_AFTER');
      continue;
    }
    
    insertPos += node.nodeSize;
  }
  
  // Cursor lands in first pasted block, offset 0
  const $firstBlock = tr.doc.resolve(firstInsertPos + 1);
  tr.setSelection(TextSelection.create(tr.doc, $firstBlock.pos));
  
  console.log('[Paste] INSERT_AFTER complete', {
    cursorPos: tr.selection.from,
  });
  
  return true;
}

/**
 * 🔹 LAW 3: SPLIT_BLOCK - Split current block at cursor, insert pasted blocks between
 * 
 * Behavior:
 * 1. Split current block at cursor
 * 2. Insert pasted blocks between the split
 * 3. Base indent = current block indent
 * 4. Cursor lands at end of last pasted block
 */
function handleSplitBlock(
  state: EditorState,
  tr: Transaction,
  payload: ClipboardPayloadV1
): boolean {
  const { selection } = state;
  
  if (!(selection instanceof TextSelection)) {
    console.error('[Paste] SPLIT_BLOCK requires TextSelection');
    return false;
  }
  
  const { $from } = selection;
  const currentBlock = $from.node($from.depth);
  const cursorOffset = $from.parentOffset;
  const baseIndent = currentBlock?.attrs?.indent ?? 0;
  
  console.log('[Paste] SPLIT_BLOCK', {
    cursorOffset,
    blockContentSize: currentBlock.content.size,
    baseIndent,
    pasteBlockCount: payload.blocks.length,
  });
  
  // Extract content before and after cursor
  const contentBefore = currentBlock.content.cut(0, cursorOffset);
  const contentAfter = currentBlock.content.cut(cursorOffset);
  
  // Position of current block
  const blockPos = $from.before($from.depth);
  const blockEnd = $from.after($from.depth);
  
  // Delete current block
  tr.delete(blockPos, blockEnd);
  
  // Insert first block with content before cursor
  let insertPos = blockPos;
  const firstBlock = state.schema.nodes[currentBlock.type.name].create(
    {
      ...currentBlock.attrs,
      blockId: crypto.randomUUID(), // New ID for first split
    },
    contentBefore
  );
  tr.insert(insertPos, firstBlock);
  insertPos += firstBlock.nodeSize;
  
  // Insert pasted blocks
  const firstBlockIndent = payload.blocks[0]?.indent ?? 0;
  const indentOffset = baseIndent - firstBlockIndent;
  let lastPastedBlockEnd = insertPos;
  
  for (const block of payload.blocks) {
    const newIndent = Math.max(0, block.indent + indentOffset);
    
    const node = createBlock(state, tr, {
      type: block.type,
      insertPos,
      indent: newIndent,
      attrs: block.attrs,
      content: block.content?.content ?? null,
    });
    
    if (!node) {
      console.error('[Paste] Failed to create block in SPLIT_BLOCK');
      continue;
    }
    
    insertPos += node.nodeSize;
    lastPastedBlockEnd = insertPos;
  }
  
  // Insert second block with content after cursor
  const secondBlock = state.schema.nodes[currentBlock.type.name].create(
    {
      ...currentBlock.attrs,
      blockId: crypto.randomUUID(), // New ID for second split
    },
    contentAfter
  );
  tr.insert(insertPos, secondBlock);
  
  // Cursor lands at end of last pasted block
  // Navigate into the last pasted block's content
  const $lastBlock = tr.doc.resolve(lastPastedBlockEnd - 1);
  const lastBlockNode = $lastBlock.node($lastBlock.depth);
  const lastBlockContentSize = lastBlockNode.content.size;
  const cursorPos = $lastBlock.pos + lastBlockContentSize;
  
  tr.setSelection(TextSelection.create(tr.doc, cursorPos));
  
  console.log('[Paste] SPLIT_BLOCK complete', {
    cursorPos: tr.selection.from,
  });
  
  return true;
}

/**
 * 🔹 LAW 4: APPEND_TO_BLOCK - Append pasted content inline to current block
 * 
 * Behavior:
 * 1. Append pasted content inline to current block
 * 2. No new block created
 * 3. Cursor lands at end of appended content
 * 
 * Guards:
 * - Only applies if pasted content is single paragraph
 * - Current block is not HR
 * - Current block is not empty
 */
function handleAppendToBlock(
  state: EditorState,
  tr: Transaction,
  payload: ClipboardPayloadV1
): boolean {
  const { selection } = state;
  
  if (!(selection instanceof TextSelection)) {
    console.error('[Paste] APPEND_TO_BLOCK requires TextSelection');
    return false;
  }
  
  const { $from } = selection;
  const currentBlock = $from.node($from.depth);
  const cursorOffset = $from.parentOffset;
  
  // 🛡️ GUARD 1: Only single paragraph
  if (payload.blocks.length !== 1 || payload.blocks[0]?.type !== 'paragraph') {
    console.error('[Paste] APPEND_TO_BLOCK requires single paragraph');
    return false;
  }
  
  // 🛡️ GUARD 2: Current block not HR
  if (currentBlock.type.name === 'horizontalRule') {
    console.error('[Paste] APPEND_TO_BLOCK not allowed in HR');
    return false;
  }
  
  // 🛡️ GUARD 3: Current block not empty
  if (currentBlock.content.size === 0) {
    console.error('[Paste] APPEND_TO_BLOCK not allowed in empty block');
    return false;
  }
  
  console.log('[Paste] APPEND_TO_BLOCK', {
    cursorOffset,
    blockContentSize: currentBlock.content.size,
    pasteContentSize: payload.blocks[0].content?.content.size ?? 0,
  });
  
  // Get pasted content
  const pastedContent = payload.blocks[0]?.content?.content;
  if (!pastedContent || pastedContent.size === 0) {
    console.warn('[Paste] APPEND_TO_BLOCK no content to paste');
    return false;
  }
  
  // Insert pasted content at cursor
  const insertPos = $from.pos;
  tr.insert(insertPos, pastedContent);
  
  // Cursor lands at end of appended content
  const newCursorPos = insertPos + pastedContent.size;
  tr.setSelection(TextSelection.create(tr.doc, newCursorPos));
  
  console.log('[Paste] APPEND_TO_BLOCK complete', {
    cursorPos: tr.selection.from,
  });
  
  return true;
}

/**
 * 📋 PASTE (INTERNAL): Insert copied blocks at cursor
 * 
 * 🎯 Step 3B.2: Intent-based paste routing
 * 
 * Algorithm:
 * 1. Detect paste intent
 * 2. Route to appropriate handler
 * 3. Handler creates blocks + positions cursor
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
  
  const payload = clipboardState.payload;
  const tr = state.tr;
  
  // 🎯 Step 1: Detect paste intent
  const intent = detectPasteIntent(state, payload);
  
  console.log('[Paste] Intent detected:', intent);
  
  // 🎯 Step 2: Route to appropriate handler
  let success = false;
  
  switch (intent) {
    case PasteIntent.REPLACE_BLOCK:
      success = handleReplaceBlock(state, tr, payload);
      break;
      
    case PasteIntent.INSERT_AFTER:
      success = handleInsertAfter(state, tr, payload);
      break;
      
    case PasteIntent.SPLIT_BLOCK:
      success = handleSplitBlock(state, tr, payload);
      break;
      
    case PasteIntent.APPEND_TO_BLOCK:
      success = handleAppendToBlock(state, tr, payload);
      break;
      
    default:
      console.error('[Paste] Unknown intent:', intent);
      return false;
  }
  
  if (!success) {
    console.error('[Paste] Handler failed for intent:', intent);
    return false;
  }
  
  // 🎯 Step 3: Finalize transaction
  tr.setMeta('addToHistory', true);
  tr.setMeta('closeHistory', true);
  
  dispatch(tr);
  
  clipboardState.lastOperation = 'paste';
  clipboardState.lastOperationTime = Date.now();
  
  console.log('[Paste] Complete', {
    intent,
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
