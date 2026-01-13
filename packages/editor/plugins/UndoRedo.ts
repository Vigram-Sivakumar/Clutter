/**
 * UndoRedo - Keyboard shortcuts for undo/redo
 *
 * 🔥 FLAT MODEL: Uses TipTap's native History extension
 *
 * This provides keyboard shortcuts that call TipTap's undo/redo commands.
 * The History extension tracks all transactions with addToHistory metadata.
 *
 * Cmd+Z → undo()
 * Cmd+Shift+Z → redo()
 * Cmd+Y → redo() (alternative)
 *
 * NOTE: Requires History extension to be registered in EditorCore
 */

import { Extension } from '@tiptap/core';

export const UndoRedo = Extension.create({
  name: 'undoRedo',

  addKeyboardShortcuts() {
    return {
      // 🔒 CRITICAL: Always read canonical editor at execution time
      // NEVER use this.editor - it captures stale references

      // Undo
      'Mod-z': () => {
        const editor = (window as any).__editor;
        if (!editor) return false;
        return editor.commands.undo();
      },

      // Redo
      'Mod-Shift-z': () => {
        const editor = (window as any).__editor;
        if (!editor) return false;
        return editor.commands.redo();
      },

      // Alternative redo shortcut (Cmd+Y on Mac)
      'Mod-y': () => {
        const editor = (window as any).__editor;
        if (!editor) return false;
        return editor.commands.redo();
      },
    };
  },
});
