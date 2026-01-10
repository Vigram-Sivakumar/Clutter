/**
 * CollapsePlugin - ProseMirror plugin for universal block collapse
 *
 * ARCHITECTURE:
 * - Runs at ProseMirror layer (no React timing issues)
 * - Uses decorations to add data-hidden attribute
 * - CSS handles visibility (instant, no lag)
 * - Works for ALL block types (paragraph, list, heading, HR, etc.)
 *
 * HOW IT WORKS:
 * 1. Walk document to find collapsed blocks
 * 2. Mark all descendants with data-hidden="true"
 * 3. CSS hides them instantly
 *
 * This is how Notion/Craft/Linear handle collapse.
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const CollapsePluginKey = new PluginKey('collapse');

/**
 * CollapsePlugin - Marks hidden blocks with decorations
 */
export const CollapsePlugin = new Plugin({
  key: CollapsePluginKey,

  props: {
    decorations(state) {
      const decorations: Decoration[] = [];
      const collapsedParents = new Set<string>();

      // Step 1: Collect all collapsed parent blocks
      state.doc.descendants((node) => {
        if (node.attrs?.blockId && node.attrs?.collapsed === true) {
          collapsedParents.add(node.attrs.blockId);
        }
        return true; // Continue traversal
      });

      // Step 2: Mark all descendants of collapsed parents as hidden
      state.doc.descendants((node, pos) => {
        const parentId = node.attrs?.parentBlockId;

        // If this block's parent is collapsed, hide it
        if (parentId && collapsedParents.has(parentId)) {
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              'data-hidden': 'true',
            })
          );
        }

        return true; // Continue traversal
      });

      return DecorationSet.create(state.doc, decorations);
    },
  },
});
