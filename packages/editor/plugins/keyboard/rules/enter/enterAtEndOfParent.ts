/**
 * Enter At End Of Parent Rule
 *
 * FLAT-INDENT STRUCTURAL INVARIANT:
 *
 * In a flat-indent model, children are defined by indent depth, not explicit parent pointers.
 * Once a block has indented descendants, it is a CLOSED SUBTREE BOUNDARY.
 *
 * Rule: If cursor is at end of block AND block has indented descendants,
 *       Enter creates a SIBLING (same indent), NOT a child.
 *
 * Rationale (log-proven):
 * - hasIndentedChildren === true → subtree exists structurally
 * - Collapse is UI-only (invisible to Engine)
 * - Creating child would corrupt subtree anchor
 * - Must exit subtree to create next block
 *
 * This is NOT about collapse visibility.
 * This is about structural integrity in flat-indent architecture.
 */

import { TextSelection } from '@tiptap/pm/state';
import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { isAtEndOfBlock } from '../../types/KeyboardContext';
import { createBlock } from '../../../../core/createBlock';

export const enterAtEndOfParent = defineRule({
  id: 'enter:atEndOfParent',
  description:
    'At end of block with indented descendants, create sibling (not child)',
  priority: 125, // Above enterToggleCreatesChild (120)

  when(ctx: KeyboardContext): boolean {
    // Only intervene when at end of block
    if (!isAtEndOfBlock(ctx)) {
      return false;
    }

    // Get Engine instance
    const { editor, currentNode } = ctx;
    const engine = (editor as any)._engine;

    if (!engine || !engine.tree) {
      return false; // Engine not ready
    }

    // Get current block from Engine
    const blockId = currentNode.attrs?.blockId;
    if (!blockId) {
      return false;
    }

    const engineBlock = engine.tree.nodes[blockId];
    if (!engineBlock) {
      // Block not in Engine → desync (abort)
      return false;
    }

    // Check if block has indented descendants (Engine truth)
    const currentIndent = currentNode.attrs?.indent ?? 0;
    const blockIds = Object.keys(engine.tree.nodes).filter(
      (id) => id !== 'root'
    );
    const currentIndex = blockIds.indexOf(blockId);

    if (currentIndex === -1) {
      return false;
    }

    // Check if next block has greater indent (has descendants)
    for (let i = currentIndex + 1; i < blockIds.length; i++) {
      const nextBlock = engine.tree.nodes[blockIds[i]];
      const nextContent = nextBlock.content as any;
      const nextIndent = nextContent?.attrs?.indent ?? 0;

      if (nextIndent > currentIndent) {
        // Found indented descendant → this block is a parent
        // #region agent log
        fetch(
          'http://127.0.0.1:7244/ingest/a7f9fa0e-3f72-4ff3-8c3a-792215d634cd',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'enterAtEndOfParent.ts:when',
              message: 'STRUCTURAL INVARIANT TRIGGERED',
              data: {
                blockId: blockId.substring(0, 8),
                currentIndent: currentIndent,
                hasDescendants: true,
                willCreateSibling: true,
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              hypothesisId: 'INVARIANT',
            }),
          }
        ).catch(() => {});
        // #endregion
        return true;
      }

      if (nextIndent <= currentIndent) {
        // Reached sibling or ancestor → no descendants
        return false;
      }
    }

    return false; // No subsequent blocks
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, state, currentNode } = ctx;

    // Get current indent (preserve for sibling)
    const currentIndent = currentNode.attrs?.indent ?? 0;

    // Get current block position
    const { $from } = state.selection;
    const currentBlock = $from.node($from.depth);
    const currentBlockPos = $from.before($from.depth);

    // Calculate insert position: after current block + all its descendants
    const engine = (editor as any)._engine;
    const blockId = currentNode.attrs?.blockId;
    const blockIds = Object.keys(engine.tree.nodes).filter(
      (id) => id !== 'root'
    );
    const currentIndex = blockIds.indexOf(blockId);

    // Find next sibling (same or less indent)
    let insertPos = currentBlockPos + currentBlock.nodeSize;

    for (let i = currentIndex + 1; i < blockIds.length; i++) {
      const nextBlock = engine.tree.nodes[blockIds[i]];
      const nextContent = nextBlock.content as any;
      const nextIndent = nextContent?.attrs?.indent ?? 0;

      if (nextIndent <= currentIndent) {
        // Found sibling or ancestor - insert before it
        break;
      }

      // Skip descendant (add its size to insert position)
      const pmBlock = state.doc.nodeAt(insertPos - currentBlockPos);
      if (pmBlock) {
        insertPos += pmBlock.nodeSize;
      }
    }

    // ✅ CANONICAL ENTER PATTERN: ONE Enter = ONE transaction
    return editor.commands.command(({ state: cmdState, dispatch }) => {
      if (!dispatch) return false;

      const tr = cmdState.tr;

      // Create sibling paragraph at same indent
      const paragraphNode = createBlock(cmdState, tr, {
        type: 'paragraph',
        insertPos,
        indent: currentIndent, // SAME indent (sibling, not child)
      });

      if (!paragraphNode) {
        console.error('[enterAtEndOfParent] Failed to create sibling');
        return false;
      }

      // Move cursor into new paragraph
      const cursorPos = insertPos + 1;
      tr.setSelection(TextSelection.create(tr.doc, cursorPos));

      // Mark for history
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // One undo per Enter

      // Dispatch ONCE
      dispatch(tr);
      return true; // HARD STOP
    });
  },
});
