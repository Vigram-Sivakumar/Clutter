import { useMemo, ReactNode } from 'react';
import { useNotesStore, useUIStateStore, DAILY_NOTES_FOLDER_ID, getTodayDateString, formatTaskDateLabel, compareDates } from '@clutter/shared';
import { useTheme } from '../../../../../hooks/useTheme';
import { SidebarSection } from '../sections/Section';
import { SidebarItemTask } from '../items/TaskItem';
import { SidebarItem } from '../items/SidebarItem';
import { SidebarEmptyState } from '../sections/EmptyState';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import type { Note } from '@clutter/shared';
import { GlobalSelection } from '../types';

export interface TaskWithDate {
  id: string;
  text: string;
  checked: boolean;
  noteId: string;
  noteTitle: string;
  noteEmoji: string | null;
  date?: string; // YYYY-MM-DD from @date mention
  dailyNoteDate?: string; // YYYY-MM-DD from parent note
  createdAt: string; // For sorting
}

interface TaskViewProps {
  onTaskClick?: (noteId: string, taskId: string) => void;
  
  // Selection
  selection: GlobalSelection;
  openContextMenuId?: string | null;
  onClearSelection?: () => void;
  
  // Actions
  getTaskActions?: (taskId: string, noteId: string) => ReactNode[];
  
  // Multi-select
  selectedTaskIds?: Set<string>;
  onTaskMultiSelect?: (taskId: string, event?: React.MouseEvent) => void;
  
  // Header click handlers for navigation to full page views
  onTodayHeaderClick?: () => void;
  onOverdueHeaderClick?: () => void;
  onUpcomingHeaderClick?: () => void;
  onUnplannedHeaderClick?: () => void;
  onCompletedHeaderClick?: () => void;
}

// Helper to extract tasks from note content with date information
const extractTasksFromNote = (note: Note): TaskWithDate[] => {
  try {
    const parsed = JSON.parse(note.content);
    const tasks: TaskWithDate[] = [];
    
    const traverseNodes = (node: any, parentDate?: string) => {
      if (node.type === 'listBlock' && node.attrs?.listType === 'task') {
        // Extract text content and date mentions from the task
        let text = '';
        let taskDate: string | undefined = parentDate;
        
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach((child: any) => {
            if (child.type === 'text') {
              text += child.text || '';
            } else if (child.type === 'dateMention' && child.attrs?.date) {
              // Extract date from @mention
              taskDate = child.attrs.date; // YYYY-MM-DD format
              // Don't include the date mention in the text display
            }
          });
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
            date: taskDate,
            dailyNoteDate: note.dailyNoteDate || undefined,
            createdAt: note.createdAt,
          });
        }
      }
      
      // Recursively traverse child nodes
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child: any) => traverseNodes(child, parentDate));
      }
    };
    
    if (parsed.type === 'doc' && parsed.content) {
      parsed.content.forEach((child: any) => traverseNodes(child));
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

// Helper to group tasks by date
const groupTasksByDate = (tasks: TaskWithDate[]): Map<string, TaskWithDate[]> => {
  const grouped = new Map<string, TaskWithDate[]>();
  
  tasks.forEach(task => {
    const effectiveDate = task.date || task.dailyNoteDate || '';
    if (!grouped.has(effectiveDate)) {
      grouped.set(effectiveDate, []);
    }
    grouped.get(effectiveDate)!.push(task);
  });
  
  return grouped;
};

export const TaskView = ({
  onTaskClick,
  selection,
  openContextMenuId,
  onClearSelection,
  getTaskActions,
  selectedTaskIds,
  onTaskMultiSelect,
  onTodayHeaderClick,
  onOverdueHeaderClick,
  onUpcomingHeaderClick,
  onUnplannedHeaderClick,
  onCompletedHeaderClick,
}: TaskViewProps) => {
  const notes = useNotesStore((state) => state.notes);
  const updateNoteContent = useNotesStore((state) => state.updateNoteContent);
  const { colors } = useTheme();
  
  // Get collapse states from UI state store
  const {
    taskTodayCollapsed,
    taskOverdueCollapsed,
    taskUpcomingCollapsed,
    taskUnplannedCollapsed,
    taskCompletedCollapsed,
    setTaskTodayCollapsed,
    setTaskOverdueCollapsed,
    setTaskUpcomingCollapsed,
    setTaskUnplannedCollapsed,
    setTaskCompletedCollapsed,
  } = useUIStateStore();
  
  const todayDateString = useMemo(() => getTodayDateString(), []);
  
  // Extract all tasks from all active notes
  const allTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const tasks: TaskWithDate[] = [];
    
    activeNotes.forEach(note => {
      const noteTasks = extractTasksFromNote(note);
      tasks.push(...noteTasks);
    });
    
    return tasks;
  }, [notes]);
  
  // Categorize tasks into sections
  const { todayTasks, overdueTasks, upcomingTasks, unplannedTasks, completedTasks } = useMemo(() => {
    const today: TaskWithDate[] = [];
    const overdue: TaskWithDate[] = [];
    const upcoming: TaskWithDate[] = [];
    const unplanned: TaskWithDate[] = [];
    const completed: TaskWithDate[] = [];
    
    allTasks.forEach(task => {
      // Completed tasks go to completed section only
      if (task.checked) {
        completed.push(task);
        return;
      }
      
      // Determine the effective date for the task
      const effectiveDate = task.date || task.dailyNoteDate;
      
      if (!effectiveDate) {
        // No date = unplanned
        unplanned.push(task);
      } else if (effectiveDate === todayDateString) {
        // Today's date = today section
        today.push(task);
      } else if (compareDates(effectiveDate, todayDateString) < 0) {
        // Past date = overdue
        overdue.push(task);
      } else {
        // Future date = upcoming
        upcoming.push(task);
      }
    });
    
    // Sort by creation date (oldest first)
    const sortByCreation = (a: TaskWithDate, b: TaskWithDate) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };
    
    today.sort(sortByCreation);
    overdue.sort(sortByCreation);
    
    // Sort upcoming by date first, then by creation
    upcoming.sort((a, b) => {
      const dateA = a.date || a.dailyNoteDate || '';
      const dateB = b.date || b.dailyNoteDate || '';
      const dateComparison = compareDates(dateA, dateB);
      if (dateComparison !== 0) return dateComparison;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    unplanned.sort(sortByCreation);
    completed.sort(sortByCreation);
    
    return {
      todayTasks: today,
      overdueTasks: overdue,
      upcomingTasks: upcoming,
      unplannedTasks: unplanned,
      completedTasks: completed,
    };
  }, [allTasks, todayDateString]);
  
  // Group upcoming tasks by date
  const groupedUpcomingTasks = useMemo(() => {
    const grouped = groupTasksByDate(upcomingTasks);
    // Sort by date
    return new Map([...grouped.entries()].sort((a, b) => compareDates(a[0], b[0])));
  }, [upcomingTasks]);
  
  // Group overdue tasks by date
  const groupedOverdueTasks = useMemo(() => {
    const grouped = groupTasksByDate(overdueTasks);
    // Sort by date (most recent first for overdue)
    return new Map([...grouped.entries()].sort((a, b) => compareDates(b[0], a[0])));
  }, [overdueTasks]);
  
  // Handle checkbox toggle
  const handleToggleTask = (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const note = notes.find(n => n.id === task.noteId);
    if (!note) return;
    
    const updatedContent = toggleTaskInNote(note, taskId);
    updateNoteContent(note.id, updatedContent);
  };
  
  // Handle task navigation
  const handleTaskNavigate = (noteId: string, blockId: string) => {
    onTaskClick?.(noteId, blockId);
  };
  
  // Handle task selection
  const handleTaskClick = (taskId: string, event?: React.MouseEvent) => {
    if (onTaskMultiSelect) {
      onTaskMultiSelect(taskId, event);
    }
  };
  
  // Render grouped tasks with timeline connectors
  const renderGroupedTasks = (
    groupedTasks: Map<string, TaskWithDate[]>,
    sectionPrefix: string
  ) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: sidebarLayout.itemGap }}>
        {Array.from(groupedTasks.entries()).map(([date, tasks], groupIndex, groupsArray) => {
          const isLastGroup = groupIndex === groupsArray.length - 1;
          
          return (
            <div 
              key={date} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: sidebarLayout.itemGap,
                position: 'relative',
              }}
            >
              {/* Date group header */}
              <SidebarItem
                variant="group"
                id={`group-${sectionPrefix}-${date}`}
                label={formatTaskDateLabel(date, todayDateString)}
                onClick={() => {}}
              />
              
              {/* Tasks container with connecting line */}
              <div style={{ position: 'relative' }}>
                {/* Connecting vertical line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '10.5px',
                    top: 0,
                    bottom: isLastGroup ? 0 : `-${sidebarLayout.itemGap}`,
                    width: '3px',
                    backgroundColor: colors.connector.tertiary,
                    borderRadius: '3px',
                  }}
                />
                
                {/* Tasks indented */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: sidebarLayout.itemGap }}>
                  {tasks.map(task => (
                    <div key={task.id} style={{ paddingLeft: sidebarLayout.indentPerLevel }}>
                      <SidebarItemTask
                        id={task.id}
                        noteId={task.noteId}
                        noteTitle={task.noteTitle}
                        text={task.text}
                        checked={task.checked}
                        isSelected={selectedTaskIds?.has(task.id)}
                        hasOpenContextMenu={openContextMenuId === task.id}
                        onClick={(e) => handleTaskClick(task.id, e)}
                        onToggle={handleToggleTask}
                        onNavigate={handleTaskNavigate}
                        actions={getTaskActions?.(task.id, task.noteId)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div 
      onClick={onClearSelection}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: sidebarLayout.sectionGap,
      }}
    >
      {/* Today Section */}
      <SidebarSection
        title="Today"
        isCollapsed={taskTodayCollapsed}
        onToggle={() => setTaskTodayCollapsed(!taskTodayCollapsed)}
        onHeaderClick={onTodayHeaderClick}
        badge={todayTasks.length > 0 ? todayTasks.length.toString() : undefined}
      >
        {todayTasks.length === 0 ? (
          <SidebarEmptyState message="No tasks for today" />
        ) : (
          todayTasks.map(task => (
            <SidebarItemTask
              key={task.id}
              id={task.id}
              noteId={task.noteId}
              noteTitle={task.noteTitle}
              text={task.text}
              checked={task.checked}
              isSelected={selectedTaskIds?.has(task.id)}
              hasOpenContextMenu={openContextMenuId === task.id}
              onClick={(e) => handleTaskClick(task.id, e)}
              onToggle={handleToggleTask}
              onNavigate={handleTaskNavigate}
              actions={getTaskActions?.(task.id, task.noteId)}
            />
          ))
        )}
      </SidebarSection>
      
      {/* Overdue Section */}
      <SidebarSection
        title="Overdue"
        isCollapsed={taskOverdueCollapsed}
        onToggle={() => setTaskOverdueCollapsed(!taskOverdueCollapsed)}
        onHeaderClick={onOverdueHeaderClick}
        badge={overdueTasks.length > 0 ? overdueTasks.length.toString() : undefined}
      >
        {overdueTasks.length === 0 ? (
          <SidebarEmptyState message="No overdue tasks" />
        ) : (
          renderGroupedTasks(groupedOverdueTasks, 'overdue')
        )}
      </SidebarSection>
      
      {/* Upcoming Section */}
      <SidebarSection
        title="Upcoming"
        isCollapsed={taskUpcomingCollapsed}
        onToggle={() => setTaskUpcomingCollapsed(!taskUpcomingCollapsed)}
        onHeaderClick={onUpcomingHeaderClick}
        badge={upcomingTasks.length > 0 ? upcomingTasks.length.toString() : undefined}
      >
        {upcomingTasks.length === 0 ? (
          <SidebarEmptyState message="No upcoming tasks" />
        ) : (
          renderGroupedTasks(groupedUpcomingTasks, 'upcoming')
        )}
      </SidebarSection>
      
      {/* Unplanned Section */}
      <SidebarSection
        title="Unplanned"
        isCollapsed={taskUnplannedCollapsed}
        onToggle={() => setTaskUnplannedCollapsed(!taskUnplannedCollapsed)}
        onHeaderClick={onUnplannedHeaderClick}
        badge={unplannedTasks.length > 0 ? unplannedTasks.length.toString() : undefined}
      >
        {unplannedTasks.length === 0 ? (
          <SidebarEmptyState message="No unplanned tasks" />
        ) : (
          unplannedTasks.map(task => (
            <SidebarItemTask
              key={task.id}
              id={task.id}
              noteId={task.noteId}
              noteTitle={task.noteTitle}
              text={task.text}
              checked={task.checked}
              isSelected={selectedTaskIds?.has(task.id)}
              hasOpenContextMenu={openContextMenuId === task.id}
              onClick={(e) => handleTaskClick(task.id, e)}
              onToggle={handleToggleTask}
              onNavigate={handleTaskNavigate}
              actions={getTaskActions?.(task.id, task.noteId)}
            />
          ))
        )}
      </SidebarSection>
      
      {/* Completed Section */}
      <SidebarSection
        title="Completed"
        isCollapsed={taskCompletedCollapsed}
        onToggle={() => setTaskCompletedCollapsed(!taskCompletedCollapsed)}
        onHeaderClick={onCompletedHeaderClick}
        badge={completedTasks.length > 0 ? completedTasks.length.toString() : undefined}
      >
        {completedTasks.length === 0 ? (
          <SidebarEmptyState message="No completed tasks" />
        ) : (
          completedTasks.map(task => (
            <SidebarItemTask
              key={task.id}
              id={task.id}
              noteId={task.noteId}
              noteTitle={task.noteTitle}
              text={task.text}
              checked={task.checked}
              isSelected={selectedTaskIds?.has(task.id)}
              hasOpenContextMenu={openContextMenuId === task.id}
              onClick={(e) => handleTaskClick(task.id, e)}
              onToggle={handleToggleTask}
              onNavigate={handleTaskNavigate}
              actions={getTaskActions?.(task.id, task.noteId)}
            />
          ))
        )}
      </SidebarSection>
    </div>
  );
};

