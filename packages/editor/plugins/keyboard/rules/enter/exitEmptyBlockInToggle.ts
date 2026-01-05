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
  description: 'Exit toggle/nested structure when pressing Enter in empty block',
  priority: 115, // Higher than splitListItem (110) - must check empty blocks first
  
  when(ctx: KeyboardContext): boolean {
    const { currentNode } = ctx;
    
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
    
    return handleEmptyBlockInToggle(
      editor,
      blockPos,
      currentNode,
      blockType
    );
  },
});

