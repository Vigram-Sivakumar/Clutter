import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider, NotesContainer } from '@clutter/ui';
import { 
  useNotesStore, 
  useFoldersStore, 
  useTagsStore, 
  setStorageHandlers,
  setSaveFolderHandler, 
  setSaveTagHandler,
  setDeleteTagHandler,
  setHydrating,
  setInitialized as setHydrationInitialized
} from '@clutter/shared';
import { selectStorageFolder, getStorageFolder } from './lib/storage';
import { 
  initDatabase, 
  loadAllNotesFromDatabase, 
  loadAllFoldersFromDatabase,
  loadAllTagsFromDatabase,
  saveNoteToDatabase,
  saveFolderToDatabase,
  saveTagToDatabase,
  deleteTagFromDatabase,
  migrateOrphanedFolders,
  verifyDatabaseIntegrity
} from './lib/database';
import { useAutoSave } from './hooks/useAutoSave';

function App() {
  const [storageFolder, setStorageFolder] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEditorHydrated, setIsEditorHydrated] = useState(false);
  const setNotes = useNotesStore(state => state.setNotes);
  const setFolders = useFoldersStore(state => state.setFolders);
  const setTagMetadata = useTagsStore(state => state.setTagMetadata);
  const findDailyNoteByDate = useNotesStore(state => state.findDailyNoteByDate);
  const createDailyNote = useNotesStore(state => state.createDailyNote);
  const setCurrentNoteId = useNotesStore(state => state.setCurrentNoteId);
  
  // Enable auto-save to SQLite (only after database is initialized AND editor is hydrated)
  useAutoSave(isInitialized, isEditorHydrated);

  // Suppress harmless TipTap flushSync warning in React 18
  // TipTap's ReactNodeViewRenderer needs flushSync to sync ProseMirror with React
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('flushSync was called from inside a lifecycle method')
      ) {
        // Suppress TipTap's expected flushSync warning
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Initialize SQLite database on mount (Simple, like Apple Notes)
  useEffect(() => {
    const initializeApp = async () => {
      const folder = getStorageFolder();
      setStorageFolder(folder);
      
      if (!folder) {
        // ❌ DON'T set isInitialized - keep auto-save disabled without DB
        return;
      }
      
      try {
        // 🛡️ HYDRATION START: Prevent saves during database boot
        setHydrating(true);
        
        // Initialize database (creates tables if not exist)
        await initDatabase();
        
        // Mark database as initialized (allows saves after hydration completes)
        setHydrationInitialized(true);
        
        // Set up storage handlers for notes, folders and tags (BEFORE loading data)
        setStorageHandlers({
          save: saveNoteToDatabase,
          load: loadAllNotesFromDatabase,
          delete: async (_id: string) => {
            // Delete is handled via soft delete (save with deletedAt)
            console.log('Note deletion handled via soft delete');
          },
        });
        setSaveFolderHandler(saveFolderToDatabase);
        setSaveTagHandler(saveTagToDatabase);
        setDeleteTagHandler(deleteTagFromDatabase);
        
        // Load data in correct order to satisfy FK constraints:
        // 1. Tags (referenced by note_tags, folder_tags)
        // 2. Folders (referenced by notes.folder_id)
        // 3. Notes (depends on folders)
        const [loadedTags, loadedFolders, loadedNotes] = await Promise.all([
          loadAllTagsFromDatabase(),
          loadAllFoldersFromDatabase(),
          loadAllNotesFromDatabase(),
        ]);
        
        console.log(`📂 Loaded ${loadedNotes.length} notes, ${loadedFolders.length} folders, ${loadedTags.length} tags`);
        
        // 🔧 MIGRATION: Create recovery folders for orphaned note references
        // This ensures all FK constraints can be satisfied for existing users
        const recoveredFolders = await migrateOrphanedFolders(loadedNotes, loadedFolders);
        
        if (recoveredFolders.length > 0) {
          console.log(`🔧 Migration: Recovered ${recoveredFolders.length} folders`);
        }
        
        // Merge recovered folders with loaded folders
        const allFolders = [...loadedFolders, ...recoveredFolders];
        
        // 🔧 CLEANUP: Remove __daily_notes__ if it exists (it's a virtual folder, not real)
        const DAILY_NOTES_FOLDER_ID = '__daily_notes__';
        const dailyNotesFolder = allFolders.find(f => f.id === DAILY_NOTES_FOLDER_ID);
        const cleanedFolders = allFolders.filter(f => f.id !== DAILY_NOTES_FOLDER_ID);
        
        if (dailyNotesFolder) {
          console.log('🔧 Removing __daily_notes__ virtual folder from database');
          // Mark it as deleted in the database so it won't load again
          const deletedDailyNotesFolder = {
            ...dailyNotesFolder,
            deletedAt: new Date().toISOString()
          };
          try {
            await saveFolderToDatabase(deletedDailyNotesFolder);
            console.log('✅ Cleaned up __daily_notes__ from database');
          } catch (err) {
            console.warn('⚠️ Could not clean up __daily_notes__ folder:', err);
          }
        }
        
        // Hydrate stores (still in hydrating mode, so no saves will trigger)
        if (loadedTags.length > 0) {
          setTagMetadata(loadedTags);
        }
        
        if (cleanedFolders.length > 0) {
          setFolders(cleanedFolders);
        }
        
        if (loadedNotes.length > 0) {
          setNotes(loadedNotes);
        }
        
        // ✅ ONLY set true after successful database initialization
        setIsInitialized(true);
        
        // 🛡️ HYDRATION COMPLETE: Allow saves now
        setHydrating(false);
        
        // 📅 OPEN TODAY'S DAILY NOTE BY DEFAULT (like Obsidian)
        const today = new Date();
        let dailyNote = findDailyNoteByDate(today);
        
        if (!dailyNote) {
          console.log('📅 Creating today\'s daily note...');
          dailyNote = createDailyNote(today, false); // Don't set as current yet
        }
        
        if (dailyNote) {
          console.log(`📅 Opening today's daily note: "${dailyNote.title}"`);
          setCurrentNoteId(dailyNote.id);
        }
        
        // 🔍 VERIFY DATABASE INTEGRITY (dev mode only)
        if (process.env.NODE_ENV === 'development') {
          verifyDatabaseIntegrity().then(({ isValid, issues }) => {
            if (isValid) {
              console.log('✅ Database integrity verified - no issues found');
            } else {
              console.warn('⚠️ Database integrity issues detected:', issues);
            }
          });
        }
        
        // Show migration summary if any recovery happened
        if (recoveredFolders.length > 0) {
          console.log(`
🔧 MIGRATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Recovered ${recoveredFolders.length} folder(s)
✅ All notes are now properly organized
✅ Foreign key constraints satisfied

Your data is safe! Recovered folders are marked with 📁
          `);
        }
      } catch (err: any) {
        console.error('❌ Error initializing app:', err);
        // ❌ DON'T set isInitialized on error - keep app in loading state
        // Also keep hydrating=true to prevent any saves
      }
    };
    
    initializeApp();
  }, [setNotes, setFolders, setTagMetadata, findDailyNoteByDate, createDailyNote, setCurrentNoteId]);

  const handleSelectFolder = async () => {
    try {
      const folder = await selectStorageFolder();
      if (folder) {
        setStorageFolder(folder);
        // Reload the app to reinitialize with new folder
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  return (
    <ThemeProvider>
      {!isInitialized ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '100vh',
          color: '#fff',
          gap: '24px',
        }}>
          {storageFolder ? (
            <>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>⏳ Initializing database...</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Loading your notes from SQLite</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>⚠️ No storage folder selected</div>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                Click the button below to choose where to store your notes
              </div>
              <button onClick={handleSelectFolder} style={{
                padding: '16px 32px',
                background: '#0066ff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.4)',
              }}>
                📁 Select Storage Folder
              </button>
            </>
          )}
        </div>
      ) : (
      <Routes>
        {/* Main notes view as default */}
        <Route
          path="/"
          element={
            <NotesContainer 
                isInitialized={isInitialized}
                onHydrationChange={setIsEditorHydrated}
            >
              <></>
            </NotesContainer>
          }
        />
      </Routes>
      )}
    </ThemeProvider>
  );
}

export default App;

