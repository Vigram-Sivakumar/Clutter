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
    const { $from } = ctx;

    // BLOCK IDENTITY LAW: Derive blockId from ProseMirror selection, not Engine state
    // Walk up from cursor position to find first node with blockId attribute
    let blockId: string | null = null;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.attrs?.blockId) {
        blockId = node.attrs.blockId;
        break;
      }
    }

    if (!blockId) {
      console.warn(
        '✨ [indentBlock.execute] No blockId found in selection hierarchy'
      );
      // Return noop intent instead of crashing
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
