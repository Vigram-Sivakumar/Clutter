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
  | { type: 'deletedItemsView' }
  | { type: 'dailyNotesYearView'; year: string } // View all months in a specific year
  | { type: 'dailyNotesMonthView'; year: string; month: string }; // View all notes in a specific month

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
  
  // Daily Notes - year/month group collapse states (main list view)
  // Stores keys like "2026" for years or "2026-January" for months
  collapsedDailyNoteGroups: Set<string>;
  
  // Daily Notes - year/month group collapse states (sidebar)
  // Independent from main list view collapse states
  sidebarCollapsedDailyNoteGroups: Set<string>;
  
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
  
  setCollapsedDailyNoteGroups: (groups: Set<string>) => void;
  toggleDailyNoteGroupCollapsed: (groupKey: string) => void;
  isDailyNoteGroupCollapsed: (groupKey: string) => boolean;
  
  setSidebarCollapsedDailyNoteGroups: (groups: Set<string>) => void;
  toggleSidebarDailyNoteGroupCollapsed: (groupKey: string) => void;
  isSidebarDailyNoteGroupCollapsed: (groupKey: string) => boolean;
  
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
      
      collapsedDailyNoteGroups: new Set<string>(),
      sidebarCollapsedDailyNoteGroups: new Set<string>(),
      
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
      
      setCollapsedDailyNoteGroups: (groups) => set({ collapsedDailyNoteGroups: groups }),
      toggleDailyNoteGroupCollapsed: (groupKey) => set((state) => {
        const newSet = new Set(state.collapsedDailyNoteGroups);
        if (newSet.has(groupKey)) {
          newSet.delete(groupKey);
        } else {
          newSet.add(groupKey);
        }
        return { collapsedDailyNoteGroups: newSet };
      }),
      isDailyNoteGroupCollapsed: (groupKey) => (state) => state.collapsedDailyNoteGroups.has(groupKey),
      
      setSidebarCollapsedDailyNoteGroups: (groups) => set({ sidebarCollapsedDailyNoteGroups: groups }),
      toggleSidebarDailyNoteGroupCollapsed: (groupKey) => set((state) => {
        const newSet = new Set(state.sidebarCollapsedDailyNoteGroups);
        if (newSet.has(groupKey)) {
          newSet.delete(groupKey);
        } else {
          newSet.add(groupKey);
        }
        return { sidebarCollapsedDailyNoteGroups: newSet };
      }),
      isSidebarDailyNoteGroupCollapsed: (groupKey) => (state) => state.sidebarCollapsedDailyNoteGroups.has(groupKey),
      
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
          // Convert collapsedDailyNoteGroups array back to Set
          if (parsed.state && Array.isArray(parsed.state.collapsedDailyNoteGroups)) {
            parsed.state.collapsedDailyNoteGroups = new Set(parsed.state.collapsedDailyNoteGroups);
          }
          // Convert sidebarCollapsedDailyNoteGroups array back to Set
          if (parsed.state && Array.isArray(parsed.state.sidebarCollapsedDailyNoteGroups)) {
            parsed.state.sidebarCollapsedDailyNoteGroups = new Set(parsed.state.sidebarCollapsedDailyNoteGroups);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Sets to arrays for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              openFolderIds: Array.from(value.state.openFolderIds || []),
              collapsedDailyNoteGroups: Array.from(value.state.collapsedDailyNoteGroups || []),
              sidebarCollapsedDailyNoteGroups: Array.from(value.state.sidebarCollapsedDailyNoteGroups || []),
            },
          };
          safeStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => safeStorage.removeItem(name),
      },
    }
  )
);

