/**
 * Block Deletion Plugin
 *
 * Handles DELETE and Backspace keys when blocks are node-selected (halo)
 *
 * INTEGRATION STATUS: ✅ Uses engine.deleteBlock() primitive
 * - Routes all deletions through EditorEngine (Editor Law #8)
 * - Children are promoted (never orphaned)
 * - Undo/redo restores structure + relationships
 * - No PM default deletion (tr.delete removed)
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import {
  isMultiBlockSelection,
  getSelectedBlocks,
} from '../utils/multiSelection';
import type { EditorEngine } from '../core/engine/EditorEngine';
import { DeleteBlockCommand } from '../core/engine/command';

/**
 * Check if selection is a NodeSelection on a single block
 */
function isNodeSelected(state: any): boolean {
  const { selection } = state;
  return selection instanceof NodeSelection;
}

/**
 * Get EditorEngine from TipTap editor instance
 * Engine is attached by EditorCore during initialization
 */
function getEngine(editor: any): EditorEngine | null {
  return editor._engine || null;
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
          handleClick(_view, _pos, _event) {
            return false; // Let normal click handling proceed
          },
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
              const engine = getEngine(editor);

              if (!engine) {
                console.error(
                  '[BlockDeletion] EditorEngine not found on editor instance'
                );
                return false;
              }

              console.log(
                `[BlockDeletion] Multi-block delete: ${blocks.length} blocks`
              );

              // ✅ USE ENGINE PRIMITIVE: Delete blocks via DeleteBlockCommand
              // This ensures children are promoted (Editor Law #8)
              // Delete in document order (engine handles child promotion per block)
              for (const block of blocks) {
                const blockId = block.node.attrs?.blockId;
                if (blockId) {
                  const cmd = new DeleteBlockCommand(blockId);
                  engine.dispatch(cmd);
                  console.log(
                    `[BlockDeletion] ✅ Deleted block ${blockId} (children promoted)`
                  );
                } else {
                  console.warn(
                    '[BlockDeletion] Block has no blockId, skipping',
                    block
                  );
                }
              }

              // After engine deletions, position cursor in first remaining block
              // Wait for next frame for PM to sync with engine changes
              requestAnimationFrame(() => {
                const { state: newState } = editor;
                if (newState.doc.content.size > 0 && newState.doc.firstChild) {
                  const firstBlockStart = 1;
                  const tr = newState.tr.setSelection(
                    TextSelection.create(newState.doc, firstBlockStart)
                  );
                  editor.view.dispatch(tr);
                }
              });

              return true; // Prevent default behavior
            }

            // Case 2: Single node selection (clicked handle)
            if (isNodeSelected(state)) {
              const pos = selection.$from.pos;
              const node = state.doc.nodeAt(pos);

              if (node) {
                // PHASE 3: Only process Engine blocks (not structural nodes)
                // Engine blocks: paragraph, listBlock, toggleBlock, heading, etc.
                // NOT: toggleHeaderNew, toggleContent, doc, text
                const engineBlockTypes = [
                  'paragraph',
                  'listBlock',
                  'toggleBlock',
                  'heading',
                  'blockquote',
                  'callout',
                  'codeBlock',
                  'horizontalRule',
                  'toggleHeader', // Legacy toggle (still in use)
                ];

                if (!engineBlockTypes.includes(node.type.name)) {
                  // Structural node, not an Engine block - skip silently
                  return false;
                }

                const blockId = node.attrs?.blockId;
                const engine = getEngine(editor);

                if (!engine) {
                  console.error(
                    '[BlockDeletion] EditorEngine not found on editor instance'
                  );
                  return false;
                }

                if (!blockId) {
                  console.warn(
                    '[BlockDeletion] Engine block has no blockId, skipping',
                    node.type.name
                  );
                  return false;
                }

                console.log(`[BlockDeletion] Single node delete: ${blockId}`);

                // ✅ USE ENGINE PRIMITIVE: Delete block via DeleteBlockCommand
                // This ensures children are promoted (Editor Law #8)
                const cmd = new DeleteBlockCommand(blockId);
                engine.dispatch(cmd);
                console.log(
                  `[BlockDeletion] ✅ Deleted block ${blockId} (children promoted)`
                );

                // After engine deletion, position cursor in a valid block
                // Wait for next frame for PM to sync with engine changes
                requestAnimationFrame(() => {
                  const { state: newState } = editor;
                  let cursorPos = pos;
                  if (cursorPos >= newState.doc.content.size) {
                    cursorPos = newState.doc.content.size - 1;
                  }
                  // Ensure we're inside a block, not at document boundaries
                  if (cursorPos <= 0 && newState.doc.firstChild) {
                    cursorPos = 1; // Inside the first block
                  }
                  if (cursorPos > 0) {
                    const tr = newState.tr.setSelection(
                      TextSelection.create(newState.doc, cursorPos)
                    );
                    editor.view.dispatch(tr);
                  }
                });

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
