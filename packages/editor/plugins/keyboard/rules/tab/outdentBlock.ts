/**
 * Outdent Block Rule (Shift+Tab)
 *
 * When: Shift+Tab pressed
 * Do: Emit outdent-block intent
 *
 * Canonical Decision Table: SHIFT+TAB
 * - Block is nested (level > 0) → outdent-block intent
 * - Block at root level → noop intent
 * - Multiple blocks selected → outdent-block (applied in order)
 *
 * Resolver decides:
 * - Whether block can be outdented
 * - How lists decrease depth
 * - How toggles unnest
 * - Whether to convert to paragraph at root
 * - Cursor placement
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import type { EditorIntent } from '../../../../core/engine';
import { getBlockIdFromSelection } from '../../../../utils/keyboardHelpers';

export const outdentBlock = defineRule({
  id: 'tab:outdentBlock',
  description: 'Outdent block on Shift+Tab',
  priority: 100,

  when(ctx: KeyboardContext): boolean {
    const { key, editor } = ctx;

    // Must be Tab key
    if (key !== 'Tab') {
      return false;
    }

    // Must have shift modifier (stored on editor by handleTab)
    const isShift = (editor as any)._shiftPressed;
    if (!isShift) {
      return false;
    }

    console.log('🔍 [outdentBlock.when] Shift+Tab detected');

    // For now, always match Shift+Tab
    // Resolver will decide if intent is valid
    return true;
  },

  execute(ctx: KeyboardContext): EditorIntent {
    const { state } = ctx;

    // BLOCK IDENTITY LAW: Derive blockId from ProseMirror selection
    // This ensures we're reading from the CURRENT document state,
    // not from cached/stale data
    const blockId = getBlockIdFromSelection(state);

    if (!blockId) {
      console.warn('[outdentBlock] No blockId found from selection');
      return { type: 'noop' };
    }

    console.log(
      '✨ [outdentBlock.execute] Emitting outdent-block intent for:',
      blockId
    );

    return {
      type: 'outdent-block',
      blockId,
    };
  },
});
