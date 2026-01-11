/**
 * FlatIntentResolver - Canonical flat indent model
 *
 * PRINCIPLES:
 * 1. Document is a flat ordered list
 * 2. Indent is structure
 * 3. Collapse is view-only
 * 4. Never infer parents
 * 5. Never auto-fix structure
 */

import type { EditorEngine } from './EditorEngine';
import type { EditorIntent, IntentResult } from './intent';

export class FlatIntentResolver {
  constructor(
    private _engine: EditorEngine,
    private _editor?: any // Optional TipTap editor for direct mutations
  ) {}

  resolve(intent: EditorIntent): IntentResult {
    const mode = this._engine.getMode();

    try {
      switch (intent.type) {
        case 'indent-block':
          return this.handleIndentBlock(intent);

        case 'outdent-block':
          return this.handleOutdentBlock(intent);

        case 'delete-block':
          return this.handleDeleteBlock(intent);

        default:
          return {
            success: false,
            intent,
            reason: `Intent '${intent.type}' not implemented in flat model yet`,
            mode,
          };
      }
    } catch (error) {
      return {
        success: false,
        intent,
        reason: `Exception: ${error}`,
        mode,
      };
    }
  }

  /**
   * Indent block (Tab)
   *
   * 🔥 FLAT MODEL RANGE RULE (SYMMETRY WITH OUTDENT):
   * Indent operates on the selected block AND its contiguous visual subtree
   * (all following blocks with indent > baseIndent)
   *
   * Example:
   * 1
   *     2  indent-1  ← Select this
   *     3  indent-1
   * 4
   *     5  indent-1
   *
   * After Tab:
   * 1
   *     2  indent-1
   *     3  indent-1
   *     4  indent-1  ← Moved with subtree
   *         5  indent-2  ← Moved with parent
   *
   * This ensures indent/outdent are perfect inverses.
   */
  private handleIndentBlock(
    intent: Extract<EditorIntent, { type: 'indent-block' }>
  ): IntentResult {
    const { blockId } = intent;

    if (!this._editor || !this._editor.state) {
      return {
        success: false,
        intent,
        reason: 'Editor not available',
      };
    }

    const { state, view } = this._editor;
    const doc = state.doc;
    const tr = state.tr;

    // Collect all blocks in document order
    const blocks: Array<{ pos: number; node: any; indent: number }> = [];
    doc.descendants((node: any, pos: number) => {
      if (node.attrs?.blockId) {
        blocks.push({
          pos,
          node,
          indent: node.attrs.indent ?? 0,
        });
      }
      return true;
    });

    // Find selected block index
    const selectedIndex = blocks.findIndex(
      (b) => b.node.attrs.blockId === blockId
    );
    if (selectedIndex === -1) {
      return {
        success: false,
        intent,
        reason: 'Block not found',
      };
    }

    const selectedBlock = blocks[selectedIndex];
    const baseIndent = selectedBlock.indent;

    // 🔥 INDENT VALIDATION: Can only indent to prevBlock.indent + 1
    // This prevents indent jumps and maintains flat list invariant
    const prevBlock = selectedIndex > 0 ? blocks[selectedIndex - 1] : null;
    const maxAllowedIndent = prevBlock ? prevBlock.indent + 1 : 0;
    const newIndent = baseIndent + 1;

    if (newIndent > maxAllowedIndent) {
      console.log('[FLAT INDENT] Blocked:', {
        selectedBlock: blockId.slice(0, 8),
        currentIndent: baseIndent,
        attemptedIndent: newIndent,
        maxAllowed: maxAllowedIndent,
        prevBlockIndent: prevBlock?.indent,
      });
      return {
        success: false,
        intent,
        reason: `Cannot indent beyond previous block level (max: ${maxAllowedIndent})`,
      };
    }

    // 🔥 RANGE DETECTION: Find all contiguous blocks with indent > baseIndent
    // This is the "visual subtree" that moves with the selected block
    const affectedRange = [selectedIndex];
    for (let i = selectedIndex + 1; i < blocks.length; i++) {
      if (blocks[i].indent > baseIndent) {
        affectedRange.push(i);
      } else {
        break; // Stop at first block not deeper than base
      }
    }

    console.log('[FLAT INDENT] Range:', {
      selectedBlock: blockId.slice(0, 8),
      baseIndent,
      affectedCount: affectedRange.length,
      affectedBlocks: affectedRange.map((i) => ({
        blockId: blocks[i].node.attrs.blockId.slice(0, 8),
        oldIndent: blocks[i].indent,
        newIndent: blocks[i].indent + 1,
      })),
    });

    // 🔥 RANGE MUTATION: Indent all affected blocks
    for (const index of affectedRange) {
      const block = blocks[index];
      tr.setNodeMarkup(block.pos, undefined, {
        ...block.node.attrs,
        indent: block.indent + 1,
      });
    }

    // Mark for undo
    tr.setMeta('addToHistory', true);
    tr.setMeta('historyGroup', 'indent-block');

    // Apply
    view.dispatch(tr);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  /**
   * Outdent block (Shift+Tab)
   *
   * 🔥 FLAT MODEL RANGE RULE:
   * Outdent operates on the selected block AND its contiguous visual subtree
   * (all following blocks with indent > baseIndent)
   *
   * This ensures the flat-list invariant:
   * "A block can never be more than +1 indent deeper than the block above it"
   */
  private handleOutdentBlock(
    intent: Extract<EditorIntent, { type: 'outdent-block' }>
  ): IntentResult {
    const { blockId } = intent;

    if (!this._editor || !this._editor.state) {
      return {
        success: false,
        intent,
        reason: 'Editor not available',
      };
    }

    const { state, view } = this._editor;
    const doc = state.doc;
    const tr = state.tr;

    // Collect all blocks in document order
    const blocks: Array<{ pos: number; node: any; indent: number }> = [];
    doc.descendants((node: any, pos: number) => {
      if (node.attrs?.blockId) {
        blocks.push({
          pos,
          node,
          indent: node.attrs.indent ?? 0,
        });
      }
      return true;
    });

    // Find selected block index
    const selectedIndex = blocks.findIndex(
      (b) => b.node.attrs.blockId === blockId
    );
    if (selectedIndex === -1) {
      return {
        success: false,
        intent,
        reason: 'Block not found',
      };
    }

    const selectedBlock = blocks[selectedIndex];
    const baseIndent = selectedBlock.indent;

    // Block if already at root
    if (baseIndent === 0) {
      return {
        success: false,
        intent,
        reason: 'Already at root level',
      };
    }

    // 🔥 RANGE DETECTION: Find all contiguous blocks with indent > baseIndent
    // This is the "visual subtree" that moves with the selected block
    const affectedRange = [selectedIndex];
    for (let i = selectedIndex + 1; i < blocks.length; i++) {
      if (blocks[i].indent > baseIndent) {
        affectedRange.push(i);
      } else {
        break; // Stop at first block not deeper than base
      }
    }

    console.log('[FLAT OUTDENT] Range:', {
      selectedBlock: blockId.slice(0, 8),
      baseIndent,
      affectedCount: affectedRange.length,
      affectedBlocks: affectedRange.map((i) => ({
        blockId: blocks[i].node.attrs.blockId.slice(0, 8),
        oldIndent: blocks[i].indent,
        newIndent: Math.max(0, blocks[i].indent - 1),
      })),
    });

    // 🔥 RANGE MUTATION: Outdent all affected blocks
    for (const index of affectedRange) {
      const block = blocks[index];
      tr.setNodeMarkup(block.pos, undefined, {
        ...block.node.attrs,
        indent: Math.max(0, block.indent - 1),
      });
    }

    // Mark for undo
    tr.setMeta('addToHistory', true);
    tr.setMeta('historyGroup', 'outdent-block');

    // Apply
    view.dispatch(tr);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  /**
   * Delete block (Backspace at start / Delete key)
   *
   * 🔥 DELETE LAW (FLAT MODEL):
   * Delete removes the block and promotes its children by -1 indent
   *
   * Rule: Delete is structure-aware, not text-aware
   * - Remove the selected block
   * - Promote all children (indent -= 1)
   * - Never leave children orphaned
   * - Never reorder blocks
   *
   * Example:
   * A (0)
   *   B (1)  ← delete this
   *     C (2)
   *     D (2)
   *
   * After:
   * A (0)
   *   C (1)  ← promoted
   *   D (1)  ← promoted
   */
  private handleDeleteBlock(
    intent: Extract<EditorIntent, { type: 'delete-block' }>
  ): IntentResult {
    const { blockId } = intent;

    if (!this._editor || !this._editor.state) {
      return {
        success: false,
        intent,
        reason: 'Editor not available',
      };
    }

    const { state, view } = this._editor;
    const doc = state.doc;
    const tr = state.tr;

    // Collect all blocks in document order
    const blocks: Array<{ pos: number; node: any; indent: number }> = [];
    doc.descendants((node: any, pos: number) => {
      if (node.attrs?.blockId) {
        blocks.push({
          pos,
          node,
          indent: node.attrs.indent ?? 0,
        });
      }
      return true;
    });

    // Find selected block index
    const selectedIndex = blocks.findIndex(
      (b) => b.node.attrs.blockId === blockId
    );

    if (selectedIndex === -1) {
      return {
        success: false,
        intent,
        reason: 'Block not found',
      };
    }

    const selectedBlock = blocks[selectedIndex];
    const baseIndent = selectedBlock.indent;

    // 🔥 PROMOTION RULE: Find visual subtree (children to promote)
    // These are all contiguous blocks after the selected block with indent > baseIndent
    const childrenToPromote: number[] = [];
    for (let i = selectedIndex + 1; i < blocks.length; i++) {
      if (blocks[i].indent > baseIndent) {
        childrenToPromote.push(i);
      } else {
        break; // Stop at first block not deeper than base
      }
    }

    console.log('[FLAT DELETE]:', {
      block: blockId.slice(0, 8),
      baseIndent,
      childrenCount: childrenToPromote.length,
      willPromote: childrenToPromote.length > 0,
    });

    // 🔥 STEP 1: Promote children BEFORE deleting parent
    // (Positions remain valid because we haven't deleted anything yet)
    for (const index of childrenToPromote) {
      const child = blocks[index];
      tr.setNodeMarkup(child.pos, undefined, {
        ...child.node.attrs,
        indent: child.indent - 1, // Promote by -1
      });
    }

    // 🔥 STEP 2: Delete the selected block
    const blockPos = selectedBlock.pos;
    const blockSize = selectedBlock.node.nodeSize;
    tr.delete(blockPos, blockPos + blockSize);

    // 🔥 STEP 3: POST-DELETE CURSOR PLACEMENT (INVARIANT)
    //
    // RULE: After ANY delete, cursor moves to END of previous visible block
    // This matches Craft/Workflowy UX and prevents "cursor outside editor" bugs
    //
    // Implementation:
    // - Find previous block in NEW document (tr.doc, not old doc)
    // - Calculate END position of that block's text content
    // - Use TextSelection.create for explicit placement (not .near())
    // - Fallback: If no previous block, cursor goes to first block

    if (selectedIndex > 0) {
      // There's a previous block - move cursor to its END
      const prevBlock = blocks[selectedIndex - 1];
      
      // Calculate the END of the previous block's content
      // prevBlock.pos = start of block node
      // +1 = inside the block (skip opening tag)
      // +prevBlock.node.content.size = end of text content
      const targetPos = prevBlock.pos + 1 + prevBlock.node.content.size;
      
      try {
        const $pos = tr.doc.resolve(targetPos);
        const selection = state.selection.constructor.create(tr.doc, targetPos);
        tr.setSelection(selection);
        console.log('[FLAT DELETE] Cursor → end of previous block:', {
          prevBlockId: prevBlock.node.attrs?.blockId?.slice(0, 8),
          targetPos,
        });
      } catch (e) {
        console.warn('[handleDeleteBlock] Could not set cursor to prev block end:', e);
        // Fallback: use .near() as last resort
        try {
          const fallbackPos = Math.min(targetPos, tr.doc.content.size - 1);
          const $pos = tr.doc.resolve(fallbackPos);
          tr.setSelection(state.selection.constructor.near($pos));
        } catch (e2) {
          console.error('[handleDeleteBlock] Cursor placement completely failed:', e2);
        }
      }
    } else {
      // First block deleted - move cursor to START of first remaining block
      // The new first block is at position 1 (inside doc node)
      try {
        const $pos = tr.doc.resolve(1);
        const selection = state.selection.constructor.create(tr.doc, 1);
        tr.setSelection(selection);
        console.log('[FLAT DELETE] Cursor → start of first block (first block was deleted)');
      } catch (e) {
        console.warn('[handleDeleteBlock] Could not set cursor to first block:', e);
        // Fallback: use .near() as last resort
        try {
          const $pos = tr.doc.resolve(1);
          tr.setSelection(state.selection.constructor.near($pos));
        } catch (e2) {
          console.error('[handleDeleteBlock] Cursor placement completely failed:', e2);
        }
      }
    }

    // Mark for undo
    tr.setMeta('addToHistory', true);
    tr.setMeta('historyGroup', 'delete-block');

    // Apply
    view.dispatch(tr);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }
}
