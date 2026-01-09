/**
 * EditorIntent - Human-level actions the editor can perform
 *
 * Intents represent USER INTENTION, not implementation.
 *
 * Examples:
 * - User presses Backspace → "delete-backward" intent
 * - User clicks drag handle → "start-drag" intent
 * - User presses Enter → "split-block" or "create-block" intent
 *
 * The IntentResolver decides HOW to fulfill each intent.
 *
 * WHY THIS EXISTS:
 * - Separates "what user wants" from "how to do it"
 * - Makes UX decisions explicit and debuggable
 * - Enables complex logic without spaghetti handlers
 */

import type { BlockId } from './types';

export type EditorIntent =
  // ===== TEXT EDITING =====
  | { type: 'insert-text'; blockId: BlockId; text: string; at?: number }
  | { type: 'delete-backward'; blockId: BlockId }
  | { type: 'delete-forward'; blockId: BlockId }
  | { type: 'delete-text'; blockId: BlockId; from: number; to: number }
  | {
      type: 'replace-text';
      blockId: BlockId;
      from: number;
      to: number;
      with: string;
    }

  // ===== BLOCK MANIPULATION =====
  | {
      type: 'create-block';
      blockType: string;
      afterId?: BlockId;
      parentId?: BlockId;
      content?: unknown;
    }
  | { type: 'delete-block'; blockId: BlockId }
  | { type: 'merge-blocks'; sourceId: BlockId; targetId: BlockId }
  | { type: 'split-block'; blockId: BlockId; at: number }
  | { type: 'convert-block'; blockId: BlockId; to: string }
  | {
      type: 'move-block';
      blockId: BlockId;
      afterId?: BlockId;
      parentId?: BlockId;
    }
  | { type: 'duplicate-block'; blockId: BlockId }

  // ===== LIST OPERATIONS =====
  | { type: 'indent-block'; blockId: BlockId }
  | { type: 'outdent-block'; blockId: BlockId }
  | {
      type: 'toggle-list';
      blockId: BlockId;
      listType: 'task' | 'bullet' | 'numbered';
    }
  | { type: 'toggle-task'; blockId: BlockId }
  | { type: 'toggle-collapse'; blockId: BlockId }

  // ===== SELECTION =====
  | { type: 'select-block'; blockId: BlockId }
  | { type: 'select-blocks'; blockIds: BlockId[] }
  | { type: 'extend-selection'; direction: 'up' | 'down' }
  | { type: 'select-text'; blockId: BlockId; from: number; to: number }
  | { type: 'select-all' }
  | { type: 'clear-selection' }

  // ===== NAVIGATION =====
  | { type: 'focus-block'; blockId: BlockId; position?: 'start' | 'end' }
  | { type: 'move-cursor'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'move-cursor-to'; blockId: BlockId; offset: number }
  | { type: 'move-to-next-block' }
  | { type: 'move-to-previous-block' }

  // ===== FORMATTING =====
  | { type: 'toggle-mark'; markType: string; attrs?: Record<string, unknown> }
  | { type: 'set-mark'; markType: string; attrs?: Record<string, unknown> }
  | { type: 'remove-mark'; markType: string }
  | { type: 'clear-formatting'; blockId: BlockId }

  // ===== DRAG & DROP =====
  | { type: 'start-drag'; blockIds: BlockId[] }
  | {
      type: 'drag-over';
      targetId: BlockId;
      position: 'before' | 'after' | 'inside';
    }
  | {
      type: 'drop';
      sourceIds: BlockId[];
      targetId: BlockId;
      position: 'before' | 'after' | 'inside';
    }
  | { type: 'cancel-drag' }

  // ===== HISTORY =====
  | { type: 'undo' }
  | { type: 'redo' }

  // ===== MODE CONTROL =====
  | { type: 'enter-mode'; mode: import('./types').InteractionMode }
  | { type: 'exit-mode' }

  // ===== META =====
  | { type: 'noop' }; // Explicit no-op (handler handled it, but no state change)

/**
 * IntentResult - What happened when we tried to fulfill an intent
 *
 * Every intent MUST return a result.
 * No silent failures. No exceptions.
 */
export interface IntentResult {
  /** Was the intent fulfilled? */
  success: boolean;

  /** What was attempted */
  intent: EditorIntent;

  /** Why it failed (if success = false) */
  reason?: string;

  /** Optional data returned by the intent */
  data?: unknown;

  /** Which mode we're in after this intent */
  mode?: import('./types').InteractionMode;
}
