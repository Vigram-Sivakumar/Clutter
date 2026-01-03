import { useMemo } from 'react';
import { useNotesStore } from '@clutter/shared';
import { ListView, ListItem, TaskListItemData } from '../../shared/list-view';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { CheckSquare } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import type { Note } from '@clutter/shared';

interface TodayTasksListViewProps {
  onTaskClick: (noteId: string, taskId: string) => void;
}

interface TaskWithDate extends TaskListItemData {
  date?: string;
  dailyNoteDate?: string;
  createdAt: string;
}

// Helper to extract tasks from note content with date information
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

// Helper to get today's date string
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to toggle task checked state
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

export const TodayTasksListView = ({ onTaskClick }: TodayTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const todayDateString = useMemo(() => getTodayDateString(), []);
  
  // Extract and filter today's tasks
  const todayTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTasks: TaskWithDate[] = [];
    
    activeNotes.forEach(note => {
      const noteTasks = extractTasksFromNote(note);
      allTasks.push(...noteTasks);
    });
    
    // Filter for today's tasks (uncompleted only)
    return allTasks
      .filter(task => {
        if (task.checked) return false;
        const effectiveDate = task.date || task.dailyNoteDate;
        return effectiveDate === todayDateString;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [notes, todayDateString]);
  
  const handleToggleTask = (taskId: string) => {
    const task = todayTasks.find(t => t.id === taskId);
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
        folderName="Today"
        staticIcon={<CheckSquare size={sizing.icon.pageTitleIcon} />}
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
                  const task = todayTasks.find(t => t.id === taskId);
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
                emptyState="No tasks for today"
                showDividers={false}
              />
            ),
          },
        ]}
        emptyState="No tasks for today"
      />
    </>
  );
};

