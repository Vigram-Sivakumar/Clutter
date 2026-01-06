import { useMemo } from 'react';
import { useNotesStore } from '@clutter/state';
import {
  getTodayDateString,
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

interface TodayTasksListViewProps {
  onTaskClick: (_noteId: string, _taskId: string) => void;
}

export const TodayTasksListView = ({
  onTaskClick,
}: TodayTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const todayDateString = useMemo(() => getTodayDateString(), []);

  // Extract and filter today's tasks using centralized logic
  const todayTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTasks: Task[] = [];

    activeNotes.forEach((note) => {
      const noteTasks = extractTasksFromNote(note);
      allTasks.push(...noteTasks);
    });

    // Use centralized categorization (SINGLE SOURCE OF TRUTH)
    const { today } = categorizeTasks(allTasks, todayDateString);
    return sortTasksByDateAndCreation(today);
  }, [notes, todayDateString]);

  const handleToggleTask = (taskId: string) => {
    const task = todayTasks.find((t) => t.id === taskId);
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
        folderName={SECTIONS.today.label}
        staticIcon={renderIcon(
          SECTIONS.today.iconName,
          sizing.icon.pageTitleIcon
        )}
      />

      <ListViewLayout
        sections={[
          {
            id: 'today-tasks',
            title: '',
            show: todayTasks.length > 0,
            content: (
              <ListView<TaskListItemData>
                items={todayTasks}
                selectedId={null}
                onItemClick={(taskId) => {
                  const task = todayTasks.find((t) => t.id === taskId);
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
                emptyState={SECTIONS.today.emptyMessage}
                showDividers={false}
              />
            ),
          },
        ]}
        emptyState={SECTIONS.today.emptyMessage}
      />
    </>
  );
};
