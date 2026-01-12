// packages/editor/core/structuralDelete/types.ts

/**
 * Source of a structural delete request.
 * This is diagnostic + behavioral (analytics / future tuning),
 * NOT branching logic.
 */
export type StructuralDeleteSource =
  | 'keyboard:backspace'
  | 'keyboard:delete'
  | 'handle'
  | 'context-menu';

/**
 * Snapshot of Engine structural state at a point in time.
 * This makes performStructuralDelete deterministic and testable.
 */
export interface EngineSnapshot {
  blocks: Array<{
    blockId: string;
    indent: number;
  }>;
}

/**
 * Parameters accepted by the structural delete authority.
 * No other function may perform a structural delete.
 * 
 * IMPORTANT: Requires explicit engineSnapshot to avoid timing dependencies.
 */
export interface StructuralDeleteParams {
  editor: any; // Editor type intentionally loose at boundary
  engineSnapshot: EngineSnapshot; // Explicit state, no hidden dependencies
  blockIds: string[];
  source: StructuralDeleteSource;
}

/**
 * Cursor placement intent after a structural delete.
 * This is a PURE intent — not a ProseMirror operation.
 */
export type DeletionCursorTarget =
  | {
      type: 'start-of-document';
    }
  | {
      type: 'end-of-block';
      blockId: string;
    };
