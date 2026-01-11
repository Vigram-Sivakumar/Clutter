/**
 * Enter Toggle Creates Paragraph Child Rule - FLAT MODEL
 *
 * When: Cursor inside a non-empty toggle list item
 * Do: Create paragraph child (not list item) at end of toggle's visual subtree
 *
 * Priority 120 (higher than splitListItem) ensures toggle behavior
 * runs BEFORE split logic for other list types.
 *
 * FLAT MODEL BEHAVIOR:
 * - Toggle + Enter → paragraph child at correct indent
 * - Inserts after entire visual subtree (all deeper-indented blocks)
 * - Uses only `indent` attribute (no parentBlockId, no level)
 * - Matches Notion/Craft UX
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { createBlock } from '../../../../core/createBlock';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const enterToggleCreatesChild = defineRule({
  id: 'enter:toggleCreateChild',
  description: 'Create paragraph child when pressing Enter in non-empty toggle',
  priority: 120, // Higher than splitListItem (110) - must run first

  when(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    // Must be in a list block
    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) {
      return false;
    }

    const attrs = listBlock.node.attrs;

    // ONLY toggles
    if (attrs.listType !== 'toggle') {
      return false;
    }

    // 🔥 CRITICAL: ONLY non-empty toggles create children
    // Empty toggles MUST follow global Enter rules (exit/outdent)
    // This enforces: "Emptiness beats structure"
    if (listBlock.node.textContent === '') {
      return false;
    }

    return true;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, state } = ctx;

    const listBlock = findAncestorNode(editor, 'listBlock');
    if (!listBlock) return false;

    const { node, pos } = listBlock;
    const attrs = node.attrs;

    // Only toggles, only non-empty (double-check)
    if (attrs.listType !== 'toggle') return false;
    if (listBlock.node.textContent === '') return false;

    // ✅ CANONICAL ENTER PATTERN: ONE Enter = ONE transaction
    // Do NOT use editor.chain() - it can split into multiple transactions
    return editor.commands.command(({ state, dispatch }) => {
      if (!dispatch) return false;
      
      // 🔥 TOGGLE HEADER ENTER = PREPEND FIRST CHILD
      // Insert immediately after toggle header (position + 1)
      // No subtree scanning - we always insert as FIRST child
      const baseIndent = attrs.indent ?? 0;
      const tr = state.tr;
      
      // Insert position: immediately after toggle header
      const insertAfterPos = pos + node.nodeSize;
      
      // New child indent: always toggleIndent + 1
      const newIndent = baseIndent + 1;
      
      // Create new paragraph with ONLY indent (flat model) using createBlock()
      const paragraph = createBlock(state, tr, {
        type: 'paragraph',
        insertPos: insertAfterPos,
        indent: newIndent,
      });
      
      // If createBlock failed, abort
      if (!paragraph) return false;
      
      // Position cursor at start of new paragraph (SAME transaction)
      const newCursorPos = insertAfterPos + 1;
      try {
        const $pos = tr.doc.resolve(newCursorPos);
        tr.setSelection(state.selection.constructor.near($pos));
      } catch (e) {
        console.warn('[enterToggleCreatesChild] Could not set selection:', e);
      }
      
      // Mark for undo - FORCE history boundary (one undo per Enter)
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter = separate undo step
      
      // 🔍 DIAGNOSTIC LOG
      console.log(
        '[ENTER TX] enterToggleCreatesChild',
        'steps:', tr.steps.length,
        'closeHistory:', tr.getMeta('closeHistory'),
        'addToHistory:', tr.getMeta('addToHistory')
      );
      
      // Dispatch ONCE - no more transactions after this
      dispatch(tr);
      return true; // HARD STOP - nothing else should run
    });
  },
});
