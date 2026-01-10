/**
 * Exit Empty Block in Toggle Rule (Enter)
 *
 * When: Empty block with level > 0 OR parentToggleId
 * Do: Exit the toggle/nested structure
 *
 * This replaces the legacy EnterHandler.ts logic.
 * Priority 115 ensures it runs BEFORE splitListItem (110).
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { handleEmptyBlockInToggle } from '../../../../utils/keyboardHelpers';

export const exitEmptyBlockInToggle = defineRule({
  id: 'enter:exitEmptyBlockInToggle',
  description:
    'Exit toggle/nested structure when pressing Enter in empty block',
  priority: 115, // Higher than splitListItem (110) - must check empty blocks first

  when(ctx: KeyboardContext): boolean {
    const { currentNode, $from } = ctx;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔒 CRITICAL GUARD: Never fire when cursor is IN toggle header
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // This rule is for EXITING toggles from CHILDREN, not for handling
    // Enter on the toggle header itself.
    //
    // ToggleHeader has its own Enter handler that creates the first child.
    // If we fire here, we steal Enter and prevent descending into toggle.
    //
    // ❌ WRONG: enter:exitEmptyBlockInToggle fires on header → exits
    // ✅ RIGHT: ToggleHeader.Enter fires on header → descends
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
    const currentLevel = attrs?.level || 0;
    const hasParentToggle = !!attrs?.parentToggleId;

    // Only handle if level > 0 or has parent toggle
    return currentLevel > 0 || hasParentToggle;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, $from, currentNode } = ctx;
    const blockPos = $from.before();
    const blockType = currentNode.type.name;

    // TODO: Convert to intent once toggle architecture is redesigned
    // This uses complex helper with structural manipulation
    // Needs dedicated toggle/nesting intent design session

    return handleEmptyBlockInToggle(editor, blockPos, currentNode, blockType);
  },
});
