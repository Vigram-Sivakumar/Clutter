/**
 * ListBlock Node - Unified list item (bullet, numbered, task)
 * 
 * Notion-style flat list structure where each list item is a top-level block.
 * - No nesting of <ul>/<li> - each item is independent
 * - Level attribute controls indentation (unlimited nesting)
 * - listType determines marker style (bullet, numbered, task)
 * - checked attribute for task lists
 * - collapsed attribute for tasks with subtasks
 * - Contains inline content (text with marks)
 * 
 * Features:
 * - Tab: Indent (max 1 level deeper than previous item - Notion-style)
 * - Shift+Tab: Outdent (cascades to children)
 * - Enter: New list item or exit to paragraph if empty
 * - Backspace: Outdent or convert to paragraph
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { spacing, sizing } from '../../tokens';
import type { ListType, ListBlockAttrs } from '../../types';
import { ListBlock as ListBlockComponent } from '../../components/ListBlock';
import { createShiftEnterHandler, createSiblingAttrs, findAncestorNode, handleEmptyBlockInToggle, indentBlock, outdentBlock } from '../../utils/keyboardHelpers';
import { EnterRules, BackspaceRules } from '../../utils/keyboardRules';
import { handleEnter } from '../../plugins/keyboard'; // NEW: Use rule engine for Enter

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listBlock: {
      /**
       * Set a list block with specified type
       */
      setListBlock: (listType: ListType, checked?: boolean) => ReturnType;
      /**
       * Toggle list block type
       */
      toggleListBlock: (listType: ListType) => ReturnType;
    };
  }
}

export const ListBlock = Node.create({
  name: 'listBlock',

  // Higher priority so keyboard handlers run before global handlers
  priority: 1000,

  // Block-level content
  group: 'block',

  // Contains inline content (text with marks)
  content: 'inline*',

  // Defines its own boundaries
  defining: true,

  // Attributes
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
      listType: {
        default: 'bullet' as ListType,
        parseHTML: (element) => element.getAttribute('data-list-type') || 'bullet',
        renderHTML: (attributes) => ({ 'data-list-type': attributes.listType }),
      },
      level: {
        default: 0,
        parseHTML: (element) => parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: (attributes) => ({ 'data-level': attributes.level || 0 }),
      },
      checked: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-checked');
          return val === 'true' ? true : val === 'false' ? false : null;
        },
        renderHTML: (attributes) => {
          if (attributes.checked === null) return {};
          return { 'data-checked': attributes.checked ? 'true' : 'false' };
        },
      },
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.collapsed) return {};
          return { 'data-collapsed': 'true' };
        },
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
      priority: {
        default: 0,
        parseHTML: (element) => parseInt(element.getAttribute('data-priority') || '0', 10),
        renderHTML: (attributes) => {
          if (!attributes.priority) return {};
          return { 'data-priority': attributes.priority };
        },
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [
      {
        tag: 'div[data-type="listBlock"]',
      },
    ];
  },

  // Render to HTML (for non-React contexts)
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as ListBlockAttrs;
    const indent = attrs.level * spacing.indent;

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'listBlock',
        style: `
          margin: ${spacing.margin}px 0;
          padding-left: ${indent}px;
        `.replace(/\s+/g, ' ').trim(),
      }),
      0,
    ];
  },

  // Use React component for rendering
  addNodeView() {
    return ReactNodeViewRenderer(ListBlockComponent);
  },

  // Commands
  addCommands() {
    return {
      setListBlock:
        (listType, checked = false) =>
        ({ commands }) => {
          const attrs: Partial<ListBlockAttrs> = { listType, level: 0 };
          if (listType === 'task') {
            attrs.checked = checked;
          }
          return commands.setNode(this.name, attrs);
        },

      toggleListBlock:
        (listType) =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name, { listType })) {
            return commands.setNode('paragraph');
          }
          return commands.setNode(this.name, { listType, level: 0, checked: listType === 'task' ? false : null });
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      // Shift+Enter: Insert line break (soft break)
      'Shift-Enter': createShiftEnterHandler('listBlock'),

      Tab: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        
        // Find listBlock position
        for (let d = $from.depth; d >= 1; d--) {
          const pos = $from.before(d);
          const node = state.doc.nodeAt(pos);
          if (node && node.type.name === 'listBlock') {
            return indentBlock(editor, pos, node);
          }
        }
        return false;
      },
      'Shift-Tab': ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        
        // Find listBlock position
        for (let d = $from.depth; d >= 1; d--) {
          const pos = $from.before(d);
          const node = state.doc.nodeAt(pos);
          if (node && node.type.name === 'listBlock') {
            return outdentBlock(editor, pos, node);
          }
        }
        return false;
      },

      Enter: ({ editor }) => {
        // NEW: Use rule engine for Enter behavior
        // This handles:
        // - splitListItem (priority 110) - splits at cursor position
        // - exitEmptyListInWrapper (priority 100)
        // - outdentEmptyList (priority 90)
        // All other exit/split behaviors
        const handled = handleEnter(editor);
        
        if (handled) {
          return true;
        }
        
        // Fallback: default TipTap behavior (shouldn't reach here for lists)
        return false;
      },

      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { empty } = selection;

        // Only handle if selection is empty (cursor, not range)
        if (!empty) return false;

        // PHASE 1 REFACTOR: Use detector for empty listBlock backspace context
        const context = BackspaceRules.getEmptyListBlockBackspaceContext(editor);

        if (!context.isEmpty) {
          return false;
        }

        // Get data from context
        const listBlock = context.listBlock!;
        const listBlockPos = listBlock.pos;
        const listBlockNode = listBlock.node;

        // Case 1: Should outdent (level > 0)
        if (context.shouldOutdent) {
          return outdentBlock(editor, listBlockPos, listBlockNode);
        }

        // Case 2: Should convert to paragraph (level 0, empty)
        // Converts in place - works both inside and outside wrappers
        if (context.shouldConvertToParagraph) {
          // (KEEP ALL EXECUTION CODE)
        const { tr } = state;
          // ListBlock now has inline* content directly (no nested paragraph)
          const content = listBlockNode.content;
          const listBlockAttrs = listBlockNode.attrs as ListBlockAttrs;
        
        console.log('🟠 ListBlock Enter: Converting to paragraph with attrs', {
          parentToggleId: listBlockAttrs.parentToggleId,
          level: listBlockAttrs.level,
        });
        
        const paragraphType = state.schema.nodes.paragraph;
        if (!paragraphType) return false;
        
        // ✅ Preserve structural context when converting to paragraph
        const siblingAttrs = createSiblingAttrs(listBlockAttrs);
        
        const paragraphNode = paragraphType.create({
          blockId: crypto.randomUUID(),  // Generate blockId immediately
          level: listBlockAttrs.level || 0,  // Preserve current level
          ...siblingAttrs,  // ✅ Copy parentBlockId + parentToggleId
        }, content);
        tr.replaceRangeWith(listBlockPos, listBlockPos + listBlockNode.nodeSize, paragraphNode);
        // Set cursor at start of paragraph
        tr.setSelection(TextSelection.near(tr.doc.resolve(listBlockPos + 1)));
        editor.view.dispatch(tr);
        return true;
        }

        return false;
      },
    };
  },
});

