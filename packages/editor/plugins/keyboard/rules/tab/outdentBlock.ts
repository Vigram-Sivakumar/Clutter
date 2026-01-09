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

export const outdentBlock = defineRule({
  id: 'tab:outdentBlock',
  description: 'Outdent block on Shift+Tab',
  priority: 100,

  when(ctx: KeyboardContext): boolean {
    const { key } = ctx;

    // Must be Tab key
    if (key !== 'Tab') {
      return false;
    }

    // Must have shift modifier
    const event = (ctx as any).event; // Access raw event if available
    if (!event || !event.shiftKey) {
      return false;
    }

    // For now, always match Shift+Tab
    // Resolver will decide if intent is valid
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
        '✨ [outdentBlock.execute] No blockId found in selection hierarchy'
      );
      // Return noop intent instead of crashing
      return { type: 'noop' };
    }

    return {
      type: 'outdent-block',
      blockId,
    };
  },
});
