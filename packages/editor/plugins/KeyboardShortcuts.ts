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

  // HIGH PRIORITY - must run BEFORE TabHandler (which has priority 100)
  // Higher numbers = higher priority
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      // Tab / Shift+Tab: Indent / Outdent blocks
      // These emit indent-block / outdent-block intents
      Tab: ({ editor }) => {
        console.log('🔑 [KeyboardShortcuts] Tab pressed - calling handleTab');
        const result = handleTab(editor);
        console.log('🔑 [KeyboardShortcuts] handleTab returned:', result);
        return result;
      },
      'Shift-Tab': ({ editor }) => {
        console.log(
          '🔑 [KeyboardShortcuts] Shift+Tab pressed - calling handleTab'
        );
        const result = handleTab(editor);
        console.log('🔑 [KeyboardShortcuts] handleTab returned:', result);
        return result;
      },
    };
  },
});
