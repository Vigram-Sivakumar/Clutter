/**
 * Editor Core Contracts
 * 
 * These types define the boundary between the editor core and the application.
 * They are framework-agnostic and represent the editor's public API.
 * 
 * Rules:
 * - No React imports
 * - No TipTap imports
 * - No DB imports
 * - Just truth, not implementation
 */

/**
 * EditorDocument represents the editor's internal state.
 * This is TipTap JSON format, but the app doesn't need to know that.
 */
export type EditorDocument = {
  type: 'doc';
  content: unknown[];
};

/**
 * EditorChange represents a mutation to the editor's content.
 * Source indicates whether the change came from user interaction or programmatic update.
 */
export type EditorChange = {
  document: EditorDocument;
  source: 'user' | 'programmatic';
};

/**
 * EditorCore is the main interface to the editor engine.
 * This is what the application interacts with.
 */
export interface EditorCore {
  /**
   * Set the editor's content to a new document.
   * This is atomic and does not emit onChange during initialization.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setDocument(_doc: EditorDocument): void;
  
  /**
   * Get the current document from the editor.
   * Returns the editor's internal JSON representation.
   */
  getDocument(): EditorDocument;
  
  /**
   * Focus the editor.
   */
  focus(): void;
  
  /**
   * Destroy the editor instance and clean up resources.
   */
  destroy(): void;
}

