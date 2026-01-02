import { Extension } from '@tiptap/core';
import { handleEmptyBlockInToggle } from '../utils/keyboardHelpers';

export const EnterHandler = Extension.create({
  name: 'enterHandler',
  priority: 1000, // High priority to run before individual block handlers

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        if ($from.depth < 1) return false;
        
        const currentBlock = $from.parent;
        const blockPos = $from.before();
        const attrs = currentBlock.attrs;
        
        const isEmpty = currentBlock.textContent === '';
        const currentLevel = attrs.level || 0;
        const hasParentToggle = !!attrs.parentToggleId;
        
        if (isEmpty && (currentLevel > 0 || hasParentToggle)) {
          return handleEmptyBlockInToggle(
            editor,
            blockPos,
            currentBlock,
            currentBlock.type.name
          );
        }
        return false;
      },
    };
  },
});

