/**
 * Block Deletion Plugin
 * 
 * Handles DELETE and Backspace keys when blocks are node-selected (halo)
 * Ensures deletions properly trigger onUpdate and save to database
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { isMultiBlockSelection, getSelectedBlocks } from '../utils/multiSelection';

/**
 * Clear native browser selection to prevent visual artifacts
 * after bulk delete operations (especially Ctrl+A → Delete)
 * 
 * Why: Browser Selection API can hold stale ranges across DOM mutations,
 * causing empty paragraphs to show blue highlight even when ProseMirror
 * state has a collapsed cursor.
 */
function clearBrowserSelection() {
  // eslint-disable-next-line no-undef
  if (typeof requestAnimationFrame === 'undefined' || typeof window === 'undefined') return;
  
  // eslint-disable-next-line no-undef
  requestAnimationFrame(() => {
    // eslint-disable-next-line no-undef
    const selection = window.getSelection?.();
    if (!selection) return;
    
    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
    }
  });
}

/**
 * Check if selection is a NodeSelection on a single block
 */
function isNodeSelected(state: any): boolean {
  const { selection } = state;
  return selection instanceof NodeSelection;
}

export const BlockDeletion = Extension.create({
  name: 'blockDeletion',

  // Use ProseMirror plugins for low-level key handling
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('blockDeletion'),
        props: {
          handleKeyDown(view, event) {
            // Only handle DELETE and Backspace
            if (event.key !== 'Delete' && event.key !== 'Backspace') {
              return false;
            }

            const { state } = view;
            const { selection } = state;

            // Case 1: Multi-block selection (Cmd+A, Shift+Click)
            if (isMultiBlockSelection(editor)) {
              const blocks = getSelectedBlocks(editor);
              
              // Delete in reverse order to preserve positions
              let tr = state.tr;
              for (let i = blocks.length - 1; i >= 0; i--) {
                const block = blocks[i];
                tr = tr.delete(block.pos, block.pos + block.nodeSize);
              }
              
              // 🎯 FIX: Create COLLAPSED cursor (prevents browser range highlight)
              // Position 1 = inside first paragraph (canonical "start typing" position)
              const pos = 1;
              const $pos = tr.doc.resolve(pos);
              tr = tr.setSelection(TextSelection.create(tr.doc, $pos.pos, $pos.pos));
              
              // Dispatch transaction (this will trigger onUpdate with docChanged=true)
              view.dispatch(tr);
              
              // Clear native browser selection to prevent visual artifacts
              clearBrowserSelection();
              
              return true; // Prevent default behavior
            }

            // Case 2: Single node selection (clicked handle)
            if (isNodeSelected(state)) {
              const pos = selection.$from.pos;
              const node = state.doc.nodeAt(pos);
              
              if (node) {
                // Delete the block and trigger onUpdate
                let tr = state.tr.delete(pos, pos + node.nodeSize);
                
                // 🎯 FIX: Create COLLAPSED cursor (prevents browser range highlight)
                const cursorPos = 1;
                const $cursorPos = tr.doc.resolve(cursorPos);
                tr = tr.setSelection(TextSelection.create(tr.doc, $cursorPos.pos, $cursorPos.pos));
                
                view.dispatch(tr);
                
                // Clear native browser selection to prevent visual artifacts
                clearBrowserSelection();
                
                return true; // Prevent default behavior
              }
            }

            // Not a block selection, let default behavior handle
            return false;
          },
        },
      }),
    ];
  },
});

