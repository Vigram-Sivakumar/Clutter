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
import { getBlockIdFromSelection } from '../../../../utils/keyboardHelpers';

export const indentBlock = defineRule({
  id: 'tab:indentBlock',
  description: 'Indent block on Tab',
  priority: 100,

  when(ctx: KeyboardContext): boolean {
    const { key } = ctx;

    console.log('🔍 [indentBlock.when] Checking, key:', key);

    // Must be Tab key (no shift)
    if (key !== 'Tab') {
      console.log('🔍 [indentBlock.when] Not Tab, skipping');
      return false;
    }

    // For now, always match Tab
    // Resolver will decide if intent is valid
    console.log('🔍 [indentBlock.when] Match! Will execute');
    return true;
  },

  execute(ctx: KeyboardContext): EditorIntent {
    const { state } = ctx;

    // BLOCK IDENTITY LAW: Derive blockId from ProseMirror selection
    // This ensures we're reading from the CURRENT document state,
    // not from cached/stale data
    const blockId = getBlockIdFromSelection(state);

    if (!blockId) {
      console.warn('[indentBlock] No blockId found from selection');
      return { type: 'noop' };
    }

    console.log(
      '✨ [indentBlock.execute] Emitting indent-block intent for:',
      blockId
    );

    return {
      type: 'indent-block',
      blockId,
    };
  },
});
