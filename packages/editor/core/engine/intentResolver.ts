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

export class IntentResolver {
  constructor(private _engine: EditorEngine) {}

  /**
   * Resolve an intent into commands
   *
   * This is the brain of the editor.
   */
  resolve(intent: EditorIntent): IntentResult {
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

    const command = new MoveBlockCommand(
      blockId,
      oldParentId,
      oldIndex,
      newParentId,
      newIndex
    );
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

    // 4. Policy check
    if (!this._engine.canNest(blockId, previousSiblingId)) {
      return {
        success: false,
        intent,
        reason: 'Nesting not allowed by policy',
      };
    }

    // 5. Move block under previous sibling (append as last child)
    const previousSibling = this._engine.getBlock(previousSiblingId);
    if (!previousSibling) {
      return {
        success: false,
        intent,
        reason: 'Previous sibling not found',
      };
    }

    const newIndex = previousSibling.children.length;

    this._engine.dispatch(
      new MoveBlockCommand(
        blockId,
        parent.id,
        index,
        previousSiblingId,
        newIndex
      )
    );

    // 6. Cursor placement
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

    // 5. Insert after parent (lift one level)
    const currentIndex = this._engine.getIndexInParent(blockId);
    const parentIndex = this._engine.getIndexInParent(parent.id);

    this._engine.dispatch(
      new MoveBlockCommand(
        blockId,
        parent.id,
        currentIndex,
        grandParent.id,
        parentIndex + 1
      )
    );

    // 6. Cursor placement
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
