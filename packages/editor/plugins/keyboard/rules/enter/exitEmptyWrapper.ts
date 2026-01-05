/**
 * Exit Empty Wrapper Rule (Enter)
 * 
 * When: Empty block inside blockquote/callout
 * Do: Exit the wrapper by converting to paragraph outside
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { findAncestorNode } from '../../../../utils/keyboardHelpers';

export const exitEmptyWrapper = defineRule({
  id: 'enter:exitEmptyWrapper',
  description: 'Exit wrapper when pressing Enter in empty block',
  priority: 70,
  
  when(ctx: KeyboardContext): boolean {
    const { editor, currentNode } = ctx;
    
    // Current block must be empty
    if (currentNode.textContent !== '') {
      return false;
    }
    
    // Must be inside a wrapper
    const wrapper = findAncestorNode(editor, ['blockquote', 'callout']);
    return !!wrapper;
  },
  
  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;
    
    return editor
      .chain()
      .setNode('paragraph')
      .run();
  },
});

