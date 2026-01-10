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
import { spacing } from '../../tokens';
import type { ListType, ListBlockAttrs } from '../../types';
import { ListBlock as ListBlockComponent } from '../../components/ListBlock';
import {
  createShiftEnterHandler,
  createSiblingAttrs,
} from '../../utils/keyboardHelpers';
import { BackspaceRules } from '../../utils/keyboardRules';
import { handleEnter } from '../../plugins/keyboard';
// NOTE: Arrow navigation removed - now centralized in KeyboardShortcuts.ts
import { EditorEngine } from '../../core/engine/EditorEngine';
import { DeleteBlockCommand } from '../../core/engine/command';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules

/**
 * Get EditorEngine from TipTap editor instance
 */
function getEngine(editor: any): EditorEngine | null {
  return editor._engine || null;
}

declare module '@tiptap/core' {
  // eslint-disable-next-line no-unused-vars
  interface Commands<ReturnType> {
    listBlock: {
      /**
       * Set a list block with specified type
       */
      setListBlock: (_listType: ListType, _checked?: boolean) => ReturnType;
      /**
       * Toggle list block type
       */
      toggleListBlock: (_listType: ListType) => ReturnType;
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
      listType: {
        default: 'bullet' as ListType,
        parseHTML: (element) =>
          element.getAttribute('data-list-type') || 'bullet',
        renderHTML: (attributes) => ({ 'data-list-type': attributes.listType }),
      },
      level: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-level') || '0', 10),
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
        parseHTML: (element) =>
          element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.collapsed) return {};
          return { 'data-collapsed': 'true' };
        },
      },
      parentToggleId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-parent-toggle-id') || null,
        renderHTML: (attributes) => {
          if (attributes.parentToggleId) {
            return { 'data-parent-toggle-id': attributes.parentToggleId };
          }
          return {};
        },
      },
      priority: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-priority') || '0', 10),
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
        `
          .replace(/\s+/g, ' ')
          .trim(),
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
          return commands.setNode(this.name, {
            listType,
            level: 0,
            checked: listType === 'task' ? false : null,
          });
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      // NOTE: Arrow navigation is centrally handled in KeyboardShortcuts.ts
      // Removed from here to prevent TipTap handler collision (multiple extensions = cursor freeze)

      // Shift+Enter: Insert line break (soft break)
      'Shift-Enter': createShiftEnterHandler('listBlock'),

      // NOTE: Tab / Shift+Tab behavior is centrally handled
      // via keyboard rules emitting indent-block / outdent-block intents.
      // Node extensions must not handle structural keyboard logic.

      Enter: ({ editor }) => {
        // NEW: Use rule engine for Enter behavior
        // This handles:
        // - splitListItem (priority 110) - splits at cursor position
        // - exitEmptyListInWrapper (priority 100)
        // - outdentEmptyList (priority 90)
        // All other exit/split behaviors
        //
        // OWNERSHIP CONTRACT: Check result.handled and return boolean to TipTap
        const result = handleEnter(editor);

        if (result.handled) {
          return true; // Prevent default TipTap behavior
        }

        // Fallback: default TipTap behavior (shouldn't reach here for lists)
        return false;
      },

      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        // Only handle if selection is empty (cursor, not range)
        if (!empty) return false;

        // Get current list block
        const currentListBlock = $from.parent;
        if (currentListBlock.type.name !== 'listBlock') return false;

        const listBlockPos = $from.before($from.depth);
        const currentBlockId = currentListBlock.attrs?.blockId;

        // Check if cursor is at start of block
        const atStart = $from.parentOffset === 0;

        // CASE 1: EMPTY LIST BLOCK
        // PHASE 1 REFACTOR: Use detector for empty listBlock backspace context
        const context =
          BackspaceRules.getEmptyListBlockBackspaceContext(editor);

        if (context.isEmpty) {
          // Get data from context
          const listBlock = context.listBlock!;
          const emptyListBlockPos = listBlock.pos;
          const listBlockNode = listBlock.node;

          // Case 1: Should outdent (level > 0)
          // NOTE: This is now handled via keyboard rules (outdent-block intent)
          if (context.shouldOutdent) {
            return false; // Let keyboard rules handle it
          }

          // Case 2: Should convert to paragraph (level 0, empty)
          // Converts in place - works both inside and outside wrappers
          if (context.shouldConvertToParagraph) {
            // (KEEP ALL EXECUTION CODE)
            const { tr } = state;
            // ListBlock now has inline* content directly (no nested paragraph)
            const content = listBlockNode.content;
            const listBlockAttrs = listBlockNode.attrs as ListBlockAttrs;

            console.log(
              '🟠 ListBlock Backspace: Converting empty list to paragraph',
              {
                parentToggleId: listBlockAttrs.parentToggleId,
                level: listBlockAttrs.level,
              }
            );

            const paragraphType = state.schema.nodes.paragraph;
            if (!paragraphType) return false;

            // ✅ Preserve structural context when converting to paragraph
            const siblingAttrs = createSiblingAttrs(listBlockAttrs);

            const paragraphNode = paragraphType.create(
              {
                blockId: crypto.randomUUID(), // Generate blockId immediately
                ...siblingAttrs, // ✅ Copy parentBlockId + parentToggleId + level
              },
              content
            );
            tr.replaceRangeWith(
              emptyListBlockPos,
              emptyListBlockPos + listBlockNode.nodeSize,
              paragraphNode
            );
            // Set cursor at start of paragraph
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(emptyListBlockPos + 1))
            );
            editor.view.dispatch(tr);
            return true;
          }

          return false;
        }

        // CASE 2: NON-EMPTY LIST BLOCK
        // ✅ EXPLICIT MERGE LOGIC (NO PM DEFAULT)
        //
        // Contract: Backspace at start of non-empty block → merge with previous
        // Survivor Rule: Previous block survives (Destructive Survivor Rule)
        // Engine Safety: Delete source → promotes children

        if (!atStart) {
          // Not at start - let PM handle character deletion
          return false;
        }

        // At start of non-empty list - check for previous block
        const beforePos = listBlockPos;
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
          console.log('[ListBlock.Backspace] At document start - noop');
          return false;
        }

        // Check if previous block is structural (cannot merge)
        const isStructuralPrevious = ['codeBlock', 'divider', 'image'].includes(
          previousBlockNode.type.name
        );

        if (isStructuralPrevious) {
          console.log(
            '[ListBlock.Backspace] Cannot merge with structural block - noop'
          );
          return false;
        }

        // ✅ MERGE WITH PREVIOUS BLOCK
        const previousBlockId = previousBlockNode.attrs?.blockId;
        const engine = getEngine(editor);

        if (!engine) {
          console.error('[ListBlock.Backspace] EditorEngine not found');
          return false;
        }

        if (!currentBlockId || !previousBlockId) {
          console.warn('[ListBlock.Backspace] Missing blockIds for merge');
          return false;
        }

        // Extract current block's content BEFORE deletion
        const currentContent = currentListBlock.content;

        // Calculate merge position (end of previous block)
        const previousBlockContentSize = previousBlockNode.content.size;
        const mergePos = previousBlockPos + 1 + previousBlockContentSize; // +1 for opening tag

        console.log(
          `[ListBlock.Backspace] Merging into previous: ${previousBlockId}`
        );

        // ✅ USE ENGINE PRIMITIVE: Delete current block via DeleteBlockCommand
        // This ensures children are promoted (Editor Law #8)
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

        // Get current list block
        const currentListBlock = $from.parent;
        if (currentListBlock.type.name !== 'listBlock') return false;

        const listBlockPos = $from.before($from.depth);
        const currentBlockId = currentListBlock.attrs?.blockId;
        const isEmpty = currentListBlock.textContent.length === 0;

        // Check if cursor is at end of block
        const atEnd = $from.parentOffset === currentListBlock.content.size;

        // CASE 1: EMPTY LIST BLOCK
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
              '🔒 [ListBlock.Delete] Cannot delete only block in document'
            );
            return false; // noop - preserve document invariant
          }

          const engine = getEngine(editor);
          if (!engine) {
            console.error('[ListBlock.Delete] EditorEngine not found');
            return false;
          }

          if (!currentBlockId) {
            console.warn('[ListBlock.Delete] No blockId found');
            return false;
          }

          console.log(
            `[ListBlock.Delete] Deleting empty list: ${currentBlockId}`
          );

          // ✅ USE ENGINE PRIMITIVE: Delete via DeleteBlockCommand
          const cmd = new DeleteBlockCommand(currentBlockId);
          engine.dispatch(cmd);

          // Position cursor after engine processes deletion
          requestAnimationFrame(() => {
            const beforePos = Math.max(0, listBlockPos - 1);
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

        // CASE 2: NON-EMPTY LIST BLOCK
        // ✅ EXPLICIT MERGE LOGIC (NO PM DEFAULT)
        //
        // Contract: Delete at end of non-empty block → merge next into current
        // Survivor Rule: Current block survives (Destructive Survivor Rule)
        // Engine Safety: Delete next → promotes its children

        if (!atEnd) {
          // Not at end - let PM handle character deletion
          return false;
        }

        // At end of non-empty list - check for next block
        const afterPos = listBlockPos + currentListBlock.nodeSize;
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
          console.log('[ListBlock.Delete] At document end - noop');
          return false;
        }

        // Check if next block is structural (cannot merge)
        const isStructuralNext = ['codeBlock', 'divider', 'image'].includes(
          nextBlockNode.type.name
        );

        if (isStructuralNext) {
          console.log(
            '[ListBlock.Delete] Cannot merge with structural block - noop'
          );
          return false;
        }

        // ✅ MERGE NEXT BLOCK INTO CURRENT
        const nextBlockId = nextBlockNode.attrs?.blockId;
        const engine = getEngine(editor);

        if (!engine) {
          console.error('[ListBlock.Delete] EditorEngine not found');
          return false;
        }

        if (!currentBlockId || !nextBlockId) {
          console.warn('[ListBlock.Delete] Missing blockIds for merge');
          return false;
        }

        // Store cursor position at merge point (end of current list)
        const mergePos = $from.pos;

        // Extract next block's content BEFORE deletion
        const nextContent = nextBlockNode.content;

        console.log(
          `[ListBlock.Delete] Merging next into current: ${nextBlockId}`
        );

        // ✅ USE ENGINE PRIMITIVE: Delete next block via DeleteBlockCommand
        // This ensures next block's children are promoted (Editor Law #8)
        const cmd = new DeleteBlockCommand(nextBlockId);
        engine.dispatch(cmd);

        // After engine deletion, insert content into current block
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
