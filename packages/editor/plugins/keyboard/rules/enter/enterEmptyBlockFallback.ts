/**
 * Enter Global Fallback Rule - ABSOLUTE SAFETY NET
 *
 * 🔒 THE ENTER LAW:
 * "Every Enter press MUST be handled. Default ProseMirror Enter must NEVER run."
 *
 * This rule has LOWEST priority (-1000) and catches EVERY Enter
 * that no other rule handled.
 *
 * Behavior:
 * - Empty block at indent > 0 → outdent by 1
 * - Empty block at indent = 0 → create new paragraph sibling
 * - Non-empty block → split block (like default Enter, but controlled)
 *
 * This ensures Enter is ALWAYS owned and undo is deterministic.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

export const enterEmptyBlockFallback = defineRule({
  id: 'enter:globalFallback',
  description: 'GLOBAL fallback - handles ALL Enter presses that no other rule claimed',
  priority: -1000, // LOWEST possible - must be last resort

  when(_ctx: KeyboardContext): boolean {
    // 🔒 CRITICAL: ALWAYS match
    // This ensures Enter is NEVER unowned
    return true;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor, state, currentNode } = ctx;

    // 🛡️ GUARD 3: Unsupported Selection Type
    // Warn if we encounter a selection type we haven't explicitly designed for
    // This catches AllSelection, custom selections, and future PM features early
    if (
      !(state.selection instanceof NodeSelection) &&
      !(state.selection instanceof TextSelection)
    ) {
      console.warn('[ENTER][GUARD] Unsupported selection type', {
        type: state.selection.constructor.name,
        from: state.selection.from,
        to: state.selection.to,
        anchor: state.selection.anchor,
        head: state.selection.head,
      });
      // Continue anyway - fallback should try to handle it
    }

    // 🛡️ SAFETY NET: Never operate at doc depth
    // This prevents "RangeError: There is no position before the top-level node"
    const { $from } = state.selection;
    if ($from.depth === 0) {
      return false;
    }

    const attrs = currentNode.attrs;
    const currentIndent = attrs?.indent || 0;
    const isEmpty = currentNode.textContent === '';

    // ✅ CANONICAL ENTER PATTERN: ONE Enter = ONE transaction
    return editor.commands.command(({ state: cmdState, dispatch }) => {
      if (!dispatch) return false;

      const tr = cmdState.tr;

      if (isEmpty && currentIndent > 0) {
        // CASE 1: Empty indented block → outdent by 1
        const pos = state.selection.from;
        const $pos = cmdState.doc.resolve(pos);
        const blockPos = $pos.before($pos.depth);
        const blockNode = cmdState.doc.nodeAt(blockPos);

        if (!blockNode) return false;

        tr.setNodeMarkup(blockPos, null, {
          ...blockNode.attrs,
          indent: Math.max(0, currentIndent - 1),
        });
      } else if (isEmpty && currentIndent === 0) {
        // CASE 2: Empty root block → create new paragraph sibling
        const pos = state.selection.from;
        const $pos = cmdState.doc.resolve(pos);
        const blockPos = $pos.before($pos.depth);
        const blockNode = cmdState.doc.nodeAt(blockPos);

        if (!blockNode) return false;

        // Insert new paragraph after current block
        const insertPos = blockPos + blockNode.nodeSize;
        const newParagraph = cmdState.schema.nodes.paragraph.create({
          blockId: crypto.randomUUID(),
          indent: 0,
        });

        tr.insert(insertPos, newParagraph);

        // Move cursor to new paragraph
        const cursorPos = insertPos + 1;
        try {
          const $newPos = tr.doc.resolve(cursorPos);
          tr.setSelection(cmdState.selection.constructor.near($newPos));
        } catch (e) {
          console.warn('[enterGlobalFallback] Could not set cursor:', e);
        }
      } else {
        // CASE 3: Non-empty block → split block (explicit, atomic)
        // Do NOT use tr.split() - it causes multiple updates
        // Instead: manually extract content and create new block
        
        const { $from } = cmdState.selection;
        const blockPos = $from.before($from.depth);
        const blockNode = cmdState.doc.nodeAt(blockPos);
        
        if (!blockNode) return false;
        
        // Calculate position within block content
        const cursorInBlock = $from.pos - blockPos - 1;
        
        // Extract content after cursor
        const contentAfter = blockNode.content.cut(cursorInBlock);
        
        // Step 1: Delete content after cursor from current block
        if (contentAfter.size > 0) {
          const deleteFrom = blockPos + 1 + cursorInBlock;
          const deleteTo = deleteFrom + contentAfter.size;
          tr.delete(deleteFrom, deleteTo);
        }
        
        // Step 2: Create new block with extracted content
        const insertPos = blockPos + blockNode.nodeSize - contentAfter.size;
        const nodeType = blockNode.type;
        const newBlock = nodeType.create(
          {
            ...blockNode.attrs,
            blockId: crypto.randomUUID(), // New block gets new ID
          },
          contentAfter
        );
        
        tr.insert(insertPos, newBlock);
        
        // Step 3: Move cursor to start of new block
        const cursorPos = insertPos + 1;
        try {
          const $newPos = tr.doc.resolve(cursorPos);
          tr.setSelection(cmdState.selection.constructor.near($newPos));
        } catch (e) {
          console.warn('[enterGlobalFallback] Could not set cursor:', e);
        }
      }

      // Mark for undo - FORCE history boundary (one undo per Enter)
      tr.setMeta('addToHistory', true);
      tr.setMeta('closeHistory', true); // Each Enter = separate undo step

      // 🔍 DIAGNOSTIC LOG
      console.log('[ENTER TX] globalFallback', {
        case: isEmpty && currentIndent > 0 ? 'outdent' : isEmpty ? 'newBlock' : 'split',
        steps: tr.steps.length,
        closeHistory: tr.getMeta('closeHistory'),
      });

      // Dispatch ONCE - no more transactions
      dispatch(tr);
      return true; // 🔒 HARD STOP - default Enter must NEVER run
    });
  },
});
