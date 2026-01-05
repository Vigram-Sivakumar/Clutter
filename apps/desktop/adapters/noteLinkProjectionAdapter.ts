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
 * - title (for display)
 * 
 * @param note - Domain note or note metadata
 * @returns EditorLinkedNote projection
 */
export function noteToEditorLinkedNote(
  note: Note | NoteMetadata
): EditorLinkedNote {
  // TODO: Implement in Phase 2
  throw new Error('noteToEditorLinkedNote: Not implemented');
}

/**
 * Project multiple domain Notes → EditorLinkedNotes
 * 
 * @param notes - Array of domain notes or metadata
 * @returns Array of editor linked note projections
 */
export function notesToEditorLinkedNotes(
  notes: (Note | NoteMetadata)[]
): EditorLinkedNote[] {
  return notes.map(noteToEditorLinkedNote);
}

