import { useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useNotesStore, useFoldersStore } from '@clutter/shared';
import { PageTitleSection } from '../../shared/content-header';
import { PageContent } from '../../shared/page-content/PageContent';
import { NotesListView } from '../../shared/notes-list';
import { FolderGrid } from '../folder';
import { SectionTitle } from '../../shared/section-title';
import { WavyDivider } from '../../shared/wavy-divider';
import { Trash2, RotateCcw } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import { TertiaryButton } from '../../../ui-buttons';
import { spacing } from '../../../../tokens/spacing';
import { isContentEmpty } from '../../../../utils/noteHelpers';

// Helper function to count tasks (copied from FolderListView)
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

interface DeletedItemsListViewProps {
  onNoteClick: (noteId: string) => void;
  onFolderClick: (folderId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const DeletedItemsListView = ({ 
  onNoteClick,
  onFolderClick,
  onTagClick,
}: DeletedItemsListViewProps) => {
  const { colors } = useTheme();
  
  // Notes
  const notes = useNotesStore((state) => state.notes);
  const getDeletedNotes = useNotesStore((state) => state.getDeletedNotes);
  const updateNote = useNotesStore((state) => state.updateNote);
  const restoreNote = useNotesStore((state) => state.restoreNote);
  const permanentlyDeleteNote = useNotesStore((state) => state.permanentlyDeleteNote);
  
  // Folders
  const folders = useFoldersStore((state) => state.folders);
  const getDeletedFolders = useFoldersStore((state) => state.getDeletedFolders);
  const getFolderPath = useFoldersStore((state) => state.getFolderPath);
  const restoreFolder = useFoldersStore((state) => state.restoreFolder);
  const permanentlyDeleteFolder = useFoldersStore((state) => state.permanentlyDeleteFolder);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  
  // Section collapse state
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  // Get deleted items (depend on actual data, not function reference)
  const deletedNotes = useMemo(() => {
    return notes.filter(n => n.deletedAt);
  }, [notes]);
  
  const deletedFolders = useMemo(() => {
    return folders.filter(f => f.deletedAt);
  }, [folders]);

  // Helper to get item location
  const getNoteLocation = useCallback((note: any) => {
    if (!note.folderId) return 'Cluttered';
    
    const folder = folders.find(f => f.id === note.folderId);
    if (!folder) return 'Unknown folder';
    if (folder.deletedAt) return `${folder.name || 'Untitled'} (deleted)`;
    
    const path = getFolderPath(note.folderId);
    return path.join(' › ') || 'Cluttered';
  }, [folders, getFolderPath]);

  const getFolderLocation = useCallback((folder: any) => {
    if (!folder.parentId) return 'Root';
    
    const parent = folders.find(f => f.id === folder.parentId);
    if (!parent) return 'Unknown parent';
    if (parent.deletedAt) return `${parent.name || 'Untitled'} (deleted)`;
    
    const path = getFolderPath(folder.parentId);
    return path.join(' › ') || 'Root';
  }, [folders, getFolderPath]);

  // Transform deleted notes for NotesListView
  const noteListItems = useMemo(() => 
    deletedNotes.map(note => {
      const location = getNoteLocation(note);
      const parentDeleted = note.folderId && folders.find(f => f.id === note.folderId)?.deletedAt;
      
      return {
        id: note.id,
        title: note.title,
        emoji: note.emoji,
        tags: note.tags,
        taskCount: countTasksInNote(note.content),
        dailyNoteDate: note.dailyNoteDate,
        hasContent: !isContentEmpty(note.content),
        subtitle: parentDeleted 
          ? `${location} ⚠️ Will restore to root`
          : location,
      };
    }),
    [deletedNotes, getNoteLocation, folders]
  );

  // Transform deleted folders for FolderGrid
  const folderGridItems = useMemo(() => 
    deletedFolders.map(folder => {
      const notesInFolder = notes.filter(n => 
        !n.deletedAt && n.folderId === folder.id
      );
      const subfoldersInFolder = folders.filter(f => 
        !f.deletedAt && f.parentId === folder.id
      );
      
      return {
        id: folder.id,
        name: folder.name,
        emoji: folder.emoji,
        noteCount: notesInFolder.length,
        folderCount: subfoldersInFolder.length,
        notes: notesInFolder.slice(0, 3).map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          emoji: n.emoji,
        })),
        subtitle: getFolderLocation(folder),
      };
    }),
    [deletedFolders, notes, folders, getFolderLocation]
  );

  const handleRestoreNote = useCallback((noteId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    restoreNote(noteId);
  }, [restoreNote]);

  const handlePermanentlyDeleteNote = useCallback((noteId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (window.confirm('Permanently delete this note? This cannot be undone.')) {
      permanentlyDeleteNote(noteId);
    }
  }, [permanentlyDeleteNote]);

  const handleRestoreFolder = useCallback((folderId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    restoreFolder(folderId);
  }, [restoreFolder]);

  const handlePermanentlyDeleteFolder = useCallback((folderId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (window.confirm('Permanently delete this folder? This cannot be undone.')) {
      permanentlyDeleteFolder(folderId);
    }
  }, [permanentlyDeleteFolder]);

  // Get context menu actions for notes
  const getNoteActions = useCallback((noteId: string) => [
    <TertiaryButton
      key="restore"
      icon={<RotateCcw size={16} />}
      onClick={(e) => handleRestoreNote(noteId, e)}
      size="xs"
      
    />,
    <TertiaryButton
      key="delete-forever"
      icon={<Trash2 size={16} />}
      onClick={(e) => handlePermanentlyDeleteNote(noteId, e)}
      size="xs"
      
    />,
  ], [handleRestoreNote, handlePermanentlyDeleteNote]);

  // Get context menu actions for folders
  const getFolderActions = useCallback((folderId: string) => [
    <TertiaryButton
      key="restore"
      icon={<RotateCcw size={16} />}
      onClick={(e) => handleRestoreFolder(folderId, e)}
      size="xs"
      
    />,
    <TertiaryButton
      key="delete-forever"
      icon={<Trash2 size={16} />}
      onClick={(e) => handlePermanentlyDeleteFolder(folderId, e)}
      size="xs"
      
    />,
  ], [handleRestoreFolder, handlePermanentlyDeleteFolder]);

  return (
    <>
        {/* Page Title Section - Reused! */}
        <PageTitleSection
          variant="folder"
          folderName="Recently deleted"
          staticIcon={<Trash2 size={sizing.icon.lg} />}
          staticDescription="Items in trash will be permanently deleted after 30 days"
          backgroundColor={colors.background.default}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSort={() => setSortActive(!sortActive)}
          sortActive={sortActive}
          onFilter={() => setFilterActive(!filterActive)}
          filterActive={filterActive}
        />

        {/* Content Section - Reused! */}
        <PageContent>
          {deletedNotes.length === 0 && deletedFolders.length === 0 ? (
            // Empty State
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: colors.text.tertiary,
              fontSize: '14px',
            }}>
              <span>Trash is empty</span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing['3xl'], // 32px between sections
            }}>
              {/* Deleted Folders Section - Reuses FolderGrid! */}
              {deletedFolders.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['12'] }}>
                  <SectionTitle 
                    collapsible 
                    isCollapsed={foldersCollapsed} 
                    onToggle={() => setFoldersCollapsed(!foldersCollapsed)}
                  >
                    Folders
                  </SectionTitle>
                  {!foldersCollapsed && (
                  <FolderGrid
                    folders={folderGridItems}
                    onClick={onFolderClick}
                    onCreateNote={() => {}} // Disabled in trash
                  />
                  )}
                </div>
              )}

              {/* Wavy Divider */}
              {deletedFolders.length > 0 && deletedNotes.length > 0 && <WavyDivider />}

              {/* Deleted Notes Section - Reuses NotesListView! */}
              {deletedNotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['12'] }}>
                  <SectionTitle 
                    collapsible 
                    isCollapsed={notesCollapsed} 
                    onToggle={() => setNotesCollapsed(!notesCollapsed)}
                  >
                    Notes
                  </SectionTitle>
                  {!notesCollapsed && (
                <NotesListView
                  
                  notes={noteListItems}
                  onNoteClick={onNoteClick}
                  onTagClick={onTagClick}
                      onRemoveTag={(noteId, tagToRemove) => {
                        const note = notes.find(n => n.id === noteId);
                        if (note) {
                          const newTags = note.tags.filter(t => t !== tagToRemove);
                          updateNote(noteId, { tags: newTags });
                        }
                      }}
                  emptyState={<span>No deleted notes</span>}
                />
                  )}
                </div>
              )}
            </div>
          )}
        </PageContent>
    </>
  );
};

