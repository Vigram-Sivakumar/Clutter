/**
 * Progressive Select All Plugin
 * 
 * Implements Notion/Craft-style Cmd+A behavior:
 * 1. First Cmd+A: Select all text in current block
 * 2. Second Cmd+A: Select the entire current block (NodeSelection)
 * 3. Third Cmd+A: Select all blocks in the document
 */

import { Plugin, PluginKey, TextSelection, AllSelection, NodeSelection } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';

export const SelectAllPluginKey = new PluginKey('selectAll');

/**
 * Check if selection covers all text in the current block
 */
function isBlockFullySelected(state: any): boolean {
  const { selection, doc } = state;
  const { $from, $to, from, to } = selection;

  // Must be a TextSelection (note: constructor name has underscore prefix)
  if (selection.constructor.name !== '_TextSelection') {
    return false;
  }

  // Must be in the same block
  const blockDepth = $from.depth;
  if (blockDepth === 0) return false;
  
  // Check if $from and $to are in the same block
  if ($from.depth !== $to.depth) {
    return false;
  }

  // Check if they share the same parent block
  const fromParent = $from.node(blockDepth);
  const toParent = $to.node(blockDepth);
  
  if (fromParent !== toParent) {
    return false;
  }

  const blockStart = $from.start(blockDepth);
  const blockEnd = $from.end(blockDepth);

  // Check if selection spans the entire block content
  return from === blockStart && to === blockEnd;
}

/**
 * Check if selection is a NodeSelection on a single block
 */
function isNodeSelected(state: any): boolean {
  const { selection } = state;
  return selection.constructor.name === '_NodeSelection';
}

/**
 * Select all text in the current block
 */
function selectCurrentBlock(state: any, dispatch: any): boolean {
  const { selection, doc } = state;
  const { $from } = selection;

  const blockDepth = $from.depth;
  if (blockDepth === 0) {
    // At document level, select first block
    if (doc.childCount > 0) {
      const firstBlock = doc.child(0);
      const tr = state.tr.setSelection(
        TextSelection.create(doc, 1, firstBlock.nodeSize - 1)
      );
      dispatch(tr);
      return true;
    }
    return false;
  }

  const blockStart = $from.start(blockDepth);
  const blockEnd = $from.end(blockDepth);

  const tr = state.tr.setSelection(
    TextSelection.create(doc, blockStart, blockEnd)
  );
  dispatch(tr);
  return true;
}

/**
 * Select the entire current block as a node
 */
function selectCurrentBlockAsNode(state: any, dispatch: any): boolean {
  const { selection, doc } = state;
  const { $from } = selection;

  const blockDepth = $from.depth;
  if (blockDepth === 0) return false;

  // Get the position of the current block
  const blockPos = $from.before(blockDepth);

  // Create NodeSelection
  const tr = state.tr.setSelection(NodeSelection.create(doc, blockPos));
  dispatch(tr);
  return true;
}

/**
 * Select all blocks in the document
 */
function selectAllBlocks(state: any, dispatch: any): boolean {
  const { doc } = state;
  
  // Create a TextSelection spanning the entire document
  const tr = state.tr.setSelection(
    TextSelection.create(doc, 0, doc.content.size)
  );
  dispatch(tr);
  return true;
}

export const SelectAll = Extension.create({
  name: 'selectAll',

  addKeyboardShortcuts() {
    return {
      'Mod-a': ({ editor }) => {
        const { state, view } = editor;
        const { dispatch } = view;

        // Step 1: Check if block is fully selected as text
        if (isBlockFullySelected(state)) {
          return selectCurrentBlockAsNode(state, dispatch);
        }

        // Step 2: Check if block is selected as a node
        if (isNodeSelected(state)) {
          return selectAllBlocks(state, dispatch);
        }

        // Step 3: Otherwise, select all text in current block
        return selectCurrentBlock(state, dispatch);
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SelectAllPluginKey,
        props: {
          handleKeyDown(view, event) {
            // Let the keyboard shortcut handler take care of it
            return false;
          },
        },
      }),
    ];
  },
});

