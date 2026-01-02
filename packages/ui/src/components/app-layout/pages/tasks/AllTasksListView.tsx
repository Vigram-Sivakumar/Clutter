import { useMemo, useState } from 'react';
import { useNotesStore } from '@clutter/shared';
import { ListView, ListItem, TaskListItemData } from '../../shared/list-view';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { CheckSquare } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import type { Note } from '@clutter/shared';

interface AllTasksListViewProps {
  onTaskClick: (noteId: string, taskId: string) => void;
}

// Helper to extract tasks from note content
const extractTasksFromNote = (note: Note): TaskListItemData[] => {
  try {
    const parsed = JSON.parse(note.content);
    const tasks: TaskListItemData[] = [];
    
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

export const AllTasksListView = ({ onTaskClick }: AllTasksListViewProps) => {
  const { notes, updateNoteContent } = useNotesStore();
  
  // Action controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  
  // Extract all tasks from all active notes
  const allTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const tasks: TaskListItemData[] = [];
    
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

  // Combine tasks with incomplete first
  const sortedTasks = useMemo(
    () => [...incompleteTasks, ...completedTasks],
    [incompleteTasks, completedTasks]
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
    <>
      {/* Page Title Section */}
      <PageTitleSection
        variant="folder"
        folderName="All Tasks"
        staticIcon={<CheckSquare size={sizing.icon.lg} />}
        staticDescription="View and manage all your tasks across all notes"
        // Action controls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSort={() => setSortActive(!sortActive)}
        sortActive={sortActive}
        onFilter={() => setFilterActive(!filterActive)}
        filterActive={filterActive}
      />

      {/* Content Section */}
      <ListViewLayout
        sections={[
          {
            id: 'tasks',
            title: '', // No title for single-section view
            show: sortedTasks.length > 0,
            content: (
              <ListView<TaskListItemData>
                items={sortedTasks}
                selectedId={null}
                onItemClick={(taskId) => {
                  const task = allTasks.find(t => t.id === taskId);
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
                emptyState="No tasks yet. Create tasks in your notes."
                showDividers={false}
              />
            ),
          },
        ]}
        emptyState="No tasks yet. Create tasks in your notes."
      />
    </>
  );
};

