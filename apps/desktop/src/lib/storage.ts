/**
 * Simple Local Storage System
 * 
 * Step 1: Basic folder selection and single-note save/load
 * - User picks a folder
 * - Save notes as JSON files
 * - Load notes from JSON files
 */

import { open } from '@tauri-apps/api/dialog';
import { 
  writeTextFile, 
  readTextFile, 
  exists, 
  readDir
} from '@tauri-apps/api/fs';
import type { Note } from '@clutter/shared';

const STORAGE_FOLDER_KEY = 'clutter-storage-folder';

/**
 * Opens a folder picker dialog for the user to select storage location
 * Saves the selected path to localStorage
 */
export async function selectStorageFolder(): Promise<string | null> {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Storage Folder',
    });
    
    if (selected && typeof selected === 'string') {
      localStorage.setItem(STORAGE_FOLDER_KEY, selected);
      return selected;
    }

    return null;
  } catch (error) {
    console.error('Error selecting folder:', error);
    throw error;
  }
}

/**
 * Gets the currently configured storage folder path
 */
export function getStorageFolder(): string | null {
  return localStorage.getItem(STORAGE_FOLDER_KEY);
}

/**
 * Saves a single note to the storage folder as a JSON file
 * File name format: {noteId}.json
 */
export async function saveNote(note: Note): Promise<void> {
  const folderPath = getStorageFolder();
  
  if (!folderPath) {
    throw new Error('No storage folder configured. Please select a folder first.');
  }

  try {
    const fileName = `${note.id}.json`;
    const filePath = `${folderPath}/${fileName}`;
    const noteData = JSON.stringify(note, null, 2);
  
    await writeTextFile(filePath, noteData);
    console.log(`✅ Note saved: ${fileName}`);
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
    }
  }

/**
 * Loads a single note from the storage folder
 */
export async function loadNote(noteId: string): Promise<Note | null> {
  const folderPath = getStorageFolder();
  
  if (!folderPath) {
    return null;
  }

  try {
    const fileName = `${noteId}.json`;
    const filePath = `${folderPath}/${fileName}`;
  
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return null;
    }
    
    const fileContent = await readTextFile(filePath);
    const note = JSON.parse(fileContent) as Note;
    
    console.log(`✅ Note loaded: ${fileName}`);
    return note;
  } catch (error) {
    console.error(`Error loading note ${noteId}:`, error);
    return null;
  }
}

/**
 * Loads all notes from the storage folder
 */
export async function loadAllNotes(): Promise<Note[]> {
  const folderPath = getStorageFolder();
  
  if (!folderPath) {
    console.log('No storage folder configured');
    return [];
  }
  
  try {
    const entries = await readDir(folderPath);
    const notes: Note[] = [];
    
    for (const entry of entries) {
      if (entry.name?.endsWith('.json')) {
        const filePath = `${folderPath}/${entry.name}`;
        try {
          const fileContent = await readTextFile(filePath);
          const note = JSON.parse(fileContent) as Note;
          notes.push(note);
        } catch (error) {
          console.error(`Error loading ${entry.name}:`, error);
        }
      }
    }
    
    console.log(`✅ Loaded ${notes.length} notes from disk`);
    return notes;
  } catch (error) {
    console.error('Error loading all notes:', error);
    return [];
  }
}

