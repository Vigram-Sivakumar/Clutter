/**
 * Create Paragraph After Heading Rule (Enter)
 *
 * When: At end of non-empty heading
 * Do: Create new paragraph below
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';

export const createParagraphAfterHeading = defineRule({
  id: 'enter:createParagraphAfterHeading',
  description: 'Create paragraph below when pressing Enter at end of heading',
  priority: 60,

  when(ctx: KeyboardContext): boolean {
    const { currentNode, cursorOffset } = ctx;

    // Must be in a heading
    if (currentNode.type.name !== 'heading') {
      return false;
    }

    // Heading must not be empty
    if (currentNode.textContent === '') {
      return false;
    }

    // Must be at end of heading
    return cursorOffset === currentNode.content.size;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, $from } = ctx;

    // 🔍 Log selection BEFORE dispatch
    console.log('[Enter Rule - NEW ENGINE] BEFORE dispatch', {
      selectionFrom: editor.state.selection.from,
      selectionTo: editor.state.selection.to,
      parent: editor.state.selection.$from.parent.type.name,
      pos: $from.pos,
      depth: $from.depth,
    });

    // Split block and convert new block to paragraph
    const result = editor.chain().splitBlock().setNode('paragraph').run();

    // 🔍 Log selection AFTER dispatch (with requestAnimationFrame)
    requestAnimationFrame(() => {
      const sel = editor.state.selection;
      console.log('[Enter Rule - NEW ENGINE] AFTER dispatch', {
        selectionFrom: sel.from,
        selectionTo: sel.to,
        parent: sel.$from.parent.type.name,
        result,
      });
      console.log(
        '[Enter Rule - NEW ENGINE] Doc after',
        editor.state.doc.toJSON()
      );
    });

    return result;
  },
});
