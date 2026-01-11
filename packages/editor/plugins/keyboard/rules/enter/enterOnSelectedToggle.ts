/**
 * Enter On Selected Block (Halo Selection) - GLOBAL RULE
 *
 * 🔒 CANONICAL BEHAVIOR (ALL BLOCK TYPES):
 * When ANY block is structurally selected (halo/NodeSelection) and Enter is pressed:
 * → Create a new paragraph below
 * → Same indent as selected block
 * → Cursor moves into the new paragraph
 * → Selected block remains unchanged
 *
 * Applies to: Paragraph, Heading, ListBlock, Toggle, HorizontalRule, Blockquote, etc.
 * 
 * This is NOT a fallback. This is the PRIMARY Enter behavior for NodeSelection.
 * Priority 1000 ensures it runs BEFORE all other Enter rules.
 * 
 * This prevents:
 * - "RangeError: There is no position before the top-level node" crashes
 * - Block-specific divergence in Enter behavior
 * - Accidental text splitting when block is halo-selected
 */

import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { defineRule } from '../../types/KeyboardRule';

export const enterOnSelectedBlock = defineRule({
  id: 'enter:onSelectedBlock',
  priority: 1000, // HIGHEST - runs before ALL other Enter rules

  when: ({ state }) => {
    // Match ANY NodeSelection (structural block selection)
    return state.selection instanceof NodeSelection;
  },

  execute: ({ editor, state }) => {
    const { selection } = state;
    const { $to, node } = selection as NodeSelection;

    // Get indent from selected block (works for ANY block type)
    const indent = node.attrs?.indent ?? 0;

    // Insert position: after the selected block
    // $to.pos + 1 is guaranteed valid for NodeSelection
    const insertPos = $to.pos + 1;

    editor.commands.command(({ state, dispatch }) => {
      if (!dispatch) return false;

      const tr = state.tr;

      // Create new paragraph with same indent
      const paragraphNode = state.schema.nodes.paragraph.create({
        blockId: crypto.randomUUID(),
        indent,
      });

      tr.insert(insertPos, paragraphNode);
      
      // Move cursor into the new paragraph
      // Position is after opening tag of new paragraph
      const cursorPos = insertPos + 1;
      tr.setSelection(TextSelection.create(tr.doc, cursorPos));

      // Mark for history
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter is its own undo step

      dispatch(tr);
      return true;
    });

    return true;
  },
});
