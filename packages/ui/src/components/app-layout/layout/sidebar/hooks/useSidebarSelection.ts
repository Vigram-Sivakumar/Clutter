import { useCallback } from 'react';
import { useUIStateStore } from '@clutter/shared';
import { useMultiSelect } from '../../../../../hooks/useMultiSelect';
import { sidebarBehavior } from '../config/sidebarConfig';
import { GlobalSelection } from '../types';

/**
 * useSidebarSelection
 * Centralized selection state and logic
 * 
 * This hook:
 * - Manages global selection state (context-aware)
 * - Handles multi-select (Cmd/Ctrl + click, Shift + click)
 * - Provides clear/reset functions
 * - Integrates with useMultiSelect hook
 * 
 * Pattern:
 * - Single source of truth for selection
 * - Type-safe selection operations
 * - Config-driven behavior
 * 
 * Usage:
 * ```ts
 * const { selection, handleItemClick, clearSelection } = useSidebarSelection();
 * 
 * // Then in render:
 * <SidebarItemNote
 *   isSelected={selection.type === 'note' && selection.itemId === noteId && selection.context === 'root-folders'}
 *   onClick={(e) => handleItemClick(noteId, 'note', 'root-folders', e)}
 * />
 * ```
 */

interface SelectionHandlers {
  // Click handlers for different item types
  handleItemClick: (
    id: string,
    type: 'note' | 'folder' | 'tag',
    context: string,
    event: React.MouseEvent
  ) => void;
  
  // Clear all selections
  clearSelection: () => void;
  
  // Check if an item is selected
  isItemSelected: (id: string, type: 'note' | 'folder' | 'tag', context: string) => boolean;
}

export function useSidebarSelection(): {
  selection: GlobalSelection;
  multiSelectIds: Set<string>;
  handlers: SelectionHandlers;
} {
  // Global selection state (single item + context)
  const selection = useUIStateStore(state => state.selection);
  const setSelection = useUIStateStore(state => state.setSelection);
  
  // Multi-select state (for notes and folders)
  const {
    selectedNoteIds,
    selectedFolderIds,
    handleNoteMultiSelectBase,
    handleFolderMultiSelectBase,
    clearAllSelections,
  } = useMultiSelect();
  
  /**
   * Handle item click with multi-select support
   */
  const handleItemClick = useCallback((
    id: string,
    type: 'note' | 'folder' | 'tag',
    context: string,
    event: React.MouseEvent
  ) => {
    // Check config for multi-select support
    if (sidebarBehavior.selection.multiSelect) {
      // Multi-select logic for notes and folders
      if (type === 'note') {
        // Use existing multi-select hook
        handleNoteMultiSelectBase(id, event);
        
        // Update global selection
        setSelection({
          type: 'note',
          itemId: id,
          context,
          multiSelectIds: Array.from(selectedNoteIds),
        });
      } else if (type === 'folder') {
        // Use existing multi-select hook
        handleFolderMultiSelectBase(id, event);
        
        // Update global selection
        setSelection({
          type: 'folder',
          itemId: id,
          context,
          multiSelectIds: Array.from(selectedFolderIds),
        });
      } else if (type === 'tag') {
        // Tags don't support multi-select
        setSelection({
          type: 'tag',
          itemId: id,
          context,
          multiSelectIds: [],
        });
      }
    } else {
      // Simple single-select
      setSelection({
        type,
        itemId: id,
        context,
        multiSelectIds: [],
      });
    }
  }, [
    handleNoteMultiSelectBase,
    handleFolderMultiSelectBase,
    selectedNoteIds,
    selectedFolderIds,
    setSelection,
  ]);
  
  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    // Clear multi-select
    clearAllSelections();
    
    // Clear global selection
    setSelection({
      type: null,
      itemId: null,
      context: null,
      multiSelectIds: [],
    });
  }, [clearAllSelections, setSelection]);
  
  /**
   * Check if an item is selected
   * 
   * Context-aware: Only returns true if the item is selected in the same context
   */
  const isItemSelected = useCallback((
    id: string,
    type: 'note' | 'folder' | 'tag',
    context: string
  ): boolean => {
    if (!sidebarBehavior.selection.contextAware) {
      // Non-context-aware: just check if item is selected
      return selection.type === type && selection.itemId === id;
    }
    
    // Context-aware: check type, id, AND context
    return (
      selection.type === type &&
      selection.itemId === id &&
      selection.context === context
    );
  }, [selection]);
  
  // Get multi-select IDs based on type
  const multiSelectIds = selection.type === 'note' 
    ? selectedNoteIds 
    : selection.type === 'folder'
    ? selectedFolderIds
    : new Set<string>();
  
  return {
    selection,
    multiSelectIds,
    handlers: {
      handleItemClick,
      clearSelection,
      isItemSelected,
    },
  };
}

