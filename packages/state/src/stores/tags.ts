/**
 * Tags store with metadata (descriptions, etc.)
 * Tags are still derived from notes, but we store additional metadata
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { useNotesStore, getStorageHandlers } from './notes';
import { useFoldersStore, saveFolderHandler as getFolderHandler } from './folders';
import type { Tag } from '@clutter/domain';
import { shouldAllowSave } from './hydration';

// Platform-specific storage handlers (set by app initialization)
let saveTagHandler: ((tag: Tag) => Promise<void>) | null = null;
let deleteTagHandler: ((tagName: string) => Promise<void>) | null = null;

export const setSaveTagHandler = (handler: typeof saveTagHandler) => {
  saveTagHandler = handler;
};

export const setDeleteTagHandler = (handler: typeof deleteTagHandler) => {
  deleteTagHandler = handler;
};

interface TagsState {
  // Map of tag name (lowercase) to tag metadata
  tagMetadata: Record<string, Tag>;
  
  // Cached list of all unique tag names (for autocomplete)
  // Updated automatically when notes change
  allTagsCache: string[];
  
  // Get tag metadata by name (case-insensitive)
  getTagMetadata: (tagName: string) => Tag | undefined;
  
  // Get all deleted tags
  getDeletedTags: () => Tag[];
  
  // Update tag metadata
  updateTagMetadata: (tagName: string, updates: Partial<Omit<Tag, 'name' | 'createdAt'>>) => void;
  
  // Create or update tag metadata
  upsertTagMetadata: (tagName: string, description?: string, descriptionVisible?: boolean, isFavorite?: boolean, color?: string) => void;
  
  // Rename a tag globally across all notes
  renameTag: (oldTag: string, newTag: string) => void;
  
  // Delete a tag (soft delete - sets deletedAt)
  deleteTag: (tagName: string) => void;
  
  // Restore a deleted tag
  restoreTag: (tagName: string) => void;
  
  // Permanently delete a tag (hard delete - removes completely)
  permanentlyDeleteTag: (tagName: string) => void;
  
  // Update the cached tag list (called automatically when notes change)
  updateTagsCache: () => void;
  
  // Set tag metadata from database (for hydration)
  setTagMetadata: (tags: Tag[]) => void;
}

export const useTagsStore = create<TagsState>()((set, get) => ({
      tagMetadata: {},
      allTagsCache: [],
      
      getTagMetadata: (tagName: string) => {
        const key = tagName.toLowerCase();
        return get().tagMetadata[key];
      },
      
      getDeletedTags: () => {
        const allTags = Object.values(get().tagMetadata);
        const deleted = allTags.filter(tag => tag.deletedAt !== null);
        console.log('🏷️ [DEBUG] getDeletedTags:', {
          totalTags: allTags.length,
          deletedTags: deleted.length,
          deletedTagNames: deleted.map(t => t.name),
        });
        return deleted;
      },
      
  updateTagMetadata: (tagName: string, updates) => {
    const key = tagName.toLowerCase();
    const existing = get().tagMetadata[key];
    
    console.log('🎨 UPDATE TAG METADATA:', {
      tagName,
      key,
      updates,
      existing,
      hasExisting: !!existing,
    });
    
    if (existing) {
      const updatedTag = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      console.log('🎨 UPDATE TAG METADATA - Updated tag:', updatedTag);
      
      set((state) => ({
        tagMetadata: {
          ...state.tagMetadata,
          [key]: updatedTag,
        },
      }));
      
      // Save metadata to database
      if (saveTagHandler) {
        // 🛡️ Guard: Don't save during hydration
        if (!shouldAllowSave('updateTagMetadata')) return;
        
        console.log('💾 UPDATE TAG METADATA - Saving to database:', updatedTag);
        saveTagHandler(updatedTag).catch((err) => {
          console.error('❌ Failed to save tag metadata:', err);
        });
      }
    } else {
      console.warn('⚠️ UPDATE TAG METADATA - No existing metadata found for:', tagName, '- Consider using upsertTagMetadata instead');
    }
  },
      
  upsertTagMetadata: (tagName: string, description = '', descriptionVisible = true, isFavorite?: boolean, color?: string) => {
    const key = tagName.toLowerCase();
    const existing = get().tagMetadata[key];
    const now = new Date().toISOString();
    
    console.log('🎨 UPSERT TAG METADATA:', {
      tagName,
      key,
      description,
      descriptionVisible,
      isFavorite,
      color,
      existing,
    });
    
    const tag: Tag = {
      name: tagName, // Preserve original capitalization
      description: description,
      descriptionVisible: descriptionVisible,
      isFavorite: isFavorite !== undefined ? isFavorite : (existing?.isFavorite || false), // Use provided value or preserve existing
      color: color !== undefined ? color : existing?.color, // Use provided value or preserve existing
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      deletedAt: null, // Always null when upserting (creating/updating)
    };
    
    console.log('🎨 UPSERT TAG METADATA - Created tag:', tag);
    
    set((state) => ({
      tagMetadata: {
        ...state.tagMetadata,
        [key]: tag,
      },
    }));
    
    // Save metadata to database
    if (saveTagHandler) {
      // 🛡️ Guard: Don't save during hydration
      if (!shouldAllowSave('upsertTagMetadata')) return;
      
      console.log('💾 UPSERT TAG METADATA - Saving to database:', tag);
      saveTagHandler(tag).catch((err) => {
        console.error('❌ Failed to save tag metadata:', err);
      });
    }
  },
      
      renameTag: (oldTag: string, newTag: string) => {
        const oldKey = oldTag.toLowerCase();
        const newKey = newTag.toLowerCase();
        
        // Don't do anything if the tags are the same (case-insensitive)
        if (oldKey === newKey) return;
        
        // 1. Update all notes that have this tag (batch update)
        const { notes, setNotes } = useNotesStore.getState();
        
        const now = new Date().toISOString();
        let notesUpdated = 0;
        const updatedNotes = notes.map(note => {
          if (note.tags.some(t => t.toLowerCase() === oldKey)) {
            const updatedTags = note.tags.map(t => 
              t.toLowerCase() === oldKey ? newTag : t
            );
            notesUpdated++;
            return { ...note, tags: updatedTags, updatedAt: now };
          }
          return note;
        });
        
        // Apply the batch update using the store's setNotes action
        if (notesUpdated > 0) {
          setNotes(updatedNotes);
          
          // 🆕 SAVE all updated notes to database
          const noteStorageHandlers = getStorageHandlers();
          
          if (noteStorageHandlers?.save && shouldAllowSave('renameTag-notes')) {
            const notesToSave = updatedNotes.filter(note =>
              note.tags.some(t => t.toLowerCase() === newKey) && note.updatedAt === now
            );
            
            Promise.all(
              notesToSave.map(note =>
                noteStorageHandlers.save(note).catch((err) => {
                  console.error(`❌ Failed to save note ${note.id}:`, err);
                })
              )
            ).then(() => {
              console.log(`✅ Saved ${notesToSave.length} notes after tag rename`);
            });
          }
        }
        
        // 1b. Update all folders that have this tag (batch update)
        const foldersStore = useFoldersStore.getState();
        
        let foldersUpdated = 0;
        const updatedFolders = foldersStore.folders.map(folder => {
          if (folder.tags?.some(t => t.toLowerCase() === oldKey)) {
            const updatedTags = folder.tags.map(t => 
              t.toLowerCase() === oldKey ? newTag : t
            );
            foldersUpdated++;
            return { ...folder, tags: updatedTags, updatedAt: now };
          }
          return folder;
        });
        
        // Apply the batch update
        if (foldersUpdated > 0) {
          useFoldersStore.setState({ folders: updatedFolders });
          
          // 🆕 SAVE all updated folders to database
          const saveFolderHandler = getFolderHandler;
          
          if (saveFolderHandler && shouldAllowSave('renameTag-folders')) {
            const foldersToSave = updatedFolders.filter(folder =>
              folder.tags?.some(t => t.toLowerCase() === newKey) && folder.updatedAt === now
            );
            
            Promise.all(
              foldersToSave.map(folder =>
                saveFolderHandler(folder).catch((err) => {
                  console.error(`❌ Failed to save folder ${folder.id}:`, err);
                })
              )
            ).then(() => {
              console.log(`✅ Saved ${foldersToSave.length} folders after tag rename`);
            });
          }
        }
        
        // 2. Update tag metadata (move from old key to new key)
        const existing = get().tagMetadata[oldKey];
        console.log('🔍 RENAME TAG - Before:', {
          oldTag,
          newTag,
          oldKey,
          newKey,
          existingMetadata: existing,
          hasColor: !!existing?.color,
          color: existing?.color,
        });
        
        if (existing) {
          const updatedMetadata = {
            ...existing,
            name: newTag,
            updatedAt: new Date().toISOString(),
          };
          
          console.log('🔍 RENAME TAG - Updated metadata to save:', {
            updatedMetadata,
            colorPreserved: updatedMetadata.color === existing.color,
          });
          
          set((state) => {
            const newTagMetadata = { ...state.tagMetadata };
            delete newTagMetadata[oldKey];
            newTagMetadata[newKey] = updatedMetadata;
            return { tagMetadata: newTagMetadata };
          });
          
          // Verify the update
          const afterUpdate = get().tagMetadata[newKey];
          console.log('🔍 RENAME TAG - After state update:', {
            newKey,
            retrievedMetadata: afterUpdate,
            colorStillPreserved: afterUpdate?.color === existing.color,
          });
          
          // Save the renamed metadata to database
          if (saveTagHandler && shouldAllowSave('renameTag-metadata')) {
            console.log('💾 RENAME TAG - Saving to database:', updatedMetadata);
            saveTagHandler(updatedMetadata).catch((err) => {
              console.error('❌ Failed to save renamed tag metadata:', err);
            });
          }
          
          // Delete the old metadata from database
          if (deleteTagHandler && shouldAllowSave('renameTag-delete-old')) {
            console.log('🗑️ RENAME TAG - Deleting old metadata:', oldTag);
            deleteTagHandler(oldTag).catch((err) => {
              console.error('❌ Failed to delete old tag metadata:', err);
            });
          }
        } else {
          console.log('⚠️ RENAME TAG - No existing metadata found for:', oldTag);
        }
        
        // 3. Update the cache
        get().updateTagsCache();
      },
      
  deleteTag: (tagName: string) => {
    const key = tagName.toLowerCase();
    const now = new Date().toISOString();
    const existing = get().tagMetadata[key];
    
    console.log('🗑️ [DEBUG] deleteTag called:', { tagName, key, existing });
    
    if (!existing) {
      console.warn(`⚠️ Tag "${tagName}" not found in metadata - creating it for soft delete`);
      // Create metadata entry if it doesn't exist
      get().upsertTagMetadata(tagName, '', true, false, undefined);
    }
    
    // 1. Remove tag from all notes
    const { notes, setNotes } = useNotesStore.getState();
    const notesWithTag = notes.filter(note => 
      note.tags.some(t => t.toLowerCase() === key)
    );
    
    if (notesWithTag.length > 0) {
      console.log(`🗑️ Removing tag "${tagName}" from ${notesWithTag.length} notes`);
      
      const updatedNotes = notes.map(note => {
        if (note.tags.some(t => t.toLowerCase() === key)) {
          return {
            ...note,
            tags: note.tags.filter(t => t.toLowerCase() !== key),
            updatedAt: now,
          };
        }
        return note;
      });
      
      setNotes(updatedNotes);
      
      // Save all updated notes to database
      const noteStorageHandlers = getStorageHandlers();
      
      if (noteStorageHandlers?.save && shouldAllowSave('deleteTag-notes')) {
        const notesToSave = updatedNotes.filter(note =>
          notesWithTag.some(n => n.id === note.id)
        );
        
        Promise.all(
          notesToSave.map(note =>
            noteStorageHandlers.save(note).catch((err) => {
              console.error(`❌ Failed to save note ${note.id}:`, err);
            })
          )
        ).then(() => {
          console.log(`✅ Saved ${notesToSave.length} notes after tag deletion`);
        });
      }
    }
    
    // 2. Remove tag from all folders
    const foldersStore = useFoldersStore.getState();
    const foldersWithTag = foldersStore.folders.filter(folder =>
      folder.tags?.some(t => t.toLowerCase() === key)
    );
    
    if (foldersWithTag.length > 0) {
      console.log(`🗑️ Removing tag "${tagName}" from ${foldersWithTag.length} folders`);
      
      const updatedFolders = foldersStore.folders.map(folder => {
        if (folder.tags?.some(t => t.toLowerCase() === key)) {
          return {
            ...folder,
            tags: folder.tags.filter(t => t.toLowerCase() !== key),
            updatedAt: now,
          };
        }
        return folder;
      });
      
      useFoldersStore.setState({ folders: updatedFolders });
      
      // Save all updated folders to database
      const saveFolderHandler = getFolderHandler;
      
      if (saveFolderHandler && shouldAllowSave('deleteTag-folders')) {
        const foldersToSave = updatedFolders.filter(folder =>
          foldersWithTag.some(f => f.id === folder.id)
        );
        
        Promise.all(
          foldersToSave.map(folder =>
            saveFolderHandler(folder).catch((err) => {
              console.error(`❌ Failed to save folder ${folder.id}:`, err);
            })
          )
        ).then(() => {
          console.log(`✅ Saved ${foldersToSave.length} folders after tag deletion`);
        });
      }
    }
    
    // 3. Soft delete tag metadata (set deletedAt)
    const updatedTag: Tag = {
      ...(get().tagMetadata[key] || {
        name: tagName,
        description: '',
        descriptionVisible: true,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
      deletedAt: now,
      updatedAt: now,
    };
    
    console.log('🗑️ [DEBUG] Setting deletedAt on tag metadata:', { tagName, deletedAt: now });
    
    set((state) => ({
      tagMetadata: {
        ...state.tagMetadata,
        [key]: updatedTag,
      },
    }));
    
    console.log(`🗑️ Soft deleted tag: "${tagName}"`);
    
    // 4. Save tag metadata to database
    if (saveTagHandler && shouldAllowSave('deleteTag-metadata')) {
      console.log('💾 [DEBUG] Saving deleted tag metadata to database:', tagName);
      saveTagHandler(updatedTag).catch((err) => {
        console.error('❌ Failed to save deleted tag metadata:', err);
      });
    }
    
    // 5. Update cache to exclude deleted tag
    get().updateTagsCache();
  },
  
  restoreTag: (tagName: string) => {
    const key = tagName.toLowerCase();
    const now = new Date().toISOString();
    const existing = get().tagMetadata[key];
    
    if (!existing) {
      console.warn(`⚠️ Tag "${tagName}" not found in metadata`);
      return;
    }
    
    if (!existing.deletedAt) {
      console.warn(`⚠️ Tag "${tagName}" is not deleted`);
      return;
    }
    
    // Restore: Clear deletedAt timestamp
    const restoredTag: Tag = {
      ...existing,
      deletedAt: null,
      updatedAt: now,
    };
    
    set((state) => ({
      tagMetadata: {
        ...state.tagMetadata,
        [key]: restoredTag,
      },
    }));
    
    console.log(`♻️ Restored tag: "${tagName}"`);
    
    // Save updated metadata to database
    if (saveTagHandler && shouldAllowSave('restoreTag-metadata')) {
      saveTagHandler(restoredTag).catch((err) => {
        console.error('❌ Failed to save restored tag metadata:', err);
      });
    }
    
    // Update cache to include restored tag
    get().updateTagsCache();
  },
  
  permanentlyDeleteTag: (tagName: string) => {
    const key = tagName.toLowerCase();
    
    // 1. Delete tag metadata from store
    set((state) => {
      const newTagMetadata = { ...state.tagMetadata };
      delete newTagMetadata[key];
      return { tagMetadata: newTagMetadata };
    });
    
    console.log(`🔥 Permanently deleted tag: "${tagName}"`);
    
    // 2. Delete tag metadata from database
    if (deleteTagHandler && shouldAllowSave('permanentlyDeleteTag-metadata')) {
      deleteTagHandler(tagName).catch((err) => {
        console.error('❌ Failed to permanently delete tag metadata:', err);
      });
    }
    
    // 3. Update cache
    get().updateTagsCache();
  },
      
  updateTagsCache: () => {
    const notes = useNotesStore.getState().notes;
    const folders = useFoldersStore.getState().folders;
    const metadata = get().tagMetadata;
    const tagsMap = new Map<string, string>();
    
    // 1. Derive unique tags from all non-deleted notes
    notes.forEach((note) => {
      if (!note.deletedAt) {
        note.tags.forEach((tag) => {
          const lowerTag = tag.toLowerCase();
          if (!tagsMap.has(lowerTag)) {
            tagsMap.set(lowerTag, tag); // Store original capitalization
          }
        });
      }
    });
    
    // 2. Add tags from folders
    folders.forEach((folder) => {
      if (!folder.deletedAt && folder.tags) {
        folder.tags.forEach((tag) => {
          const lowerTag = tag.toLowerCase();
          if (!tagsMap.has(lowerTag)) {
            tagsMap.set(lowerTag, tag); // Store original capitalization
          }
        });
      }
    });
    
    // 3. Add standalone tags from metadata
    Object.values(metadata).forEach((tag) => {
      if (tag.deletedAt) return; // Skip deleted tags
      const lowerTag = tag.name.toLowerCase();
      if (!tagsMap.has(lowerTag)) {
        tagsMap.set(lowerTag, tag.name); // Store original capitalization
      }
    });
    
    set({ allTagsCache: Array.from(tagsMap.values()) });
  },
  
  setTagMetadata: (tags: Tag[]) => {
    const metadata: Record<string, Tag> = {};
    tags.forEach(tag => {
      metadata[tag.name.toLowerCase()] = tag;
    });
    set({ tagMetadata: metadata });
  },
}));

/**
 * Hook that derives all unique tags from notes, folders, and standalone tag metadata
 * Automatically updates when notes, folders, or tag metadata changes
 */
export const useAllTags = (): string[] => {
  const notes = useNotesStore((state) => state.notes);
  const folders = useFoldersStore((state) => state.folders);
  const tagMetadata = useTagsStore((state) => state.tagMetadata);

  return useMemo(() => {
    // Use Map to deduplicate case-insensitively while preserving first occurrence's capitalization
    const tagsMap = new Map<string, string>();
    
    // 1. Add tags from notes
    notes.forEach((note) => {
      if (!note.deletedAt) {
        note.tags.forEach((tag) => {
          const lowerTag = tag.toLowerCase();
          if (!tagsMap.has(lowerTag)) {
            tagsMap.set(lowerTag, tag); // Store original capitalization
          }
        });
      }
    });
    
    // 2. Add tags from folders
    folders.forEach((folder) => {
      if (!folder.deletedAt && folder.tags) {
        folder.tags.forEach((tag) => {
          const lowerTag = tag.toLowerCase();
          if (!tagsMap.has(lowerTag)) {
            tagsMap.set(lowerTag, tag); // Store original capitalization
          }
        });
      }
    });
    
    // 3. Add standalone tags from metadata (tags that exist but aren't assigned anywhere yet)
    Object.values(tagMetadata).forEach((tag) => {
      if (tag.deletedAt) return; // Skip deleted tags
      const lowerTag = tag.name.toLowerCase();
      if (!tagsMap.has(lowerTag)) {
        tagsMap.set(lowerTag, tag.name); // Store original capitalization from metadata
      }
    });
    
    return Array.from(tagsMap.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [notes, folders, tagMetadata]);
};

/**
 * Hook that provides tag suggestions based on query
 * @param query - The search query
 * @param excludeTags - Tags to exclude from suggestions
 */
export const useTagSuggestions = (query: string, excludeTags: string[] = []): string[] => {
  const allTags = useAllTags();

  return useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const excludeSet = new Set(excludeTags.map((t) => t.toLowerCase()));

    if (!normalizedQuery) {
      return [];
    }

    return allTags
      .filter((tag) => {
        // Case-insensitive matching since allTags now preserves original capitalization
        return tag.toLowerCase().startsWith(normalizedQuery) && !excludeSet.has(tag.toLowerCase());
      })
      .slice(0, 5); // Limit to 5 suggestions
  }, [allTags, query, excludeTags]);
};

/**
 * Utility function to get suggestions (non-hook version for callbacks)
 * @param notes - Array of notes
 * @param query - The search query
 * @param excludeTags - Tags to exclude from suggestions
 */
export const getTagSuggestions = (
  notes: { tags: string[]; deletedAt: string | null }[],
  query: string,
  excludeTags: string[] = []
): string[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const excludeSet = new Set(excludeTags.map((t) => t.toLowerCase()));

  if (!normalizedQuery) {
    return [];
  }

  // Derive all tags from notes, preserving original capitalization
  const tagsMap = new Map<string, string>();
  notes.forEach((note) => {
    if (!note.deletedAt) {
      note.tags.forEach((tag) => {
        const lowerTag = tag.toLowerCase();
        if (!tagsMap.has(lowerTag)) {
          tagsMap.set(lowerTag, tag); // Store original capitalization
        }
      });
    }
  });

  return Array.from(tagsMap.values())
    .filter((tag) => {
      // Case-insensitive matching
      return tag.toLowerCase().startsWith(normalizedQuery) && !excludeSet.has(tag.toLowerCase());
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .slice(0, 5);
};

