/**
 * useBlockCollapse - Universal collapse check for any block type
 *
 * Returns true if this block should be hidden because a parent
 * toggle or task is collapsed.
 *
 * This hook checks both:
 * 1. Flat schema (parentBlockId-based) - NEW system
 * 2. Legacy toggle (parentToggleId-based) - OLD system
 *
 * Usage:
 * ```typescript
 * const isHidden = useBlockCollapse(editor, getPos, parentToggleId);
 * ```
 */

import { useMemo } from 'react';
import type { Editor } from '@tiptap/core';
import {
  isHiddenByCollapsedToggle,
  isHiddenByCollapsedParent,
} from '../utils/collapseHelpers';

export function useBlockCollapse(
  editor: Editor,
  getPos: () => number | undefined,
  parentToggleId?: string | null
): boolean {
  return useMemo(() => {
    const pos = getPos();
    if (pos === undefined) return false;

    // Check flat schema (parentBlockId-based) - PRIMARY SYSTEM
    const hiddenByFlat = isHiddenByCollapsedParent(editor.state.doc, pos);

    // Check legacy toggle (parentToggleId-based) - DEPRECATED
    // Only kept for backward compatibility with old documents
    // TODO: Remove once all notes are migrated from parentToggleId → parentBlockId
    const hiddenByLegacyToggle = parentToggleId
      ? isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId)
      : false;

    return hiddenByFlat || hiddenByLegacyToggle;
  }, [editor.state.doc, getPos, parentToggleId]);
  // CRITICAL: Do NOT include 'editor' in dependencies
  // Only editor.state.doc matters - avoids unnecessary recalculation
}
