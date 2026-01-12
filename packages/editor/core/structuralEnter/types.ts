// packages/editor/core/structuralEnter/types.ts

export type StructuralEnterSource =
  | 'keyboard:enter'
  | 'keyboard:shift+enter'
  | 'keyboard:cmd+enter';

export type EnterContext = {
  /** Cursor offset inside the block text */
  cursorOffset: number;

  /** Total text length of the block */
  textLength: number;

  /** Whether the block is empty */
  isEmpty: boolean;

  /** Whether the cursor is at the very start */
  atStart: boolean;

  /** Whether the cursor is at the very end */
  atEnd: boolean;

  /** Block ID of current block (for hierarchy checks) */
  blockId: string;

  /** Block type name for context-specific rules */
  blockType: string;

  /** Current block's indent level (from PM) */
  indent: number;

  /** ProseMirror document (for checking sibling indents) */
  pmDoc: any; // PM Node - typed loosely to avoid dep on prosemirror-model

  /** Engine instance (for hierarchy queries) */
  engine: any; // EditorEngine - typed loosely to avoid circular deps
};

export type EnterStructureIntent =
  | {
      kind: 'create-sibling-below';
    }
  | {
      kind: 'create-sibling-above';
    }
  | {
      kind: 'create-child';
    }
  | {
      kind: 'split-block';
    }
  | {
      kind: 'noop';
    };

export type StructuralEnterResult = {
  intent: EnterStructureIntent;

  /**
   * Where the cursor should go AFTER the structure change.
   * This is declarative — not a PM position.
   */
  cursor: {
    block: 'current' | 'previous' | 'next' | 'created';
    placement: 'start' | 'end';
  };
};
