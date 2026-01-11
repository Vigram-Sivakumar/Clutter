/**
 * 🔒 CLIPBOARD LAWS (Step 3A - Foundation)
 * 
 * 1. Clipboard is NOT DOM-based
 *    - Never infer structure from HTML
 *    - DOM is only transport for external apps
 * 
 * 2. Internal clipboard ≠ external clipboard
 *    - Internal: engine blocks → structured payload
 *    - External: plain text → paragraphs only
 * 
 * 3. blockId is NEVER copied
 *    - Paste always generates new IDs
 *    - Copy is structural, not identity-based
 * 
 * 4. Indent is RELATIVE
 *    - Copied blocks store absolute indent
 *    - Paste re-bases indent at insertion point
 * 
 * 5. Paste ALWAYS goes through createBlock()
 *    - No schema.create calls
 *    - No exceptions
 */

import type { Node as PMNode } from '@tiptap/pm/model';
import type { BlockType } from '../engine/types';

/**
 * Internal clipboard payload (memory only)
 * 
 * ❌ Explicitly excluded:
 * - blockId (NEVER preserved)
 * - collapsed (paste state reset)
 * - selection info
 * - parent references
 * - engine metadata
 */
export interface ClipboardPayloadV1 {
  /** Payload version for future migrations */
  version: 1;
  
  /** Source identifier */
  source: 'clutter-editor';
  
  /** Copied blocks (ordered) */
  blocks: Array<{
    /** Block type (paragraph, listBlock, heading, etc.) */
    type: BlockType;
    
    /** Text/content only (no wrapper) */
    content: PMNode | null;
    
    /** Absolute indent at copy time */
    indent: number;
    
    /** Safe attributes (WITHOUT blockId, collapsed, etc.) */
    attrs: Record<string, any>;
  }>;
}

/**
 * Clipboard manager state
 */
export interface ClipboardState {
  /** Current internal clipboard payload (null if empty) */
  payload: ClipboardPayloadV1 | null;
  
  /** Last operation timestamp (for debugging) */
  lastOperation: 'copy' | 'cut' | 'paste' | null;
  lastOperationTime: number | null;
}
