/**
 * Core Editor Engine Types
 *
 * These are the fundamental building blocks of editor state.
 * Pure TypeScript. No React. No TipTap. No dependencies.
 *
 * This is the truth of the editor.
 */

export type BlockId = string;

/**
 * BlockNode - A single block in the document tree
 *
 * Every block knows:
 * - Who it is (id)
 * - What it is (type)
 * - Who owns it (parentId)
 * - Who it owns (children)
 * - What it contains (content)
 */
export type BlockNode = {
  id: BlockId;
  type: string;
  parentId: BlockId | null;
  children: BlockId[];
  content: unknown;
};

/**
 * BlockTree - The complete document structure
 *
 * This is a normalized tree:
 * - Root node is the document
 * - Every block is indexed by ID
 * - Parent-child relationships are explicit
 *
 * Why not a nested structure?
 * - Easier to find blocks by ID (O(1))
 * - Easier to move blocks (no deep cloning)
 * - Easier to implement undo (track fewer changes)
 */
export type BlockTree = {
  rootId: BlockId;
  nodes: Record<BlockId, BlockNode>;
};

/**
 * EditorSelection - What is highlighted
 *
 * THREE kinds of selection:
 * 1. none - Nothing selected
 * 2. text - Range of text within a block
 * 3. block - One or more entire blocks
 *
 * CRITICAL: These are mutually exclusive.
 * You cannot have text selection AND block selection.
 */
export type EditorSelection =
  | { kind: 'none' }
  | { kind: 'text'; blockId: BlockId; from: number; to: number }
  | { kind: 'block'; blockIds: BlockId[] };

/**
 * EditorFocus - Who receives keyboard input
 *
 * Only ONE block can have focus at a time.
 * null = no focus (editor inactive)
 */
export type EditorFocus = {
  blockId: BlockId | null;
};

/**
 * EditorCursor - Where text will be inserted
 *
 * This is SEPARATE from selection.
 * You can have a cursor position without visible selection.
 *
 * null = no cursor (block-level operations only)
 */
export type EditorCursor = {
  blockId: BlockId;
  offset: number;
} | null;

/**
 * InteractionMode - The ONE thing the editor is doing right now
 *
 * Rules:
 * - Only ONE mode active at a time
 * - Every handler checks mode before acting
 * - Mode transitions are explicit and logged
 *
 * This eliminates conflicts between handlers.
 */
export type InteractionMode =
  | 'idle' // No active interaction
  | 'typing' // Actively typing text
  | 'selecting' // Selecting text with mouse/shift+arrows
  | 'block-selection' // One or more blocks selected
  | 'dragging' // Dragging blocks to reorder
  | 'navigating' // Arrow key navigation (no selection)
  | 'command' // Slash command menu open
  | 'composing-ime'; // IME composition (Chinese/Japanese/Korean)
