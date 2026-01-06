/**
 * Task categorization utilities
 * SINGLE SOURCE OF TRUTH for task filtering and sorting
 * Used by BOTH sidebar and list views to ensure consistency
 */

import { compareDates } from './dateFormatting';
import type { Task } from './taskExtraction';

export interface CategorizedTasks {
  inbox: Task[];
  today: Task[];
  overdue: Task[];
  upcoming: Task[];
  completed: Task[];
}

/**
 * Categorize tasks into sections
 * This is the AUTHORITATIVE logic used by both sidebar and list views
 *
 * Rules:
 * - Inbox: Tasks without any date (current)
 * - Today: Overdue + today tasks (overdue and today, not completed)
 * - Overdue: Tasks with date < today (not completed)
 * - Upcoming: All dated tasks - overdue, today, and future (not completed)
 * - Completed: All completed tasks (regardless of date)
 *
 * @param allTasks - All tasks extracted from notes
 * @param todayDateString - Today's date in YYYY-MM-DD format
 * @returns Categorized task lists
 */
export const categorizeTasks = (
  allTasks: Task[],
  todayDateString: string
): CategorizedTasks => {
  const inbox: Task[] = [];
  const today: Task[] = [];
  const overdue: Task[] = [];
  const upcoming: Task[] = [];
  const completed: Task[] = [];

  allTasks.forEach((task) => {
    // Completed tasks go to completed section only
    if (task.checked) {
      completed.push(task);
      return;
    }

    // Determine the effective date for the task
    const effectiveDate = task.date || task.dailyNoteDate;

    if (!effectiveDate) {
      // No date = inbox
      inbox.push(task);
      return;
    }

    // All dated tasks go to upcoming
    upcoming.push(task);

    // Check if overdue or today
    const comparison = compareDates(effectiveDate, todayDateString);

    if (comparison < 0) {
      // Overdue: date < today
      overdue.push(task);
      today.push(task); // Overdue also shows in today
    } else if (comparison === 0) {
      // Today: date === today
      today.push(task);
    }
    // Future tasks (comparison > 0) are already in upcoming
  });

  return { inbox, today, overdue, upcoming, completed };
};

/**
 * Sort tasks by date first, then by creation time
 * Used for dated task lists (today, overdue, upcoming)
 */
export const sortTasksByDateAndCreation = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    const dateA = a.date || a.dailyNoteDate || '';
    const dateB = b.date || b.dailyNoteDate || '';
    const dateComparison = compareDates(dateA, dateB);
    if (dateComparison !== 0) return dateComparison;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

/**
 * Sort tasks by creation date (oldest first)
 * Used for inbox and completed task lists
 */
export const sortTasksByCreation = (tasks: Task[]): Task[] => {
  return [...tasks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

/**
 * Group tasks by their effective date
 * Returns a Map of date strings to task arrays
 */
export const groupTasksByDate = (tasks: Task[]): Map<string, Task[]> => {
  const grouped = new Map<string, Task[]>();

  tasks.forEach((task) => {
    const effectiveDate = task.date || task.dailyNoteDate;
    if (effectiveDate) {
      if (!grouped.has(effectiveDate)) {
        grouped.set(effectiveDate, []);
      }
      grouped.get(effectiveDate)!.push(task);
    }
  });

  return grouped;
};
