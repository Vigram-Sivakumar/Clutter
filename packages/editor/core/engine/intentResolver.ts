/**
 * IntentResolver - Translates intents into commands
 *
 * This is where UX decisions live.
 *
 * An intent says "what user wants"
 * The resolver decides "how to do it"
 *
 * Examples:
 * - "delete-backward" at start of block → merge with previous
 * - "delete-backward" with selection → delete selection
 * - "delete-backward" with text → delete one char
 *
 * This is the single source of UX truth.
 */

import type { EditorEngine } from './EditorEngine';
import type { EditorIntent, IntentResult } from './intent';
import {
  InsertTextCommand,
  DeleteTextCommand,
  MoveBlockCommand,
  CreateBlockCommand,
  DeleteBlockCommand,
} from './command';
import {
  isDescendantOf,
  assertValidIndentTree,
  assertNoForwardParenting,
} from './subtreeHelpers';

/**
 * Recompute levels for ALL blocks based on parentBlockId chain
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CANONICAL MODEL: parentBlockId is TRUTH, level is DERIVED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This is the ONLY way levels should ever be set.
 * Level = depth in parent chain from root.
 *
 * Called after EVERY structural change (indent/outdent/move/paste).
 */
function recomputeAllLevels(doc: any, tr: any): void {
  // Build blockId → block data map
  const blocks = new Map<
    string,
    { node: any; pos: number; parentBlockId: string }
  >();

  doc.descendants((node: any, pos: number) => {
    if (node.attrs?.blockId) {
      blocks.set(node.attrs.blockId, {
        node,
        pos,
        parentBlockId: node.attrs.parentBlockId || 'root',
      });
    }
    return true;
  });

  // Compute level recursively from parent chain
  const levelCache = new Map<string, number>();

  function computeLevel(blockId: string): number {
    if (levelCache.has(blockId)) {
      return levelCache.get(blockId)!;
    }

    const block = blocks.get(blockId);
    if (!block) return 0;

    if (block.parentBlockId === 'root') {
      levelCache.set(blockId, 0);
      return 0;
    }

    const parentLevel = computeLevel(block.parentBlockId);
    const level = parentLevel + 1;
    levelCache.set(blockId, level);
    return level;
  }

  // Apply computed levels to ALL blocks
  blocks.forEach((block, blockId) => {
    const correctLevel = computeLevel(blockId);
    const currentLevel = block.node.attrs.level ?? 0;

    if (currentLevel !== correctLevel) {
      tr.setNodeMarkup(block.pos, undefined, {
        ...block.node.attrs,
        level: correctLevel,
      });
    }
  });
}

export class IntentResolver {
  constructor(
    private _engine: EditorEngine,
    private _editor?: any // Optional TipTap editor for PM sync
  ) {}

  /**
   * Resolve an intent into commands
   *
   * This is the brain of the editor.
   */
  resolve(intent: EditorIntent): IntentResult {
    // 🧠 INTENT RESOLUTION TRACE
    console.log('🧠 [IntentResolver.resolve]', {
      intent: intent.type,
      blockId: (intent as any).blockId,
    });

    // 🌳 FORENSIC CHECKPOINT 1: BEFORE MUTATION
    console.group('🌳 TREE SNAPSHOT — BEFORE MUTATION');
    const nodesBefore = Object.values(this._engine.tree.nodes).filter(
      (n: any) => n.id !== 'root'
    );
    nodesBefore.forEach((b: any, i: number) => {
      console.log(
        `${i}. ${b.id.slice(0, 8)} | level=${b.level} | parent=${b.parentId?.slice(0, 8) ?? 'root'}`
      );
    });
    console.groupEnd();

    const mode = this._engine.getMode();

    // CRITICAL: Check if intent is allowed in current mode
    if (!this._engine.isIntentAllowed(intent.type)) {
      return {
        success: false,
        intent,
        reason: `Intent '${intent.type}' not allowed in mode '${mode}'`,
        mode,
      };
    }

    // Route to handler
    try {
      switch (intent.type) {
        // ===== TEXT EDITING =====
        case 'insert-text':
          return this.handleInsertText(intent);

        case 'delete-backward':
          return this.handleDeleteBackward(intent);

        case 'delete-forward':
          return this.handleDeleteForward(intent);

        case 'delete-text':
          return this.handleDeleteText(intent);

        // ===== BLOCK MANIPULATION =====
        case 'create-block':
          return this.handleCreateBlock(intent);

        case 'delete-block':
          return this.handleDeleteBlock(intent);

        case 'merge-blocks':
          return this.handleMergeBlocks(intent);

        case 'split-block':
          return this.handleSplitBlock(intent);

        case 'convert-block':
          return this.handleConvertBlock(intent);

        case 'move-block':
          return this.handleMoveBlock(intent);

        case 'indent-block':
          return this.handleIndentBlock(intent);

        case 'outdent-block':
          return this.handleOutdentBlock(intent);

        // ===== SELECTION =====
        case 'select-block':
          return this.handleSelectBlock(intent);

        case 'select-blocks':
          return this.handleSelectBlocks(intent);

        case 'clear-selection':
          return this.handleClearSelection();

        // ===== HISTORY =====
        case 'undo':
          return this.handleUndo();

        case 'redo':
          return this.handleRedo();

        // ===== MODE CONTROL =====
        case 'enter-mode':
          return this.handleEnterMode(intent);

        case 'exit-mode':
          return this.handleExitMode();

        // ===== META =====
        case 'noop':
          return {
            success: true,
            intent,
            mode,
          };

        default:
          return {
            success: false,
            intent,
            reason: `Intent '${(intent as any).type}' not implemented yet`,
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

  // ===== INTENT HANDLERS =====

  private handleInsertText(
    intent: Extract<EditorIntent, { type: 'insert-text' }>
  ): IntentResult {
    const { blockId, text, at } = intent;
    const offset = at ?? this._engine.cursor?.offset ?? 0;

    const command = new InsertTextCommand(blockId, text, offset);
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleDeleteBackward(
    intent: Extract<EditorIntent, { type: 'delete-backward' }>
  ): IntentResult {
    const { blockId } = intent;
    const cursor = this._engine.cursor;

    if (!cursor || cursor.blockId !== blockId) {
      return {
        success: false,
        intent,
        reason: 'No cursor in this block',
      };
    }

    // At start of block? Merge with previous
    if (cursor.offset === 0) {
      const parent = this._engine.getParent(blockId);
      if (!parent) {
        return { success: false, intent, reason: 'At start of document' };
      }

      const siblings = parent.children;
      const index = siblings.indexOf(blockId);

      if (index > 0) {
        const previousId = siblings[index - 1];
        if (previousId) {
          return this.handleMergeBlocks({
            type: 'merge-blocks',
            sourceId: blockId,
            targetId: previousId,
          });
        }
      }

      return { success: false, intent, reason: 'No previous block' };
    }

    // Delete one character
    const command = new DeleteTextCommand(
      blockId,
      cursor.offset - 1,
      cursor.offset,
      '' // TODO: Get actual text being deleted
    );
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleDeleteForward(
    intent: Extract<EditorIntent, { type: 'delete-forward' }>
  ): IntentResult {
    // TODO: Implement
    return {
      success: false,
      intent,
      reason: 'Not implemented yet',
    };
  }

  private handleDeleteText(
    intent: Extract<EditorIntent, { type: 'delete-text' }>
  ): IntentResult {
    const { blockId, from, to } = intent;

    const command = new DeleteTextCommand(
      blockId,
      from,
      to,
      '' // TODO: Get actual text being deleted
    );
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleCreateBlock(
    intent: Extract<EditorIntent, { type: 'create-block' }>
  ): IntentResult {
    const { blockType, afterId, parentId, content } = intent;

    // Generate new block ID
    const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine parent and index
    let targetParentId = parentId;
    let index = 0;

    if (afterId) {
      const afterBlock = this._engine.getBlock(afterId);
      if (afterBlock) {
        targetParentId = afterBlock.parentId ?? undefined;
        const parent = this._engine.getParent(afterId);
        if (parent) {
          index = parent.children.indexOf(afterId) + 1;
        }
      }
    }

    if (!targetParentId) {
      targetParentId = this._engine.tree.rootId;
    }

    const command = new CreateBlockCommand(
      newBlockId,
      blockType,
      targetParentId,
      index,
      content
    );
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      data: { blockId: newBlockId },
      mode: this._engine.getMode(),
    };
  }

  private handleDeleteBlock(
    intent: Extract<EditorIntent, { type: 'delete-block' }>
  ): IntentResult {
    const { blockId } = intent;

    const command = new DeleteBlockCommand(blockId);
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleMergeBlocks(
    intent: Extract<EditorIntent, { type: 'merge-blocks' }>
  ): IntentResult {
    // TODO: Implement proper merge logic
    // For now, just delete the source block
    const { sourceId } = intent;

    const command = new DeleteBlockCommand(sourceId);
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleSplitBlock(
    intent: Extract<EditorIntent, { type: 'split-block' }>
  ): IntentResult {
    // TODO: Implement
    return {
      success: false,
      intent,
      reason: 'Not implemented yet',
    };
  }

  private handleConvertBlock(
    intent: Extract<EditorIntent, { type: 'convert-block' }>
  ): IntentResult {
    // TODO: Implement ConvertBlockCommand
    //
    // This should:
    // 1. Create a new block of target type at same position
    // 2. Copy content from old block (if compatible)
    // 3. Delete old block
    // 4. Update engine.tree
    // 5. TipTap bridge will sync to TipTap document
    //
    // For now, keyboard rules handle conversion directly via TipTap commands.
    // This is a temporary bridge until ConvertBlockCommand is implemented.

    return {
      success: false,
      intent,
      reason:
        'ConvertBlockCommand not implemented yet (keyboard rules handle it directly)',
    };
  }

  private handleMoveBlock(
    intent: Extract<EditorIntent, { type: 'move-block' }>
  ): IntentResult {
    const { blockId, afterId, parentId } = intent;

    const block = this._engine.getBlock(blockId);
    if (!block) {
      return {
        success: false,
        intent,
        reason: `Block ${blockId} not found`,
      };
    }

    const oldParentId = block.parentId;
    const oldIndex = this._engine.getIndexInParent(blockId);

    // Determine new parent and index
    let newParentId = parentId || oldParentId;
    let newIndex = 0;

    if (afterId) {
      const afterBlock = this._engine.getBlock(afterId);
      if (afterBlock) {
        newParentId = afterBlock.parentId;
        const parent = this._engine.getParent(afterId);
        if (parent) {
          newIndex = parent.children.indexOf(afterId) + 1;
        }
      }
    }

    const command = new MoveBlockCommand({
      blockId,
      oldParentId,
      oldIndex,
      newParentId,
      newIndex,
      intentCategory: 'block-move',
      engine: this._engine,
    });
    this._engine.dispatch(command);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleIndentBlock(
    intent: Extract<EditorIntent, { type: 'indent-block' }>
  ): IntentResult {
    const { blockId } = intent;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔒 HARD STOP: Find Nearest Adoptable Parent (FIRST GUARD)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (this._editor && this._editor.state) {
      const { state } = this._editor;
      const doc = state.doc;

      // Get blocks in document order with their levels
      const blocks: Array<{ id: string; level: number; pos: number }> = [];
      doc.descendants((node, pos) => {
        if (node.attrs?.blockId) {
          blocks.push({
            id: node.attrs.blockId,
            level: node.attrs.level ?? 0,
            pos,
          });
        }
        return true;
      });

      const currentIndex = blocks.findIndex((b) => b.id === blockId);
      if (currentIndex <= 0) {
        return {
          success: false,
          intent,
          reason: 'No previous block to indent under',
        };
      }

      const currentBlock = blocks[currentIndex];
      const currentLevel = currentBlock.level;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔍 THE FINAL, CORRECT INDENT RULE (Notion-style)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Indent is decided ONLY by the immediate previous block.
      //
      // RULE: If prev.level >= current.level → ALLOW
      //       Else → BLOCK
      //
      // This is not about finding "same level parents" or scanning.
      // It's about visual adjacency: can the previous block contain me?
      //
      // Examples:
      //   A (0)
      //     B (1) ← prev
      //     C (1) ← Tab → prev.level (1) >= current (1) ✅
      //
      //   A (0)
      //     B (1)
      //       C (2) ← prev
      //   D (0) ← Tab → prev.level (2) >= current (0) ✅ (second child)
      //
      //   A (0)
      //     B (1) ← prev
      //       C (2) ← Tab → prev.level (1) < current (2) ❌ (stops infinite indent)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const immediatePrevious = blocks[currentIndex - 1];
      let adoptableParent: (typeof blocks)[number] | null = null;

      // Simple rule: previous must be at same level or deeper
      if (immediatePrevious.level >= currentLevel) {
        adoptableParent = immediatePrevious;
      } else {
        console.log(
          `🔒 [handleIndentBlock] BLOCKED: Previous block too shallow`,
          {
            current: { id: blockId.slice(0, 8), level: currentLevel },
            previous: {
              id: immediatePrevious.id.slice(0, 8),
              level: immediatePrevious.level,
            },
            reason: `prev.level (${immediatePrevious.level}) < current.level (${currentLevel})`,
          }
        );

        return {
          success: false,
          intent,
          reason: 'Cannot indent: previous block is shallower',
        };
      }

      console.log(`✅ [handleIndentBlock] Indent allowed`, {
        current: { id: blockId.slice(0, 8), level: currentLevel },
        previous: {
          id: adoptableParent.id.slice(0, 8),
          level: adoptableParent.level,
        },
      });

      // 🔒 Circular reference check
      if (isDescendantOf(doc, adoptableParent.id, blockId)) {
        console.log(
          `🔒 [handleIndentBlock] BLOCKED: Circular reference prevented`,
          {
            current: { id: blockId.slice(0, 8) },
            parent: { id: adoptableParent.id.slice(0, 8) },
            reason: 'Cannot indent under own descendant',
          }
        );
        return {
          success: false,
          intent,
          reason: 'Cannot indent: would create circular reference',
        };
      }
    }

    // 1. Get block
    const block = this._engine.getBlock(blockId);
    if (!block) {
      return {
        success: false,
        intent,
        reason: `Block ${blockId} not found`,
      };
    }

    // 2. Get parent and siblings
    const parent = this._engine.getParent(blockId);
    if (!parent) {
      return {
        success: false,
        intent,
        reason: 'Block has no parent (cannot indent root)',
      };
    }

    const siblings = parent.children;
    const index = siblings.indexOf(blockId);

    // 3. Must have a previous sibling
    if (index <= 0) {
      return {
        success: false,
        intent,
        reason: 'No previous sibling to nest under',
      };
    }

    const previousSiblingId = siblings[index - 1];

    // Guard: previousSiblingId must exist (should never fail due to index > 0 check)
    if (!previousSiblingId) {
      return {
        success: false,
        intent,
        reason: 'Previous sibling not found in siblings array',
      };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔑 SPECIAL CASE: Toggle Adoption
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // If previous sibling is a toggleHeader, Tab adopts the block INTO the toggle.
    //
    // BEFORE:  ▶ My Toggle
    //          Paragraph (cursor here)
    //
    // AFTER:   ▼ My Toggle
    //            └─ Paragraph (cursor here)
    //
    // This must be checked BEFORE general nesting logic.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const previousSibling = this._engine.getBlock(previousSiblingId);
    if (!previousSibling) {
      return {
        success: false,
        intent,
        reason: 'Previous sibling not found',
      };
    }

    if (previousSibling.type === 'toggleHeader') {
      console.log(
        '🔑 [handleIndentBlock] Toggle adoption detected:',
        blockId,
        '→',
        previousSiblingId
      );

      // 🔥 CANONICAL MODEL: Toggle adoption = same as indent
      if (this._editor && this._editor.state) {
        const { state, view } = this._editor;
        const doc = state.doc;
        const tr = state.tr;

        // Find the selected block
        let selectedPos: number | null = null;
        let selectedNode: any = null;

        doc.descendants((node: any, pos: number) => {
          if (node.attrs?.blockId === blockId) {
            selectedPos = pos;
            selectedNode = node;
            return false;
          }
          return true;
        });

        if (selectedPos !== null && selectedNode) {
          console.log('✅ [handleIndentBlock/toggle] Adopting under toggle:', {
            block: blockId.slice(0, 8),
            toggle: previousSiblingId.slice(0, 8),
          });

          // Mark for undo grouping
          tr.setMeta('addToHistory', true);
          tr.setMeta('historyGroup', 'indent-block');

          // STEP 1: Change selected block's parent to toggle
          tr.setNodeMarkup(selectedPos, undefined, {
            ...selectedNode.attrs,
            parentBlockId: previousSiblingId,
            // level will be recomputed - don't set it!
          });

          // STEP 2: Recompute ALL levels from parent chain
          recomputeAllLevels(doc, tr);

          // STEP 3: Expand toggle if collapsed (Notion-style)
          let togglePos: number | null = null;
          doc.descendants((node: any, pos: number) => {
            if (node.attrs?.blockId === previousSiblingId) {
              togglePos = pos;
              return false;
            }
            return true;
          });

          if (togglePos !== null) {
            const toggleNode = doc.nodeAt(togglePos);
            if (toggleNode && toggleNode.attrs.collapsed) {
              console.log(
                '🔑 [handleIndentBlock] Expanding collapsed toggle:',
                previousSiblingId
              );
              tr.setNodeMarkup(togglePos, undefined, {
                ...toggleNode.attrs,
                collapsed: false,
              });
            }
          }

          // Apply transaction
          view.dispatch(tr);

          // Validate tree in dev mode
          assertValidIndentTree(tr.doc);
          assertNoForwardParenting(tr.doc);
        }
      }

      // 🔥 CRITICAL: Do NOT issue MoveBlockCommand
      // Indent/outdent is now TipTap-owned (updates level + parentBlockId attributes).
      // Engine derives structure from those attributes during rebuild.
      // See: docs/INDENT_TREE_INVARIANT.md

      // Cursor placement
      this._engine.setCursorAfterStructuralMove(blockId);

      return {
        success: true,
        intent,
        mode: this._engine.getMode(),
      };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GENERAL NESTING (List items, etc.)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // 4. Policy check
    if (!this._engine.canNest(blockId, previousSiblingId)) {
      return {
        success: false,
        intent,
        reason: 'Nesting not allowed by policy',
      };
    }

    // 5. 🔥 CANONICAL MODEL: Indent = Change parent, recompute levels
    if (this._editor && this._editor.state) {
      const { state, view } = this._editor;
      const doc = state.doc;
      const tr = state.tr;

      // Find the selected block and previous block
      let selectedPos: number | null = null;
      let selectedNode: any = null;

      doc.descendants((node: any, pos: number) => {
        if (node.attrs?.blockId === blockId) {
          selectedPos = pos;
          selectedNode = node;
          return false;
        }
        return true;
      });

      if (selectedPos !== null && selectedNode) {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // CANONICAL INDENT MODEL
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 1. Change selected block's parent to previous block
        // 2. Recompute ALL levels from parent chain
        // 3. Children automatically follow (their parent unchanged)
        //
        // NO subtree detection needed!
        // NO level math needed!
        // Structure comes from parents, levels are derived.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Prevent circular parenting (don't indent under own descendant)
        if (isDescendantOf(doc, previousSiblingId, blockId)) {
          console.log('🔒 [handleIndentBlock] BLOCKED: Circular reference');
          return {
            success: false,
            intent,
            reason: 'Cannot indent: would create circular reference',
          };
        }

        console.log('✅ [handleIndentBlock] Reparenting:', {
          block: blockId.slice(0, 8),
          oldParent: (selectedNode.attrs.parentBlockId || 'root').slice(0, 8),
          newParent: previousSiblingId.slice(0, 8),
        });

        // Mark for undo grouping
        tr.setMeta('addToHistory', true);
        tr.setMeta('historyGroup', 'indent-block');

        // STEP 1: Change selected block's parent (ONLY change!)
        tr.setNodeMarkup(selectedPos, undefined, {
          ...selectedNode.attrs,
          parentBlockId: previousSiblingId,
          // level will be recomputed - don't set it!
        });

        // STEP 2: Recompute ALL levels from parent chain
        recomputeAllLevels(doc, tr);

        // Apply transaction
        view.dispatch(tr);

        // 🌳 FINAL TREE STATE SNAPSHOT (POST-OPERATION)
        console.group('🌳 FINAL TREE STATE');
        tr.doc.descendants((node: any) => {
          if (node.attrs?.blockId) {
            console.log(
              `${node.attrs.blockId.slice(0, 6)} | parent=${node.attrs.parentBlockId?.slice(0, 6) || 'root'} | level=${node.attrs.level}`
            );
          }
          return true;
        });
        console.groupEnd();

        // Validate tree in dev mode
        assertValidIndentTree(tr.doc);
        assertNoForwardParenting(tr.doc);
      }
    }

    // 6. 🔥 CRITICAL: Do NOT issue MoveBlockCommand
    // Indent/outdent is now TipTap-owned (updates level + parentBlockId attributes).
    // Engine derives structure from those attributes during rebuild.
    // See: docs/INDENT_TREE_INVARIANT.md

    // 7. Cursor placement
    this._engine.setCursorAfterStructuralMove(blockId);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleOutdentBlock(
    intent: Extract<EditorIntent, { type: 'outdent-block' }>
  ): IntentResult {
    const { blockId } = intent;

    // ⬆️ OUTDENT FLOW TRACE
    console.log('⬆️ [handleOutdentBlock] START', {
      blockId,
    });

    // 1. Get block
    const block = this._engine.getBlock(blockId);
    if (!block) {
      return {
        success: false,
        intent,
        reason: `Block ${blockId} not found`,
      };
    }

    // 2. Get parent
    const parent = this._engine.getParent(blockId);
    if (!parent) {
      return {
        success: false,
        intent,
        reason: 'Block has no parent (already at root)',
      };
    }

    // 3. Get grandparent
    const grandParent = this._engine.getParent(parent.id);
    if (!grandParent) {
      return {
        success: false,
        intent,
        reason: 'Parent is root (cannot outdent further)',
      };
    }

    // 4. Policy check
    if (!this._engine.canOutdent(blockId)) {
      return {
        success: false,
        intent,
        reason: 'Outdent not allowed by policy',
      };
    }

    // 5. 🔥 CANONICAL MODEL: Outdent = Change parent to grandparent, recompute levels
    if (this._editor && this._editor.state) {
      const { state, view } = this._editor;
      const doc = state.doc;
      const tr = state.tr;

      // Find the selected block
      let selectedPos: number | null = null;
      let selectedNode: any = null;

      doc.descendants((node: any, pos: number) => {
        if (node.attrs?.blockId === blockId) {
          selectedPos = pos;
          selectedNode = node;
          return false;
        }
        return true;
      });

      if (selectedPos !== null && selectedNode) {
        const currentParent = selectedNode.attrs.parentBlockId || 'root';

        if (currentParent === 'root') {
          console.log('🔒 [handleOutdentBlock] BLOCKED: Already at root');
          return {
            success: false,
            intent,
            reason: 'Block already at root level',
          };
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // CANONICAL OUTDENT MODEL
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 1. Change selected block's parent to its grandparent
        // 2. Recompute ALL levels from parent chain
        // 3. Children automatically follow (their parent unchanged)
        //
        // NO subtree detection needed!
        // NO level math needed!
        // Structure comes from parents, levels are derived.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Find parent node to get grandparent
        let parentNode: any = null;
        doc.descendants((node: any) => {
          if (node.attrs?.blockId === currentParent) {
            parentNode = node;
            return false;
          }
          return true;
        });

        if (!parentNode) {
          console.log('🔒 [handleOutdentBlock] BLOCKED: Parent not found');
          return {
            success: false,
            intent,
            reason: 'Parent block not found',
          };
        }

        const grandparent = parentNode.attrs.parentBlockId || 'root';

        console.log('✅ [handleOutdentBlock] Reparenting:', {
          block: blockId.slice(0, 8),
          oldParent: currentParent.slice(0, 8),
          newParent: grandparent === 'root' ? 'root' : grandparent.slice(0, 8),
        });

        // Mark for undo grouping
        tr.setMeta('addToHistory', true);
        tr.setMeta('historyGroup', 'outdent-block');

        // STEP 1: Change selected block's parent to grandparent (ONLY change!)
        tr.setNodeMarkup(selectedPos, undefined, {
          ...selectedNode.attrs,
          parentBlockId: grandparent,
          // level will be recomputed - don't set it!
        });

        // STEP 2: Recompute ALL levels from parent chain
        recomputeAllLevels(doc, tr);

        // Apply transaction
        view.dispatch(tr);

        // 🌳 FINAL TREE STATE SNAPSHOT (POST-OPERATION)
        console.group('🌳 FINAL TREE STATE');
        tr.doc.descendants((node: any) => {
          if (node.attrs?.blockId) {
            console.log(
              `${node.attrs.blockId.slice(0, 6)} | parent=${node.attrs.parentBlockId?.slice(0, 6) || 'root'} | level=${node.attrs.level}`
            );
          }
          return true;
        });
        console.groupEnd();

        // Validate tree in dev mode
        assertValidIndentTree(tr.doc);
        assertNoForwardParenting(tr.doc);
      }
    }

    // 6. 🔥 CRITICAL: Do NOT issue MoveBlockCommand
    // Indent/outdent is now TipTap-owned (updates level + parentBlockId attributes).
    // Engine derives structure from those attributes during rebuild.
    // Issuing MoveBlockCommand here would create a conflict and re-orphan children.
    //
    // See: docs/INDENT_TREE_INVARIANT.md - "Single Source of Truth"

    // 7. Cursor placement
    this._engine.setCursorAfterStructuralMove(blockId);

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleSelectBlock(
    intent: Extract<EditorIntent, { type: 'select-block' }>
  ): IntentResult {
    this._engine.selection = {
      kind: 'block',
      blockIds: [intent.blockId],
    };

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleSelectBlocks(
    intent: Extract<EditorIntent, { type: 'select-blocks' }>
  ): IntentResult {
    this._engine.selection = {
      kind: 'block',
      blockIds: intent.blockIds,
    };

    return {
      success: true,
      intent,
      mode: this._engine.getMode(),
    };
  }

  private handleClearSelection(): IntentResult {
    this._engine.selection = { kind: 'none' };

    return {
      success: true,
      intent: { type: 'clear-selection' },
      mode: this._engine.getMode(),
    };
  }

  private handleUndo(): IntentResult {
    const success = this._engine.undo();

    return {
      success,
      intent: { type: 'undo' },
      reason: success ? undefined : 'Nothing to undo',
      mode: this._engine.getMode(),
    };
  }

  private handleRedo(): IntentResult {
    const success = this._engine.redo();

    return {
      success,
      intent: { type: 'redo' },
      reason: success ? undefined : 'Nothing to redo',
      mode: this._engine.getMode(),
    };
  }

  private handleEnterMode(
    intent: Extract<EditorIntent, { type: 'enter-mode' }>
  ): IntentResult {
    this._engine.setMode(intent.mode);

    return {
      success: true,
      intent,
      mode: intent.mode,
    };
  }

  private handleExitMode(): IntentResult {
    this._engine.popMode('explicit exit');

    return {
      success: true,
      intent: { type: 'exit-mode' },
      mode: this._engine.getMode(),
    };
  }
}
