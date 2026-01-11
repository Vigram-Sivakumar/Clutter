/**
 * KeyboardShortcuts Plugin - Centralized structural keyboard shortcuts
 *
 * Binds keyboard shortcuts to rule-based handlers.
 *
 * After Phase E (De-smart Node Extensions), all structural keyboard logic
 * is centralized here instead of being scattered across node extensions.
 *
 * Architecture:
 * - Key press → this extension
 * - Extension → handleTab/handleBackspace/etc (keymaps)
 * - Keymaps → KeyboardEngine (rules)
 * - Rules → IntentResolver
 * - Resolver → EditorEngine commands
 */

import { Extension } from '@tiptap/core';
import {
  handleTab,
  handleBackspace,
  handleArrowLeft,
  handleArrowRight,
  handleArrowUp,
  handleArrowDown,
} from './keyboard/keymaps';

export const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',

  // HIGH PRIORITY - must run BEFORE TabHandler (which has priority 100)
  // Higher numbers = higher priority
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      // Tab / Shift+Tab: Indent / Outdent blocks
      // These emit indent-block / outdent-block intents
      //
      // OWNERSHIP CONTRACT:
      // - If result.handled === true → TipTap returns true (prevents default)
      // - If result.handled === false → TipTap returns false (let PM handle)
      Tab: ({ editor }) => {
        console.log(
          '🔑 [KeyboardShortcuts] Tab pressed - calling handleTab(false)'
        );
        const result = handleTab(editor, false); // isShift = false
        console.log('🔑 [KeyboardShortcuts] handleTab returned:', result);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔓 CORRECT TAB CONTRACT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Intent succeeded → return true (consume Tab)
        // Intent failed → return false (allow fallback)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const shouldConsume = result.handled === true;
        console.log(
          `🔑 [KeyboardShortcuts] Returning ${shouldConsume} - ${shouldConsume ? 'CONSUMING Tab' : 'ALLOWING FALLBACK'}`
        );
        return shouldConsume;
      },
      'Shift-Tab': ({ editor }) => {
        console.log(
          '🔑 [KeyboardShortcuts] Shift+Tab pressed - calling handleTab(true)'
        );
        const result = handleTab(editor, true); // isShift = true
        console.log('🔑 [KeyboardShortcuts] handleTab returned:', result);

        const shouldConsume = result.handled === true;
        console.log(
          `🔑 [KeyboardShortcuts] Returning ${shouldConsume} - ${shouldConsume ? 'CONSUMING Shift+Tab' : 'ALLOWING FALLBACK'}`
        );
        return shouldConsume;
      },

      // ✅ BACKSPACE: Empty list → paragraph → delete flow
      // Must run at high priority (before ListBlock node handler)
      Backspace: ({ editor }) => {
        const result = handleBackspace(editor);
        return result.handled === true;
      },

      // ✅ ARROW KEYS: Centralized cross-block navigation
      // Previously scattered across Paragraph, ListBlock, Heading
      // Now in ONE place to prevent TipTap handler collision
      //
      // CRITICAL: Multiple extensions registering same key = native cursor paralysis
      // Even if all return false, browser loses control
      //
      // Returns false when no rule matches → ProseMirror handles native cursor movement
      ArrowLeft: ({ editor }) => handleArrowLeft(editor),
      ArrowRight: ({ editor }) => handleArrowRight(editor),
      ArrowUp: ({ editor }) => handleArrowUp(editor),
      ArrowDown: ({ editor }) => handleArrowDown(editor),
    };
  },
});
