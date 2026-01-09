/**
 * ToggleHeader Node - Standalone collapsible toggle header
 * 
 * Craft/Notion-style flat structure where toggle header is a top-level block.
 * - No nesting - each toggle header is independent
 * - Level attribute controls indentation
 * - collapsed attribute controls visibility of children
 * - toggleId uniquely identifies this toggle
 * - Contains inline content (text with marks for rich text support)
 * 
 * Children blocks (paragraphs, lists, etc.) reference the toggle via parentToggleId.
 * When collapsed, children hide themselves by checking if their parent is collapsed.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { spacing } from '../../tokens';
import { ToggleHeader as ToggleHeaderComponent } from '../../components/ToggleHeader';
import { createShiftEnterHandler, createSiblingAttrs } from '../../utils/keyboardHelpers';
import { BackspaceRules } from '../../utils/keyboardRules';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules

export interface ToggleHeaderAttrs {
  blockId: string;
  parentBlockId: string | null;
  collapsed: boolean;
  toggleId: string;
  level: number;
  parentToggleId: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleHeader: {
      /**
       * Set a toggle header
       */
      setToggleHeader: () => ReturnType;
      /**
       * Toggle the collapsed state
       */
      toggleCollapse: () => ReturnType;
    };
  }
}

export const ToggleHeader = Node.create({
  name: 'toggleHeader',

  // High priority so Enter handler runs before defaults
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
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.collapsed) return {};
          return { 'data-collapsed': 'true' };
        },
      },
      toggleId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-toggle-id') || crypto.randomUUID(),
        renderHTML: (attributes) => ({ 'data-toggle-id': attributes.toggleId }),
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
          if (!attributes.parentToggleId) return {};
          return { 'data-parent-toggle-id': attributes.parentToggleId };
        },
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggleHeader"]',
      },
    ];
  },

  // Render to HTML (for non-React contexts)
  renderHTML({ node, HTMLAttributes }) {
    // Removed indentation logic - no padding-left based on level
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggleHeader',
      }),
      0,
    ];
  },

  // Use React component for rendering
  addNodeView() {
    return ReactNodeViewRenderer(ToggleHeaderComponent);
  },

  // Commands
  addCommands() {
    return {
      setToggleHeader:
        () =>
        ({ commands }) => {
          return commands.setNode(this.name, { 
            collapsed: false, 
            toggleId: crypto.randomUUID()
          });
        },

      toggleCollapse:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the toggleHeader ancestor
          let nodePos: number | null = null;
          let node = null;
          
          for (let d = $from.depth; d >= 1; d--) {
            const pos = $from.before(d);
            const n = state.doc.nodeAt(pos);
            if (n && n.type.name === this.name) {
              nodePos = pos;
              node = n;
              break;
            }
          }

          if (nodePos === null || !node) return false;

          const attrs = node.attrs as ToggleHeaderAttrs;

          if (dispatch) {
            const tr = state.tr.setNodeMarkup(nodePos, undefined, {
              ...attrs,
              collapsed: !attrs.collapsed,
            });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      // Shift+Enter: Insert line break (soft break)
      'Shift-Enter': createShiftEnterHandler('toggleHeader'),

      // NOTE: Tab / Shift+Tab behavior is centrally handled
      // via keyboard rules emitting indent-block / outdent-block intents.
      // Node extensions must not handle structural keyboard logic.

      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        
        // Find the toggle header node (same pattern as ListBlock)
        let toggleHeaderPos: number | null = null;
        let toggleHeaderNode = null;
        
        for (let d = $from.depth; d >= 1; d--) {
          const pos = $from.before(d);
          const node = state.doc.nodeAt(pos);
          if (node && node.type.name === this.name) {
            toggleHeaderPos = pos;
            toggleHeaderNode = node;
            break;
          }
        }

        if (toggleHeaderPos === null || !toggleHeaderNode) {
          return false;
        }

        const attrs = toggleHeaderNode.attrs as ToggleHeaderAttrs;
        const isEmpty = toggleHeaderNode.content.size === 0;
        
        if (!isEmpty) {
          const endPos = toggleHeaderPos + toggleHeaderNode.nodeSize;
          
          // If collapsed, check if it has children
          if (attrs.collapsed) {
            // Count children blocks that reference this toggle
            let hasChildren = false;
            state.doc.descendants((node, nodePos) => {
              if (nodePos > toggleHeaderPos) {
                const parentToggleId = node.attrs.parentToggleId;
                if (parentToggleId === attrs.toggleId) {
                  hasChildren = true;
                  return false; // Stop searching
                }
              }
              return true;
            });
            
            // If has children, create a sibling (don't create hidden child)
            if (hasChildren) {
              // ✅ Create sibling of toggle - copy toggle's structural context
              const siblingAttrs = createSiblingAttrs(attrs);
              
              console.log('🟡 ToggleHeader Enter: Collapsed + children → creating SIBLING', siblingAttrs);
              return editor.chain()
                .insertContentAt(endPos, {
                  type: 'paragraph',
                  attrs: {
                    blockId: crypto.randomUUID(),  // Generate blockId immediately
                    level: attrs.level || 0,  // Same level as toggle
                    ...siblingAttrs,  // ✅ Enforce invariant
                  },
                })
                .setTextSelection(endPos + 1)
                .run();
            }
            
            // If no children, expand and create child in one transaction
            console.log('🟡 ToggleHeader Enter: Collapsed + NO children → expanding and creating CHILD', {
              parentBlockId: attrs.blockId,
              parentToggleId: attrs.toggleId,
            });
            const { tr } = state;
            
            // Expand the toggle
            tr.setNodeMarkup(toggleHeaderPos, undefined, {
              ...attrs,
              collapsed: false,
            });
            
            // Create paragraph as child
            // ✅ Set both parentBlockId (hierarchy) and parentToggleId (toggle membership)
            const paragraphNode = state.schema.nodes.paragraph.create({
              blockId: crypto.randomUUID(),  // Generate blockId immediately
              level: (attrs.level || 0) + 1,  // Child is one level deeper
              parentBlockId: attrs.blockId,  // ✅ Child of toggle (explicit hierarchy)
              parentToggleId: attrs.toggleId,
            });
            tr.insert(endPos, paragraphNode);
            tr.setSelection(TextSelection.create(tr.doc, endPos + 1));
            
            editor.view.dispatch(tr);
            return true;
          }
          
          // Not collapsed - create paragraph as child
          // ✅ Child of toggle: set both parentBlockId (hierarchy) and parentToggleId (toggle membership)
          console.log('🟢 ToggleHeader Enter: Creating child paragraph', {
            parentBlockId: attrs.blockId,
            parentToggleId: attrs.toggleId,
          });
          return editor.chain()
            .insertContentAt(endPos, {
              type: 'paragraph',
              attrs: {
                blockId: crypto.randomUUID(),  // Generate blockId immediately
                level: (attrs.level || 0) + 1,  // Child is one level deeper
                parentBlockId: attrs.blockId,  // ✅ Child of toggle (explicit hierarchy)
                parentToggleId: attrs.toggleId,
              },
            })
            .setTextSelection(endPos + 1)
            .run();
        }

        // Empty toggle header - convert to paragraph
        // Detach all children (remove parentToggleId from them)
        const { tr } = state;
        
        // Find and detach all children with this toggleId
        state.doc.descendants((node, nodePos) => {
          if (nodePos > toggleHeaderPos && node.attrs.parentToggleId === attrs.toggleId) {
            // Remove parentToggleId only
            tr.setNodeMarkup(nodePos, undefined, {
              ...node.attrs,
              parentToggleId: null,
            });
          }
          return true;
        });
        
        // Now convert the toggle to paragraph
        const paragraphNode = state.schema.nodes.paragraph.create();
        tr.replaceRangeWith(toggleHeaderPos, toggleHeaderPos + toggleHeaderNode.nodeSize, paragraphNode);
        tr.setSelection(TextSelection.create(tr.doc, toggleHeaderPos + 1));
        editor.view.dispatch(tr);
        return true;
      },

      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { empty } = selection;

        if (!empty) return false;

        const context = BackspaceRules.getWrapperBlockBackspaceContext(editor, 'toggleHeader');

        if (!context.isEmpty) {
          return false;
        }

        const toggleHeader = context.block!;
        const toggleHeaderPos = toggleHeader.pos;
        const toggleHeaderNode = toggleHeader.node;

        if (context.shouldConvertToParagraph) {
          const { tr } = state;
          const toggleAttrs = toggleHeaderNode.attrs as ToggleHeaderAttrs;
          
          // Detach all children (remove parentToggleId from them)
          state.doc.descendants((node, nodePos) => {
            if (nodePos > toggleHeaderPos && node.attrs.parentToggleId === toggleAttrs.toggleId) {
              // Remove parentToggleId only
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                parentToggleId: null,
              });
            }
            return true;
          });
          
          const content = toggleHeaderNode.content;
          const paragraphNode = state.schema.nodes.paragraph.create(null, content);
          tr.replaceRangeWith(toggleHeaderPos, toggleHeaderPos + toggleHeaderNode.nodeSize, paragraphNode);
          tr.setSelection(state.selection.constructor.near(tr.doc.resolve(toggleHeaderPos + 1)));
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});
