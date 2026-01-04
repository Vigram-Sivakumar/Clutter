import { useMemo } from 'react';
import { useNotesStore, getTodayDateString, formatTaskDateLabel } from '@clutter/shared';
import { ListView, ListItem, TaskListItemData } from '../../shared/list-view';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { CheckSquare } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import type { Note } from '@clutter/shared';

interface OverdueTasksListViewProps {
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

export const OverdueTasksListView = ({ onTaskClick }: OverdueTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const todayDateString = useMemo(() => getTodayDateString(), []);
  
  // Get all overdue tasks
  const overdueTasks = useMemo(() => {
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
        return effectiveDate && effectiveDate < todayDateString;
      });
  }, [notes, todayDateString]);
  
  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, TaskWithDate[]>();
    
    overdueTasks.forEach(task => {
      const effectiveDate = task.date || task.dailyNoteDate!;
      if (!groups.has(effectiveDate)) {
        groups.set(effectiveDate, []);
      }
      groups.get(effectiveDate)!.push(task);
    });
    
    // Sort tasks within each date by creation date
    groups.forEach(tasks => {
      tasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    
    // Convert to array and sort by date (descending - most recent overdue first)
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [overdueTasks]);
  
  const handleToggleTask = (taskId: string) => {
    const task = overdueTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const note = notes.find(n => n.id === task.noteId);
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
            const task = tasks.find(t => t.id === taskId);
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
        folderName="Overdue"
        staticIcon={<CheckSquare size={sizing.icon.pageTitleIcon} />}
      />
      
      <ListViewLayout
        sections={sections}
        emptyState="No overdue tasks"
      />
    </>
  );
};

