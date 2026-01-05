/**
 * Folders Store
 * Manages folder hierarchy and operations
 */

import { create } from 'zustand';
import { Folder } from '@clutter/domain';
import { shouldAllowSave } from './hydration';
import { useNotesStore, getStorageHandlers } from './notes';

// Platform-specific storage handlers (set by app initialization)
let saveFolderHandler: ((folder: Folder) => Promise<void>) | null = null;
let deleteFolderHandler: ((folderId: string) => Promise<void>) | null = null;

export const setSaveFolderHandler = (handler: typeof saveFolderHandler) => {
  saveFolderHandler = handler;
};

export const setDeleteFolderHandler = (handler: typeof deleteFolderHandler) => {
  deleteFolderHandler = handler;
};

// Export for use by other stores (e.g., tags need to save folders during rename/delete)
export { saveFolderHandler };

// Maximum folder nesting depth
const MAX_FOLDER_DEPTH = 10;

interface FoldersState {
  folders: Folder[];
  
  // Actions
  createFolder: (name: string, parentId?: string | null, emoji?: string | null, tags?: string[]) => string | null;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string, options?: { keepNotes?: boolean }) => void;
  restoreFolder: (id: string) => void;
  permanentlyDeleteFolder: (id: string) => void;
  toggleFolderExpanded: (id: string) => void;
  moveFolder: (folderId: string, newParentId: string | null) => void;
  setFolders: (folders: Folder[]) => void; // For hydration from database
  
  // Queries
  getFolderPath: (folderId: string | null) => string[];
  getFolderPathWithIds: (folderId: string | null) => Array<{ id: string; name: string }>;
  getChildFolders: (parentId: string | null) => Folder[];
  getFolderDepth: (folderId: string | null) => number;
  getDeletedFolders: () => Folder[];
  getSafeParentForRestore: (folderId: string) => string | null;
}

// Helper function to sanitize folder data (for future use in migrations)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sanitizeFolder = (folder: any): Folder => {
  // Valid folder properties
  const validProps = ['id', 'name', 'parentId', 'description', 'descriptionVisible', 'color', 'emoji', 'tags', 'tagsVisible', 'isFavorite', 'isExpanded', 'createdAt', 'updatedAt', 'deletedAt'];
  
  // Log if we find corrupted data
  const hasInvalidProps = Object.keys(folder).some(key => !validProps.includes(key));
  
  if (hasInvalidProps) {
    console.warn('🔧 Sanitizing corrupted folder:', {
      id: folder.id,
      name: folder.name,
      invalidProps: Object.keys(folder).filter(key => !validProps.includes(key))
    });
  }
  
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    description: folder.description || '',
    descriptionVisible: folder.descriptionVisible ?? true,
    color: folder.color,
    emoji: folder.emoji,
    tags: Array.isArray(folder.tags) ? folder.tags : [], // Ensure tags is always an array
    tagsVisible: folder.tagsVisible ?? true,
    isFavorite: folder.isFavorite ?? false, // Default to not favorite
    isExpanded: folder.isExpanded ?? true,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    deletedAt: folder.deletedAt,
  };
};

export const useFoldersStore = create<FoldersState>()((set, get) => ({
      folders: [],
      
      createFolder: (name: string, parentId: string | null = null, emoji: string | null = null, tags: string[] = []) => {
    // Validate input types to prevent corruption
    if (typeof name !== 'string') {
      console.error('❌ createFolder: name must be a string, got:', typeof name, name);
      return null;
    }
    
    // Check depth limit
    if (parentId) {
      const depth = get().getFolderDepth(parentId);
      if (depth >= MAX_FOLDER_DEPTH) {
        console.error(`Cannot create folder: Maximum nesting depth (${MAX_FOLDER_DEPTH}) reached`);
        return null; // Return null instead of creating
      }
    }
    
    const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Explicitly define ONLY valid properties for folders
    const newFolder: Folder = {
      id,
      name,
      parentId,
      description: '',
      descriptionVisible: true,
      color: null,
      emoji,
      tags: Array.isArray(tags) ? tags : [], // Ensure tags is always an array
      tagsVisible: true,
      isFavorite: false, // Default to not favorite
      isExpanded: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    
  set((state) => ({
    folders: [...state.folders, newFolder],
  }));
  
  // Save to database immediately (folders are structural, must persist)
  if (saveFolderHandler) {
    // 🛡️ Guard: Don't save during hydration
    if (!shouldAllowSave('createFolder')) return id;
    
    saveFolderHandler(newFolder).catch((err) => {
      console.error('❌ Failed to save folder:', err);
    });
  }
  
  console.log('✅ Created folder:', { id, name, parentId, emoji, tags });
  return id;
  },
  
  updateFolder: (id: string, updates: Partial<Folder>) => {
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id
          ? { ...folder, ...updates, updatedAt: new Date().toISOString() }
          : folder
      ),
    }));
    
    // Save to database immediately
    const updatedFolder = get().folders.find(f => f.id === id);
    if (updatedFolder && saveFolderHandler) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('updateFolder')) return;
      
      saveFolderHandler(updatedFolder).catch((err) => {
        console.error('❌ Failed to save folder update:', err);
      });
    }
  },
  
  deleteFolder: (id: string, options?: { keepNotes?: boolean }) => {
    const now = new Date().toISOString();
    const keepNotes = options?.keepNotes ?? false;
    
    // 🔄 CASCADE DELETE: Find all child folders (recursively)
    const getDescendantFolders = (parentId: string): string[] => {
      const children = get().folders.filter(f => f.parentId === parentId && !f.deletedAt);
      const descendants: string[] = [];
      
      children.forEach(child => {
        descendants.push(child.id);
        descendants.push(...getDescendantFolders(child.id));
      });
      
      return descendants;
    };
    
    const descendantIds = getDescendantFolders(id);
    const allFolderIds = [id, ...descendantIds];
    
    console.log(`🗑️ Deleting folder "${id}" with ${descendantIds.length} descendants (keepNotes: ${keepNotes})`);
    
    // Soft delete the folder and all descendants
    set((state) => ({
      folders: state.folders.map((folder) =>
        allFolderIds.includes(folder.id)
          ? { ...folder, deletedAt: now }
          : folder
      ),
    }));
    
    // 🔄 Handle notes based on user choice
    const { notes, setNotes } = useNotesStore.getState();
    const notesInFolders = notes.filter((note: any) => 
      allFolderIds.includes(note.folderId) && !note.deletedAt
    );
    
    if (notesInFolders.length > 0) {
      if (keepNotes) {
        // Move notes to root (Cluttered) instead of deleting
        console.log(`📦 Moving ${notesInFolders.length} notes to Cluttered`);
        
        const updatedNotes = notes.map((note: any) =>
          allFolderIds.includes(note.folderId) && !note.deletedAt
            ? { ...note, folderId: null, updatedAt: now }
            : note
        );
        
        setNotes(updatedNotes);
        
        // Save moved notes to database
        const noteStorageHandlers = getStorageHandlers();
        
        if (noteStorageHandlers?.save && shouldAllowSave('deleteFolder-moveNotes')) {
          const notesToSave = updatedNotes.filter((note: any) =>
            allFolderIds.includes(note.folderId) === false && 
            notesInFolders.find((n: any) => n.id === note.id)
          );
          
          Promise.all(
            notesToSave.map((note: any) =>
              noteStorageHandlers.save(note).catch((err: any) => {
                console.error(`❌ Failed to save note move for ${note.id}:`, err);
              })
            )
          ).then(() => {
            console.log(`✅ Saved ${notesToSave.length} note moves`);
          });
        }
      } else {
        // Delete notes together with folder (original behavior)
        console.log(`🗑️ Cascading delete to ${notesInFolders.length} notes`);
        
        const updatedNotes = notes.map((note: any) =>
          allFolderIds.includes(note.folderId) && !note.deletedAt
            ? { ...note, deletedAt: now }
            : note
        );
        
        setNotes(updatedNotes);
        
        // Save deleted notes to database
        const noteStorageHandlers = getStorageHandlers();
        
        if (noteStorageHandlers?.save && shouldAllowSave('deleteFolder-notes')) {
          const notesToSave = updatedNotes.filter((note: any) =>
            allFolderIds.includes(note.folderId) && note.deletedAt === now
          );
          
          Promise.all(
            notesToSave.map((note: any) =>
              noteStorageHandlers.save(note).catch((err: any) => {
                console.error(`❌ Failed to save note deletion for ${note.id}:`, err);
              })
            )
          ).then(() => {
            console.log(`✅ Saved ${notesToSave.length} note deletions`);
          });
        }
      }
    }
    
    // Save all deleted folders to database
    const deletedFolders = get().folders.filter(f => allFolderIds.includes(f.id));
    
    if (saveFolderHandler) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('deleteFolder')) return;
      
      // Save all folders in parallel
      const handler = saveFolderHandler; // Copy to satisfy TypeScript null check
      Promise.all(
        deletedFolders.map(folder => 
          handler(folder).catch((err) => {
            console.error(`❌ Failed to save folder deletion for ${folder.id}:`, err);
          })
        )
      ).then(() => {
        console.log(`✅ Saved ${deletedFolders.length} folder deletions`);
      });
    }
  },
  
  restoreFolder: (id: string) => {
    const safeParentId = get().getSafeParentForRestore(id);
    const now = new Date().toISOString();
    
    // 🔄 CASCADE RESTORE: Find all child folders (that were deleted at the same time)
    const folder = get().folders.find(f => f.id === id);
    if (!folder) return;
    
    const getDescendantFolders = (parentId: string): string[] => {
      const children = get().folders.filter(f => 
        f.parentId === parentId && 
        f.deletedAt !== null // Only include deleted children
      );
      const descendants: string[] = [];
      
      children.forEach(child => {
        descendants.push(child.id);
        descendants.push(...getDescendantFolders(child.id));
      });
      
      return descendants;
    };
    
    const descendantIds = getDescendantFolders(id);
    const allFolderIds = [id, ...descendantIds];
    
    console.log(`♻️ Restoring folder "${id}" with ${descendantIds.length} descendants`);
    
    // Restore the folder and all descendants
    set((state) => ({
      folders: state.folders.map((folder) => {
        if (folder.id === id) {
          return { 
            ...folder, 
            deletedAt: null, 
            parentId: safeParentId, // Use safe parent (null if parent is deleted)
            updatedAt: now 
          };
        } else if (descendantIds.includes(folder.id)) {
          return { ...folder, deletedAt: null, updatedAt: now };
        }
        return folder;
      }),
    }));
    
    // 🔄 CASCADE TO NOTES: Restore all notes in these folders
    const { notes, setNotes } = useNotesStore.getState();
    const notesInFolders = notes.filter((note: any) => 
      allFolderIds.includes(note.folderId) && note.deletedAt !== null
    );
    
    if (notesInFolders.length > 0) {
      console.log(`♻️ Cascading restore to ${notesInFolders.length} notes`);
      
      const updatedNotes = notes.map((note: any) =>
        allFolderIds.includes(note.folderId) && note.deletedAt !== null
          ? { ...note, deletedAt: null, updatedAt: now }
          : note
      );
      
      setNotes(updatedNotes);
      
      // 🆕 SAVE all restored notes to database
      const noteStorageHandlers = getStorageHandlers();
      
      if (noteStorageHandlers?.save && shouldAllowSave('restoreFolder-notes')) {
        const notesToSave = updatedNotes.filter((note: any) =>
          allFolderIds.includes(note.folderId) && note.deletedAt === null && note.updatedAt === now
        );
        
        Promise.all(
          notesToSave.map((note: any) =>
            noteStorageHandlers.save(note).catch((err: any) => {
              console.error(`❌ Failed to save note restore for ${note.id}:`, err);
            })
          )
        ).then(() => {
          console.log(`✅ Saved ${notesToSave.length} note restores`);
        });
      }
    }
    
    // Save all restored folders to database
    const restoredFolders = get().folders.filter(f => allFolderIds.includes(f.id));
    
    if (saveFolderHandler) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('restoreFolder')) return;
      
      // Save all folders in parallel
      const handler = saveFolderHandler; // Copy to satisfy TypeScript null check
      Promise.all(
        restoredFolders.map(folder => 
          handler(folder).catch((err) => {
            console.error(`❌ Failed to save folder restore for ${folder.id}:`, err);
          })
        )
      ).then(() => {
        console.log(`✅ Saved ${restoredFolders.length} folder restores`);
      });
    }
  },
  
  toggleFolderExpanded: (id: string) => {
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id
          ? { ...folder, isExpanded: !folder.isExpanded }
          : folder
      ),
    }));
  },
  
  moveFolder: (folderId: string, newParentId: string | null) => {
    // Check depth limit when moving to a new parent
    if (newParentId !== null) {
      const targetDepth = get().getFolderDepth(newParentId);
      const folderSubtreeDepth = get().getFolderDepth(folderId) - get().getFolderDepth(get().folders.find(f => f.id === folderId)?.parentId ?? null);
      
      if (targetDepth + folderSubtreeDepth >= MAX_FOLDER_DEPTH) {
        console.error(`Cannot move folder: Would exceed maximum nesting depth (${MAX_FOLDER_DEPTH})`);
        return;
      }
    }
    
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId
          ? { ...folder, parentId: newParentId, updatedAt: new Date().toISOString() }
          : folder
      ),
    }));
    
    // Save move to database
    const movedFolder = get().folders.find(f => f.id === folderId);
    if (movedFolder && saveFolderHandler) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('moveFolder')) return;
      
      saveFolderHandler(movedFolder).catch((err) => {
        console.error('❌ Failed to save folder move:', err);
      });
    }
  },
  
  getFolderPath: (folderId: string | null): string[] => {
    if (!folderId) return [];
    
    const { folders } = get();
    const path: string[] = [];
    const visited = new Set<string>(); // Prevent circular references
    let currentId: string | null = folderId;
    
    // Build path from current folder up to root
    while (currentId) {
      // Detect circular reference
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      
      const folder = folders.find((f) => f.id === currentId && !f.deletedAt);
      if (!folder) break;
      
      path.unshift(folder.name || 'Untitled Folder');
      currentId = folder.parentId;
    }
    
    return path;
  },
  
  getFolderPathWithIds: (folderId: string | null): Array<{ id: string; name: string }> => {
    if (!folderId) return [];
    
    const { folders } = get();
    const path: Array<{ id: string; name: string }> = [];
    const visited = new Set<string>(); // Prevent circular references
    let currentId: string | null = folderId;
    
    // Build path from current folder up to root
    while (currentId) {
      // Detect circular reference
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      
      const folder = folders.find((f) => f.id === currentId && !f.deletedAt);
      if (!folder) break;
      
      path.unshift({ id: folder.id, name: folder.name || 'Untitled Folder' });
      currentId = folder.parentId;
    }
    
    return path;
  },
  
  getChildFolders: (parentId: string | null): Folder[] => {
    const { folders } = get();
    return folders
      .filter((f) => f.parentId === parentId && !f.deletedAt)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  
  getFolderDepth: (folderId: string | null): number => {
    if (!folderId) return 0;
    
    const { folders } = get();
    let depth = 0;
    let currentId: string | null = folderId;
    
    // Prevent infinite loops
    while (currentId && depth < MAX_FOLDER_DEPTH + 1) {
      const folder = folders.find((f) => f.id === currentId);
      if (!folder) break;
      depth++;
      currentId = folder.parentId;
    }
    
    return depth;
  },
  
  getDeletedFolders: (): Folder[] => {
    const { folders } = get();
    return folders.filter((f) => f.deletedAt !== null);
  },
  
  getSafeParentForRestore: (folderId: string): string | null => {
    const { folders } = get();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return null;
    
    // If no parent, restore to root
    if (!folder.parentId) return null;
    
    // If parent doesn't exist or is deleted, restore to root
    const parent = folders.find((f) => f.id === folder.parentId);
    if (!parent || parent.deletedAt) {
      console.warn(`Parent folder deleted, restoring "${folder.name}" to root`);
      return null;
    }
    
    return folder.parentId;
  },
  
  permanentlyDeleteFolder: (id: string) => {
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
    }));
    
    // Delete from storage (database)
    if (deleteFolderHandler) {
      deleteFolderHandler(id).catch((err) => {
        console.error(`❌ Failed to permanently delete folder ${id} from database:`, err);
      });
    }
  },
  
  setFolders: (folders: Folder[]) => {
    set({ folders });
  },
}));

