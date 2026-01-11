/**
 * Paragraph Node - Base block element
 *
 * The default block element for text content.
 * Uses uniform block structure (no marker, just content).
 * No margin - parent handles spacing via gap.
 */

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { ParagraphBlock } from '../../components/ParagraphBlock';
import {
  createSiblingAttrs,
  findAncestorNode,
  handleEmptyBlockInToggle,
} from '../../utils/keyboardHelpers';
import { HASHTAG_REGEX, insertTag } from '@clutter/ui';
import { BackspaceRules } from '../../utils/keyboardRules';
import type { EditorEngine } from '../../core/engine/EditorEngine';
import { DeleteBlockCommand } from '../../core/engine/command';

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules
// NOTE: Arrow navigation removed - now centralized in KeyboardShortcuts.ts

/**
 * Get EditorEngine from TipTap editor instance
 * Engine is attached by EditorCore during initialization
 */
function getEngine(editor: any): EditorEngine | null {
  return editor._engine || null;
}

declare module '@tiptap/core' {
  // eslint-disable-next-line no-unused-vars
  interface Commands<ReturnType> {
    paragraph: {
      /**
       * Set a paragraph node
       */
      setParagraph: () => ReturnType;
    };
  }
}

export const Paragraph = Node.create({
  name: 'paragraph',

  // Block-level content
  group: 'block',

  // Contains inline content (text with marks)
  content: 'inline*',

  // Priority for parsing
  priority: 1000,

  // Attributes
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: (attributes) => {
          // Always ensure we have a blockId
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
      tags: {
        default: [],
        parseHTML: (element) => {
          const tagsAttr = element.getAttribute('data-tags');
          return tagsAttr ? JSON.parse(tagsAttr) : [];
        },
        renderHTML: (attributes) => {
          if (attributes.tags?.length) {
            return {
              'data-tags': JSON.stringify(attributes.tags),
            };
          }
          return {};
        },
      },
      level: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: (attributes) => ({ 'data-level': attributes.level || 0 }),
      },
      // 🔥 FLAT MODEL: indent replaces level (Phase C)
      indent: {
        default: 0,
        parseHTML: (element) => {
          // Try indent first, fallback to level for migration
          const indentAttr = element.getAttribute('data-indent');
          if (indentAttr !== null) {
            return parseInt(indentAttr, 10);
          }
          // Fallback: read from level for old data
          return parseInt(element.getAttribute('data-level') || '0', 10);
        },
        renderHTML: (attributes) => ({
          'data-indent': attributes.indent ?? attributes.level ?? 0,
        }),
      },
      // 🔥 FLAT MODEL: collapsed for visibility (Phase C)
      collapsed: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => {
          if (attributes.collapsed) {
            return { 'data-collapsed': 'true' };
          }
          return {};
        },
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [{ tag: 'p' }];
  },

  // Render to HTML (for copy/paste, export)
  renderHTML({ HTMLAttributes }) {
    return ['p', HTMLAttributes, 0];
  },

  // Use React NodeView for rendering in editor
  // Uses ParagraphBlock wrapper which adds block handle for top-level paragraphs
  addNodeView() {
    return ReactNodeViewRenderer(ParagraphBlock);
  },

  // Commands
  addCommands() {
    return {
      setParagraph:
        () =>
        ({ commands }) => {
          return commands.setNode(this.name);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      // NOTE: Arrow navigation is centrally handled in KeyboardShortcuts.ts
      // Removed from here to prevent TipTap handler collision (multiple extensions = cursor freeze)

      // Cmd/Ctrl+Alt+0 to convert to paragraph
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),

      // NOTE: Tab / Shift+Tab behavior is centrally handled
      // via keyboard rules emitting indent-block / outdent-block intents.
      // Node extensions must not handle structural keyboard logic.

      // Shift+Enter: Insert line break (soft break)
      'Shift-Enter': ({ editor }) => {
        return editor.commands.setHardBreak();
      },

      // Enter splits paragraph (creates new paragraph)
      // BUT: Check for wrapper blocks FIRST, then hashtags, and preserve toggle parent
      Enter: ({ editor }) => {
        // PHASE 1 REFACTOR: Use helper to check for wrapper blocks
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Let heading handle its own Enter behavior
        if ($from.parent.type.name === 'heading') {
          return false;
        }

        // IMPORTANT: Check if we're inside a wrapper block FIRST
        // Wrapper blocks (tasks, toggles, etc.) should handle Enter themselves
        const wrapper = findAncestorNode(editor, [
          'toggleBlock',
          'blockquote',
          'callout',
          'codeBlock',
          'listBlock',
        ]);

        if (wrapper) {
          // Inside a wrapper block - let that block handle Enter
          // DO NOT do hashtag detection here!
          return false;
        }

        // GLOBAL: Handle paragraphs with parentBlockId (toggle/task children)
        if ($from.parent.type.name === 'paragraph') {
          const currentAttrs = $from.parent.attrs;
          if (currentAttrs.parentBlockId) {
            const isEmpty = $from.parent.textContent === '';

            // SIMPLIFIED EXIT: Empty paragraph with parentBlockId
            if (isEmpty) {
              const paragraphPos = $from.before();
              const paragraphNode = $from.parent;
              return handleEmptyBlockInToggle(
                editor,
                paragraphPos,
                paragraphNode,
                'paragraph'
              );
            }

            // NON-EMPTY: Split paragraph, preserve structural context
            return editor.commands.command(({ tr }) => {
              const { $from } = tr.selection;

              // CRITICAL: Copy structural context to create proper sibling
              const siblingAttrs = createSiblingAttrs(currentAttrs);

              // Split at current position
              tr.split($from.pos, 1, [
                {
                  type: state.schema.nodes.paragraph,
                  attrs: {
                    blockId: crypto.randomUUID(), // ✅ NEW ID for new paragraph!
                    level: currentAttrs.level || 0, // Copy current level
                    ...siblingAttrs, // ✅ Enforce invariant: copy parentBlockId
                    tags: [], // Don't copy tags to new paragraph
                  },
                },
              ]);

              return true;
            });
          }
        }

        // ONLY do hashtag detection in standalone paragraphs (not inside wrappers)
        if (selection.empty && $from.parent.type.name === 'paragraph') {
          const textBefore = $from.parent.textBetween(0, $from.parentOffset);
          const match = textBefore.match(HASHTAG_REGEX); // Use shared regex

          if (match) {
            const tagName = match[1];
            const matchStart = $from.pos - match[0].length;
            const currentBlock = $from.parent;
            const blockPos = $from.before($from.depth);

            // Use shared insertTag utility
            const tr = state.tr;
            insertTag(
              tr,
              matchStart,
              $from.pos,
              blockPos,
              currentBlock.attrs,
              tagName
            );
            editor.view.dispatch(tr);
            return true; // Handled - don't split
          }
        }

        // Not in wrapper - perform default paragraph split
        // CRITICAL: New paragraph needs a NEW blockId (not copied from parent)
        const result = editor.commands.splitBlock();

        if (result) {
          // Get the new block's position
          const { state } = editor;
          const { $from } = state.selection;
          const blockPos = $from.before($from.depth);

          // ✅ ALWAYS set new blockId and clear tags
          const tr = state.tr;
          tr.setNodeMarkup(blockPos, null, {
            ...$from.parent.attrs,
            blockId: crypto.randomUUID(), // ✅ NEW ID for new paragraph!
            tags: [], // Clear inherited tags
          });

          // ✅ CRITICAL: Preserve selection from splitBlock
          // The second transaction must maintain the selection or it gets lost!
          tr.setSelection(state.selection.map(tr.doc, tr.mapping));

          editor.view.dispatch(tr);
        }

        return result;
      },

      // Cmd+Enter: Move to end of current block and create new paragraph below
      'Mod-Enter': ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Find the end of the current block
        const endOfBlock = $from.end($from.depth);

        // Create transaction
        const { tr } = state;

        // Move cursor to end of current block
        tr.setSelection(TextSelection.create(tr.doc, endOfBlock));

        // Insert new paragraph after current block
        const paragraphType = state.schema.nodes.paragraph;
        if (!paragraphType) return false;

        const afterBlock = $from.after($from.depth);
        tr.insert(
          afterBlock,
          paragraphType.create({
            blockId: crypto.randomUUID(), // ✅ NEW ID for new paragraph!
            level: 0,
            parentBlockId: null,
            tags: [],
          })
        );

        // Move cursor to new paragraph
        tr.setSelection(TextSelection.create(tr.doc, afterBlock + 1));

        editor.view.dispatch(tr);
        return true;
      },

      // Backspace: Prevent joining back into structural blocks
      Backspace: ({ editor }) => {
        // PHASE 1 REFACTOR: Use detectors for checks

        // Check 1: Is cursor in empty paragraph at start?
        if (!BackspaceRules.isInEmptyParagraphAtStart(editor)) {
          return false;
        }

        // Check 2: Should we let a wrapper block handle this?
        if (BackspaceRules.shouldLetWrapperHandleBackspace(editor)) {
          return false;
        }

        // Check 3: Is there a structural block before this paragraph?
        const beforeContext = BackspaceRules.getStructuralBlockBefore(editor);

        if (beforeContext.hasStructuralBlock) {
          // Delete the empty paragraph and move cursor to end of structural block
          // (KEEP ALL EXECUTION CODE)
          const { state } = editor;
          const { $from } = state.selection;
          const currentParagraph = $from.parent;
          const paragraphPos = $from.before($from.depth);
          const beforePos = paragraphPos - 1;

          // 🔒 EDITOR INVARIANT: Document must always contain ≥ 1 block
          // Count total blocks in document
          let blockCount = 0;
          state.doc.descendants((node) => {
            if (node.isBlock && node.type.name !== 'doc') {
              blockCount++;
            }
          });

          // If this is the only block, DO NOT delete it
          if (blockCount <= 1) {
            console.log(
              '🔒 [Paragraph.Backspace] Cannot delete only block in document'
            );
            return false; // noop - preserve document invariant
          }

          // ✅ USE ENGINE PRIMITIVE: Delete paragraph via DeleteBlockCommand
          // This ensures children are promoted (Editor Law #8)
          const blockId = currentParagraph.attrs?.blockId;
          const engine = getEngine(editor);

          if (!engine) {
            console.error('[Paragraph.Backspace] EditorEngine not found');
            return false;
          }

          if (!blockId) {
            console.warn('[Paragraph.Backspace] No blockId found');
            return false;
          }

          console.log(
            `[Paragraph.Backspace] Deleting empty paragraph: ${blockId}`
          );
          const cmd = new DeleteBlockCommand(blockId);
          engine.dispatch(cmd);

          // Position cursor after engine processes deletion
          requestAnimationFrame(() => {
            const targetPos = Math.max(0, beforePos);
            try {
              const $pos = editor.state.tr.doc.resolve(targetPos);
              const selection = TextSelection.near($pos, -1);
              const tr = editor.state.tr.setSelection(selection);
              editor.view.dispatch(tr);
            } catch (e) {
              const $pos = editor.state.tr.doc.resolve(Math.max(0, targetPos));
              const selection = TextSelection.near($pos);
              const tr = editor.state.tr.setSelection(selection);
              editor.view.dispatch(tr);
            }
          });

          return true;
        }

        // Let default behavior handle other cases
        return false;
      },

      // Delete: Forward delete (symmetric to Backspace, directionally opposite)
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Only handle specific cases - let PM handle character deletion in middle
        const currentParagraph = $from.parent;
        if (currentParagraph.type.name !== 'paragraph') {
          return false; // Not in paragraph
        }

        // Check if we're at end of paragraph
        const atEnd = $from.parentOffset === currentParagraph.content.size;
        const isEmpty = currentParagraph.content.size === 0;

        // If not at end and not empty, let PM handle character deletion
        if (!atEnd && !isEmpty) {
          return false; // PM default: delete character ahead
        }

        // Check if wrapper block should handle this
        if (BackspaceRules.shouldLetWrapperHandleBackspace(editor)) {
          return false;
        }

        // We're at end of paragraph or paragraph is empty
        // Find next block
        const paragraphPos = $from.before($from.depth);
        const afterPos = paragraphPos + currentParagraph.nodeSize;

        // Check if there's a next block
        let hasNextBlock = false;
        let nextBlockNode = null;

        try {
          const $after = state.doc.resolve(afterPos);
          if ($after.nodeAfter) {
            hasNextBlock = true;
            nextBlockNode = $after.nodeAfter;
          }
        } catch (e) {
          // No next block (we're at document end)
          hasNextBlock = false;
        }

        // CASE 1: Empty paragraph
        if (isEmpty) {
          // 🔒 EDITOR INVARIANT: Document must always contain ≥ 1 block
          let blockCount = 0;
          state.doc.descendants((node) => {
            if (node.isBlock && node.type.name !== 'doc') {
              blockCount++;
            }
          });

          // If this is the only block, DO NOT delete it
          if (blockCount <= 1) {
            console.log(
              '🔒 [Paragraph.Delete] Cannot delete only block in document'
            );
            return false; // noop - preserve document invariant
          }

          // ✅ USE ENGINE PRIMITIVE: Delete paragraph via DeleteBlockCommand
          // This ensures children are promoted (Editor Law #8)
          const blockId = currentParagraph.attrs?.blockId;
          const engine = getEngine(editor);

          if (!engine) {
            console.error('[Paragraph.Delete] EditorEngine not found');
            return false;
          }

          if (!blockId) {
            console.warn('[Paragraph.Delete] No blockId found');
            return false;
          }

          console.log(
            `[Paragraph.Delete] Deleting empty paragraph: ${blockId}`
          );
          const cmd = new DeleteBlockCommand(blockId);
          engine.dispatch(cmd);

          // Position cursor after engine processes deletion
          requestAnimationFrame(() => {
            const beforePos = Math.max(0, paragraphPos - 1);
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

        // CASE 2: At end of non-empty paragraph
        if (atEnd && hasNextBlock) {
          // Merge with next block

          // Check if next block is structural (code, divider, etc.)
          const isStructuralNext =
            nextBlockNode &&
            ['codeBlock', 'divider', 'image'].includes(nextBlockNode.type.name);

          if (isStructuralNext) {
            // Cannot merge with structural blocks - noop
            console.log(
              '[Paragraph.Delete] Cannot merge with structural block'
            );
            return false;
          }

          // Store cursor position at merge point (end of current paragraph)
          const mergePos = $from.pos;

          // Merge: Delete next block's wrapper, keep its content
          if (nextBlockNode) {
            const nextBlockId = nextBlockNode.attrs?.blockId;
            const engine = getEngine(editor);

            if (!engine) {
              console.error(
                '[Paragraph.Delete] EditorEngine not found for merge'
              );
              return false;
            }

            if (!nextBlockId) {
              console.warn(
                '[Paragraph.Delete] Next block has no blockId, cannot merge safely'
              );
              return false;
            }

            // Extract next block's content BEFORE deletion
            const nextContent = nextBlockNode.content;

            // ✅ USE ENGINE PRIMITIVE: Delete next block via DeleteBlockCommand
            // This ensures children are promoted (Editor Law #8)
            console.log(
              `[Paragraph.Delete] Merging with next block: ${nextBlockId}`
            );
            const cmd = new DeleteBlockCommand(nextBlockId);
            engine.dispatch(cmd);

            // After engine deletion, insert content into current paragraph
            requestAnimationFrame(() => {
              const { tr: newTr } = editor.state;
              // Re-resolve merge position in new document
              const newMergePos = Math.min(
                mergePos,
                newTr.doc.content.size - 1
              );

              if (nextContent.size > 0) {
                newTr.insert(newMergePos, nextContent);
              }

              // Position cursor at merge point
              newTr.setSelection(TextSelection.create(newTr.doc, newMergePos));
              editor.view.dispatch(newTr);
            });

            return true;
          }
        }

        // CASE 3: At end with no next block - noop
        if (atEnd && !hasNextBlock) {
          console.log('[Paragraph.Delete] At end of document - noop');
          return false; // noop - can't delete forward at document end
        }

        // Fallback: let PM handle
        return false;
      },
    };
  },
});
