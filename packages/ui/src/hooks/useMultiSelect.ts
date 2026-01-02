import { useState, useCallback } from 'react';

interface UseMultiSelectOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onSingleSelect?: (id: string) => void;
}

interface UseMultiSelectReturn {
  selectedIds: Set<string>;
  lastClickedId: string | null;
  handleClick: (id: string, event?: React.MouseEvent) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setLastClickedId: (id: string | null) => void;
  clearSelection: () => void;
}

/**
 * Custom hook for multi-select functionality with shift+click and cmd/ctrl+click support
 * 
 * @param items - Array of items to select from (in display order)
 * @param getItemId - Function to extract ID from an item
 * @param onSingleSelect - Optional callback when a single item is selected (normal click)
 * 
 * @returns Object with selection state and handlers
 * 
 * @example
 * const { selectedIds, handleClick } = useMultiSelect({
 *   items: notes,
 *   getItemId: (note) => note.id,
 *   onSingleSelect: (id) => openNote(id),
 * });
 */
export function useMultiSelect<T>({
  items,
  getItemId,
  onSingleSelect,
}: UseMultiSelectOptions<T>): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const handleClick = useCallback(
    (id: string, event?: React.MouseEvent) => {
      // Build flat list of item IDs in display order
      const flatIds = items.map(getItemId);

      if (event?.shiftKey && lastClickedId) {
        // Shift+click: Range selection
        const lastIndex = flatIds.indexOf(lastClickedId);
        const currentIndex = flatIds.indexOf(id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          // Select all items in range
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = flatIds.slice(start, end + 1);

          setSelectedIds(new Set(rangeIds));
        }
      } else if (event?.metaKey || event?.ctrlKey) {
        // Cmd/Ctrl+click: Toggle individual selection
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        setSelectedIds(newSelected);
        setLastClickedId(id);
      } else {
        // Normal click: Select single item
        setSelectedIds(new Set([id]));
        setLastClickedId(id);

        // Call single select callback
        if (onSingleSelect) {
          onSingleSelect(id);
        }
      }
    },
    [items, getItemId, selectedIds, lastClickedId, onSingleSelect]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedId(null);
  }, []);

  return {
    selectedIds,
    lastClickedId,
    handleClick,
    setSelectedIds,
    setLastClickedId,
    clearSelection,
  };
}

