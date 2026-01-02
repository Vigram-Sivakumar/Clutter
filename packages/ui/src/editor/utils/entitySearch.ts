/**
 * Entity Search - Search for notes and folders to link
 * Used by @ mention menu to suggest notes/folders
 */

import { type Note, type Folder } from '@clutter/shared';

export interface EntitySuggestion {
  type: 'note' | 'folder';
  id: string;
  title: string;
  emoji: string | null;
  isDailyNote?: boolean;
}

export interface EntitySearchResult {
  matches: EntitySuggestion[];
  showCreateNote: boolean;
  showCreateFolder: boolean;
}

/**
 * Search notes and folders based on query
 * Returns top matches + create options
 */
export function searchEntities(
  query: string,
  allNotes: Note[],
  allFolders: Folder[],
  maxResults: number = 6
): EntitySearchResult {
  if (!query || query.trim() === '') {
    // No query - don't show any suggestions
    return {
      matches: [],
      showCreateNote: false,
      showCreateFolder: false,
    };
  }

  const normalizedQuery = query.toLowerCase().trim();
  const matches: EntitySuggestion[] = [];

  // Search notes (including daily notes)
  const noteMatches = allNotes
    .filter(note => {
      if (note.deletedAt) return false;
      return (
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.description.toLowerCase().includes(normalizedQuery) ||
        note.tags.some((tag: string) => tag.toLowerCase().includes(normalizedQuery))
      );
    })
    .map(note => ({
      type: 'note' as const,
      id: note.id,
      title: note.title,
      emoji: note.emoji,
      isDailyNote: !!note.dailyNoteDate,
    }));

  // Search folders
  const folderMatches = allFolders
    .filter(folder => {
      return (
        folder.name.toLowerCase().includes(normalizedQuery) ||
        folder.description.toLowerCase().includes(normalizedQuery) ||
        folder.tags.some((tag: string) => tag.toLowerCase().includes(normalizedQuery))
      );
    })
    .map(folder => ({
      type: 'folder' as const,
      id: folder.id,
      title: folder.name,
      emoji: folder.emoji,
    }));

  // Combine and limit results
  matches.push(...noteMatches.slice(0, maxResults));
  const remainingSlots = maxResults - matches.length;
  if (remainingSlots > 0) {
    matches.push(...folderMatches.slice(0, remainingSlots));
  }

  // Check if we should show create options
  // Show if query has content and no exact match exists
  const hasExactNoteMatch = noteMatches.some(
    n => n.title.toLowerCase() === normalizedQuery
  );
  const hasExactFolderMatch = folderMatches.some(
    f => f.title.toLowerCase() === normalizedQuery
  );

  return {
    matches,
    showCreateNote: !hasExactNoteMatch,
    showCreateFolder: !hasExactFolderMatch,
  };
}

