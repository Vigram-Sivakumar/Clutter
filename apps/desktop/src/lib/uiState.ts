import { invoke } from '@tauri-apps/api/tauri';

/**
 * UI State Keys
 * All keys are prefixed with 'ui.' for organization in the settings table
 */
export const UI_STATE_KEYS = {
  // Sidebar
  SIDEBAR_COLLAPSED: 'ui.sidebar.collapsed',
  SIDEBAR_WIDTH: 'ui.sidebar.width',
  SIDEBAR_TAB: 'ui.sidebar.tab',
  
  // Notes tab sections
  CLUTTERED_COLLAPSED: 'ui.notes.cluttered.collapsed',
  DAILY_NOTES_COLLAPSED: 'ui.notes.dailyNotes.collapsed',
  FAVOURITES_COLLAPSED: 'ui.notes.favourites.collapsed',
  FOLDERS_COLLAPSED: 'ui.notes.folders.collapsed',
  OPEN_FOLDER_IDS: 'ui.notes.openFolderIds',
  COLLAPSED_DAILY_NOTE_GROUPS: 'ui.notes.collapsedDailyNoteGroups',
  SIDEBAR_COLLAPSED_DAILY_NOTE_GROUPS: 'ui.notes.sidebar.collapsedDailyNoteGroups',
  
  // Notes tab - manual toggle tracking
  MANUALLY_TOGGLED_CLUTTERED: 'ui.notes.manuallyToggledCluttered',
  MANUALLY_TOGGLED_DAILY_NOTES: 'ui.notes.manuallyToggledDailyNotes',
  MANUALLY_TOGGLED_FAVOURITES: 'ui.notes.manuallyToggledFavourites',
  MANUALLY_TOGGLED_FOLDERS: 'ui.notes.manuallyToggledFolders',
  
  // Tasks tab
  ALL_TASKS_COLLAPSED: 'ui.tasks.allTasks.collapsed',
  
  // Tags tab
  ALL_TAGS_COLLAPSED: 'ui.tags.allTags.collapsed',
  FAVOURITE_TAGS_COLLAPSED: 'ui.tags.favouriteTags.collapsed',
  
  // Navigation
  MAIN_VIEW: 'ui.navigation.mainView',
  CURRENT_NOTE_ID: 'ui.navigation.currentNoteId',
  
  // Calendar
  CALENDAR_WEEK_START: 'ui.calendar.weekStart',
  
  // Editor
  EDITOR_FULL_WIDTH: 'ui.editor.fullWidth',
  
  // Per-view states (FolderListView)
  FOLDER_VIEW_SEARCH: 'ui.folderView.search',
  FOLDER_VIEW_SUBFOLDERS_COLLAPSED: 'ui.folderView.subfoldersCollapsed',
  FOLDER_VIEW_NOTES_COLLAPSED: 'ui.folderView.notesCollapsed',
  
  // Deleted items view
  DELETED_ITEMS_FOLDERS_COLLAPSED: 'ui.deletedItems.foldersCollapsed',
  DELETED_ITEMS_NOTES_COLLAPSED: 'ui.deletedItems.notesCollapsed',
} as const;

/**
 * Type-safe UI State interface
 */
export interface UIState {
  // Sidebar
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  sidebarTab?: 'notes' | 'tasks' | 'tags';
  
  // Notes tab
  clutteredCollapsed?: boolean;
  dailyNotesCollapsed?: boolean;
  favouritesCollapsed?: boolean;
  foldersCollapsed?: boolean;
  openFolderIds?: string[];
  collapsedDailyNoteGroups?: string[];
  sidebarCollapsedDailyNoteGroups?: string[];
  
  // Manual toggle tracking
  manuallyToggledCluttered?: boolean;
  manuallyToggledDailyNotes?: boolean;
  manuallyToggledFavourites?: boolean;
  manuallyToggledFolders?: boolean;
  
  // Tasks tab
  allTasksCollapsed?: boolean;
  
  // Tags tab
  allTagsCollapsed?: boolean;
  favouriteTagsCollapsed?: boolean;
  
  // Navigation
  mainView?: {
    type: 'editor' | 'tagFilter' | 'folderView' | 'allFoldersView' | 'favouritesView' | 'allTagsView' | 'favouriteTagsView' | 'allTasksView' | 'deletedItemsView';
    folderId?: string;
    tag?: string;
    source?: 'all' | 'favorites' | 'deletedItems' | 'default';
  };
  currentNoteId?: string | null;
  
  // Calendar
  calendarWeekStart?: string;
  
  // Editor
  editorFullWidth?: boolean;
  
  // Per-view states
  folderViewSearch?: string;
  folderViewSubfoldersCollapsed?: boolean;
  folderViewNotesCollapsed?: boolean;
  deletedItemsFoldersCollapsed?: boolean;
  deletedItemsNotesCollapsed?: boolean;
}

/**
 * Save a single UI state value
 */
export async function saveUIState(key: string, value: any): Promise<void> {
  try {
    const valueStr = JSON.stringify(value);
    await invoke('save_ui_state', { key, value: valueStr });
  } catch (error) {
    console.error(`Failed to save UI state for ${key}:`, error);
  }
}

/**
 * Load a single UI state value
 */
export async function loadUIState(key: string): Promise<any | null> {
  try {
    const valueStr = await invoke<string | null>('load_ui_state', { key });
    return valueStr ? JSON.parse(valueStr) : null;
  } catch (error) {
    console.error(`Failed to load UI state for ${key}:`, error);
    return null;
  }
}

/**
 * Load all UI state from database
 */
export async function loadAllUIState(): Promise<UIState> {
  try {
    const allSettings = await invoke<Record<string, string>>('load_all_ui_state');
    
    // Parse all JSON values
    const parsed: UIState = {};
    for (const [key, valueStr] of Object.entries(allSettings)) {
      try {
        const shortKey = key.replace('ui.', '').replace(/\./g, '_');
        // Convert snake_case to camelCase
        const camelKey = shortKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        parsed[camelKey as keyof UIState] = JSON.parse(valueStr);
      } catch (e) {
        console.warn(`Failed to parse UI state for ${key}`);
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load all UI state:', error);
    return {};
  }
}

/**
 * Debounced save to avoid too many writes
 * Maintains a timer per key
 */
const saveTimers: Record<string, NodeJS.Timeout> = {};

export function debouncedSaveUIState(key: string, value: any, delay: number = 500): void {
  if (saveTimers[key]) {
    clearTimeout(saveTimers[key]);
  }
  
  saveTimers[key] = setTimeout(() => {
    saveUIState(key, value);
    delete saveTimers[key];
  }, delay);
}

