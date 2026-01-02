/**
 * Shared tag operations for the editor
 * Single source of truth for hashtag detection and manipulation
 */

import { Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

/** 
 * Shared regex for hashtag matching
 * Matches # followed by any text until cursor (allows spaces, prevents leading/trailing spaces)
 * Examples: #task, #task name, #work project 2024
 */
export const HASHTAG_REGEX = /#(\S+(?:\s+\S+)*)$/;

/**
 * Check if a tag already exists in a list of tags (case-insensitive)
 */
export function tagExists(tags: string[], tagName: string): boolean {
  return tags.some((t: string) => t.toLowerCase() === tagName.toLowerCase());
}

/**
 * Add a tag to a block node's attributes
 * Only adds if tag doesn't already exist (case-insensitive check)
 * 
 * @param tr - ProseMirror transaction
 * @param blockPos - Position of the block node
 * @param blockAttrs - Current block attributes
 * @param tagName - Tag name to add
 * @returns Modified transaction
 */
export function addTagToBlock(
  tr: Transaction,
  blockPos: number,
  blockAttrs: any,
  tagName: string
): Transaction {
  const existingTags = blockAttrs.tags || [];
  
  if (!tagExists(existingTags, tagName)) {
    tr.setNodeMarkup(blockPos, null, {
      ...blockAttrs,
      tags: [...existingTags, tagName],
    });
  }
  
  return tr;
}

/**
 * Delete text range and position cursor at the start
 * 
 * @param tr - ProseMirror transaction
 * @param from - Start position
 * @param to - End position
 * @returns Modified transaction with cursor positioned at 'from'
 */
export function deleteTextAndPositionCursor(
  tr: Transaction,
  from: number,
  to: number
): Transaction {
  tr.delete(from, to);
  tr.setSelection(TextSelection.create(tr.doc, from));
  return tr;
}

/**
 * Complete tag insertion workflow:
 * 1. Delete the #tagname text
 * 2. Add tag to block attributes (if not exists)
 * 3. Position cursor where the tag was
 * 
 * @param tr - ProseMirror transaction
 * @param hashtagPos - Position of the '#' character
 * @param cursorPos - Current cursor position (end of hashtag)
 * @param blockPos - Position of the parent block node
 * @param blockAttrs - Current block attributes
 * @param tagName - Tag name to add
 * @returns Modified transaction
 */
export function insertTag(
  tr: Transaction,
  hashtagPos: number,
  cursorPos: number,
  blockPos: number,
  blockAttrs: any,
  tagName: string
): Transaction {
  // Delete the #tagname text
  deleteTextAndPositionCursor(tr, hashtagPos, cursorPos);
  
  // Add tag to block (if not exists)
  addTagToBlock(tr, blockPos, blockAttrs, tagName);
  
  return tr;
}

