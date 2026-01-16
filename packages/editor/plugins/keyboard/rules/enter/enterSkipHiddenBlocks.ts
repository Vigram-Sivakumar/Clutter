/**
 * Enter Skip Hidden Blocks Rule
 *
 * Ensures ENTER never inserts inside collapsed subtrees.
 *
 * PRINCIPLE: Detect position divergence, not visibility.
 * - If next logical block != next physical block, we're skipping hidden content.
 * - Delegate to getNextBlock() (collapse-aware, battle-tested).
 *
 * CRITICAL: CollapsePlugin is the single authority for visibility.
 * This rule only detects and respects that authority.
 *
 * When detected, creates a SIBLING paragraph after the collapsed range.
 * Does NOT delegate to performStructuralEnter() (would crash with invalid anchor).
 */

import { TextSelection } from '@tiptap/pm/state';
import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { getNextBlock, isAtEndOfBlock } from '../../types/KeyboardContext';
import { createBlock } from '../../../../core/createBlock';

export const enterSkipHiddenBlocks = defineRule({
  id: 'enter:skipHiddenBlocks',
  description:
    'Skip collapsed subtrees when pressing Enter - insert after hidden range',
  priority: 95, // Below enterToggleCreatesChild (120), above outdentEmptyList (90)

  when(ctx: KeyboardContext): boolean {
    // Only intervene when at end of block
    if (!isAtEndOfBlock(ctx)) {
      return false;
    }

    // Get the next LOGICAL block (collapse-aware)
    const nextLogical = getNextBlock(ctx);

    // Get the next PHYSICAL sibling
    const { $from } = ctx;
    const parentDepth = $from.depth - 1;
    if (parentDepth < 0) return false;

    const parent = $from.node(parentDepth);
    const currentIndex = $from.index(parentDepth);

    // If there's no physical next sibling, no skip needed
    if (currentIndex >= parent.childCount - 1) {
      return false;
    }

    // Calculate physical next block position
    const currentBlock = $from.node($from.depth);
    const currentBlockPos = $from.before($from.depth);
    const physicalNextPos = currentBlockPos + currentBlock.nodeSize;

    // POSITION DIVERGENCE TEST:
    // If logical and physical positions differ, there's a collapsed range between them
    if (!nextLogical) {
      // No logical next block, but physical sibling exists
      // This means everything after current block is hidden
      // #region agent log
      fetch(
        'http://127.0.0.1:7244/ingest/a7f9fa0e-3f72-4ff3-8c3a-792215d634cd',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'enterSkipHiddenBlocks.ts:when',
            message: 'Skip rule triggered - no logical next',
            data: {
              currentIndent: currentBlock.attrs?.indent,
              physicalSiblingExists: true,
              willSkip: true,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'H3',
          }),
        }
      ).catch(() => {});
      // #endregion
      return true;
    }

    // If positions differ, we're skipping hidden content
    const shouldSkip = nextLogical.pos !== physicalNextPos;

    // #region agent log
    // H3: Log position divergence detection
    fetch('http://127.0.0.1:7244/ingest/a7f9fa0e-3f72-4ff3-8c3a-792215d634cd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'enterSkipHiddenBlocks.ts:when',
        message: 'Skip rule condition check',
        data: {
          atEnd: true,
          physicalNextPos: physicalNextPos,
          logicalNextPos: nextLogical.pos,
          positionDivergence: shouldSkip,
          currentIndent: currentBlock.attrs?.indent,
          nextLogicalIndent: nextLogical.node.attrs?.indent,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'H3',
      }),
    }).catch(() => {});
    // #endregion

    return shouldSkip;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, currentNode } = ctx;

    // Get next visible block (collapse-aware helper)
    const nextVisible = getNextBlock(ctx);

    if (!nextVisible) {
      // No visible block ahead - delegate to default behavior
      return false;
    }

    // Get indent from current block (preserve structure)
    const currentIndent = currentNode.attrs?.indent ?? 0;

    // ✅ CANONICAL ENTER PATTERN: ONE Enter = ONE transaction
    // Do NOT use editor.chain() - it can split into multiple transactions
    // Do NOT call performStructuralEnter() - it crashes with invalid anchor
    return editor.commands.command(({ state: cmdState, dispatch }) => {
      if (!dispatch) return false;

      const tr = cmdState.tr;

      // Insert position: before next visible block (after collapsed range)
      const insertPos = nextVisible.pos;

      // 🔑 Use centralized createBlock() - handles identity + guards
      const paragraphNode = createBlock(cmdState, tr, {
        type: 'paragraph',
        insertPos,
        indent: currentIndent, // Preserve indent level
      });

      // If createBlock failed, abort
      if (!paragraphNode) {
        console.error('[enterSkipHiddenBlocks] Failed to create paragraph');
        return false;
      }

      // Move cursor into the new paragraph
      // Position is after opening tag of new paragraph
      const cursorPos = insertPos + 1;
      tr.setSelection(TextSelection.create(tr.doc, cursorPos));

      // Mark for history
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter is its own undo step

      // Dispatch ONCE - no more transactions
      dispatch(tr);
      return true; // HARD STOP - prevent fallthrough to performStructuralEnter
    });
  },
});
