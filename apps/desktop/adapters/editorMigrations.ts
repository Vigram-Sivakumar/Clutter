/**
 * Editor Document Migrations
 * 
 * Handles schema version upgrades for EditorDocument.
 * 
 * CRITICAL RULES:
 * - Migrations are app-owned, never in editor package
 * - Editor only consumes current schema version
 * - Migrations run at load time (before editor sees document)
 * - Each migration is pure function (no side effects)
 * 
 * Migration strategy:
 * - Version bumps are intentional, not automatic
 * - Each migration documents breaking changes
 * - Failed migrations throw (fail fast)
 */

import type { SerializedEditorDocument } from '../../../packages/editor/types';

/**
 * Current schema version
 * 
 * Increment when making breaking changes to EditorDocument structure.
 */
export const CURRENT_EDITOR_VERSION = 1;

/**
 * Migrate EditorDocument to current version
 * 
 * Called on every note load. Runs all necessary migrations
 * in sequence to bring document to current schema.
 * 
 * @param doc - Serialized document from persistence
 * @returns Migrated document at current version
 * @throws Error if document version is unknown
 */
export function migrateEditorDocument(
  doc: SerializedEditorDocument
): SerializedEditorDocument {
  // If already current version, no migration needed
  if (doc.version === CURRENT_EDITOR_VERSION) {
    return doc;
  }

  // Run migration chain
      const migrated = doc;

  // Future migrations will go here:
  // if (migrated.version === 1) {
  //   migrated = migrateV1toV2(migrated);
  // }
  // if (migrated.version === 2) {
  //   migrated = migrateV2toV3(migrated);
  // }

  // If we reach here and version doesn't match, throw
  if (migrated.version !== CURRENT_EDITOR_VERSION) {
    throw new Error(
      `Unknown editor document version: ${doc.version}. ` +
      `Expected ${CURRENT_EDITOR_VERSION}`
    );
  }

  return migrated;
}

/**
 * Example migration stub (future use)
 * 
 * Each migration:
 * - Takes document at version N
 * - Returns document at version N+1
 * - Documents what changed and why
 */
// function migrateV1toV2(
//   doc: SerializedEditorDocument
// ): SerializedEditorDocument {
//   // TODO: Implement when schema changes
//   return {
//     version: 2,
//     content: doc.content,
//   };
// }

