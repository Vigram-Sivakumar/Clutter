/**
 * Sidebar Configuration
 * Single source of truth for all sidebar behavior and styling rules
 * 
 * This configuration centralizes:
 * - Selection rules (context-aware, multi-select)
 * - Hover behavior (CSS-driven, no JS state)
 * - Action visibility rules (quick add, context menu)
 * - Variant-specific behavior (header, folder, note, tag)
 * - Styling tokens (colors, transitions, layout)
 * 
 * Philosophy:
 * - Declarative over imperative
 * - CSS-driven hover (no React state)
 * - Type-safe configuration
 * - Easy to extend and maintain
 */

import { sidebarLayout } from '../../../../../tokens/sidebar';
import { animations } from '../../../../../tokens/animations';

/**
 * Behavior Configuration
 * Defines all interaction rules and visibility logic
 */
export const sidebarBehavior = {
  /**
   * Selection Rules
   * Controls how items are selected and highlighted
   */
  selection: {
    /** Highlight only where clicked (not duplicates in other sections) */
    contextAware: true,
    
    /** Enable multi-select with Cmd/Ctrl + click and Shift + click */
    multiSelect: true,
    
    /** Clear all selections when clicking empty space */
    clearOnEmptyClick: true,
  },

  /**
   * Hover Rules (CSS-driven)
   * No React state - all hover effects via CSS
   */
  hover: {
    /** Variants that show chevron on LEFT when hovered (replacing icon/emoji) */
    showChevronOnLeft: ['folder'],
    
    /** Variants that hide icon/emoji when hovered (to show chevron) */
    hideIconOnHover: ['folder'],
    
    /** Show action buttons (+/⋮) on hover */
    showActionsOnHover: true,
    
    /** Hide badge/count when actions are visible on hover */
    hideBadgeOnHover: true,
    
    /** Background color changes on hover (CSS-driven) */
    backgroundOnHover: true,
  },

  /**
   * Action Visibility Rules
   * Determines which actions appear for which items
   */
  actions: {
    /**
     * Quick Add Button (+)
     * Shows a plus icon to quickly add nested items
     */
    quickAdd: {
      /** Which variants can show the + button */
      show: ['folder', 'header'],
      
      /** Contexts where + button should NOT appear */
      exclude: ['favourites'],
      
      /** System folders that get + button */
      systemFolders: ['__cluttered__', '__daily_notes__', 'all-tasks'],
    },
    
    /**
     * Context Menu (⋮)
     * Shows more actions in a dropdown
     */
    contextMenu: {
      /** Which variants can show context menu */
      show: ['note', 'folder', 'tag'],
      
      /** Contexts where context menu should NOT appear */
      exclude: ['favourites'],
      
      /** System folders only get + button, no context menu */
      excludeSystemFolders: true,
    },
  },

  /**
   * Variant-Specific Rules
   * Each variant (header, folder, note, tag) has unique behavior
   */
  variants: {
    /**
     * Header Variant
     * Section headers like "FAVOURITES", "ALL FOLDERS", "ALL TAGS"
     */
    header: {
      /** Chevron stays on right (doesn't swap on hover) */
      chevronPosition: 'right',
      
      /** Show icon if provided */
      showIcon: true,
      
      /** Text transformation - removed per user request */
      uppercase: false,
      
      /** Can be toggled to expand/collapse */
      collapsible: true,
      
      /** Auto-expand when dragging over (for drop targets) */
      autoExpandOnDragOver: true,
    },
    
    /**
     * Folder Variant
     * User folders and system folders (Cluttered, Daily Notes)
     */
    folder: {
      /** Chevron appears on LEFT when hovered (replaces icon) */
      chevronPosition: 'left',
      
      /** No auto-expand on click (removed per user request) */
      autoExpand: false,
      
      /** No auto-collapse when empty (removed per user request) */
      autoCollapse: false,
      
      /** Show nested count badge */
      showBadge: true,
      
      /** Can be expanded to show nested items */
      collapsible: true,
    },
    
    /**
     * Note Variant
     * Individual notes in sidebar
     */
    note: {
      /** Notes don't have quick add button */
      showQuickAdd: false,
      
      /** Notes show context menu for rename/delete */
      showContextMenu: true,
      
      /** Show emoji/icon */
      showIcon: true,
      
      /** Show special icon for daily notes (calendar icon) */
      dailyNoteIcon: true,
      
      /** Show blank note icon if no content */
      blankNoteIcon: true,
    },
    
    /**
     * Tag Variant
     * Tags displayed as colored pills
     */
    tag: {
      /** Tags don't have quick add button */
      showQuickAdd: false,
      
      /** Tags show context menu for rename/delete */
      showContextMenu: true,
      
      /** Tags use colored background (pill style) */
      coloredBackground: true,
      
      /** Show usage count badge */
      showBadge: true,
    },
  },

  /**
   * System Folders
   * Special folders that have restricted behavior
   */
  systemFolders: {
    /** System folder IDs */
    ids: ['__cluttered__', '__daily_notes__', 'all-tasks'],
    
    /** System folders cannot be renamed */
    allowRename: false,
    
    /** System folders cannot be deleted */
    allowDelete: false,
    
    /** System folders cannot have emoji changed (use Phosphor icons) */
    allowEmojiChange: false,
    
    /** System folders can have notes added */
    allowAddNotes: true,
  },

  /**
   * Favourites Section
   * Items in favourites section have special behavior
   */
  favourites: {
    /** Favourite folders are fully functional (not just bookmarks) */
    foldersAreFullyFunctional: true,
    
    /** Show context menu for unfavoriting */
    showContextMenu: true,
    
    /** Don't show quick add button */
    showQuickAdd: false,
  },
} as const;

/**
 * Style Configuration
 * Defines all visual styling rules
 */
export const sidebarStyles = {
  /**
   * Colors
   * All color tokens mapped to theme
   */
  colors: {
    background: {
      /** Default background (transparent) */
      default: 'transparent',
      
      /** Hover background - function receives theme */
      hover: (theme: any) => theme.colors.background.subtleHover,
      
      /** Selected background - function receives theme */
      selected: (theme: any) => theme.colors.background.tertiary,
      
      /** Dragging background - function receives theme */
      dragging: (theme: any) => theme.colors.background.hover,
      
      /** Drop target background - function receives theme */
      dropTarget: (theme: any) => theme.colors.background.hover,
    },
    
    text: {
      /** Primary text color - function receives theme */
      default: (theme: any) => theme.colors.text.primary,
      
      /** Secondary text color - function receives theme */
      secondary: (theme: any) => theme.colors.text.secondary,
      
      /** Muted text color - function receives theme */
      muted: (theme: any) => theme.colors.text.tertiary,
    },
    
    border: {
      /** Default border (transparent) */
      default: 'transparent',
      
      /** Drop target border - function receives theme */
      dropTarget: (theme: any) => theme.colors.semantic.info,
      
      /** Scroll indicator border - function receives theme */
      scrollIndicator: (theme: any) => theme.colors.border.divider,
    },
  },

  /**
   * Transitions
   * All animation/transition definitions
   */
  transitions: {
    /** Hover transitions (background, opacity) */
    hover: animations.transition.backgroundColor + ', ' + animations.transition.opacity,
    
    /** Selection transition (background only) */
    selection: animations.transition.backgroundColor,
    
    /** Collapse/expand animation */
    collapse: {
      height: animations.presets.collapse.height,
      content: animations.presets.collapse.content,
    },
    
    /** Drag & drop transitions */
    drag: animations.transition.transform + ', ' + animations.transition.opacity,
    
    /** Standard UI transitions */
    standard: animations.transition.default,
  },

  /**
   * Layout Tokens
   * Re-export from sidebar.ts for consistency
   */
  layout: sidebarLayout,

  /**
   * CSS Classes
   * Standardized class names for styling hooks
   */
  classes: {
    /** Main item container */
    item: 'sidebar-item',
    
    /** Icon/emoji wrapper */
    iconWrapper: 'sidebar-item__icon-wrapper',
    icon: 'sidebar-item__icon',
    
    /** Chevron (left position, shown on hover for folders) */
    chevronLeft: 'sidebar-item__chevron-left',
    
    /** Label/text */
    label: 'sidebar-item__label',
    
    /** Actions container (quick add + context menu) */
    actions: 'sidebar-item__actions',
    
    /** Badge/count */
    badge: 'sidebar-item__badge',
    
    /** Chevron (right position, for headers) */
    chevronRight: 'sidebar-item__chevron-right',
    
    /** Selected state */
    selected: 'sidebar-item--selected',
    
    /** Dragging state */
    dragging: 'sidebar-item--dragging',
    
    /** Drop target state */
    dropTarget: 'sidebar-item--drop-target',
  },

  /**
   * CSS Variables
   * Used for dynamic theming
   */
  cssVariables: {
    /** Background color on hover */
    hoverBg: '--sidebar-hover-bg',
    
    /** Background color when selected */
    selectedBg: '--sidebar-selected-bg',
    
    /** Transition timing */
    transition: '--sidebar-transition',
    
    /** Icon size */
    iconSize: '--sidebar-icon-size',
    
    /** Item height */
    itemHeight: '--sidebar-item-height',
  },
} as const;

/**
 * Helper Functions
 * Utility functions for working with config
 */

/**
 * Check if a variant should show quick add button
 */
export function shouldShowQuickAdd(
  variant: 'note' | 'folder' | 'tag' | 'header',
  context?: string,
  isSystemFolder?: boolean
): boolean {
  // Check if variant supports quick add
  if (!sidebarBehavior.actions.quickAdd.show.includes(variant)) {
    return false;
  }
  
  // Check if context is excluded
  if (context && sidebarBehavior.actions.quickAdd.exclude.includes(context)) {
    return false;
  }
  
  // Allow for system folders if specified
  if (isSystemFolder) {
    return true;
  }
  
  return true;
}

/**
 * Check if an item should show context menu
 */
export function shouldShowContextMenu(
  variant: 'note' | 'folder' | 'tag' | 'header',
  context?: string,
  isSystemFolder?: boolean
): boolean {
  // Check if variant supports context menu
  if (!sidebarBehavior.actions.contextMenu.show.includes(variant)) {
    return false;
  }
  
  // System folders don't get context menu
  if (isSystemFolder && sidebarBehavior.actions.contextMenu.excludeSystemFolders) {
    return false;
  }
  
  // Check if context is excluded (e.g., favourites)
  if (context && sidebarBehavior.actions.contextMenu.exclude.includes(context)) {
    return false;
  }
  
  return true;
}

/**
 * Check if a folder ID is a system folder
 */
export function isSystemFolder(folderId: string): boolean {
  return sidebarBehavior.systemFolders.ids.includes(folderId);
}

/**
 * Get chevron position for a variant
 */
export function getChevronPosition(
  variant: 'note' | 'folder' | 'tag' | 'header'
): 'left' | 'right' {
  if (variant === 'header') {
    return sidebarBehavior.variants.header.chevronPosition;
  }
  if (variant === 'folder') {
    return sidebarBehavior.variants.folder.chevronPosition;
  }
  return 'right'; // Default
}

/**
 * Check if icon should hide on hover
 */
export function shouldHideIconOnHover(
  variant: 'note' | 'folder' | 'tag' | 'header'
): boolean {
  return sidebarBehavior.hover.hideIconOnHover.includes(variant);
}

/**
 * Type exports for use in components
 */
export type SidebarBehavior = typeof sidebarBehavior;
export type SidebarStyles = typeof sidebarStyles;
export type SidebarVariant = 'note' | 'folder' | 'tag' | 'header';

