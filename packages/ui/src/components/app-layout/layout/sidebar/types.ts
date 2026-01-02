// Sidebar-specific view types (different from store types)
export interface SidebarNote {
  id: string;
  title: string;
  icon?: string | null;
  isFavorite?: boolean;
  hasContent?: boolean; // Whether the note has editor content (for Note/NoteBlank icon switching)
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

