/**
 * Enter On Selected Block(s) - GLOBAL RULE
 *
 * 🔒 CANONICAL BEHAVIOR (ALL BLOCK TYPES, SINGLE OR MULTI):
 * When one or more blocks are halo-selected and Enter is pressed:
 * → Create a new paragraph below the LAST selected block
 * → Same indent as last selected block
 * → Cursor moves into the new paragraph
 * → Selected blocks remain unchanged
 *
 * Handles BOTH:
 * - Single block selection (NodeSelection via handle click)
 * - Multi-block selection (TextSelection via Shift+Click, Cmd+A)
 *
 * Applies to: Paragraph, Heading, ListBlock, Toggle, HorizontalRule, Blockquote, etc.
 * 
 * This is NOT a fallback. This is the PRIMARY Enter behavior for block selection.
 * Priority 1000 ensures it runs BEFORE all other Enter rules.
 * 
 * This prevents:
 * - "RangeError: There is no position after the top-level node" crashes
 * - Block-specific divergence in Enter behavior
 * - "Nothing happens" on multi-select + Enter
 * - Accidental text splitting when block is halo-selected
 *
 * 🔑 CRITICAL ARCHITECTURAL RULES:
 * 1. NEVER use PM selection type (NodeSelection vs TextSelection) to detect block selection
 *    → Multi-block halo uses TextSelection, not NodeSelection
 * 2. NEVER use $pos.after() - crashes when $pos.depth === 0 (at doc boundary)
 *    → ALWAYS use: block.pos + block.nodeSize (explicit calculation)
 * 3. Block selection is an editor concern, not a ProseMirror concern
 *    → PM selection = cursor mechanics (can be at doc boundary)
 *    → Block selection = structural truth (always at block level)
 */

import { TextSelection, NodeSelection } from '@tiptap/pm/state';
import { defineRule } from '../../types/KeyboardRule';
import { getSelectedBlocks, isMultiBlockSelection } from '../../../../utils/multiSelection';
import { createBlock } from '../../../../core/createBlock';

export const enterOnSelectedBlocks = defineRule({
  id: 'enter:onSelectedBlocks',
  priority: 1000, // HIGHEST - runs before ALL other Enter rules

  when: ({ editor }) => {
    const { selection } = editor.state;
    
    // 🛡️ STRICT GUARD: Only fire for actual block selection (halo)
    // This rule must NEVER fire for normal TextSelection inside a paragraph
    
    // Case 1: NodeSelection (single block via handle click)
    const isSingleBlockSelection = selection instanceof NodeSelection;
    
    // Case 2: Multi-block selection (Shift+Click, Cmd+A across blocks)
    const isMultiBlock = isMultiBlockSelection(editor);
    
    // Debug log to catch regressions
    if (isSingleBlockSelection || isMultiBlock) {
      console.log('[enter:onSelectedBlocks] Halo detected', {
        selectionType: selection.constructor.name,
        isSingleBlock: isSingleBlockSelection,
        isMultiBlock,
      });
    }
    
    // Only fire when blocks are explicitly selected (halo state)
    return isSingleBlockSelection || isMultiBlock;
  },

  execute: ({ editor }) => {
    // Get all selected blocks safely (never use PM selection directly)
    const blocks = getSelectedBlocks(editor);
    if (!blocks || blocks.length === 0) {
      return false;
    }

    // ✅ Always use the LAST selected block
    // This ensures consistent behavior for both single and multi-select
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock) {
      return false;
    }

    // Get indent from last selected block (works for ANY block type)
    const indent = lastBlock.node.attrs?.indent ?? 0;

    // 🔑 CORRECT insert position: explicit calculation
    // NEVER use $pos.after() - crashes at doc depth
    // This calculation is ALWAYS valid for top-level blocks
    const insertPos = lastBlock.pos + lastBlock.node.nodeSize;

    editor.commands.command(({ state, dispatch }) => {
      if (!dispatch) return false;

      const tr = state.tr;

      // 🔑 STEP 2B: Use centralized createBlock()
      // All block creation now goes through ONE function
      // Guards are inside createBlock() - no duplication
      const paragraphNode = createBlock(state, tr, {
        type: 'paragraph',
        insertPos,
        indent,
      });

      // If createBlock failed, abort
      if (!paragraphNode) {
        return false;
      }
      
      // Move cursor into the new paragraph
      // Position is after opening tag of new paragraph
      const cursorPos = insertPos + 1;
      tr.setSelection(TextSelection.create(tr.doc, cursorPos));

      // Mark for history
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter is its own undo step

      dispatch(tr);
      return true;
    });

    return true;
  },
});
