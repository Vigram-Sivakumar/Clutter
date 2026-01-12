// packages/editor/core/structuralDelete/cursorLaw.ts

import type { DeletionCursorTarget } from './types';

/**
 * Structural Deletion Cursor Law
 *
 * Cursor placement after structural delete is:
 * - Derived from SURVIVING structure
 * - Never from deleted content
 * - Independent of promotion logic
 *
 * This function is PURE:
 * - No PM
 * - No DOM
 * - No Editor
 */
export function resolveDeletionCursor({
  blocks,
  deletedRange,
}: {
  blocks: Array<{
    blockId: string;
    indent: number;
  }>;
  deletedRange: {
    from: number;
    to: number;
  };
}): DeletionCursorTarget {
  const previousIndex = deletedRange.from - 1;

  // No previous block → cursor goes to start of document
  if (previousIndex < 0) {
    return { type: 'start-of-document' };
  }

  const previousBlock = blocks[previousIndex];

  if (!previousBlock) {
    return { type: 'start-of-document' };
  }

  return {
    type: 'end-of-block',
    blockId: previousBlock.blockId,
  };
}
