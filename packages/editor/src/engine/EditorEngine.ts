/**
 * EditorEngine - Pure state machine for editor document management
 * 
 * PRINCIPLES:
 * - No React dependencies
 * - No async operations
 * - No side effects
 * - Deterministic state transitions
 * 
 * RESPONSIBILITIES:
 * - Hold current document
 * - Track document ownership (which note owns the editor)
 * - Guard against stale/late updates
 * - Emit changes to subscribers
 * 
 * WHY THIS EXISTS:
 * - Eliminates race conditions between React lifecycle and editor state
 * - Centralizes all ownership/timing logic in one place
 * - Makes editor state independent of React component lifecycle
 * - Enables editor to survive component unmounts
 */

export type EditorDocument = string; // TipTap JSON as string

export type EditorChangeEvent = {
  document: EditorDocument;
  noteId: string;
  source: 'user' | 'programmatic';
};

export type EditorChangeListener = (event: EditorChangeEvent) => void;

export class EditorEngine {
  private document: EditorDocument | null = null;
  private noteId: string | null = null;
  private isHydrating: boolean = false;
  private listeners: Set<EditorChangeListener> = new Set();

  /**
   * Get current document (read-only)
   */
  getDocument(): EditorDocument | null {
    return this.document;
  }

  /**
   * Get current note ID (which note owns the editor)
   */
  getNoteId(): string | null {
    return this.noteId;
  }

  /**
   * Check if engine is currently hydrating (should block user edits)
   */
  isHydratingDocument(): boolean {
    return this.isHydrating;
  }

  /**
   * Set document (from app, e.g., on note switch)
   * This is the ONLY way to update document from outside
   */
  setDocument(document: EditorDocument, noteId: string): void {
    // Start hydration phase
    this.isHydrating = true;
    this.noteId = noteId;
    this.document = document;

    // Emit programmatic change (app-driven)
    this.emit({
      document,
      noteId,
      source: 'programmatic',
    });

    // End hydration after a tick (allows React/TipTap to settle)
    // In practice, this would be called by the adapter after editor initializes
    setTimeout(() => {
      this.isHydrating = false;
    }, 0);
  }

  /**
   * Apply user edit (from TipTap onChange)
   * Guards against stale updates and hydration conflicts
   */
  applyEdit(document: EditorDocument, sourceNoteId: string): boolean {
    // 🔒 GUARD: Block during hydration
    if (this.isHydrating) {
      return false;
    }

    // 🔒 GUARD: Block if no active note
    if (!this.noteId) {
      return false;
    }

    // 🔒 GUARD: Block stale updates from previous notes
    if (sourceNoteId !== this.noteId) {
      return false;
    }

    // 🔒 GUARD: Block TipTap boot transactions (empty or trivial content)
    if (document.length <= 200 && !document.includes('"text"')) {
      return false;
    }

    // ✅ Accept update
    this.document = document;

    // Emit user change
    this.emit({
      document,
      noteId: this.noteId,
      source: 'user',
    });

    return true;
  }

  /**
   * Mark hydration as complete (called by adapter after editor settles)
   */
  completeHydration(): void {
    this.isHydrating = false;
  }

  /**
   * Clear current document (e.g., on app shutdown or editor unmount)
   */
  clear(): void {
    this.document = null;
    this.noteId = null;
    this.isHydrating = false;
  }

  /**
   * Subscribe to document changes
   */
  onChange(listener: EditorChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit change to all listeners
   */
  private emit(event: EditorChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('EditorEngine: Listener error:', error);
      }
    });
  }
}

/**
 * Singleton instance (for now, can be made context-based later)
 */
export const editorEngine = new EditorEngine();

