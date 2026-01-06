import { useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useNotesStore, useFoldersStore } from '@clutter/state';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { NotesListView } from '../../shared/notes-list/NotesListView';
import { FolderGrid } from '../folder';
import { isContentEmpty } from '../../../../utils/noteHelpers';
import { SECTIONS, renderIcon } from '../../../../config/sidebarConfig';
import { sizing } from '../../../../tokens/sizing';

interface FavouritesListViewProps {
  onNoteClick: (_noteId: string) => void;
  onCreateNote: () => void;
  onCreateFolder?: () => void;
  onFolderClick?: (_folderId: string) => void;
  onTagClick?: (_tag: string) => void;
}

export const FavouritesListView = ({
  onNoteClick,
  onCreateNote,
  onCreateFolder,
  onFolderClick,
  onTagClick,
}: FavouritesListViewProps) => {
  useTheme();
  const notes = useNotesStore((state) => state.notes);
  const updateNote = useNotesStore((state) => state.updateNote);
  const createNote = useNotesStore((state) => state.createNote);
  const currentNoteId = useNotesStore((state) => state.currentNoteId);
  const { folders } = useFoldersStore();

  // Action controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  // Section collapse state
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  // Helper to check if a note is empty
  const isNoteEmpty = useCallback((note: any): boolean => {
    if (note.title?.trim()) return false;
    if (note.description?.trim()) return false;
    if (note.tags?.length > 0) return false;
    if (note.emoji) return false;
    if (note.isFavorite) return false;

    // Check if content is not empty
    if (
      note.content &&
      note.content.trim() &&
      note.content !== '""' &&
      note.content !== '{}'
    ) {
      try {
        const parsed = JSON.parse(note.content);
        if (
          parsed.type === 'doc' &&
          parsed.content &&
          parsed.content.length > 0
        ) {
          return false;
        }
      } catch {
        if (note.content.trim()) return false;
      }
    }

    return true;
  }, []);

  // Helper to count tasks in note content
  const countTasksInNote = useCallback((content: string): number => {
    if (!content) return 0;
    try {
      const parsed = JSON.parse(content);
      let taskCount = 0;

      const countTasks = (node: any) => {
        // Tasks are listBlock nodes with listType: 'task'
        if (node.type === 'listBlock' && node.attrs?.listType === 'task') {
          taskCount++;
        }
        // Recursively traverse all child nodes
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach(countTasks);
        }
      };

      countTasks(parsed);
      return taskCount;
    } catch {
      return 0;
    }
  }, []);

  // Get all favourite notes (excluding empty notes except current)
  const favouriteNotes = useMemo(() => {
    return notes
      .filter((note) => !note.deletedAt && note.isFavorite)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [notes]);

  // Get all favourite folders
  const favouriteFolders = useMemo(() => {
    return folders
      .filter((folder) => !folder.deletedAt && folder.isFavorite)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [folders]);

  const handleUpdateEmoji = useCallback(
    (noteId: string, emoji: string) => {
      updateNote(noteId, { emoji });
    },
    [updateNote]
  );

  return (
    <>
      {/* Page Title Section */}
      <PageTitleSection
        variant="folder"
        folderName="Favourites"
        staticIcon={renderIcon(
          SECTIONS['favourites-notes'].iconName,
          sizing.icon.pageTitleIcon
        )}
        staticDescription="Quick access to your favorite notes and folders"
        // Action controls
        onNewNote={onCreateNote}
        onNewFolder={onCreateFolder}
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
            id: 'folders',
            title: 'Folders',
            show: favouriteFolders.length > 0,
            collapsible: true,
            isCollapsed: foldersCollapsed,
            onToggle: () => setFoldersCollapsed(!foldersCollapsed),
            content: (
              <FolderGrid
                folders={favouriteFolders.map((folder) => {
                  const folderNotes = notes.filter(
                    (note) => note.folderId === folder.id && !note.deletedAt
                  );
                  // Filter out empty notes for preview display only (except current note)
                  const previewNotes = folderNotes.filter(
                    (note) => note.id === currentNoteId || !isNoteEmpty(note)
                  );
                  const nestedFolderCount = folders.filter(
                    (f) => !f.deletedAt && f.parentId === folder.id
                  ).length;

                  return {
                    id: folder.id,
                    name: folder.name || 'Untitled Folder',
                    emoji: folder.emoji,
                    noteCount: folderNotes.length,
                    folderCount: nestedFolderCount,
                    previewNotes: previewNotes.slice(0, 3).map((note) => ({
                      id: note.id,
                      title: note.title || 'Untitled',
                      emoji: note.emoji,
                      contentSnippet: note.description || '',
                    })),
                  };
                })}
                onClick={onFolderClick || (() => {})}
                onNoteClick={onNoteClick}
                onCreateNote={(folderId) => {
                  // Create a note in the folder
                  const newNote = createNote({ folderId, isFavorite: true });
                  onNoteClick(newNote.id);
                }}
              />
            ),
          },
          {
            id: 'notes',
            title: 'Notes',
            show: favouriteNotes.length > 0,
            collapsible: true,
            isCollapsed: notesCollapsed,
            onToggle: () => setNotesCollapsed(!notesCollapsed),
            content: (
              <NotesListView
                notes={favouriteNotes.map((note) => ({
                  id: note.id,
                  title: note.title,
                  emoji: note.emoji,
                  tags: note.tags,
                  taskCount: countTasksInNote(note.content),
                  dailyNoteDate: note.dailyNoteDate,
                  hasContent: !isContentEmpty(note.content),
                }))}
                selectedNoteId={null}
                onNoteClick={onNoteClick}
                onTagClick={onTagClick}
                onRemoveTag={(noteId, tagToRemove) => {
                  const note = notes.find((n) => n.id === noteId);
                  if (note) {
                    const newTags = note.tags.filter((t) => t !== tagToRemove);
                    updateNote(noteId, { tags: newTags });
                  }
                }}
                onUpdateEmoji={handleUpdateEmoji}
              />
            ),
          },
        ]}
        emptyState="No favourites yet."
      />
    </>
  );
};
