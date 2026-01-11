/**
 * useBlockHidden - Check if block is hidden by collapsed parent
 *
 * 🔥 FLAT MODEL COLLAPSE LAW:
 * Collapse is NOT inferred from indent alone.
 * Collapse is explicitly propagated:
 * - data-collapsed → parent only (marks the collapsed block)
 * - data-hidden → children only (marks blocks that should be hidden)
 *
 * ALGORITHM (matches CollapsePlugin.ts):
 * 1. Walk backwards through document from current block
 * 2. Find first block with indent < current indent (potential ancestor)
 * 3. If that block is collapsed, we are hidden
 * 4. If not collapsed, check its ancestor (recurse upward)
 */

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';

export function useBlockHidden(
  editor: Editor,
  getPos: () => number | undefined
): boolean {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const checkHidden = () => {
      const pos = getPos();
      if (pos === undefined) {
        setIsHidden(false);
        return;
      }

      const doc = editor.state.doc;
      const currentNode = doc.nodeAt(pos);
      if (!currentNode || !currentNode.attrs?.blockId) {
        setIsHidden(false);
        return;
      }

      const currentIndent = currentNode.attrs.indent ?? 0;

      // 🔥 FLAT MODEL ALGORITHM: Walk backwards to find collapsed ancestor
      // This matches CollapsePlugin's forward algorithm
      let hidden = false;

      // Collect all blocks before current position
      const blocksBeforeCurrent: Array<{
        indent: number;
        collapsed: boolean;
      }> = [];

      doc.descendants((node, nodePos) => {
        if (nodePos >= pos) {
          return false; // Stop once we reach current block
        }

        if (node.attrs?.blockId) {
          blocksBeforeCurrent.push({
            indent: node.attrs.indent ?? 0,
            collapsed: node.attrs.collapsed ?? false,
          });
        }
        return true;
      });

      // Walk backwards to find if we're inside a collapsed block
      // Replay the forward algorithm from CollapsePlugin
      let hiddenIndent: number | null = null;

      for (const block of blocksBeforeCurrent) {
        // If this block is collapsed, start hiding deeper blocks
        if (block.collapsed) {
          hiddenIndent = block.indent;
        }
        // If we were hiding and this block is at same/less indent, stop hiding
        else if (hiddenIndent !== null && block.indent <= hiddenIndent) {
          hiddenIndent = null;
        }
      }

      // Check if current block should be hidden
      if (hiddenIndent !== null && currentIndent > hiddenIndent) {
        hidden = true;
      }

      setIsHidden(hidden);
    };

    checkHidden();

    // Re-check when document updates (to react to collapse/expand)
    editor.on('update', checkHidden);
    editor.on('selectionUpdate', checkHidden);

    return () => {
      editor.off('update', checkHidden);
      editor.off('selectionUpdate', checkHidden);
    };
  }, [editor, getPos]);

  return isHidden;
}
