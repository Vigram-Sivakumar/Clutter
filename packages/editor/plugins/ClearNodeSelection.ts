/**
 * ClearNodeSelection Plugin
 *
 * Clears NodeSelection (block highlight) when clicking elsewhere in the editor.
 * This fixes the issue where highlighted blocks from scrollToBlock() stay
 * highlighted even after clicking on other content.
 *
 * UX:
 * - Clicking on a different block clears the previous block's highlight
 * - Clicking inside the highlighted block places cursor and clears highlight
 * - Auto-timeout (handled in scrollToBlock) provides fallback
 */

import { Extension } from '@tiptap/core';
import {
  Plugin,
  PluginKey,
  NodeSelection,
  TextSelection,
} from '@tiptap/pm/state';

export const ClearNodeSelection = Extension.create({
  name: 'clearNodeSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('clearNodeSelection'),
        props: {
          handleClick: (view, pos, _event) => {
            const { state } = view;
            const { selection } = state;

            // Only handle if current selection is NodeSelection
            if (!(selection instanceof NodeSelection)) {
              return false;
            }

            // User clicked somewhere - convert to text selection at click position
            const tr = state.tr.setSelection(
              TextSelection.create(state.doc, pos)
            );
            view.dispatch(tr);

            // Allow normal click handling to continue
            return false;
          },
        },
      }),
    ];
  },
});
