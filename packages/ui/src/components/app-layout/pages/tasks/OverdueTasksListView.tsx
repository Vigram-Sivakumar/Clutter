import { useMemo } from 'react';
import { useNotesStore } from '@clutter/state';
import {
  getTodayDateString,
  formatTaskDateLabel,
  extractTasksFromNote,
  toggleTaskInNote,
  categorizeTasks,
  sortTasksByDateAndCreation,
  type Task,
} from '@clutter/shared';
import { ListView, ListItem, TaskListItemData } from '../../shared/list-view';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { sizing } from '../../../../tokens/sizing';
import { Note } from '@clutter/domain';
import { SECTIONS, renderIcon } from '../../../../config/sidebarConfig';

interface OverdueTasksListViewProps {
  onTaskClick: (_noteId: string, _taskId: string) => void;
}

export const OverdueTasksListView = ({
  onTaskClick,
}: OverdueTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const todayDateString = useMemo(() => getTodayDateString(), []);

  // Get all overdue tasks using centralized logic
  const overdueTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTasks: Task[] = [];

    activeNotes.forEach((note) => {
      const noteTasks = extractTasksFromNote(note);
      allTasks.push(...noteTasks);
    });

    // Use centralized categorization (SINGLE SOURCE OF TRUTH)
    const { overdue } = categorizeTasks(allTasks, todayDateString);
    return sortTasksByDateAndCreation(overdue);
  }, [notes, todayDateString]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, Task[]>();

    overdueTasks.forEach((task) => {
      const effectiveDate = task.date || task.dailyNoteDate!;
      if (!groups.has(effectiveDate)) {
        groups.set(effectiveDate, []);
      }
      groups.get(effectiveDate)!.push(task);
    });

    // Sort tasks within each date by creation date
    groups.forEach((tasks) => {
      tasks.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    // Convert to array and sort by date (descending - most recent overdue first)
    return Array.from(groups.entries()).sort(([dateA], [dateB]) =>
      dateB.localeCompare(dateA)
    );
  }, [overdueTasks]);

  const handleToggleTask = (taskId: string) => {
    const task = overdueTasks.find((t) => t.id === taskId);
    if (!task) return;

    const note = notes.find((n) => n.id === task.noteId);
    if (!note) return;

    const updatedContent = toggleTaskInNote(note, taskId);
    updateNoteContent(note.id, updatedContent);
  };

  // Build sections - one per date
  const sections = useMemo(() => {
    return tasksByDate.map(([dateStr, tasks]) => ({
      id: `date-${dateStr}`,
      title: formatTaskDateLabel(dateStr, todayDateString),
      show: tasks.length > 0,
      content: (
        <ListView<TaskListItemData>
          items={tasks}
          selectedId={null}
          onItemClick={(taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              onTaskClick(task.noteId, task.id);
            }
          }}
          renderItem={(task) => (
            <ListItem variant="task" data={task} onToggle={handleToggleTask} />
          )}
          emptyState=""
          showDividers={false}
        />
      ),
    }));
  }, [tasksByDate, onTaskClick, handleToggleTask, todayDateString]);

  return (
    <>
      <PageTitleSection
        variant="folder"
        folderName={SECTIONS.overdue.label}
        staticIcon={renderIcon(
          SECTIONS.overdue.iconName,
          sizing.icon.pageTitleIcon
        )}
      />

      <ListViewLayout
        sections={sections}
        emptyState={SECTIONS.overdue.emptyMessage}
      />
    </>
  );
};
