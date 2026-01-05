/**
 * Note ⇄ EditorDocument Adapter
 * 
 * This adapter translates between:
 * - Domain Note (app's truth)
 * - EditorDocument (editor's truth)
 * 
 * CRITICAL RULES:
 * - Adapters live in app layer, never in editor
 * - Editor never sees Note type
 * - App owns all persistence logic
 * - Migrations handled here
 * 
 * This is the border crossing.
 */

import type { Note } from '@clutter/shared';
import type { EditorDocument } from '../../../packages/editor/types';

/**
 * Convert domain Note → EditorDocument
 * 
 * Used when:
 * - Loading a note into the editor
 * - Hydrating editor state
 * 
 * @param note - Domain note from persistence
 * @returns EditorDocument ready for editing
 */
export function noteToEditorDocument(note: Note): EditorDocument {
  // TODO: Implement in Phase 2
  // Will parse note.content (stringified JSON) into EditorDocument
  throw new Error('noteToEditorDocument: Not implemented');
}

/**
 * Convert EditorDocument → domain Note
 * 
 * Used when:
 * - Saving editor content
 * - Syncing changes
 * 
 * @param note - Original note (for metadata preservation)
 * @param doc - Editor document with updated content
 * @returns Updated note ready for persistence
 */
export function editorDocumentToNote(
  note: Note,
  doc: EditorDocument
): Note {
  // TODO: Implement in Phase 2
  // Will stringify EditorDocument and merge with note metadata
  throw new Error('editorDocumentToNote: Not implemented');
}

