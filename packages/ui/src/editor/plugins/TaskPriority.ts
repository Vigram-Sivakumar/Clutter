/**
 * Task Priority Plugin
 * Detects and highlights "!" symbols in task blocks for priority indication
 * - Detects !, !!, or !!! at the start of task text
 * - Highlights each "!" in orange (like slash commands)
 * - Only activates in task blocks (listType === 'task')
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';

export const TASK_PRIORITY_PLUGIN_KEY = new PluginKey('taskPriority');

export const TaskPriority = Extension.create({
  name: 'taskPriority',
  
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: TASK_PRIORITY_PLUGIN_KEY,

        props: {
          handleTextInput(view, from, to, text) {
            // Only handle space character
            if (text !== ' ') return false;

            const { state } = view;
            const { $from } = state.selection;

            // Find the listBlock node
            let listBlockNode = null;
            let listBlockPos = null;

            for (let d = $from.depth; d >= 1; d--) {
              const node = $from.node(d);
              if (node.type.name === 'listBlock') {
                listBlockNode = node;
                listBlockPos = $from.start(d) - 1;
                break;
              }
            }

            // Only process in task blocks
            if (!listBlockNode || listBlockNode.attrs.listType !== 'task') {
              return false;
            }

            // Get the text content
            const taskText = listBlockNode.textContent;

            // Check if text starts with 1-3 exclamation marks
            const priorityMatch = taskText.match(/^(!{1,3})$/);
            if (!priorityMatch) return false;

            const priorityLevel = priorityMatch[1].length;

            // Delete the exclamation marks and set priority attribute
            const tr = state.tr;
            
            // Delete the exclamation marks (from start of content to cursor)
            tr.delete(listBlockPos + 1, from);
            
            // Set the priority attribute on the listBlock
            tr.setNodeMarkup(listBlockPos, undefined, {
              ...listBlockNode.attrs,
              priority: priorityLevel,
            });

            view.dispatch(tr);
            return true; // Space will still be inserted by returning true here
          },

          decorations(state) {
            const { $from } = state.selection;
            const decorations: Decoration[] = [];

            // Check if we're in a listBlock
            const listBlockDepth = $from.depth;
            let listBlockNode = null;
            let listBlockPos = null;

            // Find the listBlock node
            for (let d = listBlockDepth; d >= 1; d--) {
              const node = $from.node(d);
              if (node.type.name === 'listBlock') {
                listBlockNode = node;
                listBlockPos = $from.start(d) - 1; // Position of the listBlock itself
                break;
              }
            }

            // Only process if we're in a task block
            if (!listBlockNode || listBlockNode.attrs.listType !== 'task') {
              return null;
            }

            // Get the text content of the task
            const taskText = listBlockNode.textContent;
            
            // Match 1-3 exclamation marks at the start (WITHOUT space - while typing)
            const priorityMatch = taskText.match(/^(!{1,3})$/);
            
            if (priorityMatch) {
              const exclamations = priorityMatch[1]; // The "!" characters
              const matchLength = exclamations.length;
              
              // Create decoration for each "!" symbol (only while typing, before space)
              for (let i = 0; i < matchLength; i++) {
                decorations.push(
                  Decoration.inline(
                    listBlockPos + 1 + i, // +1 to account for node start
                    listBlockPos + 1 + i + 1,
                    { class: 'task-priority-symbol' }
                  )
                );
              }
            }

            return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : null;
          },
        },
      }),
    ];
  },
});

