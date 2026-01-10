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
import { ToggleHeader as ToggleHeaderComponent } from '../../components/ToggleHeader';
import {
  createShiftEnterHandler,
  createSiblingAttrs,
} from '../../utils/keyboardHelpers';
import { BackspaceRules } from '../../utils/keyboardRules';
import { EditorEngine } from '../../core/engine/EditorEngine';
import { DeleteBlockCommand } from '../../core/engine/command';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules

/**
 * Get EditorEngine from TipTap editor instance
 */
function getEngine(editor: any): EditorEngine | null {
  return editor._engine || null;
}

export interface ToggleHeaderAttrs {
  blockId: string;
  parentBlockId: string | null;
  collapsed: boolean;
  toggleId: string;
  level: number;
  parentToggleId: string | null;
}

declare module '@tiptap/core' {
  // eslint-disable-next-line no-unused-vars
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
        parseHTML: (element) =>
          element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: (attributes) => {
          const blockId = attributes.blockId || crypto.randomUUID();
          return { 'data-block-id': blockId };
        },
      },
      parentBlockId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-parent-block-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentBlockId) {
            return { 'data-parent-block-id': attributes.parentBlockId };
          }
          return {};
        },
      },
      collapsed: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.collapsed) return {};
          return { 'data-collapsed': 'true' };
        },
      },
      toggleId: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-toggle-id') || crypto.randomUUID(),
        renderHTML: (attributes) => ({ 'data-toggle-id': attributes.toggleId }),
      },
      level: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: (attributes) => ({ 'data-level': attributes.level || 0 }),
      },
      parentToggleId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-parent-toggle-id') || null,
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
  renderHTML({ HTMLAttributes }) {
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
            toggleId: crypto.randomUUID(),
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

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // CANONICAL TOGGLE ENTER BEHAVIOR (Notion/Craft-style)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        if (!isEmpty) {
          // 🔑 CASE A1: Cursor in non-empty toggle header
          // ACTION: Create first CHILD paragraph (descend into toggle)
          //
          // BEFORE:  ▶ My Toggle
          // AFTER:   ▼ My Toggle
          //            └─ Paragraph (empty, cursor here)
          //
          // CRITICAL: This is NOT a sibling - it's a CHILD
          // parentToggleId = this toggle's toggleId

          const endPos = toggleHeaderPos + toggleHeaderNode.nodeSize;
          const toggleId = attrs.toggleId;

          console.log(
            '✅ ToggleHeader Enter: Creating FIRST CHILD (descend into toggle)',
            {
              toggleId,
              parentBlockId: attrs.blockId, // Child's parent is the toggle block
              parentToggleId: toggleId, // Child belongs to this toggle
            }
          );

          return (
            editor
              .chain()
              // Expand toggle if collapsed
              .updateAttributes(this.name, { collapsed: false })
              // Create child paragraph
              .insertContentAt(endPos, {
                type: 'paragraph',
                attrs: {
                  blockId: crypto.randomUUID(),
                  parentBlockId: attrs.blockId, // ✅ Child's parent = toggle block
                  parentToggleId: toggleId, // ✅ Child belongs to this toggle
                  level: attrs.level, // Inherit level
                },
              })
              .setTextSelection(endPos + 1)
              .run()
          );
        }

        // 🔑 CASE A2: Empty toggle header
        // ACTION: Convert to paragraph (exit toggle mode)
        //
        // BEFORE:  ▶ (empty toggle)
        // AFTER:   Paragraph (empty, cursor here)
        //
        // Children (if any) are promoted by engine (Engine Law #8)

        const engine = getEngine(editor);

        if (!engine) {
          console.error('[ToggleHeader.Enter] EditorEngine not found');
          return false;
        }

        const toggleBlockId = attrs.blockId;
        if (!toggleBlockId) {
          console.warn('[ToggleHeader.Enter] No blockId found');
          return false;
        }

        console.log(
          `✅ ToggleHeader Enter: Converting empty toggle to paragraph: ${toggleBlockId}`
        );

        // Delete toggle - engine handles child promotion
        const cmd = new DeleteBlockCommand(toggleBlockId);
        engine.dispatch(cmd);

        // After engine deletion, create new paragraph at same position
        requestAnimationFrame(() => {
          const { tr: newTr, schema } = editor.state;
          const paragraphType = schema.nodes.paragraph;
          if (!paragraphType) return;

          const insertPos = Math.min(toggleHeaderPos, newTr.doc.content.size);

          // ✅ CONTRACT: Create paragraph with NEW blockId
          const siblingAttrs = createSiblingAttrs(attrs);
          const paragraphNode = paragraphType.create({
            blockId: crypto.randomUUID(), // NEW blockId
            ...siblingAttrs, // Preserve parentBlockId
          });

          newTr.insert(insertPos, paragraphNode);
          newTr.setSelection(TextSelection.create(newTr.doc, insertPos + 1));
          editor.view.dispatch(newTr);
        });

        return true;
      },

      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        // Only handle if selection is empty (cursor, not range)
        if (!empty) return false;

        // Get current toggle header
        const currentToggle = $from.parent;
        if (currentToggle.type.name !== 'toggleHeader') return false;

        const togglePos = $from.before($from.depth);
        const currentBlockId = currentToggle.attrs?.blockId;

        // Check if cursor is at start of toggle
        const atStart = $from.parentOffset === 0;

        // CASE 1: EMPTY TOGGLE HEADER
        const context = BackspaceRules.getWrapperBlockBackspaceContext(
          editor,
          'toggleHeader'
        );

        if (context.isEmpty) {
          // ✅ USE ENGINE PRIMITIVE: Delete toggle via DeleteBlockCommand
          // This ensures children are promoted (Engine Law #8)
          const engine = getEngine(editor);

          if (!engine) {
            console.error('[ToggleHeader.Backspace] EditorEngine not found');
            return false;
          }

          if (!currentBlockId) {
            console.warn('[ToggleHeader.Backspace] No blockId found');
            return false;
          }

          console.log(
            `[ToggleHeader.Backspace] Deleting empty toggle: ${currentBlockId}`
          );

          // Delete toggle - engine handles child promotion
          const cmd = new DeleteBlockCommand(currentBlockId);
          engine.dispatch(cmd);

          // Position cursor after engine processes deletion
          requestAnimationFrame(() => {
            const beforePos = Math.max(0, togglePos - 1);
            try {
              const $pos = editor.state.tr.doc.resolve(beforePos);
              const selection = TextSelection.near($pos, -1);
              const tr = editor.state.tr.setSelection(selection);
              editor.view.dispatch(tr);
            } catch (e) {
              const $pos = editor.state.tr.doc.resolve(Math.max(0, beforePos));
              const selection = TextSelection.near($pos);
              const tr = editor.state.tr.setSelection(selection);
              editor.view.dispatch(tr);
            }
          });

          return true;
        }

        // CASE 2: NON-EMPTY TOGGLE HEADER
        // ✅ EXPLICIT MERGE LOGIC (NO PM DEFAULT)
        //
        // Contract: Backspace at start of non-empty toggle → merge with previous
        // Survivor Rule: Previous block survives (Destructive Survivor Rule)
        // Engine Safety: Delete toggle → promotes children

        if (!atStart) {
          // Not at start - let PM handle character deletion
          return false;
        }

        // At start of non-empty toggle - check for previous block
        const beforePos = togglePos;
        let previousBlockNode = null;
        let previousBlockPos = -1;

        try {
          const $before = state.doc.resolve(beforePos);
          if ($before.nodeBefore) {
            previousBlockNode = $before.nodeBefore;
            previousBlockPos = beforePos - previousBlockNode.nodeSize;
          }
        } catch (e) {
          // No previous block
        }

        if (!previousBlockNode) {
          // No previous block - noop (at document start)
          console.log('[ToggleHeader.Backspace] At document start - noop');
          return false;
        }

        // Check if previous block is structural (cannot merge)
        const isStructuralPrevious = ['codeBlock', 'divider', 'image'].includes(
          previousBlockNode.type.name
        );

        if (isStructuralPrevious) {
          console.log(
            '[ToggleHeader.Backspace] Cannot merge with structural block - noop'
          );
          return false;
        }

        // ✅ MERGE WITH PREVIOUS BLOCK
        const previousBlockId = previousBlockNode.attrs?.blockId;
        const engine = getEngine(editor);

        if (!engine) {
          console.error('[ToggleHeader.Backspace] EditorEngine not found');
          return false;
        }

        if (!currentBlockId || !previousBlockId) {
          console.warn('[ToggleHeader.Backspace] Missing blockIds for merge');
          return false;
        }

        // Extract current toggle's content BEFORE deletion
        const currentContent = currentToggle.content;

        // Calculate merge position (end of previous block)
        const previousBlockContentSize = previousBlockNode.content.size;
        const mergePos = previousBlockPos + 1 + previousBlockContentSize; // +1 for opening tag

        console.log(
          `[ToggleHeader.Backspace] Merging into previous: ${previousBlockId}`
        );

        // ✅ USE ENGINE PRIMITIVE: Delete current toggle via DeleteBlockCommand
        // This ensures children are promoted (Engine Law #8)
        const cmd = new DeleteBlockCommand(currentBlockId);
        engine.dispatch(cmd);

        // After engine deletion, insert content into previous block
        requestAnimationFrame(() => {
          const { tr: newTr } = editor.state;
          // Re-resolve merge position in new document
          const newMergePos = Math.min(mergePos, newTr.doc.content.size - 1);

          if (currentContent.size > 0) {
            newTr.insert(newMergePos, currentContent);
          }

          // Position cursor at merge point
          newTr.setSelection(TextSelection.create(newTr.doc, newMergePos));
          editor.view.dispatch(newTr);
        });

        return true;
      },

      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        // Only handle if selection is empty (cursor, not range)
        if (!empty) return false;

        // Get current toggle header
        const currentToggle = $from.parent;
        if (currentToggle.type.name !== 'toggleHeader') return false;

        const togglePos = $from.before($from.depth);
        const currentBlockId = currentToggle.attrs?.blockId;
        const isEmpty = currentToggle.textContent.length === 0;

        // Check if cursor is at end of toggle
        const atEnd = $from.parentOffset === currentToggle.content.size;

        // CASE 1: EMPTY TOGGLE HEADER
        if (isEmpty) {
          // 🔒 EDITOR INVARIANT: Document must always contain ≥ 1 block
          let blockCount = 0;
          state.doc.descendants((node) => {
            if (node.isBlock && node.type.name !== 'doc') {
              blockCount++;
            }
          });

          if (blockCount <= 1) {
            console.log(
              '🔒 [ToggleHeader.Delete] Cannot delete only block in document'
            );
            return false; // noop - preserve document invariant
          }

          const engine = getEngine(editor);
          if (!engine) {
            console.error('[ToggleHeader.Delete] EditorEngine not found');
            return false;
          }

          if (!currentBlockId) {
            console.warn('[ToggleHeader.Delete] No blockId found');
            return false;
          }

          console.log(
            `[ToggleHeader.Delete] Deleting empty toggle: ${currentBlockId}`
          );

          // ✅ USE ENGINE PRIMITIVE: Delete via DeleteBlockCommand
          const cmd = new DeleteBlockCommand(currentBlockId);
          engine.dispatch(cmd);

          // Position cursor after engine processes deletion
          requestAnimationFrame(() => {
            const beforePos = Math.max(0, togglePos - 1);
            try {
              const $pos = editor.state.tr.doc.resolve(beforePos);
              const selection = TextSelection.near($pos, -1);
              const tr = editor.state.tr.setSelection(selection);
              editor.view.dispatch(tr);
            } catch (e) {
              const $pos = editor.state.tr.doc.resolve(Math.max(0, beforePos));
              const selection = TextSelection.near($pos);
              const tr = editor.state.tr.setSelection(selection);
              editor.view.dispatch(tr);
            }
          });

          return true;
        }

        // CASE 2: NON-EMPTY TOGGLE HEADER
        // ✅ EXPLICIT MERGE LOGIC (NO PM DEFAULT)
        //
        // Contract: Delete at end of non-empty toggle → merge next into current
        // Survivor Rule: Current toggle survives (Destructive Survivor Rule)
        // Engine Safety: Delete next → promotes its children

        if (!atEnd) {
          // Not at end - let PM handle character deletion
          return false;
        }

        // At end of non-empty toggle - check for next block
        const afterPos = togglePos + currentToggle.nodeSize;
        let nextBlockNode = null;

        try {
          const $after = state.doc.resolve(afterPos);
          if ($after.nodeAfter) {
            nextBlockNode = $after.nodeAfter;
          }
        } catch (e) {
          // No next block
        }

        if (!nextBlockNode) {
          // No next block - noop (at document end)
          console.log('[ToggleHeader.Delete] At document end - noop');
          return false;
        }

        // Check if next block is structural (cannot merge)
        const isStructuralNext = ['codeBlock', 'divider', 'image'].includes(
          nextBlockNode.type.name
        );

        if (isStructuralNext) {
          console.log(
            '[ToggleHeader.Delete] Cannot merge with structural block - noop'
          );
          return false;
        }

        // ✅ MERGE NEXT BLOCK INTO CURRENT
        const nextBlockId = nextBlockNode.attrs?.blockId;
        const engine = getEngine(editor);

        if (!engine) {
          console.error('[ToggleHeader.Delete] EditorEngine not found');
          return false;
        }

        if (!currentBlockId || !nextBlockId) {
          console.warn('[ToggleHeader.Delete] Missing blockIds for merge');
          return false;
        }

        // Store cursor position at merge point (end of current toggle)
        const mergePos = $from.pos;

        // Extract next block's content BEFORE deletion
        const nextContent = nextBlockNode.content;

        console.log(
          `[ToggleHeader.Delete] Merging next into current: ${nextBlockId}`
        );

        // ✅ USE ENGINE PRIMITIVE: Delete next block via DeleteBlockCommand
        // This ensures next block's children are promoted (Engine Law #8)
        const cmd = new DeleteBlockCommand(nextBlockId);
        engine.dispatch(cmd);

        // After engine deletion, insert content into current toggle
        requestAnimationFrame(() => {
          const { tr: newTr } = editor.state;
          // Re-resolve merge position in new document
          const newMergePos = Math.min(mergePos, newTr.doc.content.size - 1);

          if (nextContent.size > 0) {
            newTr.insert(newMergePos, nextContent);
          }

          // Position cursor at merge point
          newTr.setSelection(TextSelection.create(newTr.doc, newMergePos));
          editor.view.dispatch(newTr);
        });

        return true;
      },
    };
  },
});
