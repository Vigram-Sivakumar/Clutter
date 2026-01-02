/**
 * DoubleSpaceEscape Plugin - Clear inline marks with double spacebar
 * 
 * When the user presses spacebar twice in quick succession (within 300ms)
 * while at the end of formatted text, this plugin replaces the marked space
 * with an unmarked space, breaking mark inheritance.
 * 
 * Implementation:
 * - Tracks spacebar timing (< 300ms = double space)
 * - Detects marks at cursor position or in preceding text
 * - Deletes the first space (which has marks)
 * - Inserts a new space with empty mark array []
 * - Positions cursor after the unmarked space
 * - Clears any stored marks
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

export const DoubleSpaceEscape = Extension.create({
  name: 'doubleSpaceEscape',

  addProseMirrorPlugins() {
    let lastSpaceTime = 0;
    let lastSpacePos = -1;
    const DOUBLE_SPACE_THRESHOLD = 300; // 300ms

    return [
      new Plugin({
        key: new PluginKey('doubleSpaceEscape'),
        props: {
          handleKeyDown: (view, event) => {
            // Only handle spacebar
            if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey) {
              return false;
            }

            const now = Date.now();
            const timeSinceLastSpace = now - lastSpaceTime;

            // Check if this is a double space
            if (timeSinceLastSpace < DOUBLE_SPACE_THRESHOLD && timeSinceLastSpace > 0) {
              const { state, dispatch } = view;
              const { selection } = state;

              // Only handle if selection is empty (cursor)
              if (!selection.empty) {
                lastSpaceTime = now;
                lastSpacePos = selection.from;
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
              if (pos > 0) {
                const $pos = state.doc.resolve(pos - 1);
                marksBeforeCursor = $pos.marks();
              }
              
              const activeMarks = storedMarks || (cursorMarks.length > 0 ? cursorMarks : marksBeforeCursor);

              // ONLY apply to formatting marks (bold, italic, underline, strikethrough, code)
              // IGNORE structural marks like hashtag and link
              const FORMATTING_MARKS = ['bold', 'italic', 'underline', 'strike', 'code'];
              const formattingMarks = activeMarks?.filter(mark => 
                FORMATTING_MARKS.includes(mark.type.name)
              );

              if (formattingMarks && formattingMarks.length > 0) {
                // Prevent the second space from being inserted
                event.preventDefault();
                
                const tr = state.tr;
                const pos = selection.from;
                
                // Delete the first space (which has marks)
                tr.delete(pos - 1, pos);
                
                // Clear stored marks (marks waiting to be applied)
                tr.setStoredMarks([]);
                
                // Insert a regular space WITHOUT any marks to break formatting
                // The key is to pass an empty mark array [] as the 4th parameter
                tr.insertText(' ', pos - 1, pos - 1, []);
                
                // Position cursor AFTER the unmarked space
                tr.setSelection(TextSelection.create(tr.doc, pos));
                
                if (dispatch) {
                  dispatch(tr);
                }
                
                lastSpaceTime = 0;
                lastSpacePos = -1;
                return true;
              }
            }

            // Update last space time and position
            lastSpaceTime = now;
            lastSpacePos = view.state.selection.from + 1; // Position after the space will be inserted
            return false;
          },
        },
      }),
    ];
  },
});

