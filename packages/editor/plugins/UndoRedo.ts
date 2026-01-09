/**
 * UndoRedo - Keyboard shortcuts for undo/redo
 *
 * This replaces TipTap's History extension with our UndoController.
 *
 * Cmd+Z → undo()
 * Cmd+Shift+Z → redo()
 *
 * NOTE: This extension requires EditorEngine to be attached to the editor
 * via the TipTap bridge (useEditorEngine hook).
 */

import { Extension } from '@tiptap/core';

export const UndoRedo = Extension.create({
  name: 'undoRedo',

  addKeyboardShortcuts() {
    return {
      // Undo
      'Mod-z': () => {
        const engine = (this.editor as any).engine;

        if (!engine) {
          console.warn('[UndoRedo] EditorEngine not found on editor');
          return false;
        }

        return engine.undo();
      },

      // Redo
      'Mod-Shift-z': () => {
        const engine = (this.editor as any).engine;

        if (!engine) {
          console.warn('[UndoRedo] EditorEngine not found on editor');
          return false;
        }

        return engine.redo();
      },

      // Alternative redo shortcut (Cmd+Y on Mac)
      'Mod-y': () => {
        const engine = (this.editor as any).engine;

        if (!engine) {
          console.warn('[UndoRedo] EditorEngine not found on editor');
          return false;
        }

        return engine.redo();
      },
    };
  },
});
