/**
 * useBlockSelection - Hook to detect if current block is selected
 * 
 * Returns true when:
 * - Block is in a NodeSelection (handle click)
 * - Block is part of a multi-block TextSelection (Shift+Click, Cmd+A)
 * 
 * Returns false when:
 * - Single block TextSelection (triple-click, normal text selection)
 */

import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { isMultiBlockSelection } from '../utils/multiSelection';

interface UseBlockSelectionProps {
  editor: Editor;
  getPos: () => number | undefined;
  nodeSize: number;
}

export function useBlockSelection({ editor, getPos, nodeSize }: UseBlockSelectionProps): boolean {
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const checkSelection = () => {
      const pos = getPos();
      if (pos === undefined) {
        setIsSelected(false);
        return;
      }

      const { selection } = editor.state;
      const blockStart = pos;
      const blockEnd = pos + nodeSize;
      
      // 🎯 DEFENSIVE: Never show halo on single empty paragraph
      // (prevents flash after Ctrl+A → Delete)
      const doc = editor.state.doc;
      if (doc.content.size <= 4 && doc.content.childCount === 1) {
        const firstChild = doc.content.firstChild;
        if (firstChild && firstChild.type.name === 'paragraph' && firstChild.content.size === 0) {
          setIsSelected(false);
          return;
        }
      }

      // Case 1: NodeSelection (clicking handle) → show halo
      if (selection instanceof NodeSelection) {
        const selected = selection.$from.pos === pos;
        setIsSelected(selected);
        return;
      }

      // Case 2: Multi-block TextSelection (Shift+Click, Cmd+A) → show halo
      if (isMultiBlockSelection(editor)) {
        const { from, to } = selection;
        const contentStart = blockStart + 1;
        const contentEnd = blockEnd - 1;
        
        // Check if this block is covered by the selection
        const isFullyCovered = from <= contentStart && to >= contentEnd;
        setIsSelected(isFullyCovered && from !== to);
        return;
      }

      // Case 3: Single-block TextSelection (triple-click, normal selection) → NO halo
      setIsSelected(false);
    };

    editor.on('selectionUpdate', checkSelection);
    editor.on('focus', checkSelection);
    
    // Initial check
    checkSelection();

    return () => {
      editor.off('selectionUpdate', checkSelection);
      editor.off('focus', checkSelection);
    };
  }, [editor, getPos, nodeSize]);

  return isSelected;
}

