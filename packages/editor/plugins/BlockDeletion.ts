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
import { logSelectionPair } from '../utils/selectionDebug';

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

            // 🔬 FORENSIC: Log selection BEFORE delete
            logSelectionPair('before-delete', editor);

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
              
              // 🎯 FIX: Force TextSelection after delete (prevents sticky halo)
              const pos = Math.min(tr.doc.content.size - 1, tr.selection.from);
              if (pos >= 0) {
                tr = tr.setSelection(TextSelection.create(tr.doc, pos));
              }
              
              // Dispatch transaction (this will trigger onUpdate with docChanged=true)
              view.dispatch(tr);
              
              // 🔬 FORENSIC: Log selection AFTER delete
              setTimeout(() => {
                logSelectionPair('after-delete-multi', editor);
                
                // 🔬 FORENSIC: Log on next keydown (to see if selection is still wrong)
                view.dom.addEventListener('keydown', () => {
                  logSelectionPair('on-keydown', editor);
                }, { once: true });
              }, 0);
              
              return true; // Prevent default behavior
            }

            // Case 2: Single node selection (clicked handle)
            if (isNodeSelected(state)) {
              const pos = selection.$from.pos;
              const node = state.doc.nodeAt(pos);
              
              if (node) {
                // Delete the block and trigger onUpdate
                let tr = state.tr.delete(pos, pos + node.nodeSize);
                
                // 🎯 FIX: Force TextSelection after delete (prevents sticky halo)
                const cursorPos = Math.min(tr.doc.content.size - 1, pos);
                if (cursorPos >= 0) {
                  tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos));
                }
                
                view.dispatch(tr);
                
                // 🔬 FORENSIC: Log selection AFTER delete
                setTimeout(() => {
                  logSelectionPair('after-delete-single', editor);
                  
                  // 🔬 FORENSIC: Log on next keydown (to see if selection is still wrong)
                  view.dom.addEventListener('keydown', () => {
                    logSelectionPair('on-keydown', editor);
                  }, { once: true });
                }, 0);
                
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

