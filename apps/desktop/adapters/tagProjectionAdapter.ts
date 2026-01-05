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
 * - id (derived from name)
 * - label (display name)
 * - color (visual distinction)
 * 
 * @param tag - Domain tag from persistence
 * @returns EditorTag projection
 */
export function tagToEditorTag(tag: Tag): EditorTag {
  // TODO: Implement in Phase 2
  // Note: Tag uses 'name' as ID, not a separate 'id' field
  throw new Error('tagToEditorTag: Not implemented');
}

/**
 * Project multiple domain Tags → EditorTags
 * 
 * @param tags - Array of domain tags
 * @returns Array of editor tag projections
 */
export function tagsToEditorTags(tags: Tag[]): EditorTag[] {
  return tags.map(tagToEditorTag);
}

