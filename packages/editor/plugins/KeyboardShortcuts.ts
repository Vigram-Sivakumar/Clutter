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
import { handleTab } from './keyboard/keymaps/tab';

export const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // Tab / Shift+Tab: Indent / Outdent blocks
      // These emit indent-block / outdent-block intents
      Tab: ({ editor }) => {
        console.log('🔑 [KeyboardShortcuts] Tab pressed');
        return handleTab(editor);
      },
      'Shift-Tab': ({ editor }) => {
        console.log('🔑 [KeyboardShortcuts] Shift+Tab pressed');
        return handleTab(editor);
      },
    };
  },
});
