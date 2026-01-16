/**
 * Notes store using Zustand
 * Manages all notes with file-based persistence (Tauri) and localStorage (web)
 * Designed for iCloud Drive sync compatibility
 */

import { create } from 'zustand';
import { Note, DAILY_NOTES_FOLDER_ID } from '@clutter/domain';
import { shouldAllowSave } from './hydration';

// Generate a unique ID
const generateId = () => {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new empty note
const createEmptyNote = (initialValues?: Partial<Note>): Note => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: '',
    description: '',
    descriptionVisible: true,
    emoji: null,
    content: '',
    tags: [],
    tagsVisible: true,
    isFavorite: false,
    folderId: null, // null = "Uncluttered" (root)
    dailyNoteDate: null, // null = regular note, ISO date string = daily note
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...initialValues, // Override with any provided initial values
  };
};

// Internal helper: Get relative date prefix ("Today", "Yesterday", "Tomorrow", or empty)
const getRelativeDatePrefix = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today, ';
  if (diffDays === -1) return 'Yesterday, ';
  if (diffDays === 1) return 'Tomorrow, ';
  return '';
};

// Internal helper: Format daily note title ("Today, 3 Jan 2026" or "3 Jan 2026")
const formatDailyNoteTitle = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const prefix = getRelativeDatePrefix(date);
  const dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  
  return `${prefix}${dateStr}`;
};

interface NotesStore {
  // State
  notes: Note[];
  currentNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Derived
  currentNote: Note | null;
  
  // Actions
  setNotes: (notes: Note[]) => void;
  setCurrentNoteId: (id: string | null) => void;
  createNote: (initialValues?: Partial<Note>, setAsCurrent?: boolean) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => Note | null;
  restoreNote: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
  
  // Single-writer pattern (prevents race conditions)
  updateNoteContent: (id: string, content: string) => void;
  updateNoteMeta: (id: string, updates: Omit<Partial<Note>, 'content' | 'id' | 'createdAt' | 'updatedAt'>) => void;
  
  // Daily notes
  findDailyNoteByDate: (date: Date) => Note | null;
  createDailyNote: (date: Date, setAsCurrent?: boolean) => Note;
  updateDailyNoteTitles: () => void;
  
  // Storage integration (to be implemented by platform)
  saveNote: (note: Note) => Promise<void>;
  loadNotes: () => Promise<void>;
  
  // Helpers
  getNoteById: (id: string) => Note | null;
  getActiveNotes: () => Note[];
  getDeletedNotes: () => Note[];
  searchNotes: (query: string) => Note[];
}

// Platform-specific storage handlers (set by app initialization)
let storageHandlers: {
  save: (note: Note) => Promise<void>;
  load: () => Promise<Note[]>;
  delete: (id: string) => Promise<void>;
} | null = null;

export const setStorageHandlers = (handlers: typeof storageHandlers) => {
  storageHandlers = handlers;
};

// Export for use by other stores (e.g., folders need to save notes during cascade delete)
export const getStorageHandlers = () => storageHandlers;

// Create initial notes (empty by default)
const createInitialNotes = (): Note[] => {
  return [];
};

export const useNotesStore = create<NotesStore>()((set, get) => ({
  // Initial state
  notes: createInitialNotes(),
  currentNoteId: null,
  isLoading: false,
  error: null,
  
  // Derived state (computed in selectors)
  get currentNote() {
    const { notes, currentNoteId } = get();
    return notes.find(n => n.id === currentNoteId) || null;
  },
  
  // Actions
  setNotes: (notes) => set({ notes }),
  
  setCurrentNoteId: (id) => {
    // Save to localStorage to restore on next launch
    try {
      if (id) {
        (globalThis as any).localStorage?.setItem('clutter-last-note-id', id);
      } else {
        (globalThis as any).localStorage?.removeItem('clutter-last-note-id');
      }
    } catch {
      // localStorage not available (SSR or restricted environment)
    }
    set({ currentNoteId: id });
  },
  
  createNote: (initialValues, setAsCurrent = true) => {
    const note = createEmptyNote(initialValues);
    set((state) => ({
      notes: [note, ...state.notes],
      currentNoteId: setAsCurrent ? note.id : state.currentNoteId,
    }));
    
    // Save immediately when note is created
    if (storageHandlers) {
      console.log('💾 Saving note immediately:', note.id, note.title);
      storageHandlers.save(note).catch((err) => {
        console.error('Failed to save note:', err);
      });
    }
    
    return note;
  },
  
  // ⚠️ DEPRECATED: Use updateNoteContent() or updateNoteMeta() instead
  // This method allows multi-writer races and will be removed in a future version
  updateNote: (id, updates) => {
    // 🚨 DEV-ONLY: Crash if content write attempted (prevents regressions)
    if (process.env.NODE_ENV === 'development' && 'content' in updates) {
      throw new Error('❌ INVARIANT VIOLATION: Use updateNoteContent() for content writes, not updateNote()');
    }
    
    const now = new Date().toISOString();
    const hadTagsBefore = get().notes.find(n => n.id === id)?.tags;
    
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: now }
          : note
      ),
    }));
    
    // Update tags cache if tags changed (deferred to avoid render-phase updates)
    const note = get().notes.find(n => n.id === id);
    if (note && hadTagsBefore && updates.tags && JSON.stringify(hadTagsBefore) !== JSON.stringify(updates.tags)) {
      // Use setTimeout to defer cache update outside of render cycle
      setTimeout(() => {
        import('./tags').then(({ useTagsStore }) => {
          useTagsStore.getState().updateTagsCache();
        });
      }, 0);
    }
    
    // ⚠️ REMOVED: Storage save removed to prevent race conditions
    // Content persistence is now ONLY handled by useAutoSave
    // Metadata persistence is handled by updateNoteMeta
  },
  
  // 🛡️ SINGLE-WRITER INVARIANT: Content has ONE writer (prevents race conditions)
  updateNoteContent: (id, content) => {
    // 🛡️ CRITICAL: Never accept pure boot state (completely empty, no structure)
    // But DO allow intentional empty (has doc structure, just no content)
    const isPureBootState = (
      !content || 
      content.trim() === '' ||
      content === '""' ||
      content === '{}'
    );
    
    if (isPureBootState) {
      console.warn('🚫 Rejected pure boot state for note:', id);
      return;
    }
    
    // Allow saves with structure even if empty (intentional deletions)
    console.log('💫 updateNoteContent:', {
      id,
      contentLength: content.length,
      contentPreview: content.substring(0, 100)
    });
    
    const now = new Date().toISOString();
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, content, updatedAt: now }
          : note
      ),
    }));
    
    // ✅ Content persistence is ONLY handled by useAutoSave (debounced, intelligent)
    // No direct save here to avoid race conditions
  },
  
  // Update note metadata (everything except content)
  updateNoteMeta: (id, updates) => {
    const now = new Date().toISOString();
    const hadTagsBefore = get().notes.find(n => n.id === id)?.tags;
    
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: now }
          : note
      ),
    }));
    
    // Update tags cache if tags changed
    const note = get().notes.find(n => n.id === id);
    if (note && hadTagsBefore && updates.tags && JSON.stringify(hadTagsBefore) !== JSON.stringify(updates.tags)) {
      setTimeout(() => {
        import('./tags').then(({ useTagsStore }) => {
          useTagsStore.getState().updateTagsCache();
        });
      }, 0);
    }
    
    // Metadata changes save immediately (they're lightweight and don't race with content)
    if (note && storageHandlers) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('updateNoteMeta')) return;
      
      storageHandlers.save(note).catch((err) => {
        console.error('❌ Failed to save note metadata:', err);
      });
    }
  },
  
  deleteNote: (id) => {
    const note = get().notes.find(n => n.id === id);
    const hadTags = note?.tags && note.tags.length > 0;
    
    // Always soft delete (notes go to "Recently deleted" for 30 days)
    const now = new Date().toISOString();
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, deletedAt: now, updatedAt: now }
          : note
      ),
    }));
    
    // Update tags cache if note had tags (deferred)
    if (hadTags) {
      setTimeout(() => {
        import('./tags').then(({ useTagsStore }) => {
          useTagsStore.getState().updateTagsCache();
        });
      }, 0);
    }
    
    // Save soft delete to storage
    if (note && storageHandlers) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('deleteNote')) return;
      
      // ✅ Get the UPDATED note with deletedAt
      const updatedNote = get().notes.find(n => n.id === id);
      if (updatedNote) {
        storageHandlers.save(updatedNote).catch(() => {});
      }
    }
  },
  
  duplicateNote: (id) => {
    const original = get().notes.find(n => n.id === id);
    if (!original) return null;
    
    const now = new Date().toISOString();
    const duplicate: Note = {
      ...original,
      id: generateId(),
      title: original.title ? `${original.title} (copy)` : '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    
    set((state) => ({
      notes: [duplicate, ...state.notes],
      currentNoteId: duplicate.id,
    }));
    
    // Save duplicate immediately
    if (storageHandlers) {
      storageHandlers.save(duplicate).catch(() => {});
    }
    
    return duplicate;
  },
  
  restoreNote: (id) => {
    const note = get().notes.find(n => n.id === id);
    const hadTags = note?.tags && note.tags.length > 0;
    
    const now = new Date().toISOString();
    
    // 🗓️ SMART RESTORE: Check if this is a daily note being restored
    let updates: Partial<Note> = { deletedAt: null, updatedAt: now };
    
    // ✅ NEW: Check if parent folder is deleted (lazy import to avoid circular dependency)
    if (note?.folderId) {
      try {
        const { useFoldersStore } = require('./folders');
        const folder = useFoldersStore.getState().folders.find((f: any) => f.id === note.folderId);
        
        if (folder?.deletedAt) {
          console.log(`⚠️ Parent folder is deleted, moving note to Cluttered`);
          updates = {
            ...updates,
            folderId: null,  // Move to Cluttered (root)
          };
        }
      } catch (e) {
        // Folders store not available, skip check
      }
    }
    
    if (note?.dailyNoteDate && !updates.folderId) {
      // Check if there's already an active daily note for this date
      const existingDailyNote = get().notes.find(n => 
        n.dailyNoteDate === note.dailyNoteDate && 
        n.id !== id && 
        !n.deletedAt
      );
      
      if (existingDailyNote) {
        // Convert to regular note (Cluttered)
        console.log(`⚠️ Daily note for ${note.dailyNoteDate} already exists, converting to regular note`);
        updates = {
          ...updates,
          dailyNoteDate: null,  // Clear daily note marker
          folderId: null,       // Move to Cluttered (root)
        };
      } else {
        // Restore as daily note
        console.log(`📅 Restoring daily note for ${note.dailyNoteDate}`);
        updates = {
          ...updates,
          folderId: DAILY_NOTES_FOLDER_ID,  // Keep as daily note
        };
      }
    }
    
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id
          ? { ...n, ...updates }
          : n
      ),
    }));
    
    // Update tags cache if note has tags (deferred)
    if (hadTags) {
      setTimeout(() => {
        import('./tags').then(({ useTagsStore }) => {
          useTagsStore.getState().updateTagsCache();
        });
      }, 0);
    }
    
    // Save to storage
    const restoredNote = get().notes.find(n => n.id === id);
    if (restoredNote && storageHandlers) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('restoreNote')) return;
      
      storageHandlers.save(restoredNote).catch(() => {});
    }
  },
  
  permanentlyDeleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      currentNoteId: state.currentNoteId === id ? null : state.currentNoteId,
    }));
    
    // Delete from storage (database)
    if (storageHandlers) {
      storageHandlers.delete(id).catch((err) => {
        console.error(`❌ Failed to permanently delete note ${id} from database:`, err);
      });
    }
  },
  
  // Daily notes
  findDailyNoteByDate: (date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
    
    // Find all daily notes for this date (there might be duplicates)
    const dailyNotes = get().notes.filter(n => n.dailyNoteDate === dateStr && !n.deletedAt);
    
    if (dailyNotes.length === 0) return null;
    
    // Return the LATEST one by updated_at (in case of duplicates)
    return dailyNotes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0] || null;
  },
  
  createDailyNote: (date, setAsCurrent = true) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
    const title = formatDailyNoteTitle(date);
    
    // 🔧 Convert any deleted daily note for this date to a regular note
    const deletedDailyNote = get().notes.find(n => 
      n.dailyNoteDate === dateStr && 
      n.deletedAt !== null
    );
    
    if (deletedDailyNote) {
      console.log(`♻️ Converting deleted daily note ${deletedDailyNote.id} to regular note (new daily note created for ${dateStr})`);
      
      // Create a fixed title without "Today/Yesterday" prefix
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fixedTitle = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
      
      get().updateNote(deletedDailyNote.id, {
        dailyNoteDate: null,  // Convert to regular note
        title: fixedTitle,     // Fixed title: "Thu, 1 Jan 2026"
        updatedAt: new Date().toISOString(),
      });
    }
    
    const note = createEmptyNote({
      dailyNoteDate: dateStr,
      title,
      emoji: null, // No emoji - will show calendar icon instead
      folderId: DAILY_NOTES_FOLDER_ID, // Special folder for daily notes
    });
    
    set((state) => ({
      notes: [note, ...state.notes],
      currentNoteId: setAsCurrent ? note.id : state.currentNoteId,
    }));
    
    // Daily note will be saved automatically when user adds content
    // (via auto-save mechanism or when switching notes)
    
    return note;
  },
  
  updateDailyNoteTitles: () => {
    const notes = get().notes;
    const dailyNotes = notes.filter(n => n.dailyNoteDate && !n.deletedAt);
    
    if (dailyNotes.length === 0) return;
    
    // console.log(`🗓️ Updating ${dailyNotes.length} daily note titles...`);
    
    dailyNotes.forEach(note => {
      // Parse the date from dailyNoteDate (YYYY-MM-DD format)
      const [year, month, day] = note.dailyNoteDate!.split('-').map(Number);
      if (year === undefined || month === undefined || day === undefined) return;
      const noteDate = new Date(year, month - 1, day);
      
      // Generate new title with current relative prefix
      const newTitle = formatDailyNoteTitle(noteDate);
      
      // Update if changed
      if (newTitle !== note.title) {
        console.log(`📝 Updating daily note title: "${note.title}" → "${newTitle}"`);
        get().updateNoteMeta(note.id, { title: newTitle });
      }
    });
    
    // console.log('✅ Daily note titles updated');
  },
  
  // Storage integration
  saveNote: async (note) => {
    if (storageHandlers) {
      await storageHandlers.save(note);
    }
  },
  
  loadNotes: async () => {
    if (!storageHandlers) {
      console.log('⚠️ loadNotes: No storageHandlers configured');
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const loadedNotes = await storageHandlers.load();
      console.log(`📂 Loaded ${loadedNotes.length} notes from files`);
      
      // Merge loaded notes with existing notes (from localStorage)
      // This prevents data loss when files haven't been written yet
      const existingNotes = get().notes;
      console.log(`💾 Existing ${existingNotes.length} notes in memory (localStorage)`);
      
      const mergedNotes = [...loadedNotes];
      
      // Add existing notes that aren't in the loaded set
      existingNotes.forEach(existingNote => {
        if (!loadedNotes.find(loaded => loaded.id === existingNote.id)) {
          console.log(`➕ Keeping note from localStorage that's not in files: ${existingNote.id} "${existingNote.title}"`);
          mergedNotes.push(existingNote);
        }
      });
      
      console.log(`✅ Final merged notes count: ${mergedNotes.length}`);
      set({ notes: mergedNotes, isLoading: false });
    } catch (error) {
      console.error('❌ Error loading notes:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  // Helpers
  getNoteById: (id) => get().notes.find(n => n.id === id) || null,
  
  getActiveNotes: () => get().notes.filter(n => !n.deletedAt),
  
  getDeletedNotes: () => get().notes.filter(n => n.deletedAt),
  
  searchNotes: (query) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return get().getActiveNotes();
    
    return get().notes.filter((note) => {
      if (note.deletedAt) return false;
      return (
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.description.toLowerCase().includes(normalizedQuery) ||
        note.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  },
}));

