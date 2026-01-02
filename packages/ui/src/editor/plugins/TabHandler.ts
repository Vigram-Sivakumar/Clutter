/**
 * TabHandler Plugin - Prevents Tab key from navigating focus outside the editor
 * 
 * This plugin ensures Tab and Shift-Tab are always captured within the editor,
 * preventing them from moving focus to other UI elements (buttons, window controls, etc.).
 * 
 * Individual block handlers (Paragraph, Heading, ListBlock, etc.) run first with higher priority.
 * If they handle the Tab (indent/outdent), great. If they don't handle it (return false),
 * this plugin catches it and prevents default browser behavior.
 * 
 * Priority: Low (100) - runs AFTER individual block handlers
 */

import { Extension } from '@tiptap/core';

export const TabHandler = Extension.create({
  name: 'tabHandler',

  // Low priority - let individual block handlers run first
  priority: 100,

  addKeyboardShortcuts() {
    return {
      // Always capture Tab - prevent focus navigation
      Tab: () => {
        // Individual block handlers already ran (they have higher priority)
        // If we're here, they either handled it (shouldn't reach here)
        // or didn't handle it (returned false)
        // Either way, consume the event to prevent browser focus navigation
        return true;
      },

      // Always capture Shift-Tab - prevent focus navigation
      'Shift-Tab': () => {
        // Same as Tab - consume to prevent browser navigation
        return true;
      },
    };
  },
});

