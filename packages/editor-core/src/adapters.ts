/**
 * Editor Core Adapters
 * 
 * These interfaces define how the editor core interacts with external systems
 * (persistence, shortcuts, clipboard, etc.) without knowing their implementation.
 * 
 * The application provides concrete implementations of these adapters.
 * 
 * Rules:
 * - No React imports
 * - No TipTap imports
 * - No DB imports
 * - Adapters are replaceable
 */

import type { EditorDocument } from './contracts';

/**
 * PersistenceAdapter handles saving editor content to storage.
 * The editor core never saves directly - it delegates to this adapter.
 */
export interface PersistenceAdapter {
  /**
   * Save a document for the given note ID.
   * This may be debounced or queued by the application.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  save(_noteId: string, _doc: EditorDocument): void;
  
  /**
   * Flush any pending saves for the given note ID immediately.
   * Called on note switch, window unload, etc.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  flush(_noteId: string): void;
}

/**
 * ShortcutAdapter handles keyboard shortcuts.
 * The editor core doesn't know about app-level shortcuts (Cmd+K, etc.).
 */
export interface ShortcutAdapter {
  /**
   * Register keyboard shortcuts with the editor.
   */
  register(): void;
  
  /**
   * Unregister keyboard shortcuts when editor is destroyed.
   */
  unregister(): void;
}

/**
 * ClipboardAdapter handles copy/paste operations.
 * The editor core doesn't know about OS clipboard APIs.
 */
export interface ClipboardAdapter {
  /**
   * Copy the current selection to the clipboard.
   */
  copy(): void;
  
  /**
   * Paste content from the clipboard into the editor.
   */
  paste(): void;
}

