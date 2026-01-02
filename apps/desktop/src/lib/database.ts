/**
 * SQLite Database Layer for Clutter Notes
 * 
 * Uses rusqlite via Tauri commands for fast, reliable local storage
 */

import { invoke } from '@tauri-apps/api/tauri';
import type { Note, Folder, Tag } from '@clutter/shared';

const STORAGE_FOLDER_KEY = 'clutter-storage-folder';

/**
 * Get the database path based on storage folder
 */
export function getDatabasePath(): string | null {
  const folder = localStorage.getItem(STORAGE_FOLDER_KEY);
  if (!folder) return null;
  return `${folder}/clutter.db`;
}

/**
 * Initialize the SQLite database
 * Creates tables and indexes if they don't exist
 */
export async function initDatabase(): Promise<string> {
  const dbPath = getDatabasePath();
  if (!dbPath) {
    throw new Error('No storage folder configured');
  }

  try {
    const result = await invoke<string>('init_database', { dbPath });
    return result;
  } catch (error) {
    console.error('❌ Database init error:', error);
    throw error;
  }
}

/**
 * Save a note to SQLite database with FK validation
 */
export async function saveNoteToDatabase(note: Note): Promise<void> {
  console.log('💾 Saving note to database:', {
    id: note.id,
    title: note.title,
    hasContent: !!note.content,
    contentLength: note.content?.length || 0,
    contentPreview: note.content?.substring(0, 50)
  });
  try {
    await invoke<string>('save_note', { note });
    console.log('✅ Note saved to database:', note.id);
  } catch (error: any) {
    // Check if this is an FK constraint error
    const errorStr = String(error);
    
    if (errorStr.includes('FOREIGN KEY constraint failed')) {
      // 📊 TELEMETRY: Log FK error with full context
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🚨 FOREIGN KEY CONSTRAINT VIOLATION (Note)');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Note Details:', {
        id: note.id,
        title: note.title,
        folderId: note.folderId,
        tags: note.tags,
        deletedAt: note.deletedAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
      console.error('Error:', errorStr);
      console.error('Stack:', new Error().stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Try recovery: Clear the problematic folder_id and retry
      if (note.folderId) {
        console.warn(`🔧 Attempting recovery: Clearing invalid folder_id "${note.folderId}"`);
        const recoveredNote = { ...note, folderId: null };
        
        try {
          await invoke<string>('save_note', { note: recoveredNote });
          console.log('✅ Note saved with folder_id cleared');
          
          // Log successful recovery
          console.log('📊 Recovery successful - note moved to root folder');
          return;
        } catch (retryError) {
          console.error('❌ Recovery failed:', retryError);
        }
      }
    }
    
    console.error('❌ SQLite save error:', error);
    throw error;
  }
}

/**
 * Load a single note from SQLite database
 */
export async function loadNoteFromDatabase(noteId: string): Promise<Note | null> {
  try {
    const note = await invoke<Note>('load_note', { noteId });
    return note;
  } catch (error) {
    console.error('❌ SQLite load error:', error);
    return null;
  }
}

/**
 * Load all notes from SQLite database
 */
export async function loadAllNotesFromDatabase(): Promise<Note[]> {
  try {
    const notes = await invoke<Note[]>('load_all_notes');
    console.log('📂 Loaded notes from database:', notes.map(n => ({
      id: n.id,
      title: n.title,
      hasContent: !!n.content,
      contentLength: n.content?.length || 0,
      contentPreview: n.content?.substring(0, 50)
    })));
    return notes;
  } catch (error) {
    console.error('❌ SQLite load all error:', error);
    return [];
  }
}

/**
 * Search notes using full-text search (FTS5)
 * Returns ranked results matching the query
 */
export async function searchNotesInDatabase(query: string): Promise<Note[]> {
  try {
    const notes = await invoke<Note[]>('search_notes', { query });
    return notes;
  } catch (error) {
    console.error('❌ SQLite search error:', error);
    return [];
  }
}

/**
 * Save a folder to SQLite database with FK validation
 */
export async function saveFolderToDatabase(folder: Folder): Promise<void> {
  try {
    await invoke<string>('save_folder', { folder });
  } catch (error: any) {
    // Check if this is an FK constraint error (parent_id reference)
    const errorStr = String(error);
    
    if (errorStr.includes('FOREIGN KEY constraint failed')) {
      // 📊 TELEMETRY: Log FK error with full context
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🚨 FOREIGN KEY CONSTRAINT VIOLATION (Folder)');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Folder Details:', {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        tags: folder.tags,
        deletedAt: folder.deletedAt,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      });
      console.error('Error:', errorStr);
      console.error('Stack:', new Error().stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Try recovery: Clear the problematic parent_id and retry (move to root)
      if (folder.parentId) {
        console.warn(`🔧 Attempting recovery: Moving folder "${folder.name}" to root`);
        const recoveredFolder = { ...folder, parentId: null };
        
        try {
          await invoke<string>('save_folder', { folder: recoveredFolder });
          console.log('✅ Folder saved at root level');
          
          // Log successful recovery
          console.log('📊 Recovery successful - folder moved to root');
          return;
        } catch (retryError) {
          console.error('❌ Recovery failed:', retryError);
        }
      }
    }
    
    console.error('❌ SQLite save folder error:', error);
    throw error;
  }
}

/**
 * Load all folders from SQLite database
 */
export async function loadAllFoldersFromDatabase(): Promise<Folder[]> {
  try {
    const folders = await invoke<Folder[]>('load_all_folders');
    return folders;
  } catch (error) {
    console.error('❌ SQLite load folders error:', error);
    return [];
  }
}

/**
 * Save tag metadata to SQLite database
 */
export async function saveTagToDatabase(tag: Tag): Promise<void> {
  try {
    await invoke<string>('save_tag', { tag });
  } catch (error) {
    console.error('❌ SQLite save tag error:', error);
    throw error;
  }
}

/**
 * Load all tag metadata from SQLite database
 */
export async function loadAllTagsFromDatabase(): Promise<Tag[]> {
  try {
    const tags = await invoke<Tag[]>('load_all_tags');
    return tags;
  } catch (error) {
    console.error('❌ SQLite load tags error:', error);
    return [];
  }
}

/**
 * Delete tag metadata from SQLite database
 * Note: Junction tables (note_tags, folder_tags) cascade delete automatically
 */
export async function deleteTagFromDatabase(tagName: string): Promise<void> {
  try {
    await invoke<string>('delete_tag', { tagName });
    console.log(`✅ Deleted tag "${tagName}" from database`);
  } catch (error) {
    console.error('❌ SQLite delete tag error:', error);
    throw error;
  }
}

/**
 * Permanently delete a note from SQLite database
 * This removes the note record and all associated junction table entries
 */
export async function deleteNotePermanently(noteId: string): Promise<void> {
  try {
    await invoke<string>('delete_note_permanently', { noteId });
    console.log(`✅ Permanently deleted note "${noteId}" from database`);
  } catch (error) {
    console.error('❌ SQLite delete note error:', error);
    throw error;
  }
}

/**
 * Permanently delete a folder from SQLite database
 * This removes the folder record and all associated junction table entries
 */
export async function deleteFolderPermanently(folderId: string): Promise<void> {
  try {
    await invoke<string>('delete_folder_permanently', { folderId });
    console.log(`✅ Permanently deleted folder "${folderId}" from database`);
  } catch (error) {
    console.error('❌ SQLite delete folder error:', error);
    throw error;
  }
}

/**
 * Migration: Move orphaned notes to Cluttered
 * Notes referencing non-existent folders are moved to root (Cluttered)
 */
export async function migrateOrphanedNotes(notes: Note[], existingFolders: Folder[]): Promise<number> {
  // Build map of existing folder IDs
  const existingFolderIds = new Set(existingFolders.map(f => f.id));
  
  // Find orphaned notes (notes pointing to non-existent folders)
  const orphanedNotes = notes.filter(note => {
    // Skip deleted notes
    if (note.deletedAt) return false;
    // Skip notes without a folder (already in Cluttered)
    if (!note.folderId) return false;
    // Check if folder exists
    return !existingFolderIds.has(note.folderId);
  });
  
  if (orphanedNotes.length === 0) {
    console.log('✅ No orphaned notes found');
    return 0;
  }
  
  console.warn(`🔧 Migration: Found ${orphanedNotes.length} orphaned notes, moving to Cluttered`);
  
  // Move each orphaned note to Cluttered
  let fixedCount = 0;
  for (const note of orphanedNotes) {
    const oldFolderId = note.folderId;
    
    try {
      // Update note to have no folder (moves to Cluttered)
      const updatedNote: Note = {
        ...note,
        folderId: null,
        updatedAt: new Date().toISOString()
      };
      
      await saveNoteToDatabase(updatedNote);
      
      // Update in-memory reference
      note.folderId = null;
      note.updatedAt = updatedNote.updatedAt;
      
      fixedCount++;
      console.log(`✅ Moved note "${note.title || 'Untitled'}" to Cluttered (was in missing folder: ${oldFolderId})`);
    } catch (error) {
      console.error(`❌ Failed to move note ${note.id} to Cluttered:`, error);
    }
  }
  
  console.log(`✅ Migration complete: Moved ${fixedCount} notes to Cluttered`);
  return fixedCount;
}

/**
 * Verify database integrity (for debugging)
 * Returns a report of any FK constraint issues
 */
export async function verifyDatabaseIntegrity(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    const [notes, folders] = await Promise.all([
      loadAllNotesFromDatabase(),
      loadAllFoldersFromDatabase(),
    ]);
    
    const folderIds = new Set(folders.map(f => f.id));
    
    // Check for orphaned note references
    notes.forEach(note => {
      if (note.folderId && !folderIds.has(note.folderId)) {
        issues.push(`Note "${note.title}" (${note.id}) references non-existent folder: ${note.folderId}`);
      }
    });
    
    // Check for orphaned folder parent references
    folders.forEach(folder => {
      if (folder.parentId && !folderIds.has(folder.parentId)) {
        issues.push(`Folder "${folder.name}" (${folder.id}) references non-existent parent: ${folder.parentId}`);
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ Database integrity verified - no issues found');
      return { isValid: true, issues: [] };
    } else {
      console.warn(`⚠️ Found ${issues.length} integrity issues:`, issues);
      return { isValid: false, issues };
    }
  } catch (error) {
    console.error('❌ Error verifying database integrity:', error);
    return { isValid: false, issues: ['Failed to verify database'] };
  }
}

