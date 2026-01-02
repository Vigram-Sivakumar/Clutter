/**
 * UI State Store
 * Manages persistent UI preferences and state across app sessions
 * Uses Zustand with localStorage persistence (will be migrated to SQLite for desktop)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Main view type for navigation
 */
export type MainView = 
  | { type: 'editor'; source?: 'deletedItems' | 'default' }
  | { type: 'tagFilter'; tag: string; source: 'all' | 'favorites' }
  | { type: 'folderView'; folderId: string; source?: 'deletedItems' | 'default' }
  | { type: 'allFoldersView' }
  | { type: 'favouritesView' }
  | { type: 'allTagsView' }
  | { type: 'favouriteTagsView' }
  | { type: 'allTasksView' }
  | { type: 'deletedItemsView' };

interface UIStateStore {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  sidebarTab: 'notes' | 'tasks' | 'tags';
  
  // Notes tab - section collapse states
  clutteredCollapsed: boolean;
  dailyNotesCollapsed: boolean;
  favouritesCollapsed: boolean;
  foldersCollapsed: boolean;
  
  // Notes tab - folder expansion
  openFolderIds: Set<string>;
  
  // Notes tab - manual toggle tracking
  hasManuallyToggledCluttered: boolean;
  hasManuallyToggledDailyNotes: boolean;
  hasManuallyToggledFavourites: boolean;
  hasManuallyToggledFolders: boolean;
  
  // Tasks tab
  allTasksCollapsed: boolean;
  
  // Tags tab
  allTagsCollapsed: boolean;
  favouriteTagsCollapsed: boolean;
  
  // Calendar
  calendarWeekStart: string; // ISO date string
  
  // Navigation
  mainView: MainView;
  lastNoteId: string | null;
  
  // Editor
  editorFullWidth: boolean;
  
  // Per-view collapse states
  folderViewSubfoldersCollapsed: boolean;
  folderViewNotesCollapsed: boolean;
  deletedItemsFoldersCollapsed: boolean;
  deletedItemsNotesCollapsed: boolean;
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarTab: (tab: 'notes' | 'tasks' | 'tags') => void;
  
  setClutteredCollapsed: (collapsed: boolean) => void;
  setDailyNotesCollapsed: (collapsed: boolean) => void;
  setFavouritesCollapsed: (collapsed: boolean) => void;
  setFoldersCollapsed: (collapsed: boolean) => void;
  
  setOpenFolderIds: (ids: Set<string>) => void;
  toggleFolderOpen: (folderId: string) => void;
  
  setHasManuallyToggledCluttered: (toggled: boolean) => void;
  setHasManuallyToggledDailyNotes: (toggled: boolean) => void;
  setHasManuallyToggledFavourites: (toggled: boolean) => void;
  setHasManuallyToggledFolders: (toggled: boolean) => void;
  
  setAllTasksCollapsed: (collapsed: boolean) => void;
  setAllTagsCollapsed: (collapsed: boolean) => void;
  setFavouriteTagsCollapsed: (collapsed: boolean) => void;
  
  setCalendarWeekStart: (date: string) => void;
  
  setMainView: (view: MainView) => void;
  setLastNoteId: (noteId: string | null) => void;
  
  setEditorFullWidth: (fullWidth: boolean) => void;
  
  setFolderViewSubfoldersCollapsed: (collapsed: boolean) => void;
  setFolderViewNotesCollapsed: (collapsed: boolean) => void;
  setDeletedItemsFoldersCollapsed: (collapsed: boolean) => void;
  setDeletedItemsNotesCollapsed: (collapsed: boolean) => void;
}

// Safe localStorage wrapper
const getLocalStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const safeStorage = {
  getItem: (name: string) => {
    try {
      const storage = getLocalStorage();
      return storage ? storage.getItem(name) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem(name, value);
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  removeItem: (name: string) => {
    try {
      const storage = getLocalStorage();
      if (storage) {
        storage.removeItem(name);
      }
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};

// Get today's week start for calendar default
const getTodayWeekStart = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  return startOfWeek.toISOString();
};

export const useUIStateStore = create<UIStateStore>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarWidth: 256,
      sidebarTab: 'tasks',
      
      clutteredCollapsed: true,
      dailyNotesCollapsed: true,
      favouritesCollapsed: true,
      foldersCollapsed: false,
      
      openFolderIds: new Set<string>(),
      
      hasManuallyToggledCluttered: false,
      hasManuallyToggledDailyNotes: false,
      hasManuallyToggledFavourites: false,
      hasManuallyToggledFolders: false,
      
      allTasksCollapsed: true,
      allTagsCollapsed: false,
      favouriteTagsCollapsed: true,
      
      calendarWeekStart: getTodayWeekStart(),
      
      mainView: { type: 'editor' },
      lastNoteId: null,
      
      editorFullWidth: false,
      
      folderViewSubfoldersCollapsed: false,
      folderViewNotesCollapsed: false,
      deletedItemsFoldersCollapsed: false,
      deletedItemsNotesCollapsed: false,
      
      // Actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),
      
      setClutteredCollapsed: (collapsed) => set({ clutteredCollapsed: collapsed }),
      setDailyNotesCollapsed: (collapsed) => set({ dailyNotesCollapsed: collapsed }),
      setFavouritesCollapsed: (collapsed) => set({ favouritesCollapsed: collapsed }),
      setFoldersCollapsed: (collapsed) => set({ foldersCollapsed: collapsed }),
      
      setOpenFolderIds: (ids) => set({ openFolderIds: ids }),
      toggleFolderOpen: (folderId) => set((state) => {
        const newSet = new Set(state.openFolderIds);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        return { openFolderIds: newSet };
      }),
      
      setHasManuallyToggledCluttered: (toggled) => set({ hasManuallyToggledCluttered: toggled }),
      setHasManuallyToggledDailyNotes: (toggled) => set({ hasManuallyToggledDailyNotes: toggled }),
      setHasManuallyToggledFavourites: (toggled) => set({ hasManuallyToggledFavourites: toggled }),
      setHasManuallyToggledFolders: (toggled) => set({ hasManuallyToggledFolders: toggled }),
      
      setAllTasksCollapsed: (collapsed) => set({ allTasksCollapsed: collapsed }),
      setAllTagsCollapsed: (collapsed) => set({ allTagsCollapsed: collapsed }),
      setFavouriteTagsCollapsed: (collapsed) => set({ favouriteTagsCollapsed: collapsed }),
      
      setCalendarWeekStart: (date) => set({ calendarWeekStart: date }),
      
      setMainView: (view) => set({ mainView: view }),
      setLastNoteId: (noteId) => set({ lastNoteId: noteId }),
      
      setEditorFullWidth: (fullWidth) => set({ editorFullWidth: fullWidth }),
      
      setFolderViewSubfoldersCollapsed: (collapsed) => set({ folderViewSubfoldersCollapsed: collapsed }),
      setFolderViewNotesCollapsed: (collapsed) => set({ folderViewNotesCollapsed: collapsed }),
      setDeletedItemsFoldersCollapsed: (collapsed) => set({ deletedItemsFoldersCollapsed: collapsed }),
      setDeletedItemsNotesCollapsed: (collapsed) => set({ deletedItemsNotesCollapsed: collapsed }),
    }),
    {
      name: 'clutter-ui-state',
      storage: {
        getItem: (name) => {
          const str = safeStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert openFolderIds array back to Set
          if (parsed.state && Array.isArray(parsed.state.openFolderIds)) {
            parsed.state.openFolderIds = new Set(parsed.state.openFolderIds);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert openFolderIds Set to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              openFolderIds: Array.from(value.state.openFolderIds || []),
            },
          };
          safeStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => safeStorage.removeItem(name),
      },
    }
  )
);

