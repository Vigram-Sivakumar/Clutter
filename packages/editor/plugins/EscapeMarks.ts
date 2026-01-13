/**
 * EscapeMarks Plugin - Clear inline marks with Escape key
 *
 * When the user presses Escape while at the end of formatted text,
 * this plugin inserts an invisible zero-width space without any marks.
 * This creates an "unmarked boundary" that prevents mark inheritance,
 * allowing subsequent text to be unstyled.
 *
 * Implementation:
 * - Detects marks at cursor position or in preceding text
 * - Inserts zero-width space (\u200B) with empty mark array []
 * - Positions cursor after the zero-width space
 * - Clears any stored marks
 */

import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export const EscapeMarks = Extension.create({
  name: 'escapeMarks',

  // Higher priority to run before other Escape handlers
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Escape: () => {
        // 🔒 CRITICAL: Always read canonical editor at execution time
        const editor = (window as any).__editor;
        if (!editor) return false;

        const { state } = editor;
        const { selection } = state;

        // Only handle if selection is empty (cursor)
        if (!selection.empty) {
          return false;
        }

        // Check for active marks in multiple ways:
        // 1. storedMarks - marks waiting to be applied
        // 2. marks at cursor position
        // 3. marks from the node before cursor (we might be at end of formatted text)
        const storedMarks = state.storedMarks;
        const cursorMarks = selection.$from.marks();

        // Get marks from the character BEFORE the cursor
        // This handles the case where we're at the end of formatted text
        const pos = selection.from;
        let marksBeforeCursor: any[] = [];
        if (pos > 1) {
          const $pos = state.doc.resolve(pos - 1);
          marksBeforeCursor = $pos.marks();
        }

        const activeMarks =
          storedMarks ||
          (cursorMarks.length > 0 ? cursorMarks : marksBeforeCursor);

        // ONLY apply to formatting marks (bold, italic, underline, strikethrough, code)
        // IGNORE structural marks like hashtag and link
        const FORMATTING_MARKS = [
          'bold',
          'italic',
          'underline',
          'strike',
          'code',
        ];
        const formattingMarks = activeMarks?.filter((mark) =>
          FORMATTING_MARKS.includes(mark.type.name)
        );

        if (formattingMarks && formattingMarks.length > 0) {
          // Use TipTap commands to clear marks properly
          return editor
            .chain()
            .command(({ tr, state }) => {
              const { from } = state.selection;

              // Clear stored marks (marks waiting to be applied)
              tr.setStoredMarks([]);

              // Insert a zero-width space WITHOUT any marks to break formatting
              // The key is to pass an empty mark array [] as the 4th parameter
              tr.insertText('\u200B', from, from, []);

              // Position cursor AFTER the zero-width space
              // This positions us in unmarked territory
              tr.setSelection(TextSelection.create(tr.doc, from + 1));

              return true;
            })
            .run();
        }

        return false;
      },
    };
  },
});
