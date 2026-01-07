import { useMemo } from 'react';
import { CLUTTERED_FOLDER_ID, DAILY_NOTES_FOLDER_ID } from '@clutter/domain';
import { useFoldersStore } from '@clutter/state';
import { Note } from '@clutter/domain';
import { SECTIONS } from '../../../../config/sidebarConfig';

/**
 * Breadcrumb configuration for different view types
 * Centralizes all breadcrumb logic in one place for easy maintenance
 */

type MainView =
  | { type: 'editor'; source?: 'deletedItems' | 'default' }
  | { type: 'tagFilter'; tag: string; source: 'all' | 'favorites' }
  | {
      type: 'folderView';
      folderId: string;
      source?: 'deletedItems' | 'default';
    }
  | { type: 'allFoldersView' }
  | { type: 'favouritesView' }
  | { type: 'allTagsView' }
  | { type: 'favouriteTagsView' }
  | { type: 'todayTasksView' }
  | { type: 'overdueTasksView' }
  | { type: 'upcomingTasksView' }
  | { type: 'unplannedTasksView' }
  | { type: 'completedTasksView' }
  | { type: 'deletedItemsView' }
  | { type: 'dailyNotesYearView'; year: string }
  | { type: 'dailyNotesMonthView'; year: string; month: string };

interface BreadcrumbPath {
  /** Array of folder/section names in the path */
  path: string[];
  /** The title of the current page (optional, e.g., note title) */
  currentPageTitle?: string;
}

/**
 * Hook to generate breadcrumb paths based on the current view and context
 *
 * @param mainView - The current main view type and context
 * @param currentNote - The currently open note (if in editor mode)
 * @returns BreadcrumbPath object with path array and optional current page title
 */
export const useBreadcrumbs = (
  mainView: MainView,
  currentNote?: Note | null
): BreadcrumbPath => {
  const { getFolderPath } = useFoldersStore();

  return useMemo(() => {
    switch (mainView.type) {
      case 'editor': {
        // Editor mode: viewing/editing a note
        if (!currentNote) {
          // No note selected - shouldn't normally happen, but handle gracefully
          return { path: [] };
        }

        // Check if viewing a deleted note
        if (mainView.source === 'deletedItems') {
          return {
            path: ['Recently deleted'],
            currentPageTitle: currentNote.title || 'Untitled',
          };
        }

        // Note is a daily note
        if (
          currentNote.folderId === DAILY_NOTES_FOLDER_ID &&
          currentNote.dailyNoteDate
        ) {
          // Extract year and month from the daily note date
          const date = new Date(currentNote.dailyNoteDate + 'T00:00:00');
          const year = date.getFullYear().toString();
          const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
          const month = monthNames[date.getMonth()];

          return {
            path: ['Daily notes', year, month],
            currentPageTitle: currentNote.title || 'Untitled',
          };
        }

        // Note is in Cluttered (no folder)
        if (!currentNote.folderId) {
          return {
            path: ['Folders', 'Cluttered'],
            currentPageTitle: currentNote.title || 'Untitled',
          };
        }

        // Note is in a specific folder
        const folderHierarchy = getFolderPath(currentNote.folderId);
        return {
          path: ['Folders', ...folderHierarchy],
          currentPageTitle: currentNote.title || 'Untitled',
        };
      }

      case 'tagFilter': {
        // Tag filter view: showing notes with a specific tag
        const rootSection =
          mainView.source === 'favorites' ? 'Favourites' : 'All tags';
        return {
          path: [rootSection, mainView.tag],
        };
      }

      case 'folderView': {
        // Folder view: showing contents of a specific folder

        // Check if viewing a deleted folder
        if (mainView.source === 'deletedItems') {
          // Get folder name for the breadcrumb
          const folders = useFoldersStore.getState().folders;
          const folder = folders.find((f) => f.id === mainView.folderId);
          return {
            path: ['Recently deleted'],
            currentPageTitle: folder?.name || 'Untitled Folder',
          };
        }

        if (mainView.folderId === CLUTTERED_FOLDER_ID) {
          // Special case: Cluttered folder
          return {
            path: ['Folders', 'Cluttered'],
          };
        }

        // Regular folder
        const folderHierarchy = getFolderPath(mainView.folderId);
        return {
          path: ['Folders', ...folderHierarchy],
        };
      }

      case 'allFoldersView': {
        // All folders view - just show 'Folders' since this IS the folders root
        return {
          path: ['Folders'],
        };
      }

      case 'favouritesView': {
        // Favourites view - show all favourite notes and folders
        return {
          path: ['Favourites'],
        };
      }

      case 'allTagsView': {
        // All tags view - show all tags
        return {
          path: ['All tags'],
        };
      }

      case 'favouriteTagsView': {
        // Favourite tags view - show all favourite tags
        return {
          path: ['Favourites'],
        };
      }

      case 'todayTasksView': {
        // Today tasks view
        return {
          path: SECTIONS.today.breadcrumbPath,
        };
      }

      case 'overdueTasksView': {
        // Overdue tasks view
        return {
          path: SECTIONS.overdue.breadcrumbPath,
        };
      }

      case 'upcomingTasksView': {
        // Upcoming tasks view
        return {
          path: SECTIONS.upcoming.breadcrumbPath,
        };
      }

      case 'unplannedTasksView': {
        // Someday tasks view
        return {
          path: SECTIONS.inbox.breadcrumbPath,
        };
      }

      case 'completedTasksView': {
        // Completed tasks view
        return {
          path: SECTIONS.completed.breadcrumbPath,
        };
      }

      case 'deletedItemsView': {
        // Deleted items view - show trash
        return {
          path: ['Recently deleted'],
        };
      }

      case 'dailyNotesYearView': {
        // Daily notes year view - show all months in a year
        return {
          path: ['Daily notes', mainView.year],
        };
      }

      case 'dailyNotesMonthView': {
        // Daily notes month view - show all notes in a month
        return {
          path: ['Daily notes', mainView.year, mainView.month],
        };
      }

      default:
        return { path: [] };
    }
  }, [mainView, currentNote, getFolderPath]);
};

/**
 * Get folder IDs for breadcrumb navigation
 * Used to navigate to specific folders when clicking breadcrumb items
 */
export const useBreadcrumbFolderIds = (
  mainView: MainView,
  currentNote?: Note | null
): string[] => {
  const { getFolderPathWithIds } = useFoldersStore();

  return useMemo(() => {
    if (mainView.type === 'editor' && currentNote?.folderId) {
      // Editor mode with a note in a folder
      return getFolderPathWithIds(currentNote.folderId).map((f) => f.id);
    }

    if (
      mainView.type === 'folderView' &&
      mainView.folderId !== CLUTTERED_FOLDER_ID
    ) {
      // Folder view (not cluttered)
      return getFolderPathWithIds(mainView.folderId).map((f) => f.id);
    }

    // No folder IDs for other cases
    return [];
  }, [mainView, currentNote, getFolderPathWithIds]);
};
