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
// DeleteBlockCommand removed - using FlatIntentResolver instead

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

              // 🔥 FLAT MODEL: Use FlatIntentResolver for multi-block delete
              // Get resolver from editor (attached by EditorCore)
              const resolver = (editor as any)._resolver;
              if (!resolver) {
                console.error('[BlockDeletion] Resolver not found on editor');
                return false;
              }

              // Delete each block using flat resolver
              // Note: In flat model, deleting multiple blocks does NOT promote children
              // (user explicitly selected the range, everything in it should be deleted)
              for (const block of blocks) {
                const blockId = block.node.attrs?.blockId;
                if (blockId) {
                  const result = resolver.resolve({
                    type: 'delete-block',
                    blockId,
                    source: 'delete',
                  });
                  if (result.success) {
                    console.log(
                      `[BlockDeletion] ✅ Deleted block ${blockId}`
                    );
                  } else {
                    console.warn(
                      `[BlockDeletion] Delete failed for ${blockId}: ${result.reason}`
                    );
                  }
                } else {
                  console.warn(
                    '[BlockDeletion] Block has no blockId, skipping',
                    block
                  );
                }
              }

              // ✅ CURSOR PLACEMENT HANDLED BY ENGINE
              // Each delete-block intent places cursor correctly
              // Final cursor position = END of block before deleted range

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

                // 🔥 FLAT MODEL: Use FlatIntentResolver, not old DeleteBlockCommand
                // Get resolver from editor (attached by EditorCore)
                const resolver = (editor as any)._resolver;
                if (resolver) {
                  // Dispatch delete-block intent through flat resolver
                  const result = resolver.resolve({
                    type: 'delete-block',
                    blockId,
                    source: 'delete',
                  });
                  if (result.success) {
                    console.log(
                      `[BlockDeletion] ✅ Deleted block ${blockId} (children promoted)`
                    );
                  } else {
                    console.warn(
                      `[BlockDeletion] Delete failed: ${result.reason}`
                    );
                    return false;
                  }
                } else {
                  console.error('[BlockDeletion] Resolver not found on editor');
                  return false;
                }

                // ✅ CURSOR PLACEMENT HANDLED BY ENGINE
                // FlatIntentResolver.handleDeleteBlock() already places cursor at END of previous block
                // No need for requestAnimationFrame or manual cursor placement here

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
