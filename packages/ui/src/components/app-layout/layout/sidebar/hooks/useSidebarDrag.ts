import { useState, useCallback } from 'react';

/**
 * useSidebarDrag
 * Consolidated drag & drop state and logic
 * 
 * This hook eliminates the duplication of:
 * - 6 separate drag handlers for notes/folders
 * - Duplicate state management
 * - Context passing logic
 * 
 * Pattern:
 * - Single source of truth for drag state
 * - Type-safe drag operations
 * - Unified handlers for all item types
 * 
 * Usage:
 * ```ts
 * const { dragState, handlers } = useSidebarDrag({
 *   onNoteDrop: (noteId, targetId) => moveNote(noteId, targetId),
 *   onFolderDrop: (folderId, targetId) => moveFolder(folderId, targetId),
 *   onReorder: (itemId, targetId, position) => reorderItem(itemId, targetId, position),
 * });
 * 
 * // Then in render:
 * <SidebarItemNote
 *   onDragStart={(id, context) => handlers.handleDragStart(id, 'note', context)}
 *   isDropTarget={dragState.dropTargetId === noteId}
 *   // ...
 * />
 * ```
 */

interface DragState {
  draggedId: string | null;
  draggedType: 'note' | 'folder' | null;
  draggedContext: string | null;
  dropTargetId: string | null;
  dropTargetType: 'folder' | 'note' | '__cluttered__' | 'dailyNotes' | null;
  reorderTarget: {
    id: string;
    position: 'before' | 'after';
    type: 'note' | 'folder';
  } | null;
}

interface DragHandlers {
  // Start drag
  handleDragStart: (id: string, type: 'note' | 'folder', context: string) => void;
  
  // End drag
  handleDragEnd: () => void;
  
  // Drop targets (move to folder)
  handleDragOver: (targetId: string, targetType: 'folder' | '__cluttered__' | 'dailyNotes') => void;
  handleDragLeave: () => void;
  handleDrop: (targetId: string, targetType: 'folder' | '__cluttered__' | 'dailyNotes') => void;
  
  // Reordering (within same container)
  handleDragOverForReorder: (targetId: string, position: 'before' | 'after', type: 'note' | 'folder', context: string) => void;
  handleDragLeaveForReorder: () => void;
  handleDropForReorder: (targetId: string, position: 'before' | 'after', type: 'note' | 'folder', context: string) => void;
  
  // Clear all indicators
  clearAllIndicators: () => void;
}

interface UseSidebarDragProps {
  // Drop handlers (move to folder)
  onNoteDrop?: (noteId: string, targetFolderId: string) => void;
  onFolderDrop?: (folderId: string, targetFolderId: string) => void;
  
  // Reorder handlers (within same container)
  onNoteReorder?: (noteId: string, targetNoteId: string, position: 'before' | 'after', context: string) => void;
  onFolderReorder?: (folderId: string, targetFolderId: string, position: 'before' | 'after', context: string) => void;
}

export function useSidebarDrag({
  onNoteDrop,
  onFolderDrop,
  onNoteReorder,
  onFolderReorder,
}: UseSidebarDragProps): {
  dragState: DragState;
  handlers: DragHandlers;
} {
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    draggedType: null,
    draggedContext: null,
    dropTargetId: null,
    dropTargetType: null,
    reorderTarget: null,
  });
  
  /**
   * Start dragging an item
   */
  const handleDragStart = useCallback((id: string, type: 'note' | 'folder', context: string) => {
    setDragState(prev => ({
      ...prev,
      draggedId: id,
      draggedType: type,
      draggedContext: context,
    }));
  }, []);
  
  /**
   * End drag operation
   */
  const handleDragEnd = useCallback(() => {
    setDragState({
      draggedId: null,
      draggedType: null,
      draggedContext: null,
      dropTargetId: null,
      dropTargetType: null,
      reorderTarget: null,
    });
  }, []);
  
  /**
   * Drag over a drop target (folder)
   */
  const handleDragOver = useCallback((
    targetId: string,
    targetType: 'folder' | '__cluttered__' | 'dailyNotes'
  ) => {
    setDragState(prev => ({
      ...prev,
      dropTargetId: targetId,
      dropTargetType: targetType,
      reorderTarget: null, // Clear reorder when entering drop zone
    }));
  }, []);
  
  /**
   * Leave drop target
   */
  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dropTargetId: null,
      dropTargetType: null,
    }));
  }, []);
  
  /**
   * Drop on target (move to folder)
   */
  const handleDrop = useCallback((
    targetId: string,
    targetType: 'folder' | '__cluttered__' | 'dailyNotes'
  ) => {
    const { draggedId, draggedType } = dragState;
    
    if (!draggedId || !draggedType) return;
    
    // Call appropriate handler
    if (draggedType === 'note' && onNoteDrop) {
      onNoteDrop(draggedId, targetId);
    } else if (draggedType === 'folder' && onFolderDrop) {
      onFolderDrop(draggedId, targetId);
    }
    
    // Clear state
    handleDragEnd();
  }, [dragState, onNoteDrop, onFolderDrop, handleDragEnd]);
  
  /**
   * Drag over for reordering
   */
  const handleDragOverForReorder = useCallback((
    targetId: string,
    position: 'before' | 'after',
    type: 'note' | 'folder',
    context: string
  ) => {
    // Only allow reordering within same context
    if (dragState.draggedContext !== context) return;
    
    setDragState(prev => ({
      ...prev,
      dropTargetId: null, // Clear drop target when reordering
      dropTargetType: null,
      reorderTarget: {
        id: targetId,
        position,
        type,
      },
    }));
  }, [dragState.draggedContext]);
  
  /**
   * Leave reorder target
   */
  const handleDragLeaveForReorder = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      reorderTarget: null,
    }));
  }, []);
  
  /**
   * Drop for reordering
   */
  const handleDropForReorder = useCallback((
    targetId: string,
    position: 'before' | 'after',
    type: 'note' | 'folder',
    context: string
  ) => {
    const { draggedId, draggedType, draggedContext } = dragState;
    
    if (!draggedId || !draggedType) return;
    
    // Only allow reordering within same context
    if (draggedContext !== context) return;
    
    // Call appropriate handler
    if (type === 'note' && draggedType === 'note' && onNoteReorder) {
      onNoteReorder(draggedId, targetId, position, context);
    } else if (type === 'folder' && draggedType === 'folder' && onFolderReorder) {
      onFolderReorder(draggedId, targetId, position, context);
    }
    
    // Clear state
    handleDragEnd();
  }, [dragState, onNoteReorder, onFolderReorder, handleDragEnd]);
  
  /**
   * Clear all drag indicators
   */
  const clearAllIndicators = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dropTargetId: null,
      dropTargetType: null,
      reorderTarget: null,
    }));
  }, []);
  
  return {
    dragState,
    handlers: {
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleDragOverForReorder,
      handleDragLeaveForReorder,
      handleDropForReorder,
      clearAllIndicators,
    },
  };
}

