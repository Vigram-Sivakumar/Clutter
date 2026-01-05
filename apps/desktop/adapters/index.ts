/**
 * Editor Adapters - App Boundary Layer
 * 
 * This is where domain objects translate into editor projections.
 * 
 * Adapters are app-owned, never imported by editor package.
 * They define the contract between app truth and editor truth.
 */

export {
  noteToEditorDocument,
  editorDocumentToNote,
} from './noteEditorAdapter';

export {
  tagToEditorTag,
  tagsToEditorTags,
} from './tagProjectionAdapter';

export {
  noteToEditorLinkedNote,
  notesToEditorLinkedNotes,
} from './noteLinkProjectionAdapter';

export {
  migrateEditorDocument,
  CURRENT_EDITOR_VERSION,
} from './editorMigrations';

