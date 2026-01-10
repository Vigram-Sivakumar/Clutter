/**
 * Callout Node - Colored callout blocks (info, warning, error, success)
 * 
 * Block element with colored left border and background.
 * Contains inline content (text with marks).
 */

import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Callout as CalloutComponent } from '../../components/Callout';
import { 
  createShiftEnterHandler, 
  createWrapperEnterHandler, 
  createWrapperBackspaceHandler,
} from '../../utils/keyboardHelpers';
import { EnterRules } from '../../utils/keyboardRules';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules

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
    // NOTE: Tab / Shift+Tab behavior is centrally handled
    // via keyboard rules emitting indent-block / outdent-block intents.
    // Node extensions must not handle structural keyboard logic.
    return {

      'Shift-Enter': createShiftEnterHandler('callout'),
      
      // PHASE 2: Use generic wrapper handlers
      Backspace: createWrapperBackspaceHandler('callout'),
      Enter: createWrapperEnterHandler('callout'),
    };
  },
});
