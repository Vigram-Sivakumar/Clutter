/**
 * Exit Empty Block in Nested Structure Rule (Enter) - FLAT MODEL
 *
 * When: Empty block with indent > 0
 * Do: Outdent by 1 level
 *
 * FLAT MODEL BEHAVIOR:
 * - Empty block at indent > 0 + Enter → outdent by 1
 * - Empty block at indent 0 + Enter → handled by exitEmptyList rule
 * - Uses only `indent` attribute (no level, no parentToggleId)
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';

export const exitEmptyBlockInToggle = defineRule({
  id: 'enter:exitEmptyBlockInToggle',
  description:
    'Outdent empty block when pressing Enter (flat model)',
  priority: 115, // Higher than splitListItem (110) - must check empty blocks first

  when(ctx: KeyboardContext): boolean {
    const { currentNode, $from } = ctx;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔒 CRITICAL GUARD: Never fire when cursor is IN toggle header
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // This rule is for EXITING nested blocks, not for handling
    // Enter on the toggle header itself.
    //
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if ($from.parent.type.name === 'toggleHeader') {
      return false;
    }

    // Block must be empty
    if (currentNode.textContent !== '') {
      return false;
    }

    const attrs = currentNode.attrs;
    const currentIndent = attrs?.indent || 0;

    // Only handle if indent > 0 (indented blocks)
    return currentIndent > 0;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, state, currentNode } = ctx;

    const attrs = currentNode.attrs;
    const currentIndent = attrs?.indent || 0;

    if (currentIndent <= 0) return false;

    // ✅ CANONICAL ENTER PATTERN: ONE Enter = ONE transaction
    return editor.commands.command(({ state: cmdState, dispatch }) => {
      if (!dispatch) return false;

      const tr = cmdState.tr;
      const pos = state.selection.from;
      const $pos = cmdState.doc.resolve(pos);
      const blockPos = $pos.before($pos.depth);
      const blockNode = cmdState.doc.nodeAt(blockPos);

      if (!blockNode) return false;

      // Decrease indent by 1 (FLAT MODEL)
      tr.setNodeMarkup(blockPos, null, {
        ...blockNode.attrs,
        indent: Math.max(0, currentIndent - 1),
      });

      // Mark for undo - FORCE history boundary (one undo per Enter)
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter = separate undo step

      // Dispatch ONCE - no more transactions
      dispatch(tr);
      return true; // HARD STOP
    });
  },
});
