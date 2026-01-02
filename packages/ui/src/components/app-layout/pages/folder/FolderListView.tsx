import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useNotesStore, useFoldersStore } from '@clutter/shared';
import { NotesListView } from '../../shared/notes-list';
import { PageTitleSection } from '../../shared/content-header';
import { PageContent } from '../../shared/page-content/PageContent';
import { FolderGrid } from '../folder';
import { EmojiTray } from '../../shared/emoji';
import { SectionTitle } from '../../shared/section-title';
import { WavyDivider } from '../../shared/wavy-divider';
import { spacing } from '../../../../tokens/spacing';
import { isContentEmpty } from '../../../../utils/noteHelpers';

// Helper function to count tasks (checkboxes) in note content
const countTasksInNote = (content: string): number => {
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
};

interface FolderListViewProps {
  folderId: string;
  onNoteClick: (noteId: string) => void;
  onCreateNote: () => void;
  onCreateFolder?: () => void;
  onFolderClick?: (folderId: string) => void;
  onTagClick?: (tag: string, source?: 'all' | 'favorites') => void;
}

export const FolderListView = ({ 
  folderId, 
  onNoteClick,
  onCreateNote,
  onCreateFolder,
  onFolderClick,
  onTagClick,
}: FolderListViewProps) => {
  const { colors } = useTheme();
  const notes = useNotesStore((state) => state.notes);
  const currentNoteId = useNotesStore((state) => state.currentNoteId);
  const createNote = useNotesStore((state) => state.createNote);
  const updateNote = useNotesStore((state) => state.updateNote);
  const { folders, updateFolder } = useFoldersStore();
  
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
  
  // Check if this is the special "Cluttered" view
  const isClutteredFolder = folderId === 'cluttered';
  
  // Get folder (cluttered is virtual, so returns undefined)
  const folder = useMemo(() => {
    if (isClutteredFolder) return undefined;
    return folders.find(f => f.id === folderId && !f.deletedAt);
  }, [folders, folderId, isClutteredFolder]);
  
  // Local state for description (not used for Cluttered)
  const [description, setDescription] = useState(folder?.description || '');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(folder?.descriptionVisible ?? true);
  
  // Local state for tags (not used for Cluttered)
  const [tags, setTags] = useState<string[]>(folder?.tags || []);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagsVisible, setTagsVisible] = useState(folder?.tagsVisible ?? true);
  
  // Local state for emoji (not used for Cluttered)
  const [isEmojiTrayOpen, setIsEmojiTrayOpen] = useState(false);
  const [emojiTrayPosition, setEmojiTrayPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const addEmojiButtonRef = useRef<HTMLButtonElement>(null);
  
  // Action controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  
  // Section collapse state
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  // Sync local state with folder
  useEffect(() => {
    if (folder) {
      setDescription(folder.description || '');
      setDescriptionVisible(folder.descriptionVisible ?? true);
      setTags(folder.tags || []);
      setTagsVisible(folder.tagsVisible ?? true);
      setShowDescriptionInput(!!folder.description);
      setShowTagInput(false);
    }
  }, [folder]);

  // Filter subfolders - show folders where parent matches this folder
  // This naturally handles Cluttered: since 'cluttered' is not a real folder ID,
  // no folder has parentId === 'cluttered', so it returns empty array automatically
  const subfolders = useMemo(() => {
    return folders
      .filter((f) => 
        !f.deletedAt && 
        f.parentId === folderId
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [folders, folderId]);

  // Filter notes in this folder
  const folderNotes = useMemo(() => {
    let filteredNotes;
    
    if (isClutteredFolder) {
      // For Cluttered folder, show notes without a folder (or with invalid folder reference)
      const activeFolderIds = new Set(folders.filter(f => !f.deletedAt).map(f => f.id));
      filteredNotes = notes.filter((note) => 
        !note.deletedAt && 
        (!note.folderId || !activeFolderIds.has(note.folderId))
      );
    } else {
      filteredNotes = notes.filter((note) => 
        !note.deletedAt && 
        note.folderId === folderId
      );
    }
    
    // Sort by most recently updated
    return filteredNotes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [notes, folderId, folders, isClutteredFolder]);

  // Folder name handler
  const handleFolderNameChange = useCallback((value: string) => {
    if (folder && !isClutteredFolder) {
      updateFolder(folder.id, { name: value });
    }
  }, [folder, isClutteredFolder, updateFolder]);

  // Description handlers
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    if (folder) {
      updateFolder(folder.id, { description: value });
    }
  }, [folder, updateFolder]);

  const handleDescriptionBlur = useCallback(() => {
    if (!description.trim()) {
      setShowDescriptionInput(false);
      if (folder) {
        updateFolder(folder.id, { description: '' });
      }
    }
  }, [description, folder, updateFolder]);

  const handleShowDescriptionInput = useCallback(() => {
    setShowDescriptionInput(true);
  }, []);

  const handleToggleDescriptionVisibility = useCallback(() => {
    const newValue = !descriptionVisible;
    setDescriptionVisible(newValue);
    if (folder) {
      updateFolder(folder.id, { descriptionVisible: newValue });
    }
  }, [descriptionVisible, folder, updateFolder]);

  // Tag handlers
  const handleAddTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag) {
      // Check for duplicates case-insensitively
      const exists = tags.some(t => t.toLowerCase() === trimmedTag.toLowerCase());
      if (!exists) {
        const newTags = [...tags, trimmedTag];
        setTags(newTags);
        if (folder) {
          updateFolder(folder.id, { tags: newTags });
        }
      }
    }
    setShowTagInput(false); // Close the input after adding
  }, [tags, folder, updateFolder]);

  const handleRemoveTag = useCallback((tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    if (folder) {
      updateFolder(folder.id, { tags: newTags });
    }
  }, [tags, folder, updateFolder]);

  const handleEditTag = useCallback((oldTag: string, newTag: string) => {
    const newTags = tags.map(t => t === oldTag ? newTag : t);
    setTags(newTags);
    if (folder) {
      updateFolder(folder.id, { tags: newTags });
    }
  }, [tags, folder, updateFolder]);

  const handleShowTagInput = useCallback(() => {
    setShowTagInput(true);
  }, []);

  const handleCancelTagInput = useCallback(() => {
    setShowTagInput(false);
  }, []);

  const handleToggleTagsVisibility = useCallback(() => {
    const newValue = !tagsVisible;
    setTagsVisible(newValue);
    if (folder) {
      updateFolder(folder.id, { tagsVisible: newValue });
    }
  }, [tagsVisible, folder, updateFolder]);

  // Emoji handlers for folder
  const handleAddFolderEmoji = useCallback(() => {
    const buttonEl = emojiButtonRef.current || addEmojiButtonRef.current;
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      setEmojiTrayPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setIsEmojiTrayOpen(true);
  }, []);

  const handleRemoveFolderEmoji = useCallback(() => {
    if (folder) {
      updateFolder(folder.id, { emoji: null });
    }
  }, [folder, updateFolder]);

  const handleSelectFolderEmoji = useCallback((emoji: string) => {
    if (folder) {
      updateFolder(folder.id, { emoji });
    }
    setIsEmojiTrayOpen(false);
  }, [folder, updateFolder]);

  // Note emoji handler
  const handleUpdateEmoji = useCallback((noteId: string, emoji: string) => {
    updateNote(noteId, { emoji });
  }, [updateNote]);

  if (!isClutteredFolder && !folder) {
    return (
      <div style={{ padding: spacing['20'], color: colors.text.secondary }}>
        Folder not found
      </div>
    );
  }

  return (
    <>
        {/* Page Title Section */}
        <PageTitleSection
          variant="folder"
          folderName={isClutteredFolder ? 'Cluttered' : (folder?.name || '')}
          onFolderNameChange={isClutteredFolder ? undefined : handleFolderNameChange}
          staticIcon={isClutteredFolder ? <span style={{ fontSize: '24px' }}>📮</span> : undefined}
          staticDescription={isClutteredFolder ? 'Notes that aren\'t in any folder' : undefined}
          selectedEmoji={isClutteredFolder ? undefined : folder?.emoji}
          onAddEmoji={isClutteredFolder ? undefined : handleAddFolderEmoji}
          onRemoveEmoji={isClutteredFolder ? undefined : handleRemoveFolderEmoji}
          emojiButtonRef={isClutteredFolder ? undefined : emojiButtonRef}
          isEmojiTrayOpen={isClutteredFolder ? false : isEmojiTrayOpen}
          addEmojiButtonRef={isClutteredFolder ? undefined : addEmojiButtonRef}
          description={isClutteredFolder ? undefined : description}
          showDescriptionInput={isClutteredFolder ? false : showDescriptionInput}
          descriptionVisible={isClutteredFolder ? false : descriptionVisible}
          onDescriptionChange={isClutteredFolder ? undefined : handleDescriptionChange}
          onDescriptionBlur={isClutteredFolder ? undefined : handleDescriptionBlur}
          onShowDescriptionInput={isClutteredFolder ? undefined : handleShowDescriptionInput}
          onToggleDescriptionVisibility={isClutteredFolder ? undefined : handleToggleDescriptionVisibility}
          tags={isClutteredFolder ? undefined : tags}
          showTagInput={isClutteredFolder ? false : showTagInput}
          tagsVisible={isClutteredFolder ? false : tagsVisible}
          onAddTag={isClutteredFolder ? undefined : handleAddTag}
          onRemoveTag={isClutteredFolder ? undefined : handleRemoveTag}
          onEditTag={isClutteredFolder ? undefined : handleEditTag}
          onShowTagInput={isClutteredFolder ? undefined : handleShowTagInput}
          onCancelTagInput={isClutteredFolder ? undefined : handleCancelTagInput}
          onToggleTagsVisibility={isClutteredFolder ? undefined : handleToggleTagsVisibility}
          onTagClick={onTagClick}
          backgroundColor={colors.background.default}
          // Action controls
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isClutteredFolder ? "Search in Cluttered..." : "Search in folder..."}
          onSort={() => setSortActive(!sortActive)}
          sortActive={sortActive}
          onFilter={() => setFilterActive(!filterActive)}
          filterActive={filterActive}
          onNewNote={onCreateNote}
          onNewFolder={isClutteredFolder ? undefined : onCreateFolder}
        />

        {/* Page Content */}
        <PageContent>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing['3xl'], // 32px between sections
          }}>
          {/* Subfolders Grid */}
          {subfolders.length > 0 && (
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
              folders={subfolders.map(subfolder => {
                const allSubfolderNotes = notes.filter(note => note.folderId === subfolder.id && !note.deletedAt);
                // Filter out empty notes for preview display only (except current note)
                const previewNotes = allSubfolderNotes.filter(note => 
                  note.id === currentNoteId || !isNoteEmpty(note)
                );
                const nestedFolderCount = folders.filter(f => 
                  !f.deletedAt && f.parentId === subfolder.id
                ).length;
                
                return {
                  id: subfolder.id,
                  name: subfolder.name || 'Untitled Folder',
                  emoji: subfolder.emoji,
                  noteCount: allSubfolderNotes.length, // Count ALL notes (including empty)
                  folderCount: nestedFolderCount,
                  previewNotes: previewNotes.slice(0, 3).map(note => ({
                    id: note.id,
                    title: note.title || 'Untitled',
                    emoji: note.emoji,
                    contentSnippet: note.description || '',
                  })),
                };
              })}
              onClick={onFolderClick || (() => {})}
              onNoteClick={onNoteClick}
              onCreateNote={(subfolderId) => {
                // Create a note in the subfolder
                const newNote = createNote({ folderId: subfolderId });
                onNoteClick(newNote.id);
              }}
            />
          )}
              </div>
            )}

            {/* Wavy Divider */}
            {subfolders.length > 0 && <WavyDivider />}

          {/* Notes List */}
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
            
            notes={folderNotes.map(note => ({
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
                    const note = notes.find(n => n.id === noteId);
                    if (note) {
                      const newTags = note.tags.filter(t => t !== tagToRemove);
                      updateNote(noteId, { tags: newTags });
                    }
                  }}
            onUpdateEmoji={handleUpdateEmoji}
            emptyState={
              isClutteredFolder 
                ? 'No notes in Cluttered' 
                : subfolders.length > 0 
                  ? 'No notes in this folder' 
                  : 'No subfolders or notes in this folder'
            }
          />
              )}
            </div>
          </div>
        </PageContent>

      {/* Emoji Tray for folder emoji selection */}
      <EmojiTray
        isOpen={isEmojiTrayOpen}
        position={emojiTrayPosition}
        onSelect={handleSelectFolderEmoji}
        onClose={() => setIsEmojiTrayOpen(false)}
      />
    </>
  );
};

