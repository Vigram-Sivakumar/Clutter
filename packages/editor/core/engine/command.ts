/**
 * EditorCommand - A reversible state change
 *
 * Commands are how ALL state changes happen.
 *
 * Every command must:
 * 1. Know how to apply itself
 * 2. Know how to undo itself
 * 3. Be deterministic (same input = same output)
 *
 * This is how Apple-level undo works.
 * Not DOM-based. Not event-based. Structural.
 */

import type { EditorEngine } from './EditorEngine';
import type { BlockId } from './types';

/**
 * EditorCommand interface
 *
 * Every mutation becomes a command.
 * Every command goes through history.
 */
export interface EditorCommand {
  /** Unique identifier for debugging */
  readonly id: string;

  /** Human-readable description */
  readonly description: string;

  /** Apply this command to the engine */
  apply(_engine: EditorEngine): void;

  /** Reverse this command */
  undo(_engine: EditorEngine): void;

  /** Optional: Merge with previous command (for typing) */
  canMerge?(_other: EditorCommand): boolean;
  merge?(_other: EditorCommand): EditorCommand;
}

/**
 * InsertTextCommand - Insert text into a block
 */
export class InsertTextCommand implements EditorCommand {
  readonly id = 'insert-text';
  readonly description: string;

  constructor(
    private _blockId: BlockId,
    private _text: string,
    private _offset: number
  ) {
    this.description = `Insert "${_text}" at ${_offset}`;
  }

  apply(_engine: EditorEngine): void {
    // TODO: Implement when we connect to ProseMirror
    console.log(
      '[InsertTextCommand] apply',
      this._blockId,
      this._text,
      this._offset
    );
  }

  undo(_engine: EditorEngine): void {
    // TODO: Implement when we connect to ProseMirror
    console.log(
      '[InsertTextCommand] undo',
      this._blockId,
      this._text,
      this._offset
    );
  }

  // Allow merging consecutive typing
  canMerge(_other: EditorCommand): boolean {
    if (!(_other instanceof InsertTextCommand)) return false;
    if (_other._blockId !== this._blockId) return false;
    // Only merge if typing at the end of previous insertion
    return _other._offset === this._offset + this._text.length;
  }

  merge(_other: EditorCommand): EditorCommand {
    const otherCmd = _other as InsertTextCommand;
    return new InsertTextCommand(
      this._blockId,
      this._text + otherCmd._text,
      this._offset
    );
  }
}

/**
 * DeleteTextCommand - Delete text from a block
 */
export class DeleteTextCommand implements EditorCommand {
  readonly id = 'delete-text';
  readonly description: string;

  constructor(
    private _blockId: BlockId,
    private _from: number,
    private _to: number,
    private _deletedText: string // Store for undo
  ) {
    this.description = `Delete "${_deletedText}" from ${_from} to ${_to}`;
  }

  apply(_engine: EditorEngine): void {
    console.log(
      '[DeleteTextCommand] apply',
      this._blockId,
      this._from,
      this._to
    );
  }

  undo(_engine: EditorEngine): void {
    console.log('[DeleteTextCommand] undo - restore', this._deletedText);
  }
}

/**
 * MoveBlockCommand - Move a block to a new position
 */
export class MoveBlockCommand implements EditorCommand {
  readonly id = 'move-block';
  readonly description: string;

  constructor(
    private blockId: BlockId,
    private oldParentId: BlockId | null,
    private oldIndex: number,
    private newParentId: BlockId | null,
    private newIndex: number
  ) {
    this.description = `Move block ${blockId} from ${oldParentId}[${oldIndex}] to ${newParentId}[${newIndex}]`;
  }

  apply(engine: EditorEngine): void {
    const block = engine.tree.nodes[this.blockId];
    if (!block) return;

    // Remove from old parent
    if (this.oldParentId) {
      const oldParent = engine.tree.nodes[this.oldParentId];
      oldParent.children = oldParent.children.filter(
        (id) => id !== this.blockId
      );
    }

    // Add to new parent
    if (this.newParentId) {
      const newParent = engine.tree.nodes[this.newParentId];
      newParent.children.splice(this.newIndex, 0, this.blockId);
    }

    block.parentId = this.newParentId;
  }

  undo(engine: EditorEngine): void {
    const block = engine.tree.nodes[this.blockId];
    if (!block) return;

    // Remove from new parent
    if (this.newParentId) {
      const newParent = engine.tree.nodes[this.newParentId];
      newParent.children = newParent.children.filter(
        (id) => id !== this.blockId
      );
    }

    // Restore to old parent
    if (this.oldParentId) {
      const oldParent = engine.tree.nodes[this.oldParentId];
      oldParent.children.splice(this.oldIndex, 0, this.blockId);
    }

    block.parentId = this.oldParentId;
  }
}

/**
 * CreateBlockCommand - Create a new block
 */
export class CreateBlockCommand implements EditorCommand {
  readonly id = 'create-block';
  readonly description: string;

  constructor(
    private blockId: BlockId,
    private blockType: string,
    private _parentId: BlockId | null,
    private _index: number,
    private _content: unknown
  ) {
    this.description = `Create ${blockType} block ${blockId}`;
  }

  apply(engine: EditorEngine): void {
    // Create the block
    engine.tree.nodes[this.blockId] = {
      id: this.blockId,
      type: this.blockType,
      parentId: this._parentId,
      children: [],
      content: this._content,
    };

    // Add to parent's children
    if (this._parentId) {
      const parent = engine.tree.nodes[this._parentId];
      parent.children.splice(this._index, 0, this.blockId);
    }
  }

  undo(engine: EditorEngine): void {
    // Remove from parent's children
    if (this._parentId) {
      const parent = engine.tree.nodes[this._parentId];
      parent.children = parent.children.filter((id) => id !== this.blockId);
    }

    // Delete the block
    delete engine.tree.nodes[this.blockId];
  }
}

/**
 * DeleteBlockCommand - Delete a block
 */
export class DeleteBlockCommand implements EditorCommand {
  readonly id = 'delete-block';
  readonly description: string;
  private deletedBlock: import('./types').BlockNode | null = null;

  constructor(private _blockId: BlockId) {
    this.description = `Delete block ${_blockId}`;
  }

  apply(engine: EditorEngine): void {
    const block = engine.tree.nodes[this._blockId];
    if (!block) return;

    // Store for undo
    this.deletedBlock = { ...block };

    // Remove from parent's children
    if (block.parentId) {
      const parent = engine.tree.nodes[block.parentId];
      parent.children = parent.children.filter((id) => id !== this._blockId);
    }

    // Delete the block
    delete engine.tree.nodes[this._blockId];
  }

  undo(engine: EditorEngine): void {
    if (!this.deletedBlock) return;

    // Restore the block
    engine.tree.nodes[this._blockId] = { ...this.deletedBlock };

    // Add back to parent's children
    if (this.deletedBlock.parentId) {
      const parent = engine.tree.nodes[this.deletedBlock.parentId];
      parent.children.push(this._blockId);
    }
  }
}

/**
 * CommandGroup - Multiple commands that undo as one unit
 */
export class CommandGroup implements EditorCommand {
  readonly id = 'command-group';
  readonly description: string;

  constructor(
    private commands: EditorCommand[],
    description?: string
  ) {
    this.description = description || `Group of ${commands.length} commands`;
  }

  apply(engine: EditorEngine): void {
    for (const cmd of this.commands) {
      cmd.apply(engine);
    }
  }

  undo(engine: EditorEngine): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo(engine);
    }
  }
}
