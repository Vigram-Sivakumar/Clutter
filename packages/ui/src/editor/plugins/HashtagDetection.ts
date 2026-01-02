/**
 * HashtagDetection Plugin - Block-level #tag detection (Tana-style)
 * 
 * When user types #tagname and presses Enter:
 * - Removes #tagname from text
 * - Adds tag to current block's tags attribute
 * - Tags render at end of block (separate from text)
 * 
 * This matches Tana's architecture where tags are separate elements
 * attached to each block.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import { addTagToBlock } from '../utils/tagUtils';

export const HashtagDetection = Extension.create({
  name: 'hashtagDetection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hashtagDetection'),
        props: {
          handleKeyDown(view, event) {
            // Only handle Enter key
            if (event.key !== 'Enter') {
              return false;
            }

            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            
            // Only handle if cursor is at end of text (empty selection)
            if (!selection.empty) {
              return false;
            }
            
            // Get text in current node up to cursor
            const textBefore = $from.parent.textBetween(0, $from.parentOffset);
            
            // Check if there's a # followed by text (allow spaces for multi-word tags)
            const match = textBefore.match(/#(\S+(?:\s+\S+)*)$/);
            
            if (match) {
              event.preventDefault();
              const tagName = match[1];
              const matchStart = $from.pos - match[0].length;
              
              // Use shared utility to add tag to block
              const tr = addTagToBlock(state, tagName, $from.depth);
              
              if (tr) {
                // Tag was added, delete the #tagname text
                tr.delete(matchStart, $from.pos);
                
                // Position cursor where the tag was
                const newPos = matchStart;
                tr.setSelection(TextSelection.create(tr.doc, newPos));
                
                view.dispatch(tr);
                return true;
              } else {
                // Tag already exists, just delete the text
                const tr = state.tr;
                tr.delete(matchStart, $from.pos);
                tr.setSelection(TextSelection.create(tr.doc, matchStart));
                view.dispatch(tr);
                return true;
              }
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

