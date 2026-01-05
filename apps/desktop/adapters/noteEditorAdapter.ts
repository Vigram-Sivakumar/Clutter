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

import type { Note } from '@clutter/domain';
import type { EditorDocument } from '../../../packages/editor/types';

/**
 * Convert domain Note → EditorDocument
 * 
 * Used when:
 * - Loading a note into the editor
 * - Hydrating editor state
 * 
 * Handles edge cases:
 * - Empty content (new notes)
 * - Malformed JSON (corruption/sync issues)
 * - Legacy notes without version
 * 
 * @param note - Domain note from persistence
 * @returns EditorDocument ready for editing
 */
export function noteToEditorDocument(note: Note): EditorDocument {
  // Edge case 1: Empty content (new notes start with '')
  if (!note.content || note.content.trim() === '') {
    return {
      version: 1,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    };
  }

  // Edge case 2: Malformed JSON (rare, but handle gracefully)
  try {
    const parsed = JSON.parse(note.content);
    
    // Validate it looks like TipTap JSON
    if (!parsed.type || parsed.type !== 'doc') {
      console.warn('Invalid TipTap JSON structure, falling back to empty doc', parsed);
      return {
        version: 1,
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
      };
    }

    // Wrap parsed content with version
    // Note: Legacy notes don't have version field, all implicitly v1
    return {
      version: 1,
      content: parsed,
    };
  } catch (error) {
    console.error('Failed to parse note content, falling back to empty doc', error);
    return {
      version: 1,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    };
  }
}

/**
 * Convert EditorDocument → domain Note
 * 
 * Used when:
 * - Saving editor content
 * - Syncing changes
 * 
 * Critical: Preserves all note metadata (id, timestamps, folder, etc.)
 * Only updates: content, updatedAt
 * 
 * @param note - Original note (for metadata preservation)
 * @param doc - Editor document with updated content
 * @returns Updated note ready for persistence
 */
export function editorDocumentToNote(
  note: Note,
  doc: EditorDocument
): Note {
  // Stringify TipTap JSON for persistence
  // Note: We store bare TipTap JSON (without version wrapper) for now
  // Future: May store version with content when migrations are needed
  const serializedContent = JSON.stringify(doc.content);

  // Merge content with existing note, preserve all metadata
  return {
    ...note,
    content: serializedContent,
    updatedAt: new Date().toISOString(),
  };
}

