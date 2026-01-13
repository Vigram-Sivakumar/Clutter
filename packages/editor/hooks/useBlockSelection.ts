/**
 * useBlockSelection - Hook to detect if current block is selected
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 SELECTION INVARIANT: Engine owns selection, PM does not
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This hook ONLY reads Engine selection state.
 * It NEVER observes ProseMirror selection.
 *
 * PM selection is write-only from this system's perspective.
 * Reading PM selection creates an observer feedback loop:
 *   PM → DOM → Hook → DOM → PM (resurrection)
 *
 * By reading Engine only, we break the cycle:
 *   Engine → Hook → DOM (paint only)
 *   PM selection → ignored
 *
 * Returns true when:
 * - Block is in Engine.selection.blockIds (halo click)
 * - Block is part of multi-block Engine selection (Shift+Click, Cmd+A)
 *
 * Returns false when:
 * - Engine selection is 'none' or 'text'
 * - Block is not in Engine.selection.blockIds
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/core';
import { isMultiBlockSelection } from '../utils/multiSelection';
import { warnIfNodeViewMutates } from '../core/devInvariants';

interface UseBlockSelectionProps {
  editor: Editor;
  getPos: () => number | undefined;
  nodeSize: number;
}

export function useBlockSelection({
  editor: _editor,
  getPos,
  nodeSize,
}: UseBlockSelectionProps): boolean {
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const checkSelection = () => {
      // 🔒 CRITICAL: Read canonical editor at execution time
      const canonicalEditor = (window as any).__editor;
      if (!canonicalEditor) {
        setIsSelected(false);
        return;
      }

      const pos = getPos();
      if (pos === undefined) {
        setIsSelected(false);
        return;
      }

      // Get Engine from canonical editor (attached by EditorCore)
      const engine = (canonicalEditor as any)._engine;
      if (!engine) {
        setIsSelected(false);
        return;
      }

      // Get current block's blockId
      const currentNode = canonicalEditor.state.doc.nodeAt(pos);
      const blockId = currentNode?.attrs?.blockId;
      if (!blockId) {
        setIsSelected(false);
        return;
      }

      console.log(
        '[useBlockSelection]',
        blockId.slice(0, 8),
        'engine selection =',
        engine.selection
      );

      // 🔒 Read from ENGINE selection ONLY (never PM selection)
      // This prevents the observer feedback loop that resurrects NodeSelection

      // Case 1: Engine block selection (halo click) → show halo
      if (engine.selection.kind === 'block') {
        const selected = engine.selection.blockIds.includes(blockId);

        // 🛡️ DEV INVARIANT: Warn if halo mutation during structural delete
        if (selected !== isSelected) {
          warnIfNodeViewMutates('useBlockSelection/engine-block', {
            blockId: blockId.slice(0, 8),
            wasSelected: isSelected,
            nowSelected: selected,
          });
        }

        setIsSelected(selected);
        return;
      }

      // Case 2: Multi-block TextSelection (Shift+Click, Cmd+A) → show halo
      // This is the only case where we check PM selection, because
      // multi-block text selection is still represented as TextSelection in PM
      const isMultiBlock = isMultiBlockSelection(canonicalEditor);
      if (isMultiBlock) {
        const { selection } = canonicalEditor.state;
        const blockStart = pos;
        const blockEnd = pos + nodeSize;
        const { from, to } = selection;
        const contentStart = blockStart + 1;
        const contentEnd = blockEnd - 1;

        // Check if this block is covered by the selection
        const isFullyCovered = from <= contentStart && to >= contentEnd;
        const finalSelected = isFullyCovered && from !== to;

        // 🛡️ DEV INVARIANT: Warn if halo mutation during structural delete
        if (finalSelected !== isSelected) {
          warnIfNodeViewMutates('useBlockSelection/multi-block', {
            blockId: blockId.slice(0, 8),
            wasSelected: isSelected,
            nowSelected: finalSelected,
          });
        }

        setIsSelected(finalSelected);
        return;
      }

      // Case 3: Engine selection is 'none' or 'text' → NO halo
      setIsSelected(false);
    };

    // Subscribe to canonical editor, but use prop for cleanup
    const canonicalEditor = (window as any).__editor;
    if (canonicalEditor) {
      canonicalEditor.on('selectionUpdate', checkSelection);
      canonicalEditor.on('focus', checkSelection);
      canonicalEditor.on('update', checkSelection);

      // Initial check
      checkSelection();

      return () => {
        canonicalEditor.off('selectionUpdate', checkSelection);
        canonicalEditor.off('focus', checkSelection);
        canonicalEditor.off('update', checkSelection);
      };
    }
  }, [getPos, nodeSize]); // 🔒 Removed 'editor' from deps

  return isSelected;
}
