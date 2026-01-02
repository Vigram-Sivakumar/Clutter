import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider, NotesContainer, ConfirmationDialog, FormDialog } from '@clutter/ui';
import { 
  useNotesStore, 
  useFoldersStore, 
  useTagsStore, 
  setStorageHandlers,
  setSaveFolderHandler,
  setDeleteFolderHandler,
  setSaveTagHandler,
  setDeleteTagHandler,
  setHydrating,
  setInitialized as setHydrationInitialized,
  type Folder
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
  deleteNotePermanently,
  deleteFolderPermanently,
  migrateOrphanedNotes,
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
  const updateDailyNoteTitles = useNotesStore(state => state.updateDailyNoteTitles);
  
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
          delete: deleteNotePermanently,
        });
        setSaveFolderHandler(saveFolderToDatabase);
        setDeleteFolderHandler(deleteFolderPermanently);
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
        
        // 🔧 MIGRATION: Move orphaned notes to Cluttered
        // Notes referencing non-existent folders are moved to root (Cluttered)
        const movedCount = await migrateOrphanedNotes(loadedNotes, loadedFolders);
        
        if (movedCount > 0) {
          console.log(`🔧 Migration: Moved ${movedCount} orphaned notes to Cluttered`);
        }
        
        // 🗓️ MIGRATION: Create or update "Daily notes" folder
        const DAILY_NOTES_FOLDER_ID = '__daily_notes__';
        const existingDailyNotesFolder = loadedFolders.find(f => f.id === DAILY_NOTES_FOLDER_ID);
        
        if (!existingDailyNotesFolder) {
          console.log('📅 Creating "Daily notes" folder...');
          const now = new Date().toISOString();
          const dailyNotesFolder: Folder = {
            id: DAILY_NOTES_FOLDER_ID,
            name: 'Daily notes',
            parentId: null, // Root level folder
            description: 'Your daily notes and journal entries',
            descriptionVisible: true,
            color: null,
            emoji: '📅', // Calendar emoji
            tags: [],
            tagsVisible: true,
            isFavorite: false,
            isExpanded: true,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          
          try {
            await saveFolderToDatabase(dailyNotesFolder);
            loadedFolders.push(dailyNotesFolder);
            console.log('✅ Created "Daily notes" folder');
          } catch (err) {
            console.error('❌ Failed to create "Daily notes" folder:', err);
          }
        } else {
          // Fix the folder name and emoji if they're wrong
          console.log(`📅 Existing folder check:`, { 
            currentName: existingDailyNotesFolder.name, 
            currentEmoji: existingDailyNotesFolder.emoji,
            currentDeletedAt: existingDailyNotesFolder.deletedAt,
            targetName: 'Daily notes',
            targetEmoji: '📅'
          });
          const needsUpdate = 
            existingDailyNotesFolder.name !== 'Daily notes' || 
            existingDailyNotesFolder.emoji !== '📅' ||
            existingDailyNotesFolder.deletedAt !== null; // Also check if folder is marked as deleted
          console.log(`📅 Need update?`, needsUpdate);
          
          if (needsUpdate) {
            console.log('📅 Updating/Restoring "Daily notes" folder...');
            existingDailyNotesFolder.name = 'Daily notes';
            existingDailyNotesFolder.emoji = '📅';
            existingDailyNotesFolder.description = 'Your daily notes and journal entries';
            existingDailyNotesFolder.deletedAt = null; // Ensure folder is not marked as deleted
            existingDailyNotesFolder.updatedAt = new Date().toISOString();
            
            try {
              await saveFolderToDatabase(existingDailyNotesFolder);
              
              // Update the folder in the loadedFolders array
              const folderIndex = loadedFolders.findIndex(f => f.id === DAILY_NOTES_FOLDER_ID);
              if (folderIndex !== -1) {
                loadedFolders[folderIndex] = existingDailyNotesFolder;
              }
              
              console.log('✅ Updated/Restored "Daily notes" folder');
            } catch (err) {
              console.error('❌ Failed to update "Daily notes" folder:', err);
            }
          } else {
            console.log('📅 "Daily notes" folder already exists with correct name and emoji');
          }
        }
        
        // 🔧 MIGRATION: Move all daily notes to "Daily notes" folder
        const dailyNotes = loadedNotes.filter(note => note.dailyNoteDate && !note.deletedAt);
        console.log(`📅 Found ${dailyNotes.length} daily notes to check:`, dailyNotes.map(n => ({ 
          title: n.title, 
          dailyNoteDate: n.dailyNoteDate, 
          folderId: n.folderId 
        })));
        
        let migratedDailyNotesCount = 0;
        
        for (const note of dailyNotes) {
          // If note doesn't have the correct folderId, update it
          if (note.folderId !== DAILY_NOTES_FOLDER_ID) {
            console.log(`📅 Migrating daily note "${note.title || 'Untitled'}" from folder "${note.folderId}" to Daily notes folder`);
            note.folderId = DAILY_NOTES_FOLDER_ID;
            note.updatedAt = new Date().toISOString();
            
            try {
              await saveNoteToDatabase(note);
              migratedDailyNotesCount++;
            } catch (err) {
              console.error(`❌ Failed to migrate daily note ${note.id}:`, err);
            }
          } else {
            console.log(`✅ Daily note "${note.title}" already in Daily notes folder`);
          }
        }
        
        if (migratedDailyNotesCount > 0) {
          console.log(`✅ Migrated ${migratedDailyNotesCount} daily notes to "Daily notes" folder`);
        }
        
        // 🔍 DEBUG: Log all folders after migration
        console.log(`📁 All folders after migration:`, loadedFolders.map(f => ({ 
          id: f.id, 
          name: f.name, 
          emoji: f.emoji,
          deletedAt: f.deletedAt 
        })));
        
        // 🔍 DEBUG: Check for duplicate Daily Notes folders
        const dailyNotesFolders = loadedFolders.filter(f => 
          f.name.toLowerCase().includes('daily') && !f.deletedAt
        );
        if (dailyNotesFolders.length > 1) {
          console.warn(`⚠️ Found ${dailyNotesFolders.length} Daily Notes folders:`, dailyNotesFolders);
        }
        
        // Hydrate stores (still in hydrating mode, so no saves will trigger)
        if (loadedTags.length > 0) {
          setTagMetadata(loadedTags);
        }
        
        if (loadedFolders.length > 0) {
          setFolders(loadedFolders);
        }
        
        if (loadedNotes.length > 0) {
          setNotes(loadedNotes);
        }
        
        // ✅ ONLY set true after successful database initialization
        setIsInitialized(true);
        
        // 🛡️ HYDRATION COMPLETE: Allow saves now
        setHydrating(false);
        
        // 🗓️ UPDATE DAILY NOTE TITLES (Today/Yesterday/Tomorrow)
        // This ensures all daily note titles have current relative prefixes
        updateDailyNoteTitles();
        
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
        
        // Show migration summary if any orphaned notes were moved
        if (movedCount > 0) {
          console.log(`
🔧 MIGRATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Moved ${movedCount} orphaned note(s) to Cluttered
✅ All notes now have valid folder references
✅ Foreign key constraints satisfied

Your data is safe! Check Cluttered (📮) for recovered notes.
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

  // Update daily note titles every hour (catches date changes like midnight)
  useEffect(() => {
    if (!isInitialized) return;
    
    // Run every hour (3600000 ms)
    const interval = setInterval(() => {
      console.log('⏰ Hourly check: Updating daily note titles...');
      updateDailyNoteTitles();
    }, 3600000);
    
    return () => clearInterval(interval);
  }, [isInitialized, updateDailyNoteTitles]);

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
      <ConfirmationDialog />
      <FormDialog />
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

