/**
 * Auto-save hook for SQLite (Apple Notes approach)
 * 
 * Flow:
 * 1. User types → Zustand updates (instant UI feedback)
 * 2. After 2s idle → Save to SQLite (debounced batch save)
 * 3. On note switch → Save immediately (no data loss)
 * 4. On startup → Load from SQLite (single source of truth)
 * 
 * Optimizations:
 * - Only saves notes that changed (tracks last saved content)
 * - Saves multiple notes in parallel (Promise.allSettled)
 * - Skips saving on initial load to prevent overwriting DB data
 */

import { useEffect, useRef } from 'react';
import { useNotesStore } from '@clutter/state';
import { saveNoteToDatabase } from '../lib/database';

// Local type to avoid import issues
type Note = {
  id: string;
  title: string;
  description: string;
  content: string;
  emoji: string | null;
  tags: string[];
  folderId: string;
  dailyNoteDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isFavorite: boolean;
  descriptionVisible: boolean;
  tagsVisible: boolean;
};

// Simple hash function for change detection
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// 🛡️ Check if content is pure boot state (completely empty, no structure)
// Allow structured empty content (intentional deletions)
function isBootEmptyTipTap(content: string): boolean {
  return (
    !content ||
    content.trim() === '' ||
    content === '""' ||
    content === '{}'
  );
}

export function useAutoSave(isEnabled: boolean = true, isHydrated: boolean = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentNoteId = (useNotesStore as any)((state: any) => state.currentNoteId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notesForSeeding = (useNotesStore as any)((state: any) => state.notes);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedHashRef = useRef<Map<string, string>>(new Map());
  const isInitialLoadRef = useRef(true);
  
  // 🛡️ Immediate flush function (bypasses debounce)
  const flushSaveImmediately = async () => {
    if (!isEnabled || !isHydrated || isInitialLoadRef.current) return;
    
    // Cancel pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const notes: Note[] = notesForSeeding;
    
    // Find notes that have changed
    const changedNotes = notes.filter((note: Note) => {
      if (isBootEmptyTipTap(note.content)) {
        lastSavedHashRef.current.set(note.id, hashContent(note.content));
        return false;
      }
      
      const lastSavedHash = lastSavedHashRef.current.get(note.id);
      const currentHash = hashContent(note.content);
      return lastSavedHash !== currentHash;
    });
    
    if (changedNotes.length === 0) return;
    
    console.log(`💾 Flush: Saving ${changedNotes.length} note(s) immediately...`);
    
    // Save all changed notes synchronously (critical for unload)
    await Promise.allSettled(
      changedNotes.map(async (note: Note) => {
        try {
          await saveNoteToDatabase(note);
          lastSavedHashRef.current.set(note.id, hashContent(note.content));
          console.log(`✅ Flushed: ${note.title || 'Untitled'}`);
        } catch (error) {
          console.error(`❌ Flush failed for ${note.id}:`, error);
        }
      })
    );
  };

  // Initialize lastSavedHashRef AFTER hydration completes
  // 🛡️ CRITICAL: Must wait for isHydrated to avoid false diffs during startup
  useEffect(() => {
    if (isInitialLoadRef.current && isEnabled && isHydrated) {
      if (notesForSeeding.length > 0) {
        console.log(`🌱 Auto-save: Seeding hashes for ${notesForSeeding.length} notes after hydration`);
        notesForSeeding.forEach((note: Note) => {
          lastSavedHashRef.current.set(note.id, hashContent(note.content));
        });
        isInitialLoadRef.current = false;
        console.log(`✅ Auto-save: Ready! Will save changes after 2s idle time`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isHydrated]);
  
  // 🚨 CRITICAL: Save on window unload/reload (prevents data loss)
  useEffect(() => {
    if (!isEnabled || !isHydrated) return;
    
    const handleBeforeUnload = () => {
      // Must be synchronous for beforeunload
      flushSaveImmediately();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isHydrated]);

  useEffect(() => {
    // 🛡️ Hard gates (non-negotiable)
    if (!isEnabled || !isHydrated || isInitialLoadRef.current) {
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Read notes fresh from store (avoids re-renders on metadata changes)
    const notes: Note[] = notesForSeeding;

    // Find notes that have changed (hash-based detection)
    const changedNotes = notes.filter((note: Note) => {
      // 🛡️ NEVER autosave TipTap boot state (not user intent)
      if (isBootEmptyTipTap(note.content)) {
        // Update hash so we don't keep checking this
        lastSavedHashRef.current.set(note.id, hashContent(note.content));
        return false;
      }
      
      const lastSavedHash = lastSavedHashRef.current.get(note.id);
      const currentHash = hashContent(note.content);
      
      // Note has changed if hash is different
      return lastSavedHash !== currentHash;
    });

    if (changedNotes.length === 0) {
      return; // No changes to save
    }

    console.log(`⏰ Auto-save: ${changedNotes.length} note(s) changed, will save in 2s...`);

    // Debounce: Save after 2 seconds of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      console.log(`💾 Auto-save: Saving ${changedNotes.length} note(s)...`);
      
      // Save all changed notes in parallel for better performance
      await Promise.allSettled(
        changedNotes.map(async (note: Note) => {
          try {
            await saveNoteToDatabase(note);
            // Update last saved hash
            lastSavedHashRef.current.set(note.id, hashContent(note.content));
            console.log(`✅ Saved: ${note.title || 'Untitled'} (${note.content.length} chars)`);
          } catch (error) {
            console.error(`❌ Auto-save failed for ${note.id}:`, error);
          }
        })
      );
    }, 2000); // 2 second debounce (like Notion)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notesForSeeding, currentNoteId, isEnabled, isHydrated]); // ✅ Must depend on notes to detect content changes!

  // Save immediately when switching notes (flush on note boundary)
  useEffect(() => {
    if (!isEnabled || !isHydrated || isInitialLoadRef.current) {
      return;
    }
    
    // Flush any unsaved changes before switching
    flushSaveImmediately();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNoteId, isEnabled, isHydrated]);
}

