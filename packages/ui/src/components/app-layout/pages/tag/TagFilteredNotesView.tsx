import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useNotesStore, useTagsStore, useFoldersStore } from '@clutter/state';
import { NotesListView } from '../../shared/notes-list';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { FolderGrid } from '../folder';
import { isContentEmpty } from '../../../../utils/noteHelpers';
import { handleTagRenameWithColorPreservation } from '../../../../utils/tagRenameHelpers';

// Helper function to count tasks (checkboxes) in note content
const countTasksInNote = (content: string): number => {
  try {
    const parsed = JSON.parse(content);
    let taskCount = 0;
    
    const traverseNodes = (node: any) => {
      // Tasks are listBlock nodes with listType: 'task'
      if (node.type === 'listBlock' && node.attrs?.listType === 'task') {
        taskCount++;
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverseNodes);
      }
    };
    
    if (parsed.type === 'doc' && parsed.content) {
      parsed.content.forEach(traverseNodes);
    }
    
    return taskCount;
  } catch {
    return 0;
  }
};

interface TagFilteredNotesViewProps {
  tag: string;
  onNoteClick: (_noteId: string) => void;
  onCreateNote: () => void;
  onCreateFolder?: () => void;
  onFolderClick?: (_folderId: string) => void;
  onTagClick?: (_tag: string, _source?: 'all' | 'favorites') => void;
}

export const TagFilteredNotesView = ({ 
  tag, 
  onNoteClick,
  onCreateNote,
  onCreateFolder,
  onFolderClick,
  onTagClick,
}: TagFilteredNotesViewProps) => {
  const { colors } = useTheme();
  const notes = useNotesStore((state) => state.notes);
  const currentNoteId = useNotesStore((state) => state.currentNoteId);
  const createNote = useNotesStore((state) => state.createNote);
  const updateNote = useNotesStore((state) => state.updateNote);
  const folders = useFoldersStore((state) => state.folders);
  const { getTagMetadata, updateTagMetadata, upsertTagMetadata, renameTag } =
    useTagsStore();
  
  // Get tag metadata
  const tagMetadata = getTagMetadata(tag);
  
  // Local state for description
  const [description, setDescription] = useState(
    tagMetadata?.description || ''
  );
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(
    tagMetadata?.descriptionVisible ?? true
  );
  
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

  // Sync description from store
  useEffect(() => {
    if (tagMetadata) {
      setDescription(tagMetadata.description);
      setDescriptionVisible(tagMetadata.descriptionVisible);
      setShowDescriptionInput(!!tagMetadata.description);
    }
    // Note: No auto-creation of metadata to prevent duplicates during rename
  }, [tag, tagMetadata]);

  // Filter folders by tag
  const filteredFolders = useMemo(() => {
    return folders
      .filter(
        (folder) =>
        !folder.deletedAt && 
        folder.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [folders, tag]);

  // Filter notes by tag (excluding empty notes except current)
  const filteredNotes = useMemo(() => {
    return notes
      .filter(
        (note) =>
        !note.deletedAt && 
        note.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [notes, tag]);

  // Description handlers
  const handleDescriptionChange = useCallback(
    (value: string) => {
    setDescription(value);
    updateTagMetadata(tag, { description: value });
    },
    [tag, updateTagMetadata]
  );

  const handleDescriptionBlur = useCallback(() => {
    if (!description.trim()) {
      setShowDescriptionInput(false);
      updateTagMetadata(tag, { description: '' });
    }
  }, [description, tag, updateTagMetadata]);

  const handleShowDescriptionInput = useCallback(() => {
    setShowDescriptionInput(true);
  }, []);

  const handleToggleDescriptionVisibility = useCallback(() => {
    const newValue = !descriptionVisible;
    setDescriptionVisible(newValue);
    updateTagMetadata(tag, { descriptionVisible: newValue });
  }, [descriptionVisible, tag, updateTagMetadata]);

  const handleUpdateEmoji = useCallback(
    (noteId: string, emoji: string) => {
    updateNote(noteId, { emoji });
    },
    [updateNote]
  );
  
  // Tag color change handler
  const handleColorChange = useCallback(
    (tagName: string, color: string) => {
    const existing = getTagMetadata(tagName);
    if (existing) {
      updateTagMetadata(tagName, { color });
    } else {
      // Create metadata with the color for tags that don't have metadata yet
      upsertTagMetadata(tagName, '', true, false, color);
    }
    },
    [updateTagMetadata, upsertTagMetadata, getTagMetadata]
  );
  
  // Tag rename handler
  const handleTagRename = useCallback(
    (oldTag: string, newTag: string) => {
    if (renameTag) {
        // Use shared helper to handle rename with color preservation
        handleTagRenameWithColorPreservation(
          oldTag,
          newTag,
          renameTag,
          getTagMetadata,
          updateTagMetadata
        );
      
      // Use requestAnimationFrame to wait for React to complete all pending renders
      // This ensures Zustand state updates have propagated to all subscribers
      if (onTagClick) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            onTagClick(newTag);
          });
        });
      }
    }
    },
    [renameTag, onTagClick, getTagMetadata, updateTagMetadata]
  );

  return (
    <>
        {/* Page Title Section */}
        <PageTitleSection
          variant="tag"
          tag={tag}
          onTagRename={handleTagRename}
          onColorChange={handleColorChange}
          description={description}
          showDescriptionInput={showDescriptionInput}
          descriptionVisible={descriptionVisible}
          onDescriptionChange={handleDescriptionChange}
          onDescriptionBlur={handleDescriptionBlur}
          onShowDescriptionInput={handleShowDescriptionInput}
          onToggleDescriptionVisibility={handleToggleDescriptionVisibility}
          backgroundColor={colors.background.default}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search in tags..."
          onSort={() => setSortActive(!sortActive)}
          sortActive={sortActive}
          onFilter={() => setFilterActive(!filterActive)}
          filterActive={filterActive}
          onNewNote={onCreateNote}
          onNewFolder={onCreateFolder}
        />

        {/* Page Content */}
        <ListViewLayout
          sections={[
            {
              id: 'folders',
              title: 'Folders',
              show: filteredFolders.length > 0,
              collapsible: true,
              isCollapsed: foldersCollapsed,
              onToggle: () => setFoldersCollapsed(!foldersCollapsed),
              content: (
                <FolderGrid
                folders={filteredFolders.map((folder) => {
                  const allFolderNotes = notes.filter(
                    (note) => note.folderId === folder.id && !note.deletedAt
                  );
                    // Filter out empty notes for preview display only (except current note)
                  const previewNotes = allFolderNotes.filter(
                    (note) => note.id === currentNoteId || !isNoteEmpty(note)
                    );
                  const subfolderCount = folders.filter(
                    (f) => !f.deletedAt && f.parentId === folder.id
                    ).length;
                    
                    return {
                      id: folder.id,
                      name: folder.name || 'Untitled Folder',
                      emoji: folder.emoji,
                      noteCount: allFolderNotes.length, // Count ALL notes (including empty)
                      folderCount: subfolderCount,
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
                    // Create a note in the folder with the current tag
                    const newNote = createNote({ folderId, tags: [tag] });
                    onNoteClick(newNote.id);
                  }}
                />
              ),
            },
            {
              id: 'notes',
              title: 'Notes',
              show: filteredNotes.length > 0,
              collapsible: true,
              isCollapsed: notesCollapsed,
              onToggle: () => setNotesCollapsed(!notesCollapsed),
              content: (
                <NotesListView
                notes={filteredNotes.map((note) => ({
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
                  emptyState="No folders or notes with this tag"
                />
              ),
            },
          ]}
          emptyState="No folders or notes with this tag"
        />
    </>
  );
};
