/**
 * Enter Global Fallback Rule - PURE DELEGATOR
 *
 * 🔒 THE ENTER LAW:
 * "Every Enter press MUST be handled. Default ProseMirror Enter must NEVER run."
 *
 * This rule has LOWEST priority (-1000) and catches EVERY Enter
 * that no other rule handled.
 *
 * DELEGATES to performStructuralEnter() - the single authority.
 */

import { defineRule } from '../../types/KeyboardRule';
import type { KeyboardContext } from '../../types/KeyboardContext';
import { performStructuralEnter } from '../../../../core/structuralEnter/performStructuralEnter';

export const enterEmptyBlockFallback = defineRule({
  id: 'enter:globalFallback',
  description: 'GLOBAL fallback - delegates ALL Enter to structural authority',
  priority: -1000, // LOWEST possible - must be last resort

  when(_ctx: KeyboardContext): boolean {
    // 🔒 CRITICAL: ALWAYS match
    // This ensures Enter is NEVER unowned
    return true;
  },

  execute(ctx: KeyboardContext): boolean {
    const { editor } = ctx;

    // 🔒 SINGLE AUTHORITY: delegate to performStructuralEnter
    return performStructuralEnter({
      editor,
      source: 'keyboard:enter',
    });
  },
});
