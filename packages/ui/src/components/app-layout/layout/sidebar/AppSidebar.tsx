import { RefObject, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Keyboard, Sun, Moon, Settings, Plus, MoreVertical, Trash2, Pencil, PanelRight } from '../../../../icons';
import { TertiaryButton } from '../../../ui-buttons';
import { ContextMenu } from '../../../ui-primitives';
import { SidebarContainer } from './SidebarContainer';
import { NotesView } from './views/NotesView';
import { TagsView } from './views/TagsView';
import { TasksView } from './views/TasksView';
import { SidebarCalendar } from './internal/SidebarCalendar';
import { EmojiTray } from '../../shared/emoji';
import { sizing } from '../../../../tokens/sizing';
import { useTheme } from '../../../../hooks/useTheme';
import { useMultiSelect } from '../../../../hooks/useMultiSelect';
import { useCarouselAnimation } from '../../../../hooks/useCarouselAnimation';
import { useSidebarResize } from '../../../../hooks/useSidebarResize';
import { useNotesStore, useFoldersStore, useOrderingStore, sortByOrder, DAILY_NOTES_FOLDER_ID, type Note, type Folder } from '@clutter/shared';
import type { SidebarNote, SidebarFolder } from './types';

/**
 * AppSidebar Design Specification
 * Single source of truth for all design tokens used in this component
 */
const DESIGN = {
  sizing: {
    minWidth: 256,                              // Minimum sidebar width (resizable)
    maxWidth: 320,                              // Maximum sidebar width (resizable)
    defaultWidth: 256,                          // Default sidebar width
    collapsedWidth: sizing.layout.sidebarCollapsedWidth, // Width when sidebar is collapsed
    iconSize: sizing.icon.sm,                   // Size of icons in footer buttons
  },
  footer: {
    iconButtonGap: '4px',                   // Gap between footer buttons
    padding: '16px',       // Footer padding when sidebar is expanded
  },
} as const;

// Check if running in Tauri (native app)
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface AppSidebarProps {
  onToggleTheme: () => void;
  onShowKeyboardShortcuts: () => void;
  keyboardButtonRef: RefObject<HTMLDivElement>;
  isCollapsed?: boolean;
  onTagClick?: (tag: string, source: 'all' | 'favorites') => void;
  onFolderClick?: (folderId: string) => void; // Called when folder is clicked
  onBackToEditor?: () => void; // Called when we need to go back (e.g., tag deleted)
  onNoteClickFromSidebar?: () => void; // Called when note clicked from sidebar
  onNoteClickWithBlock?: (noteId: string, blockId: string) => void; // Called when task clicked from sidebar
  onDateSelect?: (date: Date) => void; // Called when calendar date is selected (for daily notes)
  onToggleSidebar?: () => void;
  currentView?: { type: 'editor' } | { type: 'tagFilter'; tag: string }; // Current main view
}

export const AppSidebar = ({ 
  onToggleTheme, 
  onShowKeyboardShortcuts,
  keyboardButtonRef,
  isCollapsed = false,
  onTagClick,
  onFolderClick,
  onBackToEditor,
  onNoteClickFromSidebar,
  onNoteClickWithBlock,
  onDateSelect,
  onToggleSidebar,
  currentView,
}: AppSidebarProps) => {
  const { mode, colors } = useTheme();
  
  // Connect to stores
  const { 
    notes, 
    currentNoteId, 
    setCurrentNoteId, 
    createNote,
    updateNote,
    deleteNote,
  } = useNotesStore();
  
  const { 
    folders: storeFolders, 
    createFolder, 
    moveFolder, 
    updateFolder, 
    deleteFolder,
    getFolderDepth 
  } = useFoldersStore();
  
  // Subscribe to the entire orders object so we re-render when it changes
  const orders = useOrderingStore((state) => state.orders);
  const { 
    getOrder, 
    insertBefore, 
    insertAfter,
    setOrder,
  } = useOrderingStore();
  
  // Carousel animation state
  const { 
    contentType, 
    currentVisualTab, 
    prevVisualTab, 
    isTransitioning, 
    setContentType 
  } = useCarouselAnimation('tasks');
  
  // Sidebar resize
  const { 
    sidebarWidth, 
    isResizing, 
    handleMouseDown: handleResizeMouseDown 
  } = useSidebarResize({
    minWidth: DESIGN.sizing.minWidth,
    maxWidth: DESIGN.sizing.maxWidth,
    defaultWidth: DESIGN.sizing.defaultWidth,
    isCollapsed,
    onToggleSidebar,
  });

  // Get slide direction based on tab order
  const tabs = ['notes', 'tasks', 'tags'];
  
  const getSlideDirection = () => {
    const targetIndex = tabs.indexOf(currentVisualTab);
    const prevIndex = tabs.indexOf(prevVisualTab);
    // When moving to a higher index (right in tab bar), content slides from right to left
    // When moving to a lower index (left in tab bar), content slides from left to right
    return targetIndex > prevIndex ? 'left' : 'right';
  };

  const slideDirection = getSlideDirection();
  
  // Get initial position for tabs based on their position relative to current visual tab
  const getTabPosition = (tabType: 'notes' | 'tasks' | 'tags') => {
    const tabIndex = tabs.indexOf(tabType);
    const targetIndex = tabs.indexOf(currentVisualTab);
    if (tabIndex < targetIndex) return 'translateX(-100%)'; // Tab is to the left
    if (tabIndex > targetIndex) return 'translateX(100%)';  // Tab is to the right
    return 'translateX(0)'; // Current tab
  };
  
  // Section collapse states - Initialize based on whether sections have data to prevent flash
  const [isClutteredCollapsed, setIsClutteredCollapsed] = useState(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt && n.folderId !== DAILY_NOTES_FOLDER_ID);
    const activeFolderIds = new Set(storeFolders.filter((f: Folder) => !f.deletedAt).map((f: Folder) => f.id));
    const cluttered = activeNotes.filter((n: Note) => (!n.folderId || !activeFolderIds.has(n.folderId)));
    return cluttered.length === 0;
  });
  const [isFavouritesCollapsed, setIsFavouritesCollapsed] = useState(() => {
    const activeNotes = notes.filter((n: Note) => !n.deletedAt && n.folderId !== DAILY_NOTES_FOLDER_ID);
    const favourites = activeNotes.filter((n: Note) => n.isFavorite);
    return favourites.length === 0;
  });
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(() => {
    const activeFolders = storeFolders.filter((f: Folder) => !f.deletedAt);
    return activeFolders.length === 0;
  });
  
  // Track if user has manually interacted with collapse states
  const [hasManuallyToggledCluttered, setHasManuallyToggledCluttered] = useState(false);
  const [hasManuallyToggledFavourites, setHasManuallyToggledFavourites] = useState(false);
  const [hasManuallyToggledFolders, setHasManuallyToggledFolders] = useState(false);

  // Track which folders are open/collapsed - Initialize with current note's folder
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => {
    const currentNote = notes.find((n: Note) => n.id === currentNoteId);
    if (currentNote?.folderId) {
      // Find all parent folders to expand the entire chain
      const foldersToOpen = new Set<string>();
      const addParentChain = (folderId: string) => {
        foldersToOpen.add(folderId);
        const folder = storeFolders.find((f: Folder) => f.id === folderId);
        if (folder?.parentId) {
          addParentChain(folder.parentId);
        }
      };
      addParentChain(currentNote.folderId);
      return foldersToOpen;
    }
    return new Set();
  });

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ 
    type: 'note' | 'folder'; 
    id: string; 
    ids: string[];
    context?: string; // Track where drag originated
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ type: 'folder' | 'cluttered'; id: string | null } | null>(null);
  
  // Ref to track drag leave timeout (prevents flicker when moving between items)
  const dragLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inline editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);

  // Tags state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAllTagsCollapsed, setIsAllTagsCollapsed] = useState(() => {
    // Check if there are any tags in notes
    const activeNotes = notes.filter((n: Note) => !n.deletedAt);
    const allTags = new Set<string>();
    activeNotes.forEach((n: Note) => {
      n.tags.forEach(tag => allTags.add(tag.toLowerCase()));
    });
    return allTags.size === 0;
  });

  // Emoji picker state
  const [isEmojiTrayOpen, setIsEmojiTrayOpen] = useState(false);
  const [emojiTrayPosition, setEmojiTrayPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const [editingEmojiNoteId, setEditingEmojiNoteId] = useState<string | null>(null);
  const [editingEmojiFolderId, setEditingEmojiFolderId] = useState<string | null>(null);

  // Reordering state
  const [reorderDropTarget, setReorderDropTarget] = useState<{ id: string; position: 'before' | 'after'; type: 'note' | 'folder' } | null>(null);

  const handleFolderToggle = useCallback((folderId: string) => {
    setOpenFolderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Helper to check if TipTap JSON content is empty
  const isContentEmpty = useCallback((content: string): boolean => {
    try {
      if (!content || content.trim() === '') return true;
      
      const json = JSON.parse(content);
      // Empty TipTap document: {"type":"doc","content":[{"type":"paragraph"}]} or similar
      if (!json.content || json.content.length === 0) return true;
      
      // Check if all nodes are empty paragraphs
      return json.content.every((node: any) => {
        if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
          return true;
        }
        return false;
      });
    } catch {
      return true; // If parsing fails, consider it empty
    }
  }, []);

  // Transform store data to sidebar format
  // Filter out only deleted notes - show all others (including empty ones)
  // Active notes (non-deleted)
  const activeNotes = useMemo(() => 
    notes.filter((n: Note) => !n.deletedAt), 
    [notes]
  );
  
  // Cluttered notes (notes without a folder OR with invalid folder reference)
  // Excludes daily notes - they're saved under DAILY_NOTES_FOLDER_ID
  const clutteredNotes: SidebarNote[] = useMemo(() => {
    const activeFolderIds = new Set(
      storeFolders.filter((f: Folder) => !f.deletedAt).map((f: Folder) => f.id)
    );
    
    const notes = activeNotes
      .filter((n: Note) => {
        // Exclude daily notes - they're saved under special "Daily notes" folder ID
        if (n.folderId === DAILY_NOTES_FOLDER_ID) return false;
        // No folder assigned = cluttered
        if (!n.folderId) return true;
        // Has folder but folder doesn't exist or is deleted = cluttered
        return !activeFolderIds.has(n.folderId);
      })
      .map((n: Note) => ({
        id: n.id,
        title: n.title || 'Untitled',
        icon: n.emoji,
        isFavorite: n.isFavorite,
        hasContent: !isContentEmpty(n.content),
      }));
    
    // Apply custom ordering
    const orderedIds = getOrder('cluttered');
    return sortByOrder(notes, orderedIds);
  }, [activeNotes, storeFolders, getOrder, orders, isContentEmpty]);

  // Favorite notes
  // Excludes daily notes - they're saved under DAILY_NOTES_FOLDER_ID
  const favouriteNotes: SidebarNote[] = useMemo(() => {
    const notes = activeNotes
      .filter((n: Note) => n.isFavorite && n.folderId !== DAILY_NOTES_FOLDER_ID)
      .map((n: Note) => ({
        id: n.id,
        title: n.title || 'Untitled',
        icon: n.emoji,
        isFavorite: n.isFavorite,
        hasContent: !isContentEmpty(n.content),
      }));
    
    // Apply custom ordering
    const orderedIds = getOrder('favourites');
    return sortByOrder(notes, orderedIds);
  }, [activeNotes, getOrder, orders, isContentEmpty]);


  // Transform folders with hierarchy
  const sidebarFolders: SidebarFolder[] = useMemo(() => {
    const activeFolders = storeFolders.filter((f: Folder) => !f.deletedAt);
    
    // Recursive function to build folder hierarchy
    const buildFolderTree = (parentId: string | null): SidebarFolder[] => {
      const folders = activeFolders
        .filter((f: Folder) => f.parentId === parentId)
        .map((f: Folder) => {
          // Get notes in this folder and apply ordering
          // Daily notes automatically excluded (they have folderId === DAILY_NOTES_FOLDER_ID)
          const folderNotes = activeNotes
            .filter((n: Note) => n.folderId === f.id)
            .map((n: Note) => ({
              id: n.id,
              title: n.title || 'Untitled',
              icon: n.emoji,
              isFavorite: n.isFavorite,
              hasContent: !isContentEmpty(n.content),
            }));
          
          const noteOrderIds = getOrder(`folder-notes-${f.id}`);
          const sortedNotes = sortByOrder(folderNotes, noteOrderIds);
          
          return {
            id: f.id || '',
            name: f.name || 'Untitled Folder',
            emoji: f.emoji || null,
            isOpen: openFolderIds.has(f.id),
            notes: sortedNotes,
            subfolders: buildFolderTree(f.id), // Recursively build subfolders
          };
        });
      
      // Apply ordering to folders at this level
      const context = parentId ? `folder-children-${parentId}` : 'root-folders';
      const orderedIds = getOrder(context);
      return sortByOrder(folders, orderedIds);
    };
    
    // Start with root folders (parentId === null)
    return buildFolderTree(null);
  }, [storeFolders, activeNotes, openFolderIds, getOrder, orders, isContentEmpty]);

  // Build flat list of all visible notes for multi-select (in display order)
  const visibleNotes = useMemo(() => {
    const flatNotes: SidebarNote[] = [];
    
    // Add favourite notes
    if (!isFavouritesCollapsed) {
      flatNotes.push(...favouriteNotes);
    }
    
    // Add cluttered notes
    if (!isClutteredCollapsed) {
      flatNotes.push(...clutteredNotes);
    }
    
    // Add folder notes (recursively)
    const addFolderNotes = (folders: SidebarFolder[]) => {
      folders.forEach(folder => {
        if (folder.isOpen) {
          flatNotes.push(...folder.notes);
          addFolderNotes(folder.subfolders);
        }
      });
    };
    
    if (!isFoldersCollapsed) {
      addFolderNotes(sidebarFolders);
    }
    
    return flatNotes;
  }, [favouriteNotes, clutteredNotes, sidebarFolders, isClutteredCollapsed, isFavouritesCollapsed, isFoldersCollapsed]);

  // Use multi-select hook for notes
  const {
    selectedIds: selectedNoteIds,
    handleClick: handleNoteMultiSelectBase,
    clearSelection: clearNoteSelection,
  } = useMultiSelect({
    items: visibleNotes,
    getItemId: (note) => note.id,
    onSingleSelect: (noteId) => {
      setCurrentNoteId(noteId);
      onNoteClickFromSidebar?.();
    },
  });

  // Build flat list of all visible folders for multi-select (in display order)
  const visibleFolders = useMemo(() => {
    const flatFolders: SidebarFolder[] = [];
    
    const addFolders = (folders: SidebarFolder[]) => {
      folders.forEach(folder => {
        flatFolders.push(folder);
        // If folder is open, recursively add subfolders
        if (folder.isOpen && folder.subfolders.length > 0) {
          addFolders(folder.subfolders);
        }
      });
    };
    
    if (!isFoldersCollapsed) {
      addFolders(sidebarFolders);
    }
    
    return flatFolders;
  }, [sidebarFolders, isFoldersCollapsed]);

  // Use multi-select hook for folders
  const {
    selectedIds: selectedFolderIds,
    handleClick: handleFolderMultiSelectBase,
    clearSelection: clearFolderSelection,
  } = useMultiSelect({
    items: visibleFolders,
    getItemId: (folder) => folder.id,
    onSingleSelect: (folderId) => {
      onFolderClick?.(folderId);
    },
  });

  // Wrap handlers to implement exclusive selection (only notes OR folders, not both)
  const handleNoteMultiSelect = useCallback((noteId: string, event?: React.MouseEvent) => {
    // Clear folder selection when selecting notes
    clearFolderSelection();
    handleNoteMultiSelectBase(noteId, event);
  }, [handleNoteMultiSelectBase, clearFolderSelection]);

  const handleFolderMultiSelect = useCallback((folderId: string, event?: React.MouseEvent) => {
    // Clear note selection when selecting folders
    clearNoteSelection();
    handleFolderMultiSelectBase(folderId, event);
  }, [handleFolderMultiSelectBase, clearNoteSelection]);

  // Auto-collapse empty sections (only if user hasn't manually toggled)
  // Only collapse when going FROM having items TO empty, not expand when going from empty to having items
  useEffect(() => {
    if (!hasManuallyToggledCluttered && clutteredNotes.length === 0) {
      setIsClutteredCollapsed(true);
    }
  }, [clutteredNotes.length, hasManuallyToggledCluttered]);

  useEffect(() => {
    if (!hasManuallyToggledFavourites && favouriteNotes.length === 0) {
      setIsFavouritesCollapsed(true);
    }
  }, [favouriteNotes.length, hasManuallyToggledFavourites]);

  useEffect(() => {
    if (!hasManuallyToggledFolders && sidebarFolders.length === 0) {
      setIsFoldersCollapsed(true);
    }
  }, [sidebarFolders.length, hasManuallyToggledFolders]);

  // Auto-expand folder containing current note - but only expand folder/cluttered, never Favourites
  // This runs on initial load and when switching notes
  useEffect(() => {
    if (!currentNoteId) return;
    
    const currentNote = notes.find((n: Note) => n.id === currentNoteId && !n.deletedAt);
    if (!currentNote) return;
    
    // Skip auto-expand logic for daily notes - they're saved under special folder ID
    if (currentNote.folderId === DAILY_NOTES_FOLDER_ID) return;

    const activeFolderIds = new Set(
      storeFolders.filter((f: Folder) => !f.deletedAt).map((f: Folder) => f.id)
    );

    // Check if note is cluttered (regular notes without a folder)
    const isCluttered = !currentNote.folderId || !activeFolderIds.has(currentNote.folderId);
    
    if (isCluttered) {
      // Note is cluttered - expand cluttered section (only on initial load, not on data changes)
      // Don't expand if user has manually toggled
      if (!hasManuallyToggledCluttered) {
        setIsClutteredCollapsed(false);
      }
    } else if (currentNote.folderId) {
      // Note is in a folder - expand that folder and all parent folders
      const foldersToOpen = new Set<string>();
      const addParentChain = (folderId: string) => {
        foldersToOpen.add(folderId);
        const folder = storeFolders.find((f: Folder) => f.id === folderId);
        if (folder?.parentId) {
          addParentChain(folder.parentId);
        }
      };
      addParentChain(currentNote.folderId);
      
      setOpenFolderIds(prev => {
        const newSet = new Set(prev);
        foldersToOpen.forEach(id => newSet.add(id));
        return newSet;
      });
      
      // Expand the folders section (only on initial load, not on data changes)
      if (!hasManuallyToggledFolders) {
        setIsFoldersCollapsed(false);
      }
    }
    
    // NEVER auto-expand Favourites - it's a secondary view
    // Users should manually expand it if they want to see that list
  }, [currentNoteId, notes, storeFolders, hasManuallyToggledCluttered, hasManuallyToggledFolders]);

  // Handlers
  const handleCreateNote = useCallback(() => {
    // Simply create a new note - no auto-deletion (matches Notion/Craft/Tana)
    const newNote = createNote();
    setCurrentNoteId(newNote.id);
    
    // Notify parent to switch to full-page editor view
    onNoteClickFromSidebar?.();
  }, [createNote, setCurrentNoteId, onNoteClickFromSidebar]);

  const handleCreateFolder = useCallback((parentId?: string) => {
    // Check depth limit before creating subfolder
    if (parentId) {
      const depth = getFolderDepth(parentId);
      if (depth >= 10) {
        alert('Maximum folder depth (10 levels) reached. Cannot create subfolder.');
        return;
      }
    }
    
    // Create folder with empty name (shows "Untitled Folder" placeholder)
    const folderId = createFolder('', parentId || null);
    if (folderId && onFolderClick) {
      onFolderClick(folderId); // Navigate to the newly created folder
    }
  }, [createFolder, getFolderDepth, onFolderClick]);

  const handleFoldersHeaderClick = useCallback(() => {
    // Navigate to "All Folders" view when clicking "Folders" section title
    if (onFolderClick) {
      onFolderClick('all-folders'); // Special ID for All Folders view
    }
  }, [onFolderClick]);

  const handleFavouritesHeaderClick = useCallback(() => {
    // Navigate to "Favourites" view when clicking "Favourites" section title
    if (onFolderClick) {
      onFolderClick('all-favourites'); // Special ID for Favourites view
    }
  }, [onFolderClick]);

  const handleAllTagsHeaderClick = useCallback(() => {
    // Navigate to "All Tags" view when clicking "All Tags" section title
    if (onFolderClick) {
      onFolderClick('all-tags'); // Special ID for All Tags view
    }
  }, [onFolderClick]);

  const handleFavouriteTagsHeaderClick = useCallback(() => {
    // Navigate to "Favourite Tags" view when clicking "Favourites" section title in Tags tab
    if (onFolderClick) {
      onFolderClick('favourite-tags'); // Special ID for Favourite Tags view
    }
  }, [onFolderClick]);

  const handleAllTasksHeaderClick = useCallback(() => {
    // Navigate to "All Tasks" view when clicking "All Tasks" section title
    if (onFolderClick) {
      onFolderClick('all-tasks'); // Special ID for All Tasks view
    }
  }, [onFolderClick]);

  const handleCreateNoteInFolder = useCallback((folderId: string) => {
    // Simply create a new note in the folder - no auto-deletion
    const newNote = createNote({ folderId });
    setCurrentNoteId(newNote.id);
    
    // Notify parent to switch to full-page editor view
    onNoteClickFromSidebar?.();
  }, [createNote, setCurrentNoteId, onNoteClickFromSidebar]);

  // Drag and drop handlers
  const handleDragStart = useCallback((type: 'note' | 'folder', id: string, context: string) => {
    let itemsToDrag: string[] = [id];
    
    if (type === 'note' && selectedNoteIds.has(id)) {
      // Dragging a selected note → drag all selected notes
      itemsToDrag = Array.from(selectedNoteIds);
    } else if (type === 'folder' && selectedFolderIds.has(id)) {
      // Dragging a selected folder → drag all selected folders
      itemsToDrag = Array.from(selectedFolderIds);
    } else {
      // Dragging non-selected item → clear selection, drag only this item
      clearNoteSelection();
      clearFolderSelection();
    }
    
    setDraggedItem({ type, id, ids: itemsToDrag, context });
  }, [selectedNoteIds, selectedFolderIds, clearNoteSelection, clearFolderSelection]);

  const handleDragOver = useCallback((type: 'folder' | 'cluttered', id: string | null) => {
    setDropTarget({ type, id });
    // Clear reorder indicator when showing folder drop highlight
    setReorderDropTarget(null);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  // Helper to check if targetId is a descendant of folderId
  const isDescendantOf = useCallback((folderId: string, targetId: string): boolean => {
    const visited = new Set<string>();
    let currentId: string | null = targetId;
    
    // Walk up the tree from targetId
    while (currentId && visited.size < 100) { // Safety limit to prevent infinite loops
      if (currentId === folderId) return true;
      visited.add(currentId);
      
      const folder = storeFolders.find(f => f.id === currentId);
      if (!folder) break;
      
      currentId = folder.parentId;
    }
    
    return false;
  }, [storeFolders]);

  const handleDrop = useCallback((targetType: 'folder' | 'cluttered', targetId: string | null) => {
    if (!draggedItem) return;

    const { type: dragType, ids: draggedIds } = draggedItem;

    if (dragType === 'note') {
      // Move all selected notes to folder or cluttered
      const newFolderId = targetType === 'cluttered' ? null : targetId;
      
      // Move all dragged notes to new folder
      draggedIds.forEach(noteId => {
        updateNote(noteId, { folderId: newFolderId });
      });
      
      // If moving to a folder, open the folder to show the notes
      if (newFolderId) {
        setOpenFolderIds(prev => new Set([...prev, newFolderId]));
      }
    } else if (dragType === 'folder') {
      // Move all selected folders into another folder or to root
      const newParentId = targetType === 'cluttered' ? null : targetId;
      
      let hasErrors = false;
      
      // Validate and move each folder
      draggedIds.forEach(folderId => {
        // Prevent moving folder into itself
        if (newParentId === folderId) {
          hasErrors = true;
          return; // Skip this folder
        }
        
        // Prevent moving folder into its own descendants (would create circular reference)
        if (newParentId && isDescendantOf(folderId, newParentId)) {
          hasErrors = true;
          return; // Skip this folder
        }
        
        // Safe to move this folder
        moveFolder(folderId, newParentId);
      });
      
      // Show error message if any folders couldn't be moved
      if (hasErrors) {
        alert('Some folders could not be moved to prevent circular references');
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, updateNote, moveFolder, setOpenFolderIds, isDescendantOf]);

  const handleDragEnd = useCallback(() => {
    // If we have a valid drop target when drag ends, manually trigger the drop
    // This is a fallback for when the browser's native drop event doesn't fire
    if (dropTarget && draggedItem) {
      handleDrop(dropTarget.type, dropTarget.id);
    }
    
    setDraggedItem(null);
    setDropTarget(null);
    setReorderDropTarget(null);
  }, [dropTarget, draggedItem, handleDrop]);

  // Reordering handlers
  const handleDragOverForReorder = useCallback((type: 'note' | 'folder', id: string, position: 'before' | 'after', context: string) => {
    // Cancel any pending hide from dragLeave (prevents flicker)
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }
    
    if (!draggedItem || draggedItem.type !== type) {
      return; // Types don't match
    }

    // Check if we should show reorder indicator
    const shouldShowIndicator = (() => {
      // Same context → always allow reorder
      if (draggedItem.context === context) return true;
      
      // Different context → check if cross-context move is allowed
      
      // For notes: allow moving into an expanded folder's note list
      if (type === 'note') {
        // Extract folder ID from context (e.g., "folder-notes-123")
        const folderMatch = context.match(/folder-notes-(.+)/);
        if (folderMatch) {
          const folderId = folderMatch[1];
          return openFolderIds.has(folderId); // Allow if folder is expanded
        }
        // Allow moving to cluttered
        if (context === 'cluttered') return true;
      }
      
      // For folders: allow moving between root and subfolders, or between different subfolder levels
      if (type === 'folder') {
        // Moving to root-folders → always allow (unnesting)
        if (context === 'root-folders') return true;
        
        // Moving into an expanded folder's children
        const folderMatch = context.match(/folder-children-(.+)/);
        if (folderMatch) {
          const folderId = folderMatch[1];
          return openFolderIds.has(folderId); // Allow if folder is expanded
        }
      }
      
      return false;
    })();
    
    if (shouldShowIndicator) {
      setReorderDropTarget({ id, position, type });
      // Clear folder drop highlight when showing reorder indicator
      setDropTarget(null);
    }
  }, [draggedItem, openFolderIds]);

  const handleDragLeaveForReorder = useCallback(() => {
    // Clear any existing timeout
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
    }
    
    // Add a small delay before hiding the indicator
    // If dragOver is called within this time, it will cancel this
    dragLeaveTimeoutRef.current = setTimeout(() => {
      setReorderDropTarget(null);
      dragLeaveTimeoutRef.current = null;
    }, 50); // 50ms delay - enough to prevent flicker, not noticeable
  }, []);

  const handleDropForReorder = useCallback((type: 'note' | 'folder', targetId: string, position: 'before' | 'after', context: string) => {
    if (!draggedItem || draggedItem.type !== type) {
      return;
    }
    
    const draggedId = draggedItem.id;
    const draggedContext = draggedItem.context;
    
    // Don't reorder if dropping on itself
    if (draggedId === targetId) {
      setReorderDropTarget(null);
      return;
    }
    
    // Check if we're moving between different contexts (e.g., cluttered → folder)
    const isContextChange = draggedContext !== context;
    
    // If moving a note to a different context (e.g., from cluttered to a folder)
    if (isContextChange && type === 'note') {
      // Extract folderId from context
      let newFolderId: string | null = null;
      if (context.startsWith('folder-notes-')) {
        newFolderId = context.replace('folder-notes-', '');
      } else if (context === 'cluttered') {
        newFolderId = null;
      }
      
      // Move the note to the new folder
      updateNote(draggedId, { folderId: newFolderId });
      
      // If moving to a folder, ensure it's open
      if (newFolderId) {
        setOpenFolderIds(prev => new Set([...prev, newFolderId]));
      }
    }
    
    // If moving a folder to a different context (e.g., root → into another folder, or subfolder → root)
    if (isContextChange && type === 'folder') {
      // Extract parent folder ID from context
      let newParentId: string | null = null;
      if (context.startsWith('folder-children-')) {
        newParentId = context.replace('folder-children-', '');
      } else if (context === 'root-folders') {
        newParentId = null;
      }
      
      // Prevent moving folder into itself
      if (newParentId === draggedId) {
        setReorderDropTarget(null);
        setDraggedItem(null);
        setDropTarget(null);
        return;
      }
      
      // Prevent moving folder into its own descendants (would create circular reference)
      if (newParentId && isDescendantOf(draggedId, newParentId)) {
        alert('Cannot move a folder into its own subfolder');
        setReorderDropTarget(null);
        setDraggedItem(null);
        setDropTarget(null);
        return;
      }
      
      // Move the folder to the new parent
      moveFolder(draggedId, newParentId);
      
      // If moving into a folder, ensure it's open
      if (newParentId) {
        setOpenFolderIds(prev => new Set([...prev, newParentId]));
      }
    }
    
    // Initialize order if empty - add all items in this context
    const currentOrder = getOrder(context);
    
    if (currentOrder.length === 0) {
      // Get all items in this context
      let allItemIds: string[] = [];
      
      if (type === 'note') {
        if (context === 'favourites') {
          allItemIds = favouriteNotes.map(n => n.id);
        } else if (context === 'cluttered') {
          allItemIds = clutteredNotes.map(n => n.id);
        } else if (context.startsWith('folder-notes-')) {
          const folderId = context.replace('folder-notes-', '');
          allItemIds = activeNotes.filter(n => n.folderId === folderId).map(n => n.id);
        }
      } else if (type === 'folder') {
        if (context === 'root-folders') {
          allItemIds = sidebarFolders.map(f => f.id);
        } else if (context.startsWith('folder-children-')) {
          const parentId = context.replace('folder-children-', '');
          // Find subfolder IDs recursively
          const findSubfolders = (folders: SidebarFolder[]): string[] => {
            for (const f of folders) {
              if (f.id === parentId) {
                return f.subfolders?.map(sf => sf.id) || [];
              }
              const found = findSubfolders(f.subfolders || []);
              if (found.length > 0) return found;
            }
            return [];
          };
          allItemIds = findSubfolders(sidebarFolders);
        }
      }
      
      // If the item is moving to a new context, include it in the list
      if (isContextChange && !allItemIds.includes(draggedId)) {
        allItemIds.push(draggedId);
      }
      
      // Initialize with current display order
      if (allItemIds.length > 0) {
        setOrder(context, allItemIds);
      }
    }
    
    // Update the order in the store
    if (position === 'before') {
      insertBefore(context, draggedId, targetId);
    } else {
      insertAfter(context, draggedId, targetId);
    }
    
    // Clear all drag states
    setReorderDropTarget(null);
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, insertBefore, insertAfter, getOrder, setOrder, favouriteNotes, clutteredNotes, sidebarFolders, activeNotes, updateNote, setOpenFolderIds, moveFolder, isDescendantOf]);

  // Note actions with context menu
  const handleRenameNote = useCallback((noteId: string) => {
    setEditingNoteId(noteId);
  }, []);

  const handleNoteRenameComplete = useCallback((noteId: string, newTitle: string) => {
    if (newTitle.trim() !== '') {
      updateNote(noteId, { title: newTitle.trim() });
    }
    setEditingNoteId(null);
  }, [updateNote]);

  const handleNoteRenameCancel = useCallback(() => {
    setEditingNoteId(null);
  }, []);

  // Emoji picker handlers
  const handleNoteEmojiClick = useCallback((noteId: string, buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setEmojiTrayPosition({ top: rect.bottom + 8, left: rect.left });
    setEditingEmojiNoteId(noteId);
    setEditingEmojiFolderId(null);
    setIsEmojiTrayOpen(true);
  }, []);

  const handleFolderEmojiClick = useCallback((folderId: string, buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setEmojiTrayPosition({ top: rect.bottom + 8, left: rect.left });
    setEditingEmojiFolderId(folderId);
    setEditingEmojiNoteId(null);
    setIsEmojiTrayOpen(true);
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    if (editingEmojiNoteId) {
      updateNote(editingEmojiNoteId, { emoji });
    } else if (editingEmojiFolderId) {
      updateFolder(editingEmojiFolderId, { emoji });
    }
    setIsEmojiTrayOpen(false);
    setEditingEmojiNoteId(null);
    setEditingEmojiFolderId(null);
  }, [editingEmojiNoteId, editingEmojiFolderId, updateNote, updateFolder]);

  const handleDeleteNote = useCallback((noteId: string) => {
    if (window.confirm('Move this note to trash?')) {
      // Soft delete the note (move to trash)
      deleteNote(noteId);
      
      // If deleting the currently open note, keep it open but update context
      // The parent component (NoteEditor) will handle updating the view context
      // No navigation needed - user stays on the same note
    }
  }, [deleteNote]);

  const getNoteActions = (noteId: string) => [
    <ContextMenu
      key="more"
      items={[
        {
          icon: <Pencil size={16} />,
          label: 'Rename',
          onClick: () => handleRenameNote(noteId),
        },
        { separator: true },
        {
          icon: <Trash2 size={16} />,
          label: 'Delete',
          onClick: () => handleDeleteNote(noteId),
          danger: true,
        },
      ]}
    >
      <TertiaryButton
        icon={<MoreVertical size={16} />}
        size="xs"
      />
    </ContextMenu>
  ];

  // Folder actions with context menu
  const handleRenameFolder = useCallback((folderId: string) => {
    setEditingFolderId(folderId);
  }, []);

  const handleFolderRenameComplete = useCallback((folderId: string, newName: string) => {
    if (newName.trim() !== '') {
      updateFolder(folderId, { name: newName.trim() });
    }
    setEditingFolderId(null);
  }, [updateFolder]);

  const handleFolderRenameCancel = useCallback(() => {
    setEditingFolderId(null);
  }, []);

  const handleDeleteFolder = useCallback((folderId: string) => {
    if (window.confirm('Are you sure you want to delete this folder? Notes inside will be moved to Cluttered Note.')) {
      // Move all notes in folder to cluttered
      const notesInFolder = notes.filter(n => n.folderId === folderId);
      notesInFolder.forEach(note => {
        updateNote(note.id, { folderId: null });
      });
      
      // Delete the folder
      deleteFolder(folderId);
    }
  }, [notes, updateNote, deleteFolder]);

  const getFolderActions = (folderId: string) => [
    <TertiaryButton
      key="add"
      icon={<Plus size={16} />}
      onClick={(e) => {
        e.stopPropagation();
        handleCreateNoteInFolder(folderId);
      }}
      size="xs"
    />,
    // TODO: Add right-click context menu for rename/delete
  ];

  // Tag actions with context menu
  const handleRenameTag = useCallback((tag: string) => {
    setEditingTag(tag);
  }, []);

  const handleTagRenameComplete = useCallback((oldTag: string, newTag: string) => {
    if (newTag.trim() !== '' && newTag.trim() !== oldTag) {
      // Find all notes with this tag and update them
      notes.forEach((note) => {
        if (note.tags.some((t) => t.toLowerCase() === oldTag.toLowerCase())) {
          const updatedTags = note.tags.map((t) =>
            t.toLowerCase() === oldTag.toLowerCase() ? newTag.trim() : t
          );
          updateNote(note.id, { tags: updatedTags });
        }
      });
    }
    setEditingTag(null);
  }, [notes, updateNote]);

  const handleTagRenameCancel = useCallback(() => {
    setEditingTag(null);
  }, []);

  const handleDeleteTag = useCallback((tag: string) => {
    if (window.confirm(`Are you sure you want to delete the tag "${tag}"? It will be removed from all notes.`)) {
      // Find all notes with this tag and remove it
      notes.forEach((note) => {
        if (note.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
          const updatedTags = note.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
          updateNote(note.id, { tags: updatedTags });
        }
      });
      
      // If the deleted tag was selected, clear the selection and go back to editor
      if (selectedTag?.toLowerCase() === tag.toLowerCase()) {
        setSelectedTag(null);
        onBackToEditor?.();
      }
    }
  }, [notes, updateNote, selectedTag, onBackToEditor]);

  const getTagActions = (tag: string) => [
    <ContextMenu
      key="more"
      items={[
        {
          icon: <Pencil size={16} />,
          label: 'Rename',
          onClick: () => handleRenameTag(tag),
        },
        { separator: true },
        {
          icon: <Trash2 size={16} />,
          label: 'Delete',
          onClick: () => handleDeleteTag(tag),
          danger: true,
        },
      ]}
    >
      <TertiaryButton
        icon={<MoreVertical size={16} />}
        size="xs"
      />
    </ContextMenu>
  ];


  // Keyboard shortcut for creating new note (Cmd+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+N (Mac) or Ctrl+N (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateNote]);

  // Keyboard shortcut for toggling sidebar (Cmd+\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\ (Mac) or Ctrl+\ (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        onToggleSidebar?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggleSidebar]);

  // Keyboard shortcut for opening today's note (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D (both Mac and Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const today = new Date();
        onDateSelect?.(today);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDateSelect]);

  // Keyboard shortcuts for switching sidebar tabs (Cmd+1, Cmd+2, Cmd+3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Cmd/Ctrl is pressed (no Shift)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setContentType('notes');
        } else if (e.key === '2') {
          e.preventDefault();
          setContentType('tasks');
        } else if (e.key === '3') {
          e.preventDefault();
          setContentType('tags');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global logic: Sync selectedTag with currentView (single source of truth)
  useEffect(() => {
    if (currentView?.type === 'tagFilter') {
      // In tag view: select the tag being viewed
      setSelectedTag(currentView.tag);
    } else {
      // In editor view: clear tag selection
      setSelectedTag(null);
    }
  }, [currentView]);

  // Cleanup drag leave timeout on unmount
  useEffect(() => {
    return () => {
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="sidebar"
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        height: '100%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `.5px solid ${colors.border.default}`,
        position: 'relative',
        marginLeft: isCollapsed ? `-${sidebarWidth}px` : '0',
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
        overflow: 'hidden',
        backgroundColor: colors.background.secondary,
      }}
    >
      {/* Full sidebar content - always rendered, slides out with container */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SidebarContainer
            contentType={contentType}
            onContentTypeChange={(type) => setContentType(type as 'notes' | 'tasks' | 'tags')}
            onCreateNote={handleCreateNote}
            onSearch={() => {}}
            createButtonShortcut="⌘ N"
            width="100%"
            height="100%"
            showWindowControls={true}
            onToggleSidebar={onToggleSidebar}
            isCollapsed={isCollapsed}
          >
            {/* Carousel wrapper for slide animation */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}>
              {/* Notes Tab */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transform: currentVisualTab === 'notes' 
                  ? 'translateX(0)' 
                  : prevVisualTab === 'notes' && isTransitioning
                    ? slideDirection === 'left' ? 'translateX(-100%)' : 'translateX(100%)'
                    : getTabPosition('notes'),
                opacity: currentVisualTab === 'notes' || (prevVisualTab === 'notes' && isTransitioning) ? 1 : 0,
                transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.25s ease',
                pointerEvents: currentVisualTab === 'notes' ? 'auto' : 'none',
              }}>
                {(currentVisualTab === 'notes' || (prevVisualTab === 'notes' && isTransitioning)) && (
                  <NotesView
                clutteredNotes={clutteredNotes}
                onClutteredNoteClick={handleNoteMultiSelect}
                isClutteredCollapsed={isClutteredCollapsed}
                onClutteredToggle={() => {
                  setHasManuallyToggledCluttered(true);
                  setIsClutteredCollapsed(!isClutteredCollapsed);
                }}
                onClutteredFolderClick={() => onFolderClick?.('cluttered')}
                favouriteNotes={favouriteNotes}
                onFavouriteClick={handleNoteMultiSelect}
                isFavouritesCollapsed={isFavouritesCollapsed}
                onFavouritesToggle={() => {
                  setHasManuallyToggledFavourites(true);
                  setIsFavouritesCollapsed(!isFavouritesCollapsed);
                }}
                onFavouritesHeaderClick={handleFavouritesHeaderClick}
                folders={sidebarFolders}
                onFolderClick={handleFolderMultiSelect}
                onFolderToggle={handleFolderToggle}
                onFolderAdd={handleCreateFolder}
                isFoldersCollapsed={isFoldersCollapsed}
                onFoldersToggle={() => {
                  setHasManuallyToggledFolders(true);
                  setIsFoldersCollapsed(!isFoldersCollapsed);
                }}
                onFoldersHeaderClick={handleFoldersHeaderClick}
                foldersHeaderActions={[
                  <TertiaryButton
                    key="add"
                    icon={<Plus size={sizing.icon.sm} />}
                    onClick={() => handleCreateFolder()}
                    size="xs"
                  />
                ]}
                selectedNoteId={currentView?.type === 'editor' ? currentNoteId : null}
                selectedNoteIds={selectedNoteIds}
                selectedFolderIds={selectedFolderIds}
                getNoteActions={getNoteActions}
                getFolderActions={getFolderActions}
                onNoteDragStart={(id, context) => handleDragStart('note', id, context)}
                onFolderDragStart={(id, context) => handleDragStart('folder', id, context)}
                onDragEnd={handleDragEnd}
                onFolderDragOver={(id) => handleDragOver('folder', id)}
                onClutteredDragOver={() => handleDragOver('cluttered', null)}
                onDragLeave={handleDragLeave}
                onFolderDrop={(id) => handleDrop('folder', id)}
                onClutteredDrop={() => handleDrop('cluttered', null)}
                draggedItemId={draggedItem?.ids || null}
                dropTargetId={dropTarget?.id || null}
                dropTargetType={dropTarget?.type || null}
                onNoteDragOverForReorder={(id, pos, ctx) => handleDragOverForReorder('note', id, pos, ctx)}
                onNoteDragLeaveForReorder={handleDragLeaveForReorder}
                onNoteDropForReorder={(id, pos, ctx) => handleDropForReorder('note', id, pos, ctx)}
                onFolderDragOverForReorder={(id, pos, ctx) => handleDragOverForReorder('folder', id, pos, ctx)}
                onFolderDragLeaveForReorder={handleDragLeaveForReorder}
                onFolderDropForReorder={(id, pos, ctx) => handleDropForReorder('folder', id, pos, ctx)}
                reorderDropTarget={reorderDropTarget}
                editingNoteId={editingNoteId}
                editingFolderId={editingFolderId}
                onNoteRenameComplete={handleNoteRenameComplete}
                onNoteRenameCancel={handleNoteRenameCancel}
                onFolderRenameComplete={handleFolderRenameComplete}
                onFolderRenameCancel={handleFolderRenameCancel}
                onNoteEmojiClick={handleNoteEmojiClick}
                onFolderEmojiClick={handleFolderEmojiClick}
              />
                )}
              </div>

              {/* Tasks Tab */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transform: currentVisualTab === 'tasks'
                  ? 'translateX(0)'
                  : prevVisualTab === 'tasks' && isTransitioning
                    ? slideDirection === 'left' ? 'translateX(-100%)' : 'translateX(100%)'
                    : getTabPosition('tasks'),
                opacity: currentVisualTab === 'tasks' || (prevVisualTab === 'tasks' && isTransitioning) ? 1 : 0,
                transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.25s ease',
                pointerEvents: currentVisualTab === 'tasks' ? 'auto' : 'none',
              }}>
                {(currentVisualTab === 'tasks' || (prevVisualTab === 'tasks' && isTransitioning)) && (
                  <>
                    {/* Calendar for tasks */}
                    <div style={{ marginBottom: '16px' }}>
                  <SidebarCalendar 
                    noPadding={true}
                    onDateSelect={onDateSelect}
                    selectedDate={(() => {
                      // Get the current note's daily date if it exists
                      const currentNote = notes.find(n => n.id === currentNoteId);
                      if (currentNote?.dailyNoteDate) {
                        // Parse YYYY-MM-DD as local date
                        const [year, month, day] = currentNote.dailyNoteDate.split('-').map(Number);
                        return new Date(year, month - 1, day);
                      }
                      return undefined;
                    })()}
                    datesWithNotes={(() => {
                      // Get all dates that have daily notes
                      const dates = new Set<string>();
                      notes.forEach(note => {
                        if (note.dailyNoteDate && !note.deletedAt) {
                          dates.add(note.dailyNoteDate);
                        }
                      });
                      return dates;
                    })()}
                  />
                </div>
                
                {/* Tasks list */}
                <TasksView
                  onTaskClick={(noteId, taskId) => {
                    // Navigate to the note containing the task and scroll to the task block
                    if (onNoteClickWithBlock) {
                      onNoteClickWithBlock(noteId, taskId);
                    } else {
                      // Fallback if the handler is not provided
                      setCurrentNoteId(noteId);
                      onNoteClickFromSidebar?.();
                    }
                  }}
                  onAllTasksHeaderClick={handleAllTasksHeaderClick}
                />
                  </>
                )}
              </div>

              {/* Tags Tab */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transform: currentVisualTab === 'tags'
                  ? 'translateX(0)'
                  : prevVisualTab === 'tags' && isTransitioning
                    ? slideDirection === 'left' ? 'translateX(-100%)' : 'translateX(100%)'
                    : getTabPosition('tags'),
                opacity: currentVisualTab === 'tags' || (prevVisualTab === 'tags' && isTransitioning) ? 1 : 0,
                transition: 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.25s ease',
                pointerEvents: currentVisualTab === 'tags' ? 'auto' : 'none',
              }}>
                {(currentVisualTab === 'tags' || (prevVisualTab === 'tags' && isTransitioning)) && (
                  <TagsView
                selectedTag={selectedTag}
                onTagClick={(tag, source) => {
                  setSelectedTag(tag);
                  onTagClick?.(tag, source);
                }}
                isAllTagsCollapsed={isAllTagsCollapsed}
                onAllTagsToggle={() => setIsAllTagsCollapsed(!isAllTagsCollapsed)}
                onAllTagsHeaderClick={handleAllTagsHeaderClick}
                isFavouritesCollapsed={isFavouritesCollapsed}
                onFavouritesToggle={() => setIsFavouritesCollapsed(!isFavouritesCollapsed)}
                onFavouritesHeaderClick={handleFavouriteTagsHeaderClick}
                getTagActions={getTagActions}
                editingTag={editingTag}
                onTagRenameComplete={handleTagRenameComplete}
                onTagRenameCancel={handleTagRenameCancel}
              />
                )}
              </div>
            </div>
          </SidebarContainer>
        </div>

      {/* Bottom: Action buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: DESIGN.footer.iconButtonGap,
          padding: DESIGN.footer.padding,
          flexShrink: 0,
        }}
      >
        {useMemo(() => {
          const buttons = [
            {
              id: 'theme',
              icon: mode === 'dark' ? <Sun size={DESIGN.sizing.iconSize} /> : <Moon size={DESIGN.sizing.iconSize} />,
              onClick: onToggleTheme,
              title: mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
            },
            {
              id: 'keyboard',
              icon: <Keyboard size={DESIGN.sizing.iconSize} />,
              onClick: onShowKeyboardShortcuts,
              ref: keyboardButtonRef,
            },
          ];

          return (
            <>
              {buttons.map((button) => (
                <div 
                  key={button.id} 
                  ref={button.id === 'keyboard' ? keyboardButtonRef : undefined} 
                  style={{ 
                    display: 'flex',
                  }}
                >
                  <TertiaryButton
                    icon={button.icon}
                    onClick={button.onClick}
                    size="medium"
                  />
                </div>
              ))}
              {/* Spacer to push buttons to the right - always present */}
              <div 
                style={{ 
                  flex: isCollapsed ? 0 : 1,
                  transition: 'flex 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  minWidth: 0,
                }} 
              />
              {/* Trash button at far right (only in expanded state) */}
              {!isCollapsed && (
                <div 
                  style={{ 
                    display: 'flex',
                  }}
                >
                  <TertiaryButton
                    icon={<Trash2 size={DESIGN.sizing.iconSize} />}
                    onClick={() => {
                      onFolderClick?.('deleted-items');
                    }}
                    size="medium"
                  />
                </div>
              )}
            </>
          );
        }, [mode, onToggleTheme, onShowKeyboardShortcuts, keyboardButtonRef, isCollapsed])}
      </div>

      {/* Resize Handle - always shown for drag-to-expand functionality */}
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '4px',
          height: '100%',
          cursor: 'ew-resize',
          backgroundColor: isResizing ? colors.border.default : 'transparent',
          zIndex: 10,
          transition: 'background-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = colors.border.default;
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      />
      
      {/* Emoji Tray */}
      <EmojiTray
        isOpen={isEmojiTrayOpen}
        onClose={() => {
          setIsEmojiTrayOpen(false);
          setEditingEmojiNoteId(null);
          setEditingEmojiFolderId(null);
        }}
        onSelect={handleEmojiSelect}
        position={emojiTrayPosition}
      />
    </div>
  );
};

