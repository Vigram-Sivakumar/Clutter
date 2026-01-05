import { useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useNotesStore, useFoldersStore, useTagsStore } from '@clutter/state';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { NotesListView } from '../../shared/notes-list';
import { TagsListView } from '../../shared/tags-list';
import { FolderGrid } from '../folder';
import { Trash2, RotateCcw } from '../../../../icons';
import { TertiaryButton } from '../../../ui-buttons';
import { sizing } from '../../../../tokens/sizing';
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
  
  // Tags
  const tagMetadata = useTagsStore((state) => state.tagMetadata);
  const restoreTag = useTagsStore((state) => state.restoreTag);
  const permanentlyDeleteTag = useTagsStore((state) => state.permanentlyDeleteTag);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  
  // Section collapse state
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);

  // Get deleted items (depend on actual data, not function reference)
  const deletedNotes = useMemo(() => {
    return notes.filter(n => n.deletedAt);
  }, [notes]);
  
  const deletedFolders = useMemo(() => {
    return folders.filter(f => f.deletedAt);
  }, [folders]);
  
  const deletedTags = useMemo(() => {
    const tags = Object.values(tagMetadata).filter(tag => tag.deletedAt !== null);
    console.log('🏷️ [DEBUG] DeletedItemsListView - deletedTags computed:', {
      count: tags.length,
      tags: tags.map(t => ({ name: t.name, deletedAt: t.deletedAt })),
    });
    return tags;
  }, [tagMetadata]);

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
  // ✅ Only show notes that DON'T belong to a deleted folder
  // (Notes in deleted folders are shown inside the folder card)
  const noteListItems = useMemo(() => 
    deletedNotes
      .filter(note => {
        // Hide notes that belong to a deleted folder
        const folder = folders.find(f => f.id === note.folderId);
        return !folder?.deletedAt;
      })
      .map(note => {
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
      // ✅ Show DELETED notes that belong to this folder
      const notesInFolder = notes.filter(n => 
        n.deletedAt && n.folderId === folder.id
      );
      const subfoldersInFolder = folders.filter(f => 
        f.deletedAt && f.parentId === folder.id
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
        subtitle: notesInFolder.length > 0 
          ? `${notesInFolder.length} ${notesInFolder.length === 1 ? 'note' : 'notes'} deleted with folder`
          : getFolderLocation(folder),
      };
    }),
    [deletedFolders, notes, folders, getFolderLocation]
  );

  // Transform deleted tags for TagsListView
  const tagListItems = useMemo(() => {
    const items = deletedTags.map(tag => {
      // Count notes and folders that still have this tag (they keep tags even when tag is deleted)
      const noteCount = notes.filter(n => 
        !n.deletedAt && n.tags.some(t => t.toLowerCase() === tag.name.toLowerCase())
      ).length;
      
      const folderCount = folders.filter(f => 
        !f.deletedAt && f.tags?.some(t => t.toLowerCase() === tag.name.toLowerCase())
      ).length;
      
      return {
        id: tag.name,
        tag: tag.name,
        noteCount,
        folderCount,
      };
    });
    
    console.log('🏷️ [DEBUG] tagListItems computed:', {
      count: items.length,
      items,
    });
    
    return items;
  }, [deletedTags, notes, folders]);

  const handleRestoreNote = useCallback((noteId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    restoreNote(noteId);
  }, [restoreNote]);

  const handlePermanentlyDeleteNote = useCallback(async (noteId: string, event?: React.MouseEvent) => {
    console.log('🔴 handlePermanentlyDeleteNote called for:', noteId);
    event?.stopPropagation();
    
    try {
      console.log('🔴 Showing confirmation dialog for note...');
      // Use Tauri dialog.confirm for proper UX
      const { confirm } = await import('@tauri-apps/api/dialog');
      const confirmed = await confirm(
        'Permanently delete this note? This cannot be undone.',
        { title: 'Permanent Delete', type: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' }
      );
      
      console.log(`🔴 User ${confirmed ? 'CONFIRMED' : 'CANCELLED'} note deletion`);
      if (confirmed) {
        console.log('🔴 Calling permanentlyDeleteNote:', noteId);
        await permanentlyDeleteNote(noteId);
      }
    } catch (error) {
      console.error('❌ Error showing confirmation dialog:', error);
    }
  }, [permanentlyDeleteNote]);

  const handleRestoreFolder = useCallback((folderId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    restoreFolder(folderId);
  }, [restoreFolder]);

  const handlePermanentlyDeleteFolder = useCallback(async (folderId: string, event?: React.MouseEvent) => {
    console.log('🟠 handlePermanentlyDeleteFolder called for:', folderId);
    event?.stopPropagation();
    
    try {
      console.log('🟠 Showing confirmation dialog for folder...');
      // Use Tauri dialog.confirm for proper UX
      const { confirm } = await import('@tauri-apps/api/dialog');
      const confirmed = await confirm(
        'Permanently delete this folder? This cannot be undone.',
        { title: 'Permanent Delete', type: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' }
      );
      
      console.log(`🟠 User ${confirmed ? 'CONFIRMED' : 'CANCELLED'} folder deletion`);
      if (confirmed) {
        console.log('🟠 Calling permanentlyDeleteFolder:', folderId);
        await permanentlyDeleteFolder(folderId);
      }
    } catch (error) {
      console.error('❌ Error showing confirmation dialog:', error);
    }
  }, [permanentlyDeleteFolder]);

  const handleRestoreTag = useCallback((tagName: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    restoreTag(tagName);
  }, [restoreTag]);

  const handlePermanentlyDeleteTag = useCallback(async (tagName: string, event?: React.MouseEvent) => {
    console.log('🏷️ handlePermanentlyDeleteTag called for:', tagName);
    event?.stopPropagation();
    
    try {
      console.log('🏷️ Showing confirmation dialog for tag...');
      // Use Tauri dialog.confirm for proper UX
      const { confirm } = await import('@tauri-apps/api/dialog');
      const confirmed = await confirm(
        'Permanently delete this tag? This cannot be undone.',
        { title: 'Permanent Delete', type: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' }
      );
      
      console.log(`🏷️ User ${confirmed ? 'CONFIRMED' : 'CANCELLED'} tag deletion`);
      if (confirmed) {
        console.log('🏷️ Calling permanentlyDeleteTag:', tagName);
        permanentlyDeleteTag(tagName);
      }
    } catch (error) {
      console.error('❌ Error showing confirmation dialog:', error);
    }
  }, [permanentlyDeleteTag]);

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

  // Get context menu actions for tags
  const getTagActions = useCallback((tagName: string) => [
    <TertiaryButton
      key="restore"
      icon={<RotateCcw size={16} />}
      onClick={(e) => handleRestoreTag(tagName, e)}
      size="xs"
      
    />,
    <TertiaryButton
      key="delete-forever"
      icon={<Trash2 size={16} />}
      onClick={(e) => handlePermanentlyDeleteTag(tagName, e)}
      size="xs"
      
    />,
  ], [handleRestoreTag, handlePermanentlyDeleteTag]);

  // Debug: Log what sections should be visible
  console.log('🏷️ [DEBUG] DeletedItemsListView render:', {
    deletedNotesCount: deletedNotes.length,
    deletedFoldersCount: deletedFolders.length,
    deletedTagsCount: deletedTags.length,
    tagListItemsCount: tagListItems.length,
    shouldShowTagsSection: deletedTags.length > 0,
  });

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
        <ListViewLayout
          sections={[
            {
              id: 'folders',
              title: 'Folders',
              show: deletedFolders.length > 0,
              collapsible: true,
              isCollapsed: foldersCollapsed,
              onToggle: () => setFoldersCollapsed(!foldersCollapsed),
              content: (
                <FolderGrid
                  folders={folderGridItems}
                  onClick={onFolderClick}
                  onCreateNote={() => {}} // Disabled in trash
                />
              ),
            },
            {
              id: 'notes',
              title: 'Notes',
              show: deletedNotes.length > 0,
              collapsible: true,
              isCollapsed: notesCollapsed,
              onToggle: () => setNotesCollapsed(!notesCollapsed),
              content: (
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
                  emptyState="No deleted notes"
                />
              ),
            },
            {
              id: 'tags',
              title: 'Tags',
              show: deletedTags.length > 0,
              collapsible: true,
              isCollapsed: tagsCollapsed,
              onToggle: () => setTagsCollapsed(!tagsCollapsed),
              content: (
                <TagsListView
                  tags={tagListItems}
                  onTagClick={onTagClick || (() => {})}
                  getTagActions={getTagActions}
                  emptyState="No deleted tags"
                />
              ),
            },
          ]}
          emptyState="Trash is empty"
        />
    </>
  );
};

