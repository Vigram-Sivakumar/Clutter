import { useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { CLUTTERED_FOLDER_ID, DAILY_NOTES_FOLDER_ID } from '@clutter/domain';
import { useNotesStore, useFoldersStore } from '@clutter/state';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { FolderGrid } from '../folder';

interface AllFoldersListViewProps {
  onFolderClick: (folderId: string) => void;
  onNoteClick: (noteId: string) => void;
  onCreateNote: (folderId: string) => void;
  onCreateFolder: () => void;
}

export const AllFoldersListView = ({ 
  onFolderClick,
  onNoteClick,
  onCreateNote,
  onCreateFolder,
}: AllFoldersListViewProps) => {
  const { colors } = useTheme();
  const notes = useNotesStore((state) => state.notes);
  const currentNoteId = useNotesStore((state) => state.currentNoteId);
  const { folders } = useFoldersStore();
  
  // Action controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  
  // Helper to check if a note is empty
  const isNoteEmpty = useCallback((note: any): boolean => {
    if (note.title?.trim()) return false;
    if (note.description?.trim()) return false;
    if (note.tags?.length > 0) return false;
    if (note.emoji) return false;
    if (note.isFavorite) return false;
    
    // Check if content is not empty
    if (note.content && note.content.trim() && note.content !== '""' && note.content !== '{}') {
      try {
        const parsed = JSON.parse(note.content);
        if (parsed.type === 'doc' && parsed.content && parsed.content.length > 0) {
          return false;
        }
      } catch {
        if (note.content.trim()) return false;
      }
    }
    
    return true;
  }, []);

  // Get all root-level folders (no parent) + Cluttered
  const allFolders = useMemo(() => {
    const activeFolderIds = new Set(folders.filter(f => !f.deletedAt).map(f => f.id));
    
    // Cluttered notes count (all notes, including empty ones)
    const clutteredNotes = notes.filter((note) => 
      !note.deletedAt && 
      (!note.folderId || !activeFolderIds.has(note.folderId))
    );
    
    // Root-level folders (excluding system folders: Daily Notes)
    const rootFolders = folders
      .filter((f) => 
        !f.deletedAt && 
        !f.parentId && 
        f.id !== DAILY_NOTES_FOLDER_ID // Exclude Daily Notes system folder
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // Build folder list with Cluttered first
    const folderList = [
      {
        id: CLUTTERED_FOLDER_ID, // Use proper constant to match icon system
        name: 'Cluttered',
        emoji: undefined, // No emoji - uses Tray icon via getFolderIcon
        noteCount: clutteredNotes.length,
        folderCount: 0, // Cluttered is a virtual view - it contains NO folders, only notes
        previewNotes: clutteredNotes.slice(0, 3).map(note => ({
          id: note.id,
          title: note.title || 'Untitled',
          emoji: note.emoji,
          contentSnippet: note.description || '',
        })),
      },
      ...rootFolders.map(folder => {
        const folderNotes = notes.filter(note => 
          note.folderId === folder.id && 
          !note.deletedAt
        );
        const subfolderCount = folders.filter(f => 
          !f.deletedAt && f.parentId === folder.id
        ).length;
        
        return {
          id: folder.id,
          name: folder.name || 'Untitled Folder',
          emoji: folder.emoji,
          noteCount: folderNotes.length,
          folderCount: subfolderCount,
          previewNotes: folderNotes.slice(0, 3).map(note => ({
            id: note.id,
            title: note.title || 'Untitled',
            emoji: note.emoji,
            contentSnippet: note.description || '',
          })),
        };
      }),
    ];
    
    return folderList;
  }, [folders, notes, currentNoteId, isNoteEmpty]);

  return (
    <>
        {/* Page Title Section */}
        <PageTitleSection
          variant="folder"
          folderName="Folders"
          staticDescription="All your folders organized in one place"
          backgroundColor={colors.background.default}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search folders..."
          onSort={() => setSortActive(!sortActive)}
          sortActive={sortActive}
          onFilter={() => setFilterActive(!filterActive)}
          filterActive={filterActive}
          onNewNote={() => onCreateNote('cluttered')}
          onNewFolder={onCreateFolder}
        />

        {/* Page Content */}
        <ListViewLayout
          sections={[
            {
              id: 'folders',
              title: '', // No title for single-section view
              show: allFolders.length > 0,
              content: (
                <FolderGrid
                  folders={allFolders}
                  onClick={onFolderClick}
                  onNoteClick={onNoteClick}
                  onCreateNote={onCreateNote}
                />
              ),
            },
          ]}
          emptyState="No folders yet"
        />
    </>
  );
};

