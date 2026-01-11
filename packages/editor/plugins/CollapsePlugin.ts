/**
 * CollapsePlugin - ProseMirror plugin for universal block collapse
 *
 * 🔥 FLAT MODEL VERSION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ARCHITECTURE:
 * - Runs at ProseMirror layer (no React timing issues)
 * - Uses decorations to add data-hidden attribute
 * - CSS handles visibility (instant, no lag)
 * - Works for ALL block types (paragraph, list, heading, HR, etc.)
 *
 * FLAT MODEL ALGORITHM:
 * 1. Walk blocks in document order
 * 2. Track collapsed indent levels
 * 3. Hide blocks with indent > collapsed level
 * 4. Resume showing when indent returns to same or less
 *
 * NO parent pointers. NO tree traversal. Pure array logic.
 * This is how Craft/Workflowy handle collapse.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const CollapsePluginKey = new PluginKey('collapse');

/**
 * CollapsePlugin - Marks hidden blocks with decorations (FLAT MODEL)
 */
export const CollapsePlugin = new Plugin({
  key: CollapsePluginKey,

  props: {
    decorations(state) {
      const decorations: Decoration[] = [];

      // Collect all blocks in document order
      const blocks: Array<{
        pos: number;
        nodeSize: number;
        indent: number;
        collapsed: boolean;
      }> = [];
      state.doc.descendants((node, pos) => {
        if (node.attrs?.blockId) {
          blocks.push({
            pos,
            nodeSize: node.nodeSize,
            indent: node.attrs.indent ?? 0,
            collapsed: node.attrs.collapsed ?? false,
          });
        }
        return true;
      });

      // 🔥 FLAT VISIBILITY ALGORITHM
      // Walk blocks in order, track collapsed indent level
      let hiddenIndent: number | null = null;

      for (const block of blocks) {
        // If we're hiding, check if this block should remain hidden
        if (hiddenIndent !== null && block.indent > hiddenIndent) {
          // This block is hidden - add decoration
          decorations.push(
            Decoration.node(block.pos, block.pos + block.nodeSize, {
              'data-hidden': 'true',
            })
          );
          continue; // Still hidden, continue
        }

        // This block is visible
        // If this block is collapsed, start hiding deeper blocks
        if (block.collapsed) {
          hiddenIndent = block.indent;
        }
        // If we were hiding and this block is at same/less indent, stop hiding
        else if (hiddenIndent !== null && block.indent <= hiddenIndent) {
          hiddenIndent = null;
        }
      }

      return DecorationSet.create(state.doc, decorations);
    },
  },
});
