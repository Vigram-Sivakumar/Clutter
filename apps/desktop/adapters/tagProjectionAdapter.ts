/**
 * Tag → EditorTag Projection Adapter
 * 
 * This adapter projects domain Tags into editor-consumable form.
 * 
 * CRITICAL RULES:
 * - Editor never imports domain Tag type
 * - Adapter strips away everything editor doesn't need
 * - App owns tag data, editor only renders
 * 
 * This is a one-way projection (domain → editor only).
 */

import type { Tag } from '@clutter/shared';
import type { EditorTag } from '../../../packages/editor/types';

/**
 * Project domain Tag → EditorTag
 * 
 * Strips away metadata editor doesn't need:
 * - description, timestamps, favorite status, etc.
 * 
 * Keeps only:
 * - id (uses tag.name as identifier)
 * - label (display name, case-preserved)
 * - color (visual distinction)
 * 
 * @param tag - Domain tag from persistence
 * @returns EditorTag projection
 */
export function tagToEditorTag(tag: Tag): EditorTag {
  return {
    id: tag.name,       // Tag.name is the primary key
    label: tag.name,    // Case-preserved display name
    color: tag.color,   // Optional, passes through as-is
  };
}

/**
 * Project multiple domain Tags → EditorTags
 * 
 * Filters out deleted tags (deletedAt !== null).
 * Editor should never see deleted tags.
 * 
 * @param tags - Array of domain tags
 * @returns Array of editor tag projections (excluding deleted)
 */
export function tagsToEditorTags(tags: Tag[]): EditorTag[] {
  return tags
    .filter(tag => tag.deletedAt === null)  // Exclude deleted tags
    .map(tagToEditorTag);
}

