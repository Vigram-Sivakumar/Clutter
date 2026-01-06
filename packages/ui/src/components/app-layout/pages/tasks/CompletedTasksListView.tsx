import { useMemo } from 'react';
import { useNotesStore } from '@clutter/state';
import {
  getTodayDateString,
  extractTasksFromNote,
  toggleTaskInNote,
  categorizeTasks,
  sortTasksByCreation,
  type Task,
} from '@clutter/shared';
import { ListView, ListItem, TaskListItemData } from '../../shared/list-view';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { sizing } from '../../../../tokens/sizing';
import { Note } from '@clutter/domain';
import { SECTIONS, renderIcon } from '../../../../config/sidebarConfig';

interface CompletedTasksListViewProps {
  onTaskClick: (_noteId: string, _taskId: string) => void;
}

export const CompletedTasksListView = ({
  onTaskClick,
}: CompletedTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const todayDateString = useMemo(() => getTodayDateString(), []);

  const completedTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTasks: Task[] = [];

    activeNotes.forEach((note) => {
      const noteTasks = extractTasksFromNote(note);
      allTasks.push(...noteTasks);
    });

    // Use centralized categorization (SINGLE SOURCE OF TRUTH)
    const { completed } = categorizeTasks(allTasks, todayDateString);
    return sortTasksByCreation(completed);
  }, [notes, todayDateString]);

  const handleToggleTask = (taskId: string) => {
    const task = completedTasks.find((t) => t.id === taskId);
    if (!task) return;

    const note = notes.find((n) => n.id === task.noteId);
    if (!note) return;

    const updatedContent = toggleTaskInNote(note, taskId);
    updateNoteContent(note.id, updatedContent);
  };

  return (
    <>
      <PageTitleSection
        variant="folder"
        folderName={SECTIONS.completed.label}
        staticIcon={renderIcon(
          SECTIONS.completed.iconName,
          sizing.icon.pageTitleIcon
        )}
      />

      <ListViewLayout
        sections={[
          {
            id: 'completed-tasks',
            title: '',
            show: completedTasks.length > 0,
            content: (
              <ListView<TaskListItemData>
                items={completedTasks}
                selectedId={null}
                onItemClick={(taskId) => {
                  const task = completedTasks.find((t) => t.id === taskId);
                  if (task) {
                    onTaskClick(task.noteId, task.id);
                  }
                }}
                renderItem={(task) => (
                  <ListItem
                    variant="task"
                    data={task}
                    onToggle={handleToggleTask}
                  />
                )}
                emptyState={SECTIONS.completed.emptyMessage}
                showDividers={false}
              />
            ),
          },
        ]}
        emptyState={SECTIONS.completed.emptyMessage}
      />
    </>
  );
};
