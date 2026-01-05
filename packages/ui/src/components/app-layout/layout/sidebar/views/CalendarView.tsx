import { useMemo, useState, useEffect, ReactNode } from 'react';
import { DAILY_NOTES_FOLDER_ID } from '@clutter/domain';
import { useNotesStore, useCurrentDateStore, useUIStateStore } from '@clutter/state';
import { useTheme } from '../../../../../hooks/useTheme';
import { SidebarEmptyState } from '../sections/EmptyState';
import { SidebarSection } from '../sections/Section';
import { SidebarItemNote } from '../items/NoteItem';
import { SidebarItemFolder } from '../items/FolderItem';
import { SidebarItemTask } from '../items/TaskItem';
import { sizing as globalSizing } from '../../../../../tokens/sizing';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { transitions } from '../../../../../tokens/transitions';
import { Note } from '@clutter/domain';
import { SidebarNote, GlobalSelection } from '../types';
import { ALL_TASKS_FOLDER_ID } from '../../../../../utils/itemIcons';
import {
  groupDailyNotesByYearMonth,
  getSortedYears,
  getSortedMonths,
  getMonthNoteCount,
  formatYearMonthKey
} from '../../../../../utils/dailyNotesGrouping';

export interface Task {
  id: string;
  text: string;
  checked: boolean;
  noteId: string;
  noteTitle: string;
  noteEmoji: string | null;
}

interface CalendarViewProps {
  onTaskClick?: (noteId: string, taskId: string) => void;
  onAllTasksHeaderClick?: () => void; // Click on "All Tasks" header to open full view
  
  // Daily Notes
  dailyNotes: SidebarNote[];
  onDailyNoteClick: (noteId: string, event?: React.MouseEvent) => void;
  isDailyNotesCollapsed: boolean;
  onDailyNotesToggle: () => void;
  onDailyNotesFolderClick?: () => void; // Click folder name to open Daily Notes folder view
  onYearClick?: (year: string) => void; // Click year to open year view
  onMonthClick?: (year: string, month: string) => void; // Click month to open month view
  
  // Selection
  selection: GlobalSelection;
  currentNoteId?: string | null;
  openContextMenuId?: string | null; // ID of item with open context menu (for highlighting)
  onClearSelection?: () => void; // Clear selection when clicking empty space
  
  // Action builders
  getNoteActions?: (noteId: string) => ReactNode[];
  getFolderActions?: (folderId: string) => ReactNode[];
  getTaskActions?: (taskId: string) => ReactNode[]; // NEW: Task actions
  
  // Drag and drop
  onNoteDragStart?: (noteId: string, context: string) => void;
  onDragEnd?: () => void;
  onDailyNotesDragOver?: () => void;
  onDragLeave?: () => void;
  onDailyNotesDrop?: () => void;
  draggedItemId?: string[] | null;
  dropTargetId?: string | null;
  dropTargetType?: 'folder' | 'cluttered' | 'dailyNotes' | null;
  
  // Reordering
  onNoteDragOverForReorder?: (noteId: string, position: 'before' | 'after', context: string) => void;
  onNoteDragLeaveForReorder?: () => void;
  onNoteDropForReorder?: (noteId: string, position: 'before' | 'after', context: string) => void;
  reorderDropTarget?: { id: string; position: 'before' | 'after'; type: 'note' | 'folder' } | null;
  
  // Inline editing
  editingNoteId?: string | null;
  onNoteRenameComplete?: (noteId: string, newTitle: string) => void;
  onNoteRenameCancel?: () => void;
  
  // Emoji picker
  onNoteEmojiClick?: (noteId: string, buttonElement: HTMLButtonElement) => void;
  
  // Multi-select for tasks (NEW!)
  selectedTaskIds?: Set<string>;
  onTaskMultiSelect?: (taskId: string, event?: React.MouseEvent, context?: string) => void;
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

export const CalendarView = ({ 
  onTaskClick, 
  onAllTasksHeaderClick,
  dailyNotes,
  onDailyNoteClick,
  isDailyNotesCollapsed,
  onDailyNotesToggle,
  onDailyNotesFolderClick,
  onYearClick,
  onMonthClick,
  selection,
  currentNoteId,
  openContextMenuId,
  onClearSelection,
  getNoteActions,
  getFolderActions,
  getTaskActions,
  onNoteDragStart,
  onDragEnd,
  onDailyNotesDragOver,
  onDragLeave,
  onDailyNotesDrop,
  draggedItemId,
  dropTargetId,
  dropTargetType,
  onNoteDragOverForReorder,
  onNoteDragLeaveForReorder,
  onNoteDropForReorder,
  reorderDropTarget,
  editingNoteId,
  onNoteRenameComplete,
  onNoteRenameCancel,
  onNoteEmojiClick,
  selectedTaskIds,
  onTaskMultiSelect,
}: CalendarViewProps) => {
  const { colors } = useTheme();
  const notes = useNotesStore((state) => state.notes);
  const updateNoteContent = useNotesStore((state) => state.updateNoteContent);
  const isAllTasksCollapsed = useUIStateStore(state => state.allTasksCollapsed);
  const setAllTasksCollapsed = useUIStateStore(state => state.setAllTasksCollapsed);
  
  // Daily notes grouping - UI state for year/month collapse (sidebar-specific)
  const collapsedDailyNoteGroups = useUIStateStore(state => state.sidebarCollapsedDailyNoteGroups);
  const toggleDailyNoteGroupCollapsed = useUIStateStore(state => state.toggleSidebarDailyNoteGroupCollapsed);
  
  // Current date for highlighting today/this month/this year
  const currentYear = useCurrentDateStore(state => state.year);
  const currentMonthName = useCurrentDateStore(state => state.monthName);
  const currentDateString = useCurrentDateStore(state => state.dateString);
  
  // Group daily notes by year and month for sidebar
  const groupedDailyNotes = useMemo(() => {
    return groupDailyNotesByYearMonth(dailyNotes);
  }, [dailyNotes]);
  
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

  // Auto-collapse when all tasks are gone
  useEffect(() => {
    if (allTasks.length === 0) {
      setAllTasksCollapsed(true);
    }
  }, [allTasks.length, setAllTasksCollapsed]);

  // Helper to clear all reorder indicators
  const handleClearAllReorderIndicators = () => {
    if (onNoteDragLeaveForReorder) {
      onNoteDragLeaveForReorder();
    }
  };

  return (
    <div 
      onClick={(e) => {
        // Clear selection when clicking on empty space (not on child elements)
        if (e.target === e.currentTarget && onClearSelection) {
          onClearSelection();
        }
      }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: sidebarLayout.sectionGap,
        width: '100%',
      }}
    >
      {/* Daily Notes Section */}
      <SidebarSection
        title="Daily Notes"
        isCollapsed={isDailyNotesCollapsed}
        onToggle={onDailyNotesToggle}
        onHeaderClick={onDailyNotesFolderClick}
        badge={dailyNotes.length > 0 ? String(dailyNotes.length) : undefined}
        isDropTarget={dropTargetType === 'dailyNotes' && dropTargetId === 'dailyNotes'}
        onDragOver={onDailyNotesDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDailyNotesDrop}
        onClearAllReorderIndicators={handleClearAllReorderIndicators}
      >
        {dailyNotes.length === 0 ? (
          <SidebarEmptyState message="No daily notes yet" />
        ) : (
          <div
            style={{
              display: 'flex', 
              flexDirection: 'column', 
              gap: sidebarLayout.itemGap,
              width: '100%',
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            {getSortedYears(groupedDailyNotes).map(year => {
              const yearKey = formatYearMonthKey(year);
              const yearCollapsed = collapsedDailyNoteGroups.has(yearKey);
              const isCurrentYear = year === currentYear.toString();
              
              return (
                <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: sidebarLayout.itemGap }}>
                  {/* Year Folder */}
                  <SidebarItemFolder
                    id={yearKey}
                    label={year}
                    isOpen={!yearCollapsed}
                    level={0}
                    onClick={() => onYearClick?.(year)}
                    onToggle={() => toggleDailyNoteGroupCollapsed(yearKey)}
                    context="dailyNotes"
                  />
                  
                  {/* Months within Year */}
                  {!yearCollapsed && getSortedMonths(groupedDailyNotes, year).map(month => {
                    const monthKey = formatYearMonthKey(year, month);
                    const monthCollapsed = collapsedDailyNoteGroups.has(monthKey);
                    const monthNotes = groupedDailyNotes[year][month];
                    const monthCount = getMonthNoteCount(groupedDailyNotes, year, month);
                    
                    // Check if this month contains today's note
                    const monthContainsToday = monthNotes.some(note => note.dailyNoteDate === currentDateString);
                    
                    return (
                      <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: sidebarLayout.itemGap }}>
                        {/* Month Folder */}
                        <SidebarItemFolder
                          id={monthKey}
                          label={month}
                          // Show dot on month only when collapsed and contains today
                          isToday={monthCollapsed && monthContainsToday}
                          badge={String(monthCount)}
                          isOpen={!monthCollapsed}
                          level={1}
                          onClick={() => onMonthClick?.(year, month)}
                          onToggle={() => toggleDailyNoteGroupCollapsed(monthKey)}
                          context="dailyNotes"
                        />
                        
                        {/* Notes within Month */}
                        {!monthCollapsed && monthNotes.map((note) => {
                          // Show dot on note only when month is expanded and it's today
                          const isToday = !monthCollapsed && note.dailyNoteDate === currentDateString;
                          
                          return (
                            <SidebarItemNote
                              key={note.id}
                              id={note.id}
                              title={note.title}
                              emoji={note.emoji}
                              isToday={isToday}
                              level={2}
                              isSelected={selection.type === 'note' && selection.itemId === note.id && selection.context === 'dailyNotes'}
                              hasOpenContextMenu={openContextMenuId === note.id}
                              hasContent={note.hasContent}
                              dailyNoteDate={note.dailyNoteDate}
                              onClick={(e) => onDailyNoteClick(note.id, e)}
                              actions={getNoteActions ? getNoteActions(note.id) : []}
                            draggable={Boolean(onNoteDragStart)}
                            context="dailyNotes"
                            onDragStart={onNoteDragStart}
                            onDragEnd={onDragEnd}
                            onEmojiClick={onNoteEmojiClick}
                            reorderable={Boolean(onNoteDragOverForReorder)}
                            onDragOverForReorder={onNoteDragOverForReorder}
                            onDragLeaveForReorder={onNoteDragLeaveForReorder}
                            onDropForReorder={onNoteDropForReorder}
                            dropPosition={
                              reorderDropTarget?.type === 'note' &&
                              reorderDropTarget?.id === note.id
                                ? reorderDropTarget.position
                                : null
                            }
                            onClearAllReorderIndicators={handleClearAllReorderIndicators}
                            isEditing={editingNoteId === note.id}
                            onRenameComplete={onNoteRenameComplete}
                            onRenameCancel={onNoteRenameCancel}
                          />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </SidebarSection>

      {/* All Tasks Section */}
      <SidebarSection
        title="All Tasks"
        isCollapsed={isAllTasksCollapsed}
        onToggle={() => setAllTasksCollapsed(!isAllTasksCollapsed)}
        onHeaderClick={onAllTasksHeaderClick}
        badge={allTasks.length > 0 ? String(allTasks.length) : undefined}
        actions={getFolderActions ? getFolderActions(ALL_TASKS_FOLDER_ID) : []}
      >
        {allTasks.length === 0 ? (
          <SidebarEmptyState message="No tasks yet. Create tasks in your notes." />
        ) : (
          <div
            style={{
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0px',
              width: '100%',
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            {/* Incomplete Tasks */}
            {incompleteTasks.map(task => (
              <SidebarItemTask
                key={task.id}
                id={task.id}
                noteId={task.noteId}
                noteTitle={task.noteTitle}
                text={task.text}
                checked={task.checked}
                isSelected={
                  selection.type === 'task' && 
                  selectedTaskIds?.has(task.id) &&
                  selection.context === 'allTasks'
                }
                hasOpenContextMenu={openContextMenuId === task.id}
                onClick={(e) => onTaskMultiSelect?.(task.id, e, 'allTasks')}
                onToggle={handleToggleTask}
                onNavigate={(noteId, blockId) => onTaskClick?.(noteId, blockId)}
                actions={getTaskActions ? getTaskActions(task.id) : []}
              />
            ))}
            
            {/* Completed Tasks */}
            {completedTasks.map(task => (
              <SidebarItemTask
                key={task.id}
                id={task.id}
                noteId={task.noteId}
                noteTitle={task.noteTitle}
                text={task.text}
                checked={task.checked}
                isSelected={
                  selection.type === 'task' && 
                  selectedTaskIds?.has(task.id) &&
                  selection.context === 'allTasks'
                }
                hasOpenContextMenu={openContextMenuId === task.id}
                onClick={(e) => onTaskMultiSelect?.(task.id, e, 'allTasks')}
                onToggle={handleToggleTask}
                onNavigate={(noteId, blockId) => onTaskClick?.(noteId, blockId)}
                actions={getTaskActions ? getTaskActions(task.id) : []}
              />
            ))}
          </div>
        )}
      </SidebarSection>
    </div>
  );
};

