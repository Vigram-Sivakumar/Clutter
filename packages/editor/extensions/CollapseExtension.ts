/**
 * CollapseExtension - TipTap extension wrapper for CollapsePlugin
 * 
 * This wraps the ProseMirror CollapsePlugin so it can be added to TipTap's
 * extensions array properly.
 */

import { Extension } from '@tiptap/core';
import { CollapsePlugin } from '../plugins/CollapsePlugin';

export const CollapseExtension = Extension.create({
  name: 'collapse',

  addProseMirrorPlugins() {
    return [CollapsePlugin];
  },
});
