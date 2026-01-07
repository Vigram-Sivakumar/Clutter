import { useMemo, ReactNode } from 'react';
import { useCurrentDateStore, useUIStateStore } from '@clutter/state';
import { useTheme } from '../../../../../hooks/useTheme';
import { SidebarSection } from '../sections/Section';
import { SidebarItemNote } from '../items/NoteItem';
import { SidebarItemFolder } from '../items/FolderItem';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { SidebarNote, GlobalSelection } from '../types';
import { SECTIONS } from '../../../../../config/sidebarConfig';
import {
  groupDailyNotesByYearMonth,
  getSortedYears,
  getSortedMonths,
  getMonthNoteCount,
  formatYearMonthKey,
} from '../../../../../utils/dailyNotesGrouping';

interface CalendarViewProps {
  // Daily Notes
  dailyNotes: SidebarNote[];
  onDailyNoteClick: (_noteId: string, _event?: React.MouseEvent) => void;
  isDailyNotesCollapsed: boolean;
  onDailyNotesToggle: () => void;
  onDailyNotesFolderClick?: () => void; // Click folder name to open Daily Notes folder view
  onYearClick?: (_year: string) => void; // Click year to open year view
  onMonthClick?: (_year: string, _month: string) => void; // Click month to open month view

  // Selection
  selection: GlobalSelection;
  currentNoteId?: string | null;
  openContextMenuId?: string | null; // ID of item with open context menu (for highlighting)
  onClearSelection?: () => void; // Clear selection when clicking empty space

  // Action builders
  getNoteActions?: (_noteId: string) => ReactNode[];
  getFolderActions?: (_folderId: string) => ReactNode[];

  // Drag and drop
  onNoteDragStart?: (_noteId: string, _context: string) => void;
  onDragEnd?: () => void;
  onDailyNotesDragOver?: () => void;
  onDragLeave?: () => void;
  onDailyNotesDrop?: () => void;
  draggedItemId?: string[] | null;
  dropTargetId?: string | null;
  dropTargetType?: 'folder' | 'cluttered' | 'dailyNotes' | null;

  // Reordering
  onNoteDragOverForReorder?: (
    _noteId: string,
    _position: 'before' | 'after',
    _context: string
  ) => void;
  onNoteDragLeaveForReorder?: () => void;
  onNoteDropForReorder?: (
    _noteId: string,
    _position: 'before' | 'after',
    _context: string
  ) => void;
  reorderDropTarget?: {
    id: string;
    position: 'before' | 'after';
    type: 'note' | 'folder';
  } | null;

  // Inline editing
  editingNoteId?: string | null;
  onNoteRenameComplete?: (_noteId: string, _newTitle: string) => void;
  onNoteRenameCancel?: () => void;

  // Emoji picker
  onNoteEmojiClick?: (
    _noteId: string,
    _buttonElement: HTMLButtonElement
  ) => void;
}

export const CalendarView = ({
  dailyNotes,
  onDailyNoteClick,
  isDailyNotesCollapsed,
  onDailyNotesToggle,
  onDailyNotesFolderClick,
  onYearClick,
  onMonthClick,
  selection,
  openContextMenuId,
  onClearSelection,
  getNoteActions,
  onNoteDragStart,
  onDragEnd,
  onDailyNotesDragOver,
  onDragLeave,
  onDailyNotesDrop,
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
}: CalendarViewProps) => {
  useTheme();

  // Daily notes grouping - UI state for year/month collapse (sidebar-specific)
  const collapsedDailyNoteGroups = useUIStateStore(
    (state) => state.sidebarCollapsedDailyNoteGroups
  );
  const toggleDailyNoteGroupCollapsed = useUIStateStore(
    (state) => state.toggleSidebarDailyNoteGroupCollapsed
  );

  // Current date for highlighting today/this month/this year
  const currentDateString = useCurrentDateStore((state) => state.dateString);

  // Group daily notes by year and month for sidebar
  const groupedDailyNotes = useMemo(() => {
    return groupDailyNotesByYearMonth(dailyNotes);
  }, [dailyNotes]);

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
        gap: sidebarLayout.sectionToSectionGap,
        width: '100%',
      }}
    >
      {/* Daily Notes Section */}
      <SidebarSection
        title={SECTIONS['daily-notes'].label}
        isCollapsed={isDailyNotesCollapsed}
        onToggle={onDailyNotesToggle}
        isToggleDisabled={
          getSortedYears(groupedDailyNotes).length === 0 &&
          isDailyNotesCollapsed
        } // Only disable when empty AND collapsed
        onHeaderClick={onDailyNotesFolderClick}
        isDropTarget={
          dropTargetType === 'dailyNotes' && dropTargetId === 'dailyNotes'
        }
        onDragOver={onDailyNotesDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDailyNotesDrop}
        onClearAllReorderIndicators={handleClearAllReorderIndicators}
        emptyMessage={SECTIONS['daily-notes'].emptyMessage}
        emptyShortcut={SECTIONS['daily-notes'].emptyShortcut}
        emptySuffix={SECTIONS['daily-notes'].emptySuffix}
      >
        {getSortedYears(groupedDailyNotes).map((year) => {
          const yearKey = formatYearMonthKey(year);
          const yearCollapsed = collapsedDailyNoteGroups.has(yearKey);

          return (
            <div
              key={year}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: sidebarLayout.itemToItemGap,
              }}
            >
              {/* Year Folder */}
              <SidebarItemFolder
                id={yearKey}
                label={year}
                isOpen={!yearCollapsed}
                level={0}
                onClick={() => onYearClick?.(year)}
                onToggle={() => toggleDailyNoteGroupCollapsed(yearKey)}
                isToggleDisabled={
                  getSortedMonths(groupedDailyNotes, year).length === 0 &&
                  yearCollapsed
                } // Only disable when empty AND collapsed
                context="dailyNotes"
              />

              {/* Months within Year */}
              {!yearCollapsed &&
                getSortedMonths(groupedDailyNotes, year).map((month) => {
                  const monthKey = formatYearMonthKey(year, month);
                  const monthCollapsed = collapsedDailyNoteGroups.has(monthKey);
                  const monthNotes = groupedDailyNotes[year][month];
                  const monthCount = getMonthNoteCount(
                    groupedDailyNotes,
                    year,
                    month
                  );

                  // Check if this month contains today's note
                  const monthContainsToday = monthNotes.some(
                    (note) => note.dailyNoteDate === currentDateString
                  );

                  return (
                    <div
                      key={monthKey}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: sidebarLayout.itemToItemGap,
                      }}
                    >
                      {/* Month Folder */}
                      <SidebarItemFolder
                        id={monthKey}
                        label={month}
                        // Show dot on month only when collapsed and contains today
                        isToday={monthCollapsed && monthContainsToday}
                        badge={monthCount > 0 ? String(monthCount) : undefined}
                        isOpen={!monthCollapsed}
                        level={1}
                        onClick={() => onMonthClick?.(year, month)}
                        onToggle={() => toggleDailyNoteGroupCollapsed(monthKey)}
                        isToggleDisabled={
                          monthNotes.length === 0 && monthCollapsed
                        } // Only disable when empty AND collapsed
                        context="dailyNotes"
                      />

                      {/* Notes within Month */}
                      {!monthCollapsed &&
                        monthNotes.map((note) => {
                          // Show dot on note only when month is expanded and it's today
                          const isToday =
                            !monthCollapsed &&
                            note.dailyNoteDate === currentDateString;

                          return (
                            <SidebarItemNote
                              key={note.id}
                              id={note.id}
                              title={note.title}
                              emoji={note.emoji}
                              isToday={isToday}
                              level={2}
                              isSelected={
                                selection.type === 'note' &&
                                selection.itemId === note.id &&
                                selection.context === 'dailyNotes'
                              }
                              hasOpenContextMenu={openContextMenuId === note.id}
                              hasContent={note.hasContent}
                              dailyNoteDate={note.dailyNoteDate}
                              onClick={(e) => onDailyNoteClick(note.id, e)}
                              actions={
                                getNoteActions ? getNoteActions(note.id) : []
                              }
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
                              onClearAllReorderIndicators={
                                handleClearAllReorderIndicators
                              }
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
      </SidebarSection>
    </div>
  );
};
