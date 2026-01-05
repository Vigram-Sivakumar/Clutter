/**
 * EditorContext - The Contract Between Editor and App
 * 
 * This is the ONLY way the editor receives data and emits intent.
 * 
 * CRITICAL RULES:
 * - Editor never imports Zustand stores
 * - Editor never imports domain types (Note, Folder, Tag)
 * - All data is projected through EditorLinkedNote, EditorTag
 * - All actions return Promises (async-friendly, supports remote/collab)
 * 
 * This context makes the editor:
 * - Portable (works in read-only, collaborative, mobile)
 * - Testable (mock the context, no stores needed)
 * - Independent (knows nothing about app architecture)
 */

import { createContext, useContext } from 'react';
import type { EditorTag, EditorLinkedNote, EditorFolder } from '../types';

/**
 * Tag metadata that editor can modify
 */
export interface EditorTagMetadata {
  description?: string;
  descriptionVisible?: boolean;
  isFavorite?: boolean;
  color?: string;
}

/**
 * Editor Context - What the editor has access to
 * 
 * Organized by capability:
 * - Data: Read-only projections
 * - Tags: Tag lifecycle and metadata
 * - Notes: Note/folder lifecycle and linking
 */
export interface EditorContextValue {
  // ===== DATA (Read-only projections) =====
  
  /** All available tags for autocomplete */
  availableTags: EditorTag[];
  
  /** All available notes for @mention linking */
  availableNotes: EditorLinkedNote[];
  
  /** All available folders for @mention linking */
  availableFolders: EditorFolder[];
  
  // ===== TAGS =====
  
  /**
   * Get metadata for a specific tag
   * Returns null if tag doesn't exist or has no metadata
   */
  getTagMetadata: (tagName: string) => EditorTagMetadata | null;
  
  /**
   * Update metadata for an existing tag
   * Editor doesn't care if this succeeds - fire and forget
   */
  onUpdateTagMetadata: (tagName: string, metadata: Partial<EditorTagMetadata>) => void;
  
  /**
   * Create or update tag metadata
   * Editor doesn't care if this succeeds - fire and forget
   */
  onUpsertTagMetadata: (
    tagName: string,
    description?: string,
    descriptionVisible?: boolean,
    isFavorite?: boolean,
    color?: string
  ) => void;
  
  /**
   * Rename a tag globally (updates all occurrences)
   * Editor doesn't care if this succeeds - fire and forget
   */
  onRenameTag: (oldTag: string, newTag: string) => void;
  
  // ===== NOTES & FOLDERS =====
  
  /**
   * Create a new note
   * Returns the created note projection
   */
  onCreateNote: (title: string, navigate?: boolean) => EditorLinkedNote;
  
  /**
   * Create a new folder
   * Returns the folder ID (null if failed)
   */
  onCreateFolder: (name: string) => string | null;
  
  /**
   * Find daily note by date
   * Returns null if doesn't exist
   */
  onFindDailyNote: (date: Date) => EditorLinkedNote | null;
  
  /**
   * Create a daily note for a specific date
   * Returns the created note projection
   */
  onCreateDailyNote: (date: Date, navigate?: boolean) => EditorLinkedNote;
}

/**
 * Editor Context
 * 
 * This is the ONLY source of external data for the editor.
 */
export const EditorContext = createContext<EditorContextValue | null>(null);

/**
 * Hook to access editor context
 * 
 * Throws if used outside EditorProvider.
 * This is intentional - editor components must be wrapped.
 */
export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  
  if (!context) {
    throw new Error(
      'useEditorContext must be used within EditorProvider. ' +
      'Did you forget to wrap your editor in <EditorProvider>?'
    );
  }
  
  return context;
}

