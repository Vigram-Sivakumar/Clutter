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
import { createSiblingAttrs, findAncestorNode, handleEmptyBlockInToggle, indentBlock, outdentBlock } from '../../utils/keyboardHelpers';
import { HASHTAG_REGEX, tagExists, insertTag } from '@clutter/ui';
import { BackspaceRules } from '../../utils/keyboardRules';
import { handleArrowLeft, handleArrowRight, handleArrowUp, handleArrowDown } from '../../plugins/keyboard';

declare module '@tiptap/core' {
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
        parseHTML: element => element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: attributes => {
          // Always ensure we have a blockId
          const blockId = attributes.blockId || crypto.randomUUID();
          return { 'data-block-id': blockId };
        },
      },
      parentBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-parent-block-id') || null,
        renderHTML: attributes => {
          if (attributes.parentBlockId) {
            return { 'data-parent-block-id': attributes.parentBlockId };
          }
          return {};
        },
      },
      tags: {
        default: [],
        parseHTML: element => {
          const tagsAttr = element.getAttribute('data-tags');
          return tagsAttr ? JSON.parse(tagsAttr) : [];
        },
        renderHTML: attributes => {
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
        parseHTML: element => parseInt(element.getAttribute('data-level') || '0', 10),
        renderHTML: attributes => ({ 'data-level': attributes.level || 0 }),
      },
      parentToggleId: {
        default: null,
        parseHTML: element => element.getAttribute('data-parent-toggle-id') || null,
        renderHTML: attributes => {
          if (attributes.parentToggleId) {
            return { 'data-parent-toggle-id': attributes.parentToggleId };
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
      // Arrow navigation (cross-block)
      ArrowLeft: ({ editor }) => handleArrowLeft(editor),
      ArrowRight: ({ editor }) => handleArrowRight(editor),
      // CRITICAL: Always consume vertical navigation to prevent ProseMirror fallback
      ArrowUp: ({ editor }) => handleArrowUp(editor) || true,
      ArrowDown: ({ editor }) => handleArrowDown(editor) || true,
      
      // Cmd/Ctrl+Alt+0 to convert to paragraph
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),

      // Tab: Indent paragraph
      Tab: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        
        // Find paragraph position
        if ($from.parent.type.name === 'paragraph') {
          const paragraphPos = $from.before();
          const paragraphNode = $from.parent;
          return indentBlock(editor, paragraphPos, paragraphNode);
        }
        return false;
      },

      // Shift-Tab: Outdent paragraph
      'Shift-Tab': ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        
        // Find paragraph position
        if ($from.parent.type.name === 'paragraph') {
          const paragraphPos = $from.before();
          const paragraphNode = $from.parent;
          return outdentBlock(editor, paragraphPos, paragraphNode);
        }
        return false;
      },

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
        const wrapper = findAncestorNode(editor, ['toggleBlock', 'blockquote', 'callout', 'codeBlock', 'listBlock']);
        
        if (wrapper) {
          // Inside a wrapper block - let that block handle Enter
          // DO NOT do hashtag detection here!
          return false;
        }
        
        // GLOBAL: Handle paragraphs with parentToggleId (toggle/task children)
        if ($from.parent.type.name === 'paragraph') {
          const currentAttrs = $from.parent.attrs;
          if (currentAttrs.parentToggleId) {
            const isEmpty = $from.parent.textContent === '';
            
            // SIMPLIFIED EXIT: Empty paragraph with parentToggleId
            if (isEmpty) {
              const paragraphPos = $from.before();
              const paragraphNode = $from.parent;
              return handleEmptyBlockInToggle(editor, paragraphPos, paragraphNode, 'paragraph');
            }
            
            // NON-EMPTY: Split paragraph, preserve structural context
            return editor.commands.command(({ tr }) => {
              const { $from } = tr.selection;
              
              // CRITICAL: Copy structural context to create proper sibling
              const siblingAttrs = createSiblingAttrs(currentAttrs);
              
              // Split at current position
              tr.split($from.pos, 1, [{
                type: state.schema.nodes.paragraph,
                attrs: {
                  blockId: crypto.randomUUID(),  // ✅ NEW ID for new paragraph!
                  level: currentAttrs.level || 0,  // Copy current level
                  ...siblingAttrs,  // ✅ Enforce invariant: copy parentBlockId + parentToggleId
                  tags: [], // Don't copy tags to new paragraph
                },
              }]);
              
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
            insertTag(tr, matchStart, $from.pos, blockPos, currentBlock.attrs, tagName);
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
            blockId: crypto.randomUUID(),  // ✅ NEW ID for new paragraph!
            tags: [],  // Clear inherited tags
          });
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
        tr.insert(afterBlock, paragraphType.create({
          blockId: crypto.randomUUID(),  // ✅ NEW ID for new paragraph!
          level: 0,
          parentBlockId: null,
          parentToggleId: null,
          tags: [],
        }));
        
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
          const { tr } = state;
          
          // Delete current empty paragraph
          tr.delete(paragraphPos, paragraphPos + currentParagraph.nodeSize);
          
          // Position cursor at the end of the structural block's content
          // Use the position right before where the paragraph was (now mapped through deletion)
          const targetPos = tr.mapping.map(beforePos);
          
          // Use TextSelection.near with backward bias to find valid position inside the block
          try {
            const $pos = tr.doc.resolve(targetPos);
            const selection = TextSelection.near($pos, -1);
            tr.setSelection(selection);
          } catch (e) {
            // Fallback: just use near without bias
            const $pos = tr.doc.resolve(Math.max(0, targetPos));
            tr.setSelection(TextSelection.near($pos));
          }
          
          editor.view.dispatch(tr);
          return true;
        }

        // Let default behavior handle other cases
        return false;
      },
    };
  },
});
