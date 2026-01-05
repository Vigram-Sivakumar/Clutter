import { useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { DAILY_NOTES_FOLDER_ID } from '@clutter/domain';
import { useNotesStore, useCurrentDateStore } from '@clutter/state';
import { PageSkeleton } from '../../shared/page-skeleton';
import { PageTitleSection } from '../../shared/content-header';
import { NotesListView } from '../../shared/notes-list';
import { CalendarBlank } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import { isContentEmpty } from '../../../../utils/noteHelpers';

interface DailyNotesMonthViewProps {
  year: string;
  month: string;
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

// Helper to get month number from name
const getMonthNumber = (monthName: string): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const index = months.indexOf(monthName);
  return index !== -1 ? String(index + 1).padStart(2, '0') : '01';
};

export const DailyNotesMonthView = ({
  year,
  month,
  onNoteClick,
  onTagClick,
}: DailyNotesMonthViewProps) => {
  const { colors } = useTheme();
  const notes = useNotesStore((state) => state.notes);
  const updateNote = useNotesStore((state) => state.updateNote);
  const currentDate = useCurrentDateStore();
  const currentDateString = currentDate.dateString;
  
  // Filter daily notes for this month
  const monthNotes = useMemo(() => {
    const monthNumber = getMonthNumber(month);
    const yearMonth = `${year}-${monthNumber}`;
    
    return notes
      .filter(
        (note) =>
          !note.deletedAt &&
          note.folderId === DAILY_NOTES_FOLDER_ID &&
          note.dailyNoteDate &&
          note.dailyNoteDate.startsWith(yearMonth)
      )
      .sort((a, b) => {
        // Sort chronologically (oldest first)
        const dateA = new Date(a.dailyNoteDate! + 'T00:00:00').getTime();
        const dateB = new Date(b.dailyNoteDate! + 'T00:00:00').getTime();
        return dateA - dateB;
      });
  }, [notes, year, month]);
  
  // Build sections array - single section with all notes
  const sections = useMemo(() => {
    return [
      {
        id: 'notes',
        title: '', // No section title needed for single section
        show: monthNotes.length > 0,
        content: (
          <NotesListView
            notes={monthNotes.map(note => ({
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
        ),
      },
    ];
  }, [monthNotes, currentDateString, onNoteClick, onTagClick, notes, updateNote]);
  
  return (
    <PageSkeleton
      header={
        <PageTitleSection
          variant="folder"
          folderName={`${month} ${year}`}
          staticDescription={`All daily notes from ${month} ${year}`}
          staticIcon={<CalendarBlank size={sizing.icon.lg} />}
          backgroundColor={colors.background.default}
        />
      }
      content={{
        sections,
        emptyState: `No daily notes in ${month} ${year}`,
      }}
    />
  );
};

