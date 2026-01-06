import { useMemo, useState, useCallback, ReactNode } from 'react';
import { useNotesStore, useUIStateStore } from '@clutter/state';
import {
  getTodayDateString,
  formatTaskDateLabel,
  compareDates,
  extractTasksFromNote,
  toggleTaskInNote,
  categorizeTasks,
  sortTasksByDateAndCreation,
  sortTasksByCreation,
  type Task,
} from '@clutter/shared';
import { useTheme } from '../../../../../hooks/useTheme';
import { SidebarItemFolder } from '../items/FolderItem';
import { SidebarItemTask } from '../items/TaskItem';
import { SidebarItem } from '../items/SidebarItem';
import { SidebarEmptyState } from '../sections/EmptyState';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { transitions } from '../../../../../tokens/transitions';
import { Note } from '@clutter/domain';
import { GlobalSelection } from '../types';
import { SECTIONS, renderIcon } from '../../../../../config/sidebarConfig';

// Use shared Task type
export type TaskWithDate = Task;

interface TaskViewProps {
  onTaskClick?: (_noteId: string, _taskId: string) => void;

  // Selection
  selection: GlobalSelection;
  openContextMenuId?: string | null;
  onClearSelection?: () => void;

  // Actions
  getTaskActions?: (_taskId: string, _noteId: string) => ReactNode[];

  // Multi-select
  selectedTaskIds?: Set<string>;
  onTaskMultiSelect?: (_taskId: string, _event?: React.MouseEvent) => void;

  // Header click handlers for navigation to full page views
  onTodayHeaderClick?: () => void;
  onUpcomingHeaderClick?: () => void;
  onUnplannedHeaderClick?: () => void;
  onCompletedHeaderClick?: () => void;
}

export const TaskView = ({
  onTaskClick,
  openContextMenuId,
  onClearSelection,
  getTaskActions,
  selectedTaskIds,
  onTaskMultiSelect,
  onTodayHeaderClick,
  onUpcomingHeaderClick,
  onUnplannedHeaderClick,
  onCompletedHeaderClick,
}: TaskViewProps) => {
  const notes = useNotesStore((state) => state.notes);
  const updateNoteContent = useNotesStore((state) => state.updateNoteContent);
  const { colors } = useTheme();

  // Track tasks that are currently completing (for animation)
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(
    new Set()
  );

  // Track tasks that are in the removal animation phase (height collapse)
  const [removingTasks, setRemovingTasks] = useState<Set<string>>(new Set());

  // Get collapse states from UI state store
  const {
    taskTodayCollapsed,
    taskUpcomingCollapsed,
    taskUnplannedCollapsed,
    taskCompletedCollapsed,
    setTaskTodayCollapsed,
    setTaskUpcomingCollapsed,
    setTaskUnplannedCollapsed,
    setTaskCompletedCollapsed,
  } = useUIStateStore();

  const todayDateString = useMemo(() => getTodayDateString(), []);

  // Extract all tasks from all active notes
  const allTasks = useMemo(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const tasks: Task[] = [];

    activeNotes.forEach((note) => {
      const noteTasks = extractTasksFromNote(note);
      tasks.push(...noteTasks);
    });

    return tasks;
  }, [notes]);

  // Categorize tasks into sections using centralized logic
  const { todayTasks, upcomingTasks, unplannedTasks, completedTasks } =
    useMemo(() => {
      // Use centralized categorization (SINGLE SOURCE OF TRUTH)
      const categorized = categorizeTasks(allTasks, todayDateString);

      return {
        todayTasks: sortTasksByDateAndCreation(categorized.today),
        upcomingTasks: sortTasksByDateAndCreation(categorized.upcoming),
        unplannedTasks: sortTasksByCreation(categorized.inbox),
        completedTasks: sortTasksByCreation(categorized.completed),
      };
    }, [allTasks, todayDateString]);

  // Group today tasks by date with "Overdue" grouping
  const groupedTodayTasks = useMemo(() => {
    const overdueGroup: Task[] = [];
    const todayGroup: Task[] = [];

    todayTasks.forEach((task) => {
      const effectiveDate = task.date || task.dailyNoteDate;
      if (effectiveDate && compareDates(effectiveDate, todayDateString) < 0) {
        overdueGroup.push(task);
      } else {
        todayGroup.push(task);
      }
    });

    // Sort overdue tasks by date (oldest to newest)
    overdueGroup.sort((a, b) => {
      const dateA = a.date || a.dailyNoteDate || '';
      const dateB = b.date || b.dailyNoteDate || '';
      const dateComparison = compareDates(dateA, dateB);
      if (dateComparison !== 0) return dateComparison;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const grouped = new Map<string, Task[]>();
    if (overdueGroup.length > 0) {
      grouped.set('__overdue__', overdueGroup);
    }
    if (todayGroup.length > 0) {
      grouped.set(todayDateString, todayGroup);
    }

    return grouped;
  }, [todayTasks, todayDateString]);

  // Group upcoming tasks by date with "Overdue" grouping
  const groupedUpcomingTasks = useMemo(() => {
    const overdueGroup: Task[] = [];
    const dateGroups = new Map<string, Task[]>();

    upcomingTasks.forEach((task) => {
      const effectiveDate = task.date || task.dailyNoteDate;
      if (effectiveDate) {
        if (compareDates(effectiveDate, todayDateString) < 0) {
          overdueGroup.push(task);
        } else {
          if (!dateGroups.has(effectiveDate)) {
            dateGroups.set(effectiveDate, []);
          }
          dateGroups.get(effectiveDate)!.push(task);
        }
      }
    });

    // Sort overdue tasks by date (oldest to newest)
    overdueGroup.sort((a, b) => {
      const dateA = a.date || a.dailyNoteDate || '';
      const dateB = b.date || b.dailyNoteDate || '';
      const dateComparison = compareDates(dateA, dateB);
      if (dateComparison !== 0) return dateComparison;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Build final map with overdue first, then sorted dates
    const grouped = new Map<string, Task[]>();
    if (overdueGroup.length > 0) {
      grouped.set('__overdue__', overdueGroup);
    }

    // Add other dates sorted
    const sortedDates = Array.from(dateGroups.entries()).sort((a, b) =>
      compareDates(a[0], b[0])
    );
    sortedDates.forEach(([date, tasks]) => {
      grouped.set(date, tasks);
    });

    return grouped;
  }, [upcomingTasks, todayDateString]);

  // Group completed tasks by completion date (when they were actually completed)
  const groupedCompletedTasks = useMemo(() => {
    const dateGroups = new Map<string, Task[]>();

    completedTasks.forEach((task) => {
      // Get completion date (YYYY-MM-DD format)
      let completionDate: string;
      if (task.completedAt) {
        // Extract just the date part from ISO string (YYYY-MM-DD)
        completionDate = task.completedAt.split('T')[0];
      } else {
        // Fallback for old tasks without completedAt - use today
        completionDate = todayDateString;
      }

      if (!dateGroups.has(completionDate)) {
        dateGroups.set(completionDate, []);
      }
      dateGroups.get(completionDate)!.push(task);
    });

    // Sort tasks within each date by completion time (most recent first)
    dateGroups.forEach((tasks) => {
      tasks.sort((a, b) => {
        const timeA = a.completedAt
          ? new Date(a.completedAt).getTime()
          : new Date(a.createdAt).getTime();
        const timeB = b.completedAt
          ? new Date(b.completedAt).getTime()
          : new Date(b.createdAt).getTime();
        return timeB - timeA; // Most recent first
      });
    });

    // Build final map - sorted by date (most recent first)
    const grouped = new Map<string, Task[]>();
    const sortedDates = Array.from(dateGroups.entries()).sort((a, b) =>
      compareDates(b[0], a[0])
    ); // Reverse order - newest first

    sortedDates.forEach(([date, tasks]) => {
      grouped.set(date, tasks);
    });

    return grouped;
  }, [completedTasks, todayDateString]);

  // Handle checkbox toggle with animation
  const handleToggleTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      const note = notes.find((n) => n.id === task.noteId);
      if (!note) return;

      // If completing a task (unchecked -> checked)
      if (!task.checked) {
        // Add to completing set for animation
        setCompletingTasks((prev) => new Set(prev).add(taskId));

        // Auto-expand Completed section when completing a task
        if (taskCompletedCollapsed) {
          setTaskCompletedCollapsed(false);
        }

        // Wait for animation, then start removal animation
        setTimeout(() => {
          // Move to removing phase (height collapse animation)
          setRemovingTasks((prev) => new Set(prev).add(taskId));

          // Wait for height collapse animation, then persist
          setTimeout(() => {
            const updatedContent = toggleTaskInNote(note, taskId);
            updateNoteContent(note.id, updatedContent);

            // Remove from both sets after persistence
            setCompletingTasks((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
            setRemovingTasks((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
          }, 300); // 300ms for height collapse
        }, 800); // 800ms animation duration
      } else {
        // If uncompleting (checked -> unchecked), update immediately
        const updatedContent = toggleTaskInNote(note, taskId);
        updateNoteContent(note.id, updatedContent);
      }
    },
    [
      allTasks,
      notes,
      updateNoteContent,
      taskCompletedCollapsed,
      setTaskCompletedCollapsed,
    ]
  );

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
    groupedTasks: Map<string, Task[]>,
    sectionPrefix: string
  ) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: sidebarLayout.itemGap,
        }}
      >
        {Array.from(groupedTasks.entries()).map(
          ([date, tasks], groupIndex, groupsArray) => {
            const isLastGroup = groupIndex === groupsArray.length - 1;
            const isOverdue = date === '__overdue__';
            const isNoDate = date === '__no_date__';
            const isToday = date === todayDateString;

            // Determine label and connector color
            let label: string;
            if (isOverdue) {
              label = 'Overdue';
            } else if (isNoDate) {
              label = 'No date';
            } else {
              label = formatTaskDateLabel(date, todayDateString);
            }

            const connectorColor = isToday
              ? colors.semantic.calendarAccent
              : colors.border.default;

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
                {/* Date group header - aligned with indented tasks */}
                <div style={{ paddingLeft: '3px' }}>
                  <SidebarItem
                    variant="group"
                    id={`group-${sectionPrefix}-${date}`}
                    label={label}
                    onClick={() => {}}
                  />
                </div>

                {/* Tasks container with connecting line */}
                <div style={{ position: 'relative' }}>
                  {/* Connecting vertical line - accent color for today */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '12.5px', // Center of 3px line aligned with folder icon center: itemPaddingX (4px) + iconButtonSize/2 (10px) - lineWidth/2 (1.5px)
                      top: 0,
                      bottom: isLastGroup ? 0 : `-${sidebarLayout.itemGap}`,
                      width: '3px',
                      backgroundColor: connectorColor,
                      borderRadius: '3px',
                    }}
                  />

                  {/* Tasks indented */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: sidebarLayout.itemGap,
                    }}
                  >
                    {tasks.map((task) => {
                      // Show date badge for overdue tasks only
                      const taskDate = task.date || task.dailyNoteDate;
                      const badge =
                        isOverdue && taskDate
                          ? formatTaskDateLabel(taskDate, todayDateString)
                          : undefined;

                      const isCompleting = completingTasks.has(task.id);
                      const isRemoving = removingTasks.has(task.id);
                      const isCompleted = sectionPrefix === 'completed';

                      return (
                        <div
                          key={task.id}
                          style={{
                            paddingLeft: sidebarLayout.indentPerLevel,
                            opacity: isCompleting ? 0.5 : 1,
                            maxHeight: isRemoving ? '0px' : '32px',
                            overflow: 'hidden',
                            transition: isRemoving
                              ? 'opacity 0.3s ease, max-height 0.3s ease, margin-bottom 0.3s ease'
                              : 'opacity 0.3s ease',
                            marginBottom: isRemoving
                              ? '0px'
                              : sidebarLayout.itemGap,
                            // Simple fade-in animation for completed tasks
                            animation: isCompleted
                              ? 'fadeInSlide 0.3s ease-out'
                              : undefined,
                          }}
                        >
                          <SidebarItemTask
                            id={task.id}
                            noteId={task.noteId}
                            noteTitle={task.noteTitle}
                            text={task.text}
                            checked={task.checked || isCompleting}
                            badge={badge}
                            isSelected={selectedTaskIds?.has(task.id)}
                            hasOpenContextMenu={openContextMenuId === task.id}
                            onClick={(e) => handleTaskClick(task.id, e)}
                            onToggle={handleToggleTask}
                            onNavigate={handleTaskNavigate}
                            actions={getTaskActions?.(task.id, task.noteId)}
                            isCompleting={isCompleting}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        onClick={onClearSelection}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: sidebarLayout.sectionGap,
        }}
      >
        {/* Inbox Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: sidebarLayout.itemGap,
          }}
        >
          <SidebarItemFolder
            id={SECTIONS.inbox.id}
            label={SECTIONS.inbox.label}
            emoji={renderIcon(SECTIONS.inbox.iconName, 16)}
            isOpen={!taskUnplannedCollapsed}
            onToggle={() => setTaskUnplannedCollapsed(!taskUnplannedCollapsed)}
            onClick={onUnplannedHeaderClick}
            badge={
              unplannedTasks.length > 0
                ? unplannedTasks.length.toString()
                : undefined
            }
            level={0}
            context="task-sections"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateRows: taskUnplannedCollapsed ? '0fr' : '1fr',
              transition: transitions.collapse.height,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                minHeight: 0,
                overflow: 'hidden',
                opacity: taskUnplannedCollapsed ? 0 : 1,
                transition: transitions.collapse.content,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sidebarLayout.itemGap,
                  paddingTop: '2px',
                  paddingBottom: '2px',
                }}
              >
                {unplannedTasks.length === 0 ? (
                  <SidebarEmptyState message={SECTIONS.inbox.emptyMessage} />
                ) : (
                  unplannedTasks.map((task) => {
                    const isCompleting = completingTasks.has(task.id);
                    const isRemoving = removingTasks.has(task.id);

                    return (
                      <div
                        key={task.id}
                        style={{
                          opacity: isCompleting ? 0.5 : 1,
                          maxHeight: isRemoving ? '0px' : '32px',
                          overflow: 'hidden',
                          transition: isRemoving
                            ? 'opacity 0.3s ease, max-height 0.3s ease, margin-bottom 0.3s ease'
                            : 'opacity 0.3s ease',
                          marginBottom: isRemoving
                            ? '0px'
                            : sidebarLayout.itemGap,
                        }}
                      >
                        <SidebarItemTask
                          id={task.id}
                          noteId={task.noteId}
                          noteTitle={task.noteTitle}
                          text={task.text}
                          checked={task.checked || isCompleting}
                          isSelected={selectedTaskIds?.has(task.id)}
                          hasOpenContextMenu={openContextMenuId === task.id}
                          onClick={(e) => handleTaskClick(task.id, e)}
                          onToggle={handleToggleTask}
                          onNavigate={handleTaskNavigate}
                          actions={getTaskActions?.(task.id, task.noteId)}
                          isCompleting={isCompleting}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Today Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: sidebarLayout.itemGap,
          }}
        >
          <SidebarItemFolder
            id={SECTIONS.today.id}
            label={SECTIONS.today.label}
            emoji={renderIcon(SECTIONS.today.iconName, 16)}
            isOpen={!taskTodayCollapsed}
            onToggle={() => setTaskTodayCollapsed(!taskTodayCollapsed)}
            onClick={onTodayHeaderClick}
            badge={
              todayTasks.length > 0 ? todayTasks.length.toString() : undefined
            }
            level={0}
            context="task-sections"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateRows: taskTodayCollapsed ? '0fr' : '1fr',
              transition: transitions.collapse.height,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                minHeight: 0,
                overflow: 'hidden',
                opacity: taskTodayCollapsed ? 0 : 1,
                transition: transitions.collapse.content,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sidebarLayout.itemGap,
                  paddingTop: '2px',
                  paddingBottom: '2px',
                }}
              >
                {todayTasks.length === 0 ? (
                  <SidebarEmptyState message={SECTIONS.today.emptyMessage} />
                ) : (
                  renderGroupedTasks(groupedTodayTasks, 'today')
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: sidebarLayout.itemGap,
          }}
        >
          <SidebarItemFolder
            id={SECTIONS.upcoming.id}
            label={SECTIONS.upcoming.label}
            emoji={renderIcon(SECTIONS.upcoming.iconName, 16)}
            isOpen={!taskUpcomingCollapsed}
            onToggle={() => setTaskUpcomingCollapsed(!taskUpcomingCollapsed)}
            onClick={onUpcomingHeaderClick}
            badge={
              upcomingTasks.length > 0
                ? upcomingTasks.length.toString()
                : undefined
            }
            level={0}
            context="task-sections"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateRows: taskUpcomingCollapsed ? '0fr' : '1fr',
              transition: transitions.collapse.height,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                minHeight: 0,
                overflow: 'hidden',
                opacity: taskUpcomingCollapsed ? 0 : 1,
                transition: transitions.collapse.content,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sidebarLayout.itemGap,
                  paddingTop: '2px',
                  paddingBottom: '2px',
                }}
              >
                {upcomingTasks.length === 0 ? (
                  <SidebarEmptyState message={SECTIONS.upcoming.emptyMessage} />
                ) : (
                  renderGroupedTasks(groupedUpcomingTasks, 'upcoming')
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Completed Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: sidebarLayout.itemGap,
          }}
        >
          <SidebarItemFolder
            id={SECTIONS.completed.id}
            label={SECTIONS.completed.label}
            emoji={renderIcon(SECTIONS.completed.iconName, 16)}
            isOpen={!taskCompletedCollapsed}
            onToggle={() => setTaskCompletedCollapsed(!taskCompletedCollapsed)}
            onClick={onCompletedHeaderClick}
            badge={
              completedTasks.length > 0
                ? completedTasks.length.toString()
                : undefined
            }
            level={0}
            context="task-sections"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateRows: taskCompletedCollapsed ? '0fr' : '1fr',
              transition: transitions.collapse.height,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                minHeight: 0,
                overflow: 'hidden',
                opacity: taskCompletedCollapsed ? 0 : 1,
                transition: transitions.collapse.content,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sidebarLayout.itemGap,
                  paddingTop: '2px',
                  paddingBottom: '2px',
                }}
              >
                {completedTasks.length === 0 ? (
                  <SidebarEmptyState
                    message={SECTIONS.completed.emptyMessage}
                  />
                ) : (
                  renderGroupedTasks(groupedCompletedTasks, 'completed')
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
