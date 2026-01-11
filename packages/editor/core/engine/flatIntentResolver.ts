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
   * RULE: Increase indent by 1
   * NO subtree logic
   * NO parent assignment
   * NO validation
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

    // Find block
    let blockPos: number | null = null;
    let blockNode: any = null;

    doc.descendants((node: any, pos: number) => {
      if (node.attrs?.blockId === blockId) {
        blockPos = pos;
        blockNode = node;
        return false;
      }
      return true;
    });

    if (blockPos === null || !blockNode) {
      return {
        success: false,
        intent,
        reason: 'Block not found',
      };
    }

    // Get current indent
    const currentIndent = blockNode.attrs.indent ?? 0;

    console.log('[FLAT INDENT] BEFORE:', {
      blockId: blockId.slice(0, 8),
      currentIndent,
      hasIndentAttr: 'indent' in blockNode.attrs,
      attrs: blockNode.attrs,
    });

    // CANONICAL RULE: Just increase indent by 1
    tr.setNodeMarkup(blockPos, undefined, {
      ...blockNode.attrs,
      indent: currentIndent + 1,
    });

    // Mark for undo
    tr.setMeta('addToHistory', true);
    tr.setMeta('historyGroup', 'indent-block');

    // Apply
    view.dispatch(tr);

    // Verify after dispatch
    const updatedNode = view.state.doc.nodeAt(blockPos);
    console.log('[FLAT INDENT] AFTER:', {
      blockId: blockId.slice(0, 8),
      newIndent: updatedNode?.attrs.indent,
      attrs: updatedNode?.attrs,
    });

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
}
