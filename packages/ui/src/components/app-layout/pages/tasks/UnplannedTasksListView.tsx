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

interface UnplannedTasksListViewProps {
  onTaskClick: (_noteId: string, _taskId: string) => void;
}

export const UnplannedTasksListView = ({
  onTaskClick,
}: UnplannedTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const todayDateString = useMemo(() => getTodayDateString(), []);

  const unplannedTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTasks: Task[] = [];

    activeNotes.forEach((note) => {
      const noteTasks = extractTasksFromNote(note);
      allTasks.push(...noteTasks);
    });

    // Use centralized categorization (SINGLE SOURCE OF TRUTH)
    const { inbox } = categorizeTasks(allTasks, todayDateString);
    return sortTasksByCreation(inbox);
  }, [notes, todayDateString]);

  const handleToggleTask = (taskId: string) => {
    const task = unplannedTasks.find((t) => t.id === taskId);
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
        folderName={SECTIONS.inbox.label}
        staticIcon={renderIcon(
          SECTIONS.inbox.iconName,
          sizing.icon.pageTitleIcon
        )}
      />

      <ListViewLayout
        sections={[
          {
            id: 'unplanned-tasks',
            title: '',
            show: unplannedTasks.length > 0,
            content: (
              <ListView<TaskListItemData>
                items={unplannedTasks}
                selectedId={null}
                onItemClick={(taskId) => {
                  const task = unplannedTasks.find((t) => t.id === taskId);
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
                emptyState={SECTIONS.inbox.emptyMessage}
                showDividers={false}
              />
            ),
          },
        ]}
        emptyState={SECTIONS.inbox.emptyMessage}
      />
    </>
  );
};
