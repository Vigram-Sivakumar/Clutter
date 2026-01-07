import { createElement } from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

export type SidebarTabId = 'notes' | 'tasks' | 'task' | 'tags';

export type IconName =
  | 'Folder'
  | 'Calendar'
  | 'CheckSquare'
  | 'Tag'
  | 'Star'
  | 'Tray'
  | 'CalendarDot'
  | 'AlertTriangle'
  | 'CalendarDots'
  | 'CheckCircle'
  | 'CalendarBlank';

/**
 * Helper to render icon from name
 */
export const renderIcon = (iconName?: IconName, size = 16, color?: string) => {
  if (!iconName) return undefined;
  const IconComponent = PhosphorIcons[iconName] as any;
  const props = color ? { size, color } : { size };
  return IconComponent ? createElement(IconComponent, props) : undefined;
};

export interface SidebarTabConfig {
  id: SidebarTabId;
  label: string;
  iconName: IconName;
  shortcut: string; // Keyboard shortcut
}

export const SIDEBAR_TABS: Record<SidebarTabId, SidebarTabConfig> = {
  notes: {
    id: 'notes',
    label: 'Notes',
    iconName: 'Folder',
    shortcut: '⌘1',
  },
  tasks: {
    id: 'tasks',
    label: 'Calendar',
    iconName: 'Calendar',
    shortcut: '⌘2',
  },
  task: {
    id: 'task',
    label: 'Tasks',
    iconName: 'CheckCircle',
    shortcut: '⌘3',
  },
  tags: {
    id: 'tags',
    label: 'Tags',
    iconName: 'Tag',
    shortcut: '⌘4',
  },
} as const;

// ============================================================================
// SECTION CONFIGURATION (for sidebar views)
// ============================================================================

export type SectionId =
  // Notes tab sections
  | 'favourites-notes'
  | 'folders'
  | 'cluttered'
  // Tasks tab (calendar view) sections
  | 'daily-notes'
  // Task tab (list view) sections
  | 'today'
  | 'overdue'
  | 'upcoming'
  | 'inbox'
  | 'completed'
  // Tags tab sections
  | 'favourites-tags'
  | 'all-tags';

export interface SectionConfig {
  id: SectionId;
  label: string;
  iconName?: IconName;
  emptyMessage: string;
  internalId?: string; // For folder IDs (e.g., 'unplanned-tasks')
  breadcrumbPath: string[]; // For navigation
  stateKey?: string; // For collapse state in UI store
  showBadge?: boolean; // Whether to show count badge
}

export const SECTIONS: Record<SectionId, SectionConfig> = {
  // ============================================================================
  // NOTES TAB SECTIONS
  // ============================================================================
  'favourites-notes': {
    id: 'favourites-notes',
    label: 'Favourites',
    iconName: 'Star',
    emptyMessage: 'No favourites yet',
    breadcrumbPath: ['Favourites'],
    stateKey: 'favouritesCollapsed',
    showBadge: true,
  },
  folders: {
    id: 'folders',
    label: 'Folders',
    iconName: 'Folder',
    emptyMessage: 'No folders yet',
    breadcrumbPath: ['Folders'],
    stateKey: 'foldersCollapsed',
    showBadge: false,
  },
  cluttered: {
    id: 'cluttered',
    label: 'Cluttered',
    iconName: 'Tray',
    emptyMessage: 'No notes yet',
    internalId: '__cluttered__',
    breadcrumbPath: ['Folders', 'Cluttered'],
    stateKey: 'clutteredCollapsed',
    showBadge: true,
  },

  // ============================================================================
  // TASKS TAB (Calendar View) SECTIONS
  // ============================================================================
  'daily-notes': {
    id: 'daily-notes',
    label: 'Daily Notes',
    iconName: 'CalendarBlank',
    emptyMessage: 'No daily notes yet',
    internalId: '__daily_notes__',
    breadcrumbPath: ['Daily notes'],
    stateKey: 'dailyNotesCollapsed',
    showBadge: false,
  },

  // ============================================================================
  // TASK TAB (List View) SECTIONS
  // ============================================================================
  today: {
    id: 'today',
    label: 'Today',
    iconName: 'CalendarBlank',
    emptyMessage: 'No tasks for today',
    internalId: 'today-tasks',
    breadcrumbPath: ['Tasks', 'Today'],
    stateKey: 'taskTodayCollapsed',
    showBadge: true,
  },
  overdue: {
    id: 'overdue',
    label: 'Overdue',
    iconName: 'AlertTriangle',
    emptyMessage: 'No overdue tasks',
    internalId: 'overdue-tasks',
    breadcrumbPath: ['Tasks', 'Overdue'],
    stateKey: 'taskOverdueCollapsed',
    showBadge: true,
  },
  upcoming: {
    id: 'upcoming',
    label: 'Upcoming',
    iconName: 'CalendarDots',
    emptyMessage: 'No upcoming tasks',
    internalId: 'upcoming-tasks',
    breadcrumbPath: ['Tasks', 'Upcoming'],
    stateKey: 'taskUpcomingCollapsed',
    showBadge: true,
  },
  inbox: {
    id: 'inbox',
    label: 'Someday',
    iconName: 'Tray',
    emptyMessage: 'No tasks in someday',
    internalId: 'unplanned-tasks', // Keep old ID for backward compatibility
    breadcrumbPath: ['Tasks', 'Someday'],
    stateKey: 'taskUnplannedCollapsed',
    showBadge: true,
  },
  completed: {
    id: 'completed',
    label: 'Completed',
    iconName: 'CheckCircle',
    emptyMessage: 'No completed tasks',
    internalId: 'completed-tasks',
    breadcrumbPath: ['Tasks', 'Completed'],
    stateKey: 'taskCompletedCollapsed',
    showBadge: true,
  },

  // ============================================================================
  // TAGS TAB SECTIONS
  // ============================================================================
  'favourites-tags': {
    id: 'favourites-tags',
    label: 'Favourites',
    iconName: 'Star',
    emptyMessage: 'No favourite tags yet',
    breadcrumbPath: ['Favourites'],
    stateKey: 'favouriteTagsCollapsed',
    showBadge: true,
  },
  'all-tags': {
    id: 'all-tags',
    label: 'All Tags',
    iconName: 'Tag',
    emptyMessage: 'No tags yet',
    breadcrumbPath: ['All tags'],
    stateKey: 'allTagsCollapsed',
    showBadge: true,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get section config by ID
 */
export const getSection = (id: SectionId): SectionConfig => {
  return SECTIONS[id];
};

/**
 * Get section by internal ID (for folder navigation)
 */
export const getSectionByInternalId = (
  internalId: string
): SectionConfig | undefined => {
  return Object.values(SECTIONS).find(
    (section) => section.internalId === internalId
  );
};

/**
 * Get all sections for a specific tab
 */
export const getSectionsForTab = (tabId: SidebarTabId): SectionConfig[] => {
  const sectionsByTab: Record<SidebarTabId, SectionId[]> = {
    notes: ['favourites-notes', 'folders'],
    tasks: ['daily-notes'],
    task: ['today', 'overdue', 'upcoming', 'inbox', 'completed'],
    tags: ['favourites-tags', 'all-tags'],
  };

  return sectionsByTab[tabId].map((id) => SECTIONS[id]);
};

/**
 * Get tab config by ID
 */
export const getTab = (id: SidebarTabId): SidebarTabConfig => {
  return SIDEBAR_TABS[id];
};
