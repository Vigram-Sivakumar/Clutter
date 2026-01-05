/**
 * Note → EditorLinkedNote Projection Adapter
 * 
 * This adapter projects domain Notes into editor-consumable linked note form.
 * 
 * CRITICAL RULES:
 * - Editor never imports domain Note type
 * - Adapter strips away everything editor doesn't need
 * - App owns note data, editor only renders links
 * 
 * This is a one-way projection (domain → editor only).
 */

import type { Note, NoteMetadata } from '@clutter/shared';
import type { EditorLinkedNote } from '../../../packages/editor/types';

/**
 * Project domain Note → EditorLinkedNote
 * 
 * Strips away metadata editor doesn't need:
 * - content, timestamps, folder, tags, etc.
 * 
 * Keeps only:
 * - id (for linking)
 * - title (for display, may be empty string)
 * 
 * @param note - Domain note or note metadata
 * @returns EditorLinkedNote projection
 */
export function noteToEditorLinkedNote(
  note: Note | NoteMetadata
): EditorLinkedNote {
  return {
    id: note.id,
    title: note.title,  // May be empty string, UI handles "Untitled"
  };
}

/**
 * Project multiple domain Notes → EditorLinkedNotes
 * 
 * Filters out deleted notes (deletedAt !== null).
 * Editor should never see deleted notes in autocomplete/links.
 * 
 * @param notes - Array of domain notes or metadata
 * @returns Array of editor linked note projections (excluding deleted)
 */
export function notesToEditorLinkedNotes(
  notes: (Note | NoteMetadata)[]
): EditorLinkedNote[] {
  return notes
    .filter(note => note.deletedAt === null)  // Exclude deleted notes
    .map(noteToEditorLinkedNote);
}

