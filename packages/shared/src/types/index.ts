// Shared types across all platforms

// Special folder IDs for system folders
export const CLUTTERED_FOLDER_ID = '__cluttered__';
export const DAILY_NOTES_FOLDER_ID = '__daily_notes__';

export interface Note {
  id: string;
  title: string;
  description: string;
  descriptionVisible: boolean; // Toggle visibility of description
  emoji: string | null;
  content: string; // TipTap JSON stringified
  tags: string[];
  tagsVisible: boolean; // Toggle visibility of tags
  isFavorite: boolean;
  folderId: string | null; // null = "Uncluttered" (root)
  dailyNoteDate: string | null; // ISO date string (YYYY-MM-DD) for daily notes
  createdAt: string; // ISO string for JSON serialization
  updatedAt: string;
  deletedAt: string | null; // Soft delete for sync
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level
  description: string; // Optional folder description
  descriptionVisible: boolean; // Toggle visibility of description
  color: string | null; // Optional folder color
  emoji: string | null; // Optional folder emoji
  tags: string[]; // Tags associated with this folder
  tagsVisible: boolean; // Toggle visibility of tags
  isFavorite: boolean; // Whether folder is favorited
  isExpanded: boolean; // UI state for sidebar
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // Soft delete for sync
}

export interface Tag {
  name: string; // Tag name (case-preserved)
  description: string;
  descriptionVisible: boolean; // Toggle visibility of description
  isFavorite: boolean; // Whether tag is favorited
  color?: string; // Tag color for visual customization
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // Soft delete for sync
}

// Note metadata for index file (lightweight)
export interface NoteMetadata {
  id: string;
  title: string;
  emoji: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark';

