/**
 * Callout Node - Colored callout blocks (info, warning, error, success)
 * 
 * Block element with colored left border and background.
 * Contains inline content (text with marks).
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Callout as CalloutComponent } from '../../components/Callout';
import { 
  createShiftEnterHandler, 
  createWrapperEnterHandler, 
  createWrapperBackspaceHandler,
  indentBlock,
  outdentBlock
} from '../../utils/keyboardHelpers';
import { EnterRules } from '../../utils/keyboardRules';

export interface CalloutAttrs {
  type: 'info' | 'warning' | 'error' | 'success';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: CalloutAttrs) => ReturnType;
      toggleCallout: (attrs?: CalloutAttrs) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  
  // Higher priority so keyboard handlers run before global handlers
  priority: 1000,
  
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: (attributes) => {
          const blockId = attributes.blockId || crypto.randomUUID();
          return { 'data-block-id': blockId };
        },
      },
      parentBlockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-parent-block-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentBlockId) {
            return { 'data-parent-block-id': attributes.parentBlockId };
          }
          return {};
        },
      },
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes) => {
          return {
            'data-callout-type': attributes.type,
          };
        },
      },
      level: {
        default: 0,
        parseHTML: (element) => parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: (attributes) => ({ 'data-level': attributes.level || 0 }),
      },
      parentToggleId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-parent-toggle-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentToggleId) {
            return { 'data-parent-toggle-id': attributes.parentToggleId };
          }
          return {};
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent) as any;
  },
  addCommands() {
    return {
      setCallout: (attrs) => ({ commands }) => {
        return commands.wrapIn(this.name, attrs);
      },
      toggleCallout: (attrs) => ({ commands }) => {
        return commands.toggleWrap(this.name, attrs);
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      // Tab: Indent callout
      Tab: ({ editor }) => {
        const context = EnterRules.getWrapperBlockContext(editor, 'callout');
        if (!context.inWrapper) return false;
        
        return indentBlock(editor, context.wrapperPos!, context.wrapperNode!);
      },

      // Shift-Tab: Outdent callout
      'Shift-Tab': ({ editor }) => {
        const context = EnterRules.getWrapperBlockContext(editor, 'callout');
        if (!context.inWrapper) return false;
        
        return outdentBlock(editor, context.wrapperPos!, context.wrapperNode!);
      },

      'Shift-Enter': createShiftEnterHandler('callout'),
      
      // PHASE 2: Use generic wrapper handlers
      Backspace: createWrapperBackspaceHandler('callout'),
      Enter: createWrapperEnterHandler('callout'),
    };
  },
});
