/**
 * Editor Engine - Headless editor core
 *
 * This is the spine of the editor.
 * Everything else hangs off this.
 */

// Core types
export type {
  BlockId,
  BlockNode,
  BlockTree,
  EditorSelection,
  EditorFocus,
  EditorCursor,
  InteractionMode,
} from './types';

// Intent system
export type { EditorIntent, IntentResult } from './intent';

// Command system
export type { EditorCommand, IntentCategory, CommandMetadata } from './command';
export {
  InsertTextCommand,
  DeleteTextCommand,
  MoveBlockCommand,
  CreateBlockCommand,
  DeleteBlockCommand,
  CommandGroup,
} from './command';

// Mode management
export { ModeManager } from './mode';

// Engine
export { EditorEngine } from './EditorEngine';

// Intent resolver
export { IntentResolver } from './intentResolver';

// Undo controller
export { UndoController } from './undoController';

// TipTap bridge
export { useEditorEngine, getResolverForEditor } from './tiptapBridge';
