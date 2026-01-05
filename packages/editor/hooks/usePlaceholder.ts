/**
 * usePlaceholder Hook - JavaScript-Based Focus Detection
 * 
 * Returns placeholder text for empty blocks that should show it.
 * Logic:
 * 1. Show on focused empty blocks
 * 2. Show on first block if editor is empty
 * 
 * This hook re-runs on every selection change to update focus state.
 */

import { useMemo } from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { placeholders } from '../tokens';

interface UsePlaceholderProps {
  node: PMNode;
  editor: Editor;
  getPos: () => number | undefined;
  customText?: string; // Optional custom placeholder text
}

/**
 * Returns placeholder text if this block is empty, null otherwise
 * 
 * @param node - The ProseMirror node
 * @param editor - The Tiptap editor instance
 * @param getPos - Function to get the node's position
 * @param customText - Optional custom placeholder text (e.g., "Type or paste code...")
 * @returns Placeholder text or null
 */
export function usePlaceholder({ 
  node, 
  editor, 
  getPos,
  customText 
}: UsePlaceholderProps): string | null {
  return useMemo(() => {
    // Check if block has any actual content (text or inline nodes like dateMention)
    // content.size > 0 accounts for both text and atomic inline nodes
    const isEmpty = node.content.size === 0;
    
    if (!isEmpty) return null;

    const pos = getPos();
    if (pos === undefined) return null;

    // Check if editor is empty (only one empty block)
    const isEditorEmpty = editor.state.doc.textContent === '' && editor.state.doc.childCount === 1;
    // First block can be at pos 0 or 1 depending on node structure
    const isFirstBlock = pos <= 1;
    
    // RULE 1: Always show on first block if editor is completely empty
    if (isEditorEmpty && isFirstBlock) {
      return customText || placeholders.default;
    }

    // RULE 2: Show on focused empty blocks (only if editor has focus)
    const editorHasFocus = editor.isFocused;
    if (!editorHasFocus) return null;

    const { from, to } = editor.state.selection;
    const nodeStart = pos;
    const nodeEnd = pos + node.nodeSize;
    const isFocused = from >= nodeStart && to <= nodeEnd;
    
    if (isFocused) {
      return customText || placeholders.default;
    }
    
    return null;
  }, [node.textContent, editor.state.selection, editor.state.doc, editor.isFocused, getPos, customText]);
}

