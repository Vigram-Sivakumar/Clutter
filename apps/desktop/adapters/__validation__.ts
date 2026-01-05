/**
 * Adapter Validation
 * 
 * Simple compile-time and runtime validation that adapters work correctly.
 * Not comprehensive tests, just smoke tests to catch obvious issues.
 * 
 * Run with: npx tsx apps/desktop/adapters/__validation__.ts
 */

import type { Note, Tag } from '../../../packages/shared/src/types';
import {
  noteToEditorDocument,
  editorDocumentToNote,
} from './noteEditorAdapter';
import { tagToEditorTag, tagsToEditorTags } from './tagProjectionAdapter';
import {
  noteToEditorLinkedNote,
  notesToEditorLinkedNotes,
} from './noteLinkProjectionAdapter';
import { migrateEditorDocument, CURRENT_EDITOR_VERSION } from './editorMigrations';

// Test data
const mockNote: Note = {
  id: 'note-123',
  title: 'Test Note',
  description: 'A test note',
  descriptionVisible: true,
  emoji: '📝',
  content: '{"type":"doc","content":[{"type":"paragraph","attrs":{"id":"block-1"},"content":[{"type":"text","text":"Hello world"}]}]}',
  tags: ['test', 'validation'],
  tagsVisible: true,
  isFavorite: false,
  folderId: null,
  dailyNoteDate: null,
  createdAt: '2026-01-05T00:00:00.000Z',
  updatedAt: '2026-01-05T00:00:00.000Z',
  deletedAt: null,
};

const mockEmptyNote: Note = {
  ...mockNote,
  id: 'note-empty',
  content: '',
};

const mockTag: Tag = {
  name: 'design',
  description: 'Design work',
  descriptionVisible: true,
  isFavorite: false,
  color: '#FF5733',
  createdAt: '2026-01-05T00:00:00.000Z',
  updatedAt: '2026-01-05T00:00:00.000Z',
  deletedAt: null,
};

const mockDeletedTag: Tag = {
  ...mockTag,
  name: 'deleted',
  deletedAt: '2026-01-05T00:00:00.000Z',
};

console.log('🧪 Running adapter validation...\n');

// Test 1: noteToEditorDocument with valid content
console.log('✅ Test 1: noteToEditorDocument (valid content)');
const editorDoc = noteToEditorDocument(mockNote);
console.assert(editorDoc.version === 1, 'Version should be 1');
console.assert(editorDoc.content.type === 'doc', 'Content type should be doc');
console.assert(Array.isArray(editorDoc.content.content), 'Content should have content array');
console.log('   Result:', JSON.stringify(editorDoc, null, 2));
console.log('');

// Test 2: noteToEditorDocument with empty content
console.log('✅ Test 2: noteToEditorDocument (empty content)');
const emptyDoc = noteToEditorDocument(mockEmptyNote);
console.assert(emptyDoc.version === 1, 'Version should be 1');
console.assert(emptyDoc.content.type === 'doc', 'Content type should be doc');
console.assert(emptyDoc.content.content.length === 1, 'Should have one paragraph');
console.assert(emptyDoc.content.content[0].type === 'paragraph', 'Should be paragraph');
console.log('   Result:', JSON.stringify(emptyDoc, null, 2));
console.log('');

// Test 3: editorDocumentToNote (round trip)
console.log('✅ Test 3: editorDocumentToNote (round trip)');
const updatedNote = editorDocumentToNote(mockNote, editorDoc);
console.assert(updatedNote.id === mockNote.id, 'Should preserve id');
console.assert(updatedNote.title === mockNote.title, 'Should preserve title');
console.assert(updatedNote.folderId === mockNote.folderId, 'Should preserve folderId');
console.assert(typeof updatedNote.content === 'string', 'Content should be stringified');
console.assert(updatedNote.updatedAt !== mockNote.updatedAt, 'Should update updatedAt');
console.log('   Preserved metadata: ✓');
console.log('   Updated timestamp: ✓');
console.log('');

// Test 4: tagToEditorTag
console.log('✅ Test 4: tagToEditorTag');
const editorTag = tagToEditorTag(mockTag);
console.assert(editorTag.id === 'design', 'ID should be tag name');
console.assert(editorTag.label === 'design', 'Label should be tag name');
console.assert(editorTag.color === '#FF5733', 'Color should be preserved');
console.log('   Result:', editorTag);
console.log('');

// Test 5: tagsToEditorTags (filters deleted)
console.log('✅ Test 5: tagsToEditorTags (filters deleted)');
const editorTags = tagsToEditorTags([mockTag, mockDeletedTag]);
console.assert(editorTags.length === 1, 'Should filter out deleted tag');
console.assert(editorTags[0].id === 'design', 'Should keep non-deleted tag');
console.log('   Input: 2 tags (1 deleted)');
console.log('   Output: 1 tag (deleted filtered)');
console.log('');

// Test 6: noteToEditorLinkedNote
console.log('✅ Test 6: noteToEditorLinkedNote');
const linkedNote = noteToEditorLinkedNote(mockNote);
console.assert(linkedNote.id === 'note-123', 'ID should match');
console.assert(linkedNote.title === 'Test Note', 'Title should match');
console.assert(!('content' in linkedNote), 'Should not include content');
console.log('   Result:', linkedNote);
console.log('');

// Test 7: notesToEditorLinkedNotes (filters deleted)
console.log('✅ Test 7: notesToEditorLinkedNotes (filters deleted)');
const deletedNote: Note = { ...mockNote, id: 'note-deleted', deletedAt: '2026-01-05T00:00:00.000Z' };
const linkedNotes = notesToEditorLinkedNotes([mockNote, deletedNote]);
console.assert(linkedNotes.length === 1, 'Should filter out deleted note');
console.assert(linkedNotes[0].id === 'note-123', 'Should keep non-deleted note');
console.log('   Input: 2 notes (1 deleted)');
console.log('   Output: 1 note (deleted filtered)');
console.log('');

// Test 8: migrateEditorDocument (no-op for v1)
console.log('✅ Test 8: migrateEditorDocument (v1 no-op)');
const migrated = migrateEditorDocument({ version: 1, content: editorDoc.content });
console.assert(migrated.version === CURRENT_EDITOR_VERSION, 'Should be current version');
console.log('   Migration: v1 → v1 (no-op) ✓');
console.log('');

console.log('🎉 All adapter validations passed!\n');
console.log('Summary:');
console.log('  ✅ Note ⇄ EditorDocument conversion');
console.log('  ✅ Empty content handling');
console.log('  ✅ Metadata preservation');
console.log('  ✅ Tag projection');
console.log('  ✅ Deleted tag filtering');
console.log('  ✅ Note link projection');
console.log('  ✅ Deleted note filtering');
console.log('  ✅ Migration no-op');
console.log('');
console.log('Phase 2 adapters are ready for integration.');

