/**
 * Task extraction utilities
 * Shared logic for extracting tasks from note content
 */

import type { Note } from '@clutter/domain';

export interface Task {
  id: string;
  text: string;
  checked: boolean;
  noteId: string;
  noteTitle: string;
  noteEmoji?: string | null;
  date?: string;
  dailyNoteDate?: string;
  createdAt: string;
  completedAt?: string; // ISO date string when task was completed
}

/**
 * Extract all tasks from a note's content
 * Handles both explicit task dates and daily note dates
 */
export const extractTasksFromNote = (note: Note): Task[] => {
  try {
    const parsed = JSON.parse(note.content);
    const tasks: Task[] = [];

    const traverseNodes = (node: any) => {
      if (node.type === 'listBlock' && node.attrs?.listType === 'task') {
        let text = '';
        let taskDate: string | undefined;

        if (node.content && Array.isArray(node.content)) {
          node.content.forEach((child: any) => {
            if (child.type === 'text') {
              text += child.text || '';
            } else if (child.type === 'dateMention' && child.attrs?.date) {
              taskDate = child.attrs.date;
            }
          });
        }

        if (text.trim()) {
          tasks.push({
            id: node.attrs.blockId || crypto.randomUUID(),
            text: text.trim(),
            checked: node.attrs.checked || false,
            noteId: note.id,
            noteTitle: note.title || 'Untitled',
            noteEmoji: note.emoji,
            date: taskDate,
            dailyNoteDate: note.dailyNoteDate || undefined,
            createdAt: note.createdAt,
            completedAt: node.attrs.completedAt || undefined,
          });
        }
      }

      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverseNodes);
      }
    };

    if (parsed.type === 'doc' && parsed.content) {
      parsed.content.forEach(traverseNodes);
    }

    return tasks;
  } catch {
    return [];
  }
};

/**
 * Toggle a task's checked state in note content
 * Returns the updated note content as a string
 */
export const toggleTaskInNote = (note: Note, taskId: string): string => {
  try {
    const parsed = JSON.parse(note.content);

    const traverseAndToggle = (node: any): boolean => {
      if (
        node.type === 'listBlock' &&
        node.attrs?.listType === 'task' &&
        node.attrs?.blockId === taskId
      ) {
        const wasChecked = node.attrs.checked;
        node.attrs.checked = !wasChecked;

        // Set completedAt when completing a task, clear it when uncompleting
        if (!wasChecked) {
          // Task is being completed - set completion date
          node.attrs.completedAt = new Date().toISOString();
        } else {
          // Task is being uncompleted - remove completion date
          delete node.attrs.completedAt;
        }

        return true;
      }

      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          if (traverseAndToggle(child)) {
            return true;
          }
        }
      }

      return false;
    };

    if (parsed.type === 'doc' && parsed.content) {
      parsed.content.forEach(traverseAndToggle);
    }

    return JSON.stringify(parsed);
  } catch {
    return note.content;
  }
};
