/**
 * @clutter/editor-core
 * 
 * Framework-agnostic editor core with explicit adapters.
 * 
 * This package defines the contracts and interfaces for the editor,
 * but does not include any React, TipTap, or persistence implementation.
 * 
 * Phase 2: Contracts only (no implementation yet)
 */

// Editor contracts (what the editor is and does)
export type {
  EditorDocument,
  EditorChange,
  EditorCore,
} from './contracts';

// Adapter interfaces (how the editor talks to external systems)
export type {
  PersistenceAdapter,
  ShortcutAdapter,
  ClipboardAdapter,
} from './adapters';

