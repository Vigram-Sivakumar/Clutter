/**
 * Centralized Icon System
 * Single source of truth for all note and folder icons across the app
 */

import { ReactNode } from 'react';
import { CLUTTERED_FOLDER_ID, DAILY_NOTES_FOLDER_ID } from '@clutter/shared';
import { Tray, Calendar, CalendarDot, CalendarBlank, Note, NoteBlank, Folder, FolderOpen, CheckSquare } from '../icons';

// System folder IDs
const SYSTEM_FOLDERS = {
  CLUTTERED: CLUTTERED_FOLDER_ID, // '__cluttered__'
  DAILY_NOTES: DAILY_NOTES_FOLDER_ID, // '__daily_notes__'
  ALL_TASKS: 'all-tasks',
} as const;

// Export system folder IDs for use in components
export const ALL_TASKS_FOLDER_ID = SYSTEM_FOLDERS.ALL_TASKS;

interface GetNoteIconOptions {
  emoji?: string | null;
  dailyNoteDate?: string | null;
  hasContent?: boolean;
  size?: number;
  color?: string;
}

interface GetFolderIconOptions {
  folderId?: string;
  emoji?: string | null;
  isOpen?: boolean;
  size?: number;
  color?: string;
}

/**
 * Single source of truth for note icons
 * 
 * Priority order:
 * 1. Custom emoji (if set)
 * 2. Daily note with content → CalendarDot (single dot)
 * 3. Daily note without content → CalendarBlank (empty)
 * 4. Regular note with content → Note (filled)
 * 5. Regular note without content → NoteBlank (empty)
 * 
 * @example
 * // Regular note with content
 * getNoteIcon({ hasContent: true, color: colors.text.default })
 * 
 * // Daily note with emoji
 * getNoteIcon({ emoji: '📝', dailyNoteDate: '2026-01-01', hasContent: true })
 * 
 * // Empty daily note
 * getNoteIcon({ dailyNoteDate: '2026-01-01', hasContent: false })
 */
export const getNoteIcon = ({
  emoji,
  dailyNoteDate,
  hasContent = false,
  size = 16,
  color,
}: GetNoteIconOptions): ReactNode => {
  // 1. Custom emoji takes priority
  if (emoji) {
    return <span style={{ fontSize: '14px', lineHeight: 1 }}>{emoji}</span>;
  }
  
  // 2. Daily notes get calendar icon - dot if has content, blank if empty
  if (dailyNoteDate) {
    if (hasContent) {
      return <CalendarDot size={size} style={{ color }} />;
    }
    return <CalendarBlank size={size} style={{ color }} />;
  }
  
  // 3. Regular notes - filled if has content, blank if empty
  if (hasContent) {
    return <Note size={size} style={{ color }} />;
  }
  
  return <NoteBlank size={size} style={{ color }} />;
};

/**
 * Single source of truth for folder icons
 * 
 * Priority order:
 * 1. Cluttered system folder → Tray icon
 * 2. Daily Notes system folder → Calendar icon
 * 3. All Tasks system folder → CheckSquare icon
 * 4. Custom emoji (if set)
 * 5. Regular folder open → FolderOpen
 * 6. Regular folder closed → Folder
 * 
 * @example
 * // Cluttered folder
 * getFolderIcon({ folderId: 'cluttered', color: colors.text.default })
 * 
 * // Daily Notes folder
 * getFolderIcon({ folderId: '__daily_notes__', color: colors.text.default })
 * 
 * // All Tasks section
 * getFolderIcon({ folderId: 'all-tasks', color: colors.text.default })
 * 
 * // Regular folder with emoji
 * getFolderIcon({ emoji: '📁', isOpen: true })
 * 
 * // Regular folder without emoji
 * getFolderIcon({ isOpen: false, color: colors.text.secondary })
 */
export const getFolderIcon = ({
  folderId,
  emoji,
  isOpen = false,
  size = 16,
  color,
}: GetFolderIconOptions): ReactNode => {
  // 1. System folders get special icons
  if (folderId === SYSTEM_FOLDERS.CLUTTERED) {
    return <Tray size={size} style={{ color }} />;
  }
  
  if (folderId === SYSTEM_FOLDERS.DAILY_NOTES) {
    return <Calendar size={size} style={{ color }} />;
  }
  
  if (folderId === SYSTEM_FOLDERS.ALL_TASKS) {
    return <CheckSquare size={size} style={{ color }} />;
  }
  
  // 2. Custom emoji
  if (emoji) {
    return <span style={{ fontSize: '14px', lineHeight: 1 }}>{emoji}</span>;
  }
  
  // 3. Default folder icon - open or closed
  if (isOpen) {
    return <FolderOpen size={size} style={{ color }} />;
  }
  
  return <Folder size={size} style={{ color }} />;
};

