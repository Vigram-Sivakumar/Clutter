/**
 * TabHandler Plugin - DEPRECATED / DISABLED
 *
 * This plugin previously prevented Tab from navigating focus outside the editor.
 * However, this conflicts with proper fallback behavior when indent is blocked.
 *
 * NEW ARCHITECTURE:
 * - KeyboardShortcuts (priority 1000) handles Tab/Shift+Tab
 *   → Returns true when intent succeeds (consume Tab)
 *   → Returns false when intent fails (allow fallback)
 * - When fallback is allowed, browser handles Tab naturally
 *
 * If focus navigation becomes an issue, we can add a smart handler here
 * that only prevents default when cursor is in the MIDDLE of a block.
 *
 * For now: DISABLED to allow proper Tab fallback UX.
 */

import { Extension } from '@tiptap/core';

export const TabHandler = Extension.create({
  name: 'tabHandler',

  // Low priority - let individual block handlers run first
  priority: 100,

  addKeyboardShortcuts() {
    return {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔓 DISABLED: Allow Tab fallback when indent is blocked
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //
      // Previously: Always returned true (prevented focus navigation)
      // Problem: Killed Tab fallback when indent blocked → dead key
      //
      // Now: Return false (let browser handle Tab when not consumed upstream)
      // Result: Natural Tab behavior when indent is blocked
      //
      // If we need to prevent focus navigation, we can add:
      //   - Check if cursor is in middle of block → prevent
      //   - Check if cursor is at block boundaries → allow fallback
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Tab: () => {
        return false; // Allow fallback
      },

      'Shift-Tab': () => {
        return false; // Allow fallback
      },
    };
  },
});
