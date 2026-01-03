import { useMemo, useState } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useNotesStore, useCurrentDateStore, DAILY_NOTES_FOLDER_ID } from '@clutter/shared';
import { PageSkeleton } from '../../shared/page-skeleton';
import { PageTitleSection } from '../../shared/content-header';
import { SectionTitle } from '../../shared/section-title';
import { NotesListView } from '../../shared/notes-list';
import { TruncatedSection } from '../../shared/truncated-section';
import { CalendarBlank } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import { spacing } from '../../../../tokens/spacing';
import { isContentEmpty } from '../../../../utils/noteHelpers';
import {
  groupDailyNotesByYearMonth,
  getSortedMonths,
  getMonthNoteCount,
} from '../../../../utils/dailyNotesGrouping';

interface DailyNotesYearViewProps {
  year: string;
  onMonthClick: (year: string, month: string) => void;
  onNoteClick: (noteId: string) => void;
  onTagClick?: (tag: string, source?: 'all' | 'favorites') => void;
}

// Helper function to count tasks in note content
const countTasksInNote = (content: string): number => {
  if (!content) return 0;
  try {
    const parsed = JSON.parse(content);
    let taskCount = 0;
    
    const countTasks = (node: any) => {
      if (node.type === 'listBlock' && node.attrs?.listType === 'task') {
        taskCount++;
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(countTasks);
      }
    };
    
    countTasks(parsed);
    return taskCount;
  } catch {
    return 0;
  }
};

export const DailyNotesYearView = ({
  year,
  onMonthClick,
  onNoteClick,
  onTagClick,
}: DailyNotesYearViewProps) => {
  const { colors } = useTheme();
  const notes = useNotesStore((state) => state.notes);
  const updateNote = useNotesStore((state) => state.updateNote);
  const currentDate = useCurrentDateStore();
  const currentYear = currentDate.year.toString();
  const currentMonthName = currentDate.monthName;
  const currentDateString = currentDate.dateString;
  
  // Filter daily notes for this year
  const dailyNotes = useMemo(() => {
    return notes.filter(
      (note) =>
        !note.deletedAt &&
        note.folderId === DAILY_NOTES_FOLDER_ID &&
        note.dailyNoteDate &&
        note.dailyNoteDate.startsWith(year)
    );
  }, [notes, year]);
  
  // Group notes by month
  const groupedNotes = useMemo(() => {
    return groupDailyNotesByYearMonth(dailyNotes);
  }, [dailyNotes]);
  
  // Get sorted months for this year
  const months = useMemo(() => {
    return getSortedMonths(groupedNotes, year);
  }, [groupedNotes, year]);
  
  // Build sections array - one section per month
  const sections = useMemo(() => {
    const isCurrentYear = year === currentYear;
    
    return months.map((month) => {
      const monthNotes = groupedNotes[year][month];
      const monthCount = getMonthNoteCount(groupedNotes, year, month);
      const isCurrentMonth = isCurrentYear && month === currentMonthName;
      
      return {
        id: `month-${month}`,
        title: '', // No title - using custom SectionTitle component
        show: true,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['4'] }}>
            {/* Month Header - Clickable */}
            <SectionTitle
              collapsible={false}
              titleColor={isCurrentMonth ? colors.semantic.calendarAccent : undefined}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flex: 1,
                  cursor: 'pointer',
                }}
                onClick={() => onMonthClick(year, month)}
              >
                <span>{month}</span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: spacing['2'],
                  fontSize: '12px',
                  color: colors.text.tertiary,
                }}>
                  <CalendarBlank size={12} />
                  <span>{monthCount}</span>
                </div>
              </div>
            </SectionTitle>
            
            {/* Month Notes - Preview with "View all" link */}
            <TruncatedSection
              items={monthNotes}
              limit={3}
              totalCount={monthCount}
              itemLabel="notes"
              onViewAll={() => onMonthClick(year, month)}
              renderItems={(truncatedNotes) => (
                <NotesListView
                  notes={truncatedNotes.map(note => ({
                    id: note.id,
                    title: note.title,
                    emoji: note.emoji,
                    tags: note.tags,
                    taskCount: countTasksInNote(note.content),
                    dailyNoteDate: note.dailyNoteDate,
                    hasContent: !isContentEmpty(note.content),
                    isToday: note.dailyNoteDate === currentDateString,
                  }))}
                  selectedNoteId={null}
                  onNoteClick={onNoteClick}
                  onTagClick={onTagClick}
                  onRemoveTag={(noteId, tagToRemove) => {
                    const note = notes.find(n => n.id === noteId);
                    if (note) {
                      const newTags = note.tags.filter(t => t !== tagToRemove);
                      updateNote(noteId, { tags: newTags });
                    }
                  }}
                  onUpdateEmoji={(noteId, emoji) => updateNote(noteId, { emoji })}
                />
              )}
            />
          </div>
        ),
      };
    });
  }, [months, groupedNotes, year, currentYear, currentMonthName, currentDateString, colors, onMonthClick, onNoteClick, onTagClick, notes, updateNote]);
  
  return (
    <PageSkeleton
      header={
        <PageTitleSection
          variant="folder"
          folderName={year}
          staticDescription={`All daily notes from ${year}`}
          staticIcon={<CalendarBlank size={sizing.icon.lg} />}
          backgroundColor={colors.background.default}
        />
      }
      content={{
        sections,
        emptyState: `No daily notes in ${year}`,
      }}
    />
  );
};

