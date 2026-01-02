// Sidebar-specific view types (different from store types)
export interface SidebarNote {
  id: string;
  title: string;
  icon?: string | null;
  isFavorite?: boolean;
  hasContent?: boolean; // Whether the note has editor content (for Note/NoteBlank icon switching)
  dailyNoteDate?: string | null; // For daily notes - date in YYYY-MM-DD format
}

export interface SidebarFolder {
  id: string;
  name: string;
  emoji?: string | null;
  isOpen: boolean;
  notes: SidebarNote[];
  subfolders?: SidebarFolder[];
}

export interface SectionState {
  clutteredNote: boolean;
  favourites: boolean;
  folders: boolean;
  recentlyCreated: boolean;
}

/**
 * Global Selection State
 * Unified selection tracking for all sidebar items (notes, folders, tags, tasks)
 * Replaces fragmented selection states (selectionContext, selectedTagContext, etc.)
 */
export interface GlobalSelection {
  /** Type of item selected */
  type: 'note' | 'folder' | 'tag' | 'task' | null;
  /** Primary selected item ID */
  itemId: string | null;
  /** Context where the item was selected (for context-aware highlighting) */
  context: string | null;
  /** Multi-select IDs (for notes, folders, and tasks) */
  multiSelectIds?: Set<string>;
}

