/**
 * Indent Block Rule (Tab)
 *
 * When: Tab pressed (no shift modifier)
 * Do: Emit indent-block intent
 *
 * Canonical Decision Table: TAB (no modifiers)
 * - Block supports nesting → indent-block intent
 * - Block does NOT support nesting → noop intent
 * - Multiple blocks selected → indent-block (applied in order)
 *
 * Resolver decides:
 * - Whether block can be indented
 * - How lists change depth
 * - How toggles nest
 * - How callouts nest
 * - Cursor placement
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';

export const indentBlock = defineRule({
  id: 'tab:indentBlock',
  description: 'Indent block on Tab',
  priority: 100,

  when(ctx: KeyboardContext): boolean {
    const { key } = ctx;

    // Must be Tab key (no shift)
    if (key !== 'Tab') {
      return false;
    }

    // For now, always match Tab
    // Resolver will decide if intent is valid
    return true;
  },

  execute(ctx: KeyboardContext): EditorIntent {
    const { currentNode } = ctx;

    return {
      type: 'indent-block',
      blockId: currentNode.attrs.blockId,
    };
  },
});
