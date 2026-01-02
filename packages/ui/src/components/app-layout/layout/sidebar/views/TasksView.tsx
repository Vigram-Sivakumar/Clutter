import { useMemo, useState } from 'react';
import { useNotesStore } from '@clutter/shared';
import { useTheme } from '../../../../../hooks/useTheme';
import { SidebarSection } from '../sections/Section';
import { SidebarEmptyState } from '../sections/EmptyState';
import { sizing as globalSizing } from '../../../../../tokens/sizing';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import type { Note } from '@clutter/shared';

interface Task {
  id: string;
  text: string;
  checked: boolean;
  noteId: string;
  noteTitle: string;
  noteEmoji: string | null;
}

interface SidebarTasksViewProps {
  onTaskClick?: (noteId: string, taskId: string) => void;
  onAllTasksHeaderClick?: () => void; // Click on "All Tasks" header to open full view
}

// Helper to extract tasks from note content
const extractTasksFromNote = (note: Note): Task[] => {
  try {
    const parsed = JSON.parse(note.content);
    const tasks: Task[] = [];
    
    const traverseNodes = (node: any) => {
      if (node.type === 'listBlock' && node.attrs?.listType === 'task') {
        // Extract text content from the task
        let text = '';
        if (node.content && Array.isArray(node.content)) {
          text = node.content
            .map((child: any) => {
              if (child.type === 'text') {
                return child.text || '';
              }
              return '';
            })
            .join('');
        }
        
        // Only add tasks with text content
        if (text.trim()) {
          tasks.push({
            id: node.attrs.blockId || crypto.randomUUID(),
            text: text.trim(),
            checked: node.attrs.checked || false,
            noteId: note.id,
            noteTitle: note.title || 'Untitled',
            noteEmoji: note.emoji,
          });
        }
      }
      
      // Recursively traverse child nodes
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

// Helper to toggle task checked state in note content
const toggleTaskInNote = (note: Note, taskId: string): string => {
  try {
    const parsed = JSON.parse(note.content);
    
    const traverseAndToggle = (node: any): boolean => {
      if (node.type === 'listBlock' && 
          node.attrs?.listType === 'task' && 
          node.attrs?.blockId === taskId) {
        // Toggle the checked state
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

// Task Item Component with checkbox
interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onClick: () => void;
}

const TaskItem = ({ task, onToggle, onClick }: TaskItemProps) => {
  const { colors } = useTheme();
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: sidebarLayout.itemHeight,
        paddingLeft: sidebarLayout.itemPaddingX,
        paddingRight: sidebarLayout.itemPaddingX,
        cursor: 'pointer',
        backgroundColor: 'transparent',
        borderRadius: sidebarLayout.itemBorderRadius,
        gap: sidebarLayout.itemContentGap,
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.background.subtleHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.checked}
        onChange={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          width: 16,
          height: 16,
          margin: 0,
          flexShrink: 0,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          border: `1.5px solid ${colors.border.default}`,
          borderRadius: globalSizing.radius.md,
          backgroundColor: 'transparent',
          transition: 'border-color 0.15s ease',
          outline: 'none',
          backgroundImage: task.checked
            ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='${colors.text.default.replace('#', '%23')}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E")`
            : 'none',
          backgroundSize: '14px 14px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Task text */}
      <span
        onClick={onClick}
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: task.checked ? colors.text.tertiary : colors.text.secondary,
          textDecoration: task.checked ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1 1 0',
          minWidth: 0,
        }}
      >
        {task.text}
      </span>
    </div>
  );
};

export const TasksView = ({ onTaskClick, onAllTasksHeaderClick }: SidebarTasksViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  const [isAllTasksCollapsed, setIsAllTasksCollapsed] = useState(false);
  
  // Extract all tasks from all active notes
  const allTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const tasks: Task[] = [];
    
    activeNotes.forEach(note => {
      const noteTasks = extractTasksFromNote(note);
      tasks.push(...noteTasks);
    });
    
    return tasks;
  }, [notes]);
  
  // Separate completed and incomplete tasks
  const incompleteTasks = useMemo(
    () => allTasks.filter(task => !task.checked),
    [allTasks]
  );
  
  const completedTasks = useMemo(
    () => allTasks.filter(task => task.checked),
    [allTasks]
  );
  
  // Handle checkbox toggle
  const handleToggleTask = (taskId: string) => {
    // Find the note containing this task
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const note = notes.find(n => n.id === task.noteId);
    if (!note) return;
    
    // Toggle the task in the note's content
    const updatedContent = toggleTaskInNote(note, taskId);
    updateNoteContent(note.id, updatedContent);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0px',
      width: '100%',
    }}>
      {/* All Tasks Section */}
      <SidebarSection
        title="All Tasks"
        badge={String(allTasks.length)}
        isCollapsed={isAllTasksCollapsed}
        onToggle={() => setIsAllTasksCollapsed(!isAllTasksCollapsed)}
        onHeaderClick={onAllTasksHeaderClick}
      >
        {allTasks.length === 0 ? (
          <SidebarEmptyState message="No tasks yet. Create tasks in your notes." />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0px',
          }}>
            {/* Incomplete Tasks */}
            {incompleteTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onClick={() => onTaskClick?.(task.noteId, task.id)}
              />
            ))}
            
            {/* Completed Tasks */}
            {completedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onClick={() => onTaskClick?.(task.noteId, task.id)}
              />
            ))}
          </div>
        )}
      </SidebarSection>
    </div>
  );
};

