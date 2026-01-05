/**
 * Tag Utilities
 * Shared functions for adding tags to blocks
 */

import { EditorState, Transaction } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';

/**
 * Add a tag to a block node
 * @param state - Editor state
 * @param tagName - Tag name to add
 * @param blockDepth - Depth of the block node
 * @returns Transaction or null if tag already exists
 */
export function addTagToBlock(
  state: EditorState,
  tagName: string,
  blockDepth: number
): Transaction | null {
  const { $from } = state.selection;
  
  // Get the block node at the specified depth
  const blockNode = $from.node(blockDepth);
  const existingTags = blockNode.attrs.tags || [];
  
  // Check if tag already exists (case-insensitive)
  const tagExists = existingTags.some(
    (t: string) => t.toLowerCase() === tagName.toLowerCase()
  );
  
  if (tagExists) {
    return null;
  }
  
  // Create transaction
  const tr = state.tr;
  const blockPos = $from.before(blockDepth);
  
  // Update block attributes to add the tag
  tr.setNodeMarkup(blockPos, null, {
    ...blockNode.attrs,
    tags: [...existingTags, tagName],
  });
  
  return tr;
}

/**
 * Add a tag to a block and optionally delete a text range
 * @param view - Editor view
 * @param tagName - Tag name to add
 * @param blockDepth - Depth of the block node
 * @param deleteRange - Optional range to delete { from, to }
 * @returns true if tag was added, false if it already existed
 */
export function addTagAndDeleteText(
  view: EditorView,
  tagName: string,
  blockDepth: number,
  deleteRange?: { from: number; to: number }
): boolean {
  const { state } = view;
  const tr = addTagToBlock(state, tagName, blockDepth);
  
  if (!tr) {
    return false; // Tag already exists
  }
  
  // Delete text range if specified
  if (deleteRange) {
    tr.delete(deleteRange.from, deleteRange.to);
  }
  
  // Dispatch transaction
  view.dispatch(tr);
  return true;
}

