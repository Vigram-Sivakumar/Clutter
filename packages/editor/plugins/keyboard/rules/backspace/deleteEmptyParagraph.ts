/**
 * Delete Empty Paragraph Rule (Backspace)
 *
 * When: Cursor at start of empty paragraph
 * Do: Delegate to structural delete authority
 *
 * 🔒 PURE DELEGATOR - does NOT:
 * - Perform deletion
 * - Place cursor
 * - Mutate PM state
 *
 * ONLY delegates to performStructuralDelete()
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { performStructuralDelete } from '../../../../core/structuralDelete/performStructuralDelete';

export const deleteEmptyParagraph = defineRule({
  id: 'backspace:deleteEmptyParagraph',
  description: 'Delete empty paragraph when cursor at start',
  priority: 100, // High priority - handle empty paragraphs first

  when(ctx: KeyboardContext): boolean {
    const { cursorOffset, currentNode } = ctx;

    // Must be at start of paragraph
    if (cursorOffset !== 0) {
      return false;
    }

    // Must be a paragraph
    if (currentNode.type.name !== 'paragraph') {
      return false;
    }

    // Must be empty
    if (currentNode.textContent !== '') {
      return false;
    }

    return true;
  },

  execute(ctx: KeyboardContext): boolean {
    const { currentNode, editor } = ctx;

    // 🔒 Create snapshot from PM document (source of truth)
    // This avoids timing dependencies on Engine sync
    const blocks: Array<{ blockId: string; indent: number }> = [];
    editor.state.doc.descendants((node: any) => {
      if (node.attrs?.blockId) {
        blocks.push({
          blockId: node.attrs.blockId,
          indent: node.attrs.indent ?? 0,
        });
      }
      return true;
    });

    const engineSnapshot = { blocks };

    // 🔒 DELEGATE TO AUTHORITY
    return performStructuralDelete({
      editor,
      engineSnapshot,
      blockIds: [currentNode.attrs.blockId],
      source: 'keyboard:backspace',
    });
  },
});
