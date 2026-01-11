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
  getOutdentAffectedBlocks,
  getIndentAffectedBlocks,
  getParentBlockIdForLevel,
  isDescendantOf,
  assertValidIndentTree,
  assertNoForwardParenting,
} from './subtreeHelpers';

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

      // 🔥 CRITICAL FIX: Update visual subtree levels in ProseMirror
      if (this._editor && this._editor.state) {
        const { state, view } = this._editor;
        const doc = state.doc;
        const tr = state.tr;

        // Find the block in ProseMirror document
        let blockPos: number | null = null;
        let currentLevel = 0;

        doc.descendants((node: any, pos: number) => {
          if (node.attrs?.blockId === blockId) {
            blockPos = pos;
            currentLevel = node.attrs.level ?? 0;
            return false;
          }
          return true;
        });

        if (blockPos !== null) {
          const newLevel = currentLevel + 1;

          // Get all blocks that need level adjustment (parent + subtree)
          const affectedBlocks = getIndentAffectedBlocks(
            doc,
            blockPos,
            currentLevel,
            newLevel
          );

          console.log(
            `🔧 [handleIndentBlock/toggle] Updating ${affectedBlocks.length} blocks`,
            affectedBlocks.map((b) => ({
              id: b.blockId.slice(0, 8),
              level: `${b.oldLevel}→${b.newLevel}`,
            }))
          );

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 📝 UNDO GROUPING: Mark as user action (single undo step)
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          tr.setMeta('addToHistory', true);
          tr.setMeta('historyGroup', 'indent-block');

          // Update level AND parentBlockId for ALL affected blocks
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔥 CRITICAL FIX: parentBlockId MUST reflect new level position
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // When indenting, EVERY block (root + children) must have its
          // parentBlockId recalculated based on its new level.
          //
          // Example:
          //   A
          //     B
          //     C  [Tab]
          //
          // Result:
          //   A
          //     B
          //       C  ← parent MUST become B (not stay A!)
          //
          // If we don't update C's parent, later outdenting B won't find C
          // as B's child, causing subtree corruption.
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          for (let i = 0; i < affectedBlocks.length; i++) {
            const item = affectedBlocks[i];
            const node = doc.nodeAt(item.pos);
            if (node) {
              // ALL blocks: recalculate parent based on new level
              const newParentBlockId =
                getParentBlockIdForLevel(doc, item.pos, item.newLevel) ||
                'root';

              tr.setNodeMarkup(item.pos, undefined, {
                ...node.attrs,
                level: item.newLevel,
                parentBlockId: newParentBlockId,
              });
            }
          }

          // Expand toggle if collapsed (Notion-style)
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

          // Apply transaction (single undoable action)
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

    // 5. 🔥 CRITICAL FIX: Update visual subtree levels in ProseMirror
    if (this._editor && this._editor.state) {
      const { state, view } = this._editor;
      const doc = state.doc;
      const tr = state.tr;

      // Find the block in ProseMirror document
      let blockPos: number | null = null;
      let currentLevel = 0;

      doc.descendants((node: any, pos: number) => {
        if (node.attrs?.blockId === blockId) {
          blockPos = pos;
          currentLevel = node.attrs.level ?? 0;
          return false;
        }
        return true;
      });

      if (blockPos !== null) {
        const newLevel = currentLevel + 1;

        // Get all blocks that need level adjustment (parent + subtree)
        const affectedBlocks = getIndentAffectedBlocks(
          doc,
          blockPos,
          currentLevel,
          newLevel
        );

        console.log(
          `🔧 [handleIndentBlock] Updating ${affectedBlocks.length} blocks:`,
          affectedBlocks.map((b) => ({
            id: b.blockId.slice(0, 8),
            level: `${b.oldLevel}→${b.newLevel}`,
          }))
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📝 UNDO GROUPING: Mark as user action (single undo step)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        tr.setMeta('addToHistory', true);
        tr.setMeta('historyGroup', 'indent-block');

        // Update level AND parentBlockId for ALL affected blocks
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔥 CRITICAL FIX: parentBlockId MUST reflect new level position
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // When indenting, EVERY block (root + children) must have its
        // parentBlockId recalculated based on its new level.
        //
        // Example:
        //   A
        //     B
        //     C  [Tab]
        //
        // Result:
        //   A
        //     B
        //       C  ← parent MUST become B (not stay A!)
        //
        // If we don't update C's parent, later outdenting B won't find C
        // as B's child, causing subtree corruption.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        for (let i = 0; i < affectedBlocks.length; i++) {
          const item = affectedBlocks[i];
          const node = doc.nodeAt(item.pos);
          if (node) {
            // ALL blocks: recalculate parent based on new level
            const newParentBlockId =
              getParentBlockIdForLevel(doc, item.pos, item.newLevel) || 'root';

            tr.setNodeMarkup(item.pos, undefined, {
              ...node.attrs,
              level: item.newLevel,
              parentBlockId: newParentBlockId,
            });
          }
        }

        // Apply transaction (single undoable action)
        view.dispatch(tr);

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

    // 5. 🔥 CRITICAL FIX: Update visual subtree levels in ProseMirror
    // This ensures all visual descendants move with the parent
    if (this._editor && this._editor.state) {
      const { state, view } = this._editor;
      const doc = state.doc;
      const tr = state.tr;

      // Find the block in ProseMirror document
      let blockPos: number | null = null;
      let currentLevel = 0;

      doc.descendants((node: any, pos: number) => {
        if (node.attrs?.blockId === blockId) {
          blockPos = pos;
          currentLevel = node.attrs.level ?? 0;
          return false;
        }
        return true;
      });

      // 📍 BLOCK POSITION TRACE
      console.log('📍 [handleOutdentBlock] blockPos found', {
        blockId,
        blockPos,
        currentLevel,
      });

      if (blockPos !== null && currentLevel > 0) {
        // Get all blocks that need level adjustment (parent + subtree)
        // 🔑 CRITICAL: Pass blockId (not position) for stable identification
        const affectedBlocks = getOutdentAffectedBlocks(
          doc,
          blockId,
          currentLevel
        );

        // 🌳 SUBTREE DETECTION TRACE (CRITICAL!)
        console.log('🌳 [getOutdentAffectedBlocks] RESULT', {
          root: blockId,
          count: affectedBlocks.length,
          blocks: affectedBlocks.map((b) => ({
            id: b.blockId.slice(0, 8),
            pos: b.pos,
            oldLevel: b.oldLevel,
            newLevel: b.newLevel,
          })),
        });

        console.log(
          `🔧 [handleOutdentBlock] Updating ${affectedBlocks.length} blocks:`,
          affectedBlocks.map((b) => ({
            id: b.blockId.slice(0, 8),
            level: `${b.oldLevel}→${b.newLevel}`,
          }))
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📝 UNDO GROUPING: Mark as user action (single undo step)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        tr.setMeta('addToHistory', true);
        tr.setMeta('historyGroup', 'outdent-block');

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔑 CRITICAL: Adopt-Nearest-Grandparent Outdent
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ONLY the root block being outdented gets a new parentBlockId.
        // Children stay attached to their parents (subtree integrity).
        //
        // Example:
        //   A
        //     B
        //     C  ← outdent
        //       D
        //
        // After:
        //   A
        //   B
        //   C  ← new parent = 'root'
        //     D  ← keeps parent = C (NOT recalculated!)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Update level AND parentBlockId for all affected blocks
        for (let i = 0; i < affectedBlocks.length; i++) {
          const item = affectedBlocks[i];
          const node = doc.nodeAt(item.pos);
          if (node) {
            let newParentBlockId: string;

            if (i === 0) {
              // ROOT of outdent operation: calculate grandparent
              // (nearest block at newLevel - 1)
              newParentBlockId =
                getParentBlockIdForLevel(doc, item.pos, item.newLevel) ||
                'root';
            } else {
              // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              // 🔥 CRITICAL FIX: Children MUST follow the root block
              // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              // When outdenting, the subtree moves WITH the root block.
              // Children do NOT stay attached to the old grandparent.
              //
              // Example:
              //   A
              //     B [Shift+Tab]
              //       C
              //       D
              //
              // Result (CORRECT):
              //   A
              //   B          ← parent = root
              //     C        ← parent = B (follows B!)
              //     D        ← parent = B (follows B!)
              //
              // NOT (WRONG):
              //   A
              //   B
              //     C        ← parent = A (stays behind! ❌)
              //     D        ← parent = A (stays behind! ❌)
              // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              newParentBlockId = affectedBlocks[0].blockId;
            }

            // 🔗 FORENSIC CHECKPOINT 3: REPARENT DECISION
            console.log(
              '🔗 REPARENT',
              item.blockId.slice(0, 8),
              '→',
              newParentBlockId === 'root'
                ? 'root'
                : newParentBlockId.slice(0, 8)
            );

            tr.setNodeMarkup(item.pos, undefined, {
              ...node.attrs,
              level: item.newLevel,
              parentBlockId: newParentBlockId,
            });
          }
        }

        // Apply transaction (single undoable action)
        view.dispatch(tr);

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
