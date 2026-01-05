import { useMemo } from 'react';
import { useNotesStore } from '@clutter/state';
import { ListView, ListItem, TaskListItemData } from '../../shared/list-view';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { CheckSquare } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import { Note } from '@clutter/domain';

interface UnplannedTasksListViewProps {
  onTaskClick: (noteId: string, taskId: string) => void;
}

interface TaskWithDate extends TaskListItemData {
  date?: string;
  dailyNoteDate?: string;
  createdAt: string;
}

const extractTasksFromNote = (note: Note): TaskWithDate[] => {
  try {
    const parsed = JSON.parse(note.content);
    const tasks: TaskWithDate[] = [];
    
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

const toggleTaskInNote = (note: Note, taskId: string): string => {
  try {
    const parsed = JSON.parse(note.content);
    
    const traverseAndToggle = (node: any): boolean => {
      if (node.type === 'listBlock' && 
          node.attrs?.listType === 'task' && 
          node.attrs?.blockId === taskId) {
        node.attrs.checked = !node.attrs.checked;
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

export const UnplannedTasksListView = ({ onTaskClick }: UnplannedTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  
  const unplannedTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTasks: TaskWithDate[] = [];
    
    activeNotes.forEach(note => {
      const noteTasks = extractTasksFromNote(note);
      allTasks.push(...noteTasks);
    });
    
    return allTasks
      .filter(task => {
        if (task.checked) return false;
        const effectiveDate = task.date || task.dailyNoteDate;
        return !effectiveDate;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [notes]);
  
  const handleToggleTask = (taskId: string) => {
    const task = unplannedTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const note = notes.find(n => n.id === task.noteId);
    if (!note) return;
    
    const updatedContent = toggleTaskInNote(note, taskId);
    updateNoteContent(note.id, updatedContent);
  };
  
  return (
    <>
      <PageTitleSection
        variant="folder"
        folderName="Unplanned"
        staticIcon={<CheckSquare size={sizing.icon.pageTitleIcon} />}
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
                  const task = unplannedTasks.find(t => t.id === taskId);
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
                emptyState="No unplanned tasks"
                showDividers={false}
              />
            ),
          },
        ]}
        emptyState="No unplanned tasks"
      />
    </>
  );
};

