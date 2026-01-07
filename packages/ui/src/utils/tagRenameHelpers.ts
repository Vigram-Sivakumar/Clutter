/**
 * Tag rename helper utilities
 * Centralizes color preservation logic for tag renames
 */

import { getTagColor } from './tagColors';
import type { Tag } from '@clutter/domain';

/**
 * Handles tag rename with automatic color preservation
 *
 * Rules:
 * - If the old tag had NO saved color (using hash default): Calculate new hash color for new name
 * - If the old tag had a saved color: Keep it (don't change)
 *
 * @param oldTag - The original tag name
 * @param newTag - The new tag name
 * @param renameTag - The store's renameTag function
 * @param getTagMetadata - Function to get tag metadata
 * @param updateTagMetadata - Function to update tag metadata
 */
export function handleTagRenameWithColorPreservation(
  oldTag: string,
  newTag: string,
  renameTag: (_oldTag: string, _newTag: string) => void,
  getTagMetadata: (_tagName: string) => Tag | null,
  updateTagMetadata: (_tagName: string, _updates: Partial<Tag>) => void
): void {
  const oldMetadata = getTagMetadata(oldTag);

  // Perform the rename - this will move metadata and update all notes/folders
  renameTag(oldTag, newTag);

  // Color preservation logic:
  // - If old tag had NO saved color (was using hash default), calculate new hash color
  // - If old tag had a saved color, keep it (renameTag already moved the metadata)
  if (!oldMetadata?.color) {
    // No saved color - calculate hash color for the new tag name
    const newTagHashColor = getTagColor(newTag);
    updateTagMetadata(newTag, { color: newTagHashColor });
  }
  // If oldMetadata.color exists, renameTag already moved it, so we don't update
}
